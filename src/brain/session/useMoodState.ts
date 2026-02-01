import { useMemo, useSyncExternalStore } from "react";
import { MoodSessionManager } from "./MoodSessionManager";

export type MoodStateSnapshot = {
  vector: { energy: number; valence: number };
  latent: any;
};

const safeParse = (raw: string): MoodStateSnapshot => {
  try {
    const parsed = JSON.parse(raw);
    return {
      vector: {
        energy: typeof parsed?.vector?.energy === "number" ? parsed.vector.energy : 0.5,
        valence: typeof parsed?.vector?.valence === "number" ? parsed.vector.valence : 0.5,
      },
      latent: parsed?.latent,
    };
  } catch {
    return { vector: { energy: 0.5, valence: 0.5 }, latent: null };
  }
};

/**
 * Subscribe-only hook to the Brain's current session state (energy/valence + latent).
 * Uses a stable string snapshot to avoid infinite re-render loops.
 */
export const useMoodState = (): MoodStateSnapshot => {
  const mgr = MoodSessionManager.getInstance();

  const snapshot = useSyncExternalStore(
    (cb) => mgr.subscribeState(cb),
    () => mgr.getStateSnapshot(),
    () => mgr.getStateSnapshot(),
  );

  return useMemo(() => safeParse(snapshot), [snapshot]);
};
