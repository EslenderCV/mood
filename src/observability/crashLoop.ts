import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Crash-loop protection (best-effort):
 * - Counts fatal crashes within a short window
 * - If a loop is detected, we enable a temporary "safe mode" by overriding
 *   expensive/experimental features (flags) to keep the app bootable.
 */

export const CRASH_STATE_KEY = "@mood/crash_state_v1" as const;

type CrashState = {
  windowStartMs: number;
  crashCount: number;
  lastCrashMs: number;
  safeModeUntilMs?: number;
};

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const LOOP_THRESHOLD = 3; // crashes
const SAFE_MODE_MS = 15 * 60 * 1000; // 15 minutes

const now = () => Date.now();

const readState = async (): Promise<CrashState | null> => {
  try {
    const raw = await AsyncStorage.getItem(CRASH_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as any;

    const windowStartMs = typeof obj.windowStartMs === "number" ? obj.windowStartMs : 0;
    const crashCount = typeof obj.crashCount === "number" ? obj.crashCount : 0;
    const lastCrashMs = typeof obj.lastCrashMs === "number" ? obj.lastCrashMs : 0;
    const safeModeUntilMs = typeof obj.safeModeUntilMs === "number" ? obj.safeModeUntilMs : undefined;

    if (!windowStartMs || !lastCrashMs) return null;
    return { windowStartMs, crashCount, lastCrashMs, safeModeUntilMs };
  } catch {
    return null;
  }
};

const writeState = async (state: CrashState | null) => {
  try {
    if (!state) {
      await AsyncStorage.removeItem(CRASH_STATE_KEY);
      return;
    }
    await AsyncStorage.setItem(CRASH_STATE_KEY, JSON.stringify(state));
  } catch {
    // no-op
  }
};

export const isSafeModeActive = async (): Promise<boolean> => {
  const state = await readState();
  const until = state?.safeModeUntilMs;
  if (!until) return false;
  return until > now();
};

export const getSafeModeUntilMs = async (): Promise<number | null> => {
  const state = await readState();
  const until = state?.safeModeUntilMs;
  if (!until) return null;
  return until > now() ? until : null;
};

export const recordCrash = async (meta?: { isFatal?: boolean; message?: string }) => {
  const t = now();
  const prev = await readState();

  let windowStartMs = prev?.windowStartMs ?? t;
  let crashCount = prev?.crashCount ?? 0;
  const safeModeUntilMsPrev = prev?.safeModeUntilMs;

  // Reset window if expired.
  if (t - windowStartMs > WINDOW_MS) {
    windowStartMs = t;
    crashCount = 0;
  }

  crashCount += 1;

  let safeModeUntilMs = safeModeUntilMsPrev;
  if (crashCount >= LOOP_THRESHOLD) {
    safeModeUntilMs = Math.max(safeModeUntilMsPrev ?? 0, t + SAFE_MODE_MS);
  }

  await writeState({
    windowStartMs,
    crashCount,
    lastCrashMs: t,
    safeModeUntilMs,
  });
};

/**
 * Call once the app is stable (booted) to clear crash-loop state.
 */
export const markHealthyBoot = async () => {
  await writeState(null);
};
