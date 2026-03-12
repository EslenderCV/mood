import AsyncStorage from "@react-native-async-storage/async-storage";

export type SeenState = {
  impressions: number;
  lastSeenAt?: number;
  dwellTotalMs: number;
  skipFast: number;
  skip: number;
  positives: number;
  negatives: number;
};

export type PositiveSignal =
  | "like"
  | "save"
  | "share"
  | "follow"
  | "open_comments"
  | "open_profile";

export type NegativeSignal = "hide" | "report";

const STORAGE_VERSION = 1;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Small, deterministic hash for keys.
const hash32 = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export class SeenStateStore {
  private static instance: SeenStateStore | null = null;

  private userId: string | null = null;
  private storageKey: string | null = null;

  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  private map = new Map<string, SeenState>();
  private dirty = false;
  private flushTimer: any = null;

  public static getInstance(): SeenStateStore {
    if (!SeenStateStore.instance) SeenStateStore.instance = new SeenStateStore();
    return SeenStateStore.instance;
  }

  /** Call once per auth user (safe to call repeatedly with same userId). */
  public configure(userId: string): Promise<void> {
    if (!userId) return Promise.resolve();
    if (this.userId === userId && this.loaded) return Promise.resolve();

    if (this.userId !== userId) {
      // Switch user => reset in-memory state before loading.
      this.userId = userId;
      this.storageKey = `seen_state:v${STORAGE_VERSION}:${userId}`;
      this.loaded = false;
      this.map.clear();
      this.dirty = false;
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }
    }

    if (!this.loadPromise) {
      this.loadPromise = this.loadFromStorage().finally(() => {
        this.loadPromise = null;
      });
    }

    return this.loadPromise;
  }

  private async loadFromStorage(): Promise<void> {
    if (!this.storageKey) return;
    try {
      const raw = await AsyncStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, SeenState>;
        this.map.clear();
        for (const [postId, state] of Object.entries(parsed)) {
          if (!postId) continue;
          this.map.set(postId, {
            impressions: Number(state.impressions || 0),
            lastSeenAt: state.lastSeenAt ? Number(state.lastSeenAt) : undefined,
            dwellTotalMs: Number(state.dwellTotalMs || 0),
            skipFast: Number(state.skipFast || 0),
            skip: Number(state.skip || 0),
            positives: Number(state.positives || 0),
            negatives: Number(state.negatives || 0),
          });
        }
      }
    } catch {
      // ignore corruption; start fresh
      this.map.clear();
    } finally {
      this.loaded = true;
    }
  }

  private scheduleFlush() {
    if (!this.storageKey) return;
    if (this.flushTimer) return;

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flushToStorage();
    }, 800);
  }

  public async flushToStorage(): Promise<void> {
    if (!this.storageKey) return;
    if (!this.dirty) return;

    this.dirty = false;

    try {
      const obj: Record<string, SeenState> = {};
      for (const [k, v] of this.map.entries()) obj[k] = v;
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(obj));
    } catch {
      // If write fails, mark dirty again; we will retry on next schedule.
      this.dirty = true;
    }
  }

  public get(postId: string): SeenState {
    const existing = this.map.get(postId);
    if (existing) return existing;
    const next: SeenState = {
      impressions: 0,
      dwellTotalMs: 0,
      skipFast: 0,
      skip: 0,
      positives: 0,
      negatives: 0,
    };
    this.map.set(postId, next);
    return next;
  }

  public markImpression(postId: string, nowMs: number = Date.now()): void {
    if (!postId) return;
    const st = this.get(postId);
    st.impressions += 1;
    st.lastSeenAt = nowMs;
    this.dirty = true;
    this.scheduleFlush();
  }

  public recordViewEnd(postId: string, dwellMs: number): void {
    if (!postId) return;
    const st = this.get(postId);

    const d = Math.max(0, Math.floor(dwellMs || 0));
    st.dwellTotalMs += d;

    if (d < 1200) st.skipFast += 1;
    else st.skip += 1;

    this.dirty = true;
    this.scheduleFlush();
  }

  public recordPositive(postId: string, _kind: PositiveSignal): void {
    if (!postId) return;
    const st = this.get(postId);
    st.positives += 1;
    this.dirty = true;
    this.scheduleFlush();
  }

  public recordNegative(postId: string, _kind: NegativeSignal): void {
    if (!postId) return;
    const st = this.get(postId);
    st.negatives += 1;
    this.dirty = true;
    this.scheduleFlush();
  }

  /**
   * Aggressive suppression rules (Phase-1) to prevent "sticky" ignored posts.
   * Returns true => should be removed from top candidates for the current rebuild.
   */
  public shouldSuppress(postId: string): boolean {
    if (!postId) return false;
    const st = this.get(postId);
    if (st.negatives > 0) return true;
    if (st.positives > 0) return false;

    if (st.impressions >= 2 && st.skipFast >= 2) return true;
    if (st.impressions >= 3 && st.dwellTotalMs < 1500) return true;

    return false;
  }

  /**
   * Returns penalty [0..1]. Higher => downrank harder.
   * We intentionally over-penalize repeated fast skips to avoid re-surfacing.
   */
  public penalty(postId: string): number {
    if (!postId) return 0;
    const st = this.get(postId);
    if (st.negatives > 0) return 1;
    if (st.positives > 0) return 0;

    const imp = clamp(st.impressions, 0, 6);
    const sf = clamp(st.skipFast, 0, 6);
    const sk = clamp(st.skip, 0, 6);

    // Convert dwell to a soft "interest" signal.
    const dwell = clamp(st.dwellTotalMs, 0, 15000);
    const dwellBoost = clamp(dwell / 6000, 0, 1); // 0..1

    // Base penalty grows with impressions and skips.
    let p = 0.12 * imp + 0.22 * sf + 0.10 * sk;

    // If user actually spent time, reduce penalty.
    p = p * (1 - 0.7 * dwellBoost);

    return clamp(p, 0, 1);
  }

  /**
   * For deterministic mixing (stable UX), we expose a user+post hash.
   * Not required, but helps keep ordering consistent across builds.
   */
  public stableHashFor(postId: string): number {
    const uid = this.userId || "anon";
    return hash32(`${uid}:${postId}`);
  }
}
