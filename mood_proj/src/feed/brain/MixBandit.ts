import AsyncStorage from "@react-native-async-storage/async-storage";

export type FeedSource = "following" | "reco" | "trending" | "explore";

type Persisted = {
  v: number;
  userId: string;
  updatedAt: number;
  values: Record<FeedSource, number>;
};

const VERSION = 1;
const KEY = (userId: string) => `@mood/mix_bandit_v${VERSION}:${userId}`;

const nowMs = () => Date.now();

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

const baseWeights: Record<FeedSource, number> = {
  following: 0.35,
  reco: 0.45,
  trending: 0.10,
  explore: 0.10,
};

const guardrails: Record<FeedSource, { min: number; max: number }> = {
  following: { min: 0.20, max: 0.55 },
  reco: { min: 0.25, max: 0.60 },
  trending: { min: 0.05, max: 0.25 },
  explore: { min: 0.05, max: 0.25 },
};

const softmax = (logits: Record<FeedSource, number>): Record<FeedSource, number> => {
  const xs = Object.values(logits);
  const m = Math.max(...xs);
  const exps: Record<FeedSource, number> = {
    following: Math.exp(logits.following - m),
    reco: Math.exp(logits.reco - m),
    trending: Math.exp(logits.trending - m),
    explore: Math.exp(logits.explore - m),
  };
  const sum = exps.following + exps.reco + exps.trending + exps.explore;
  return {
    following: exps.following / sum,
    reco: exps.reco / sum,
    trending: exps.trending / sum,
    explore: exps.explore / sum,
  };
};

export class MixBandit {
  private static instance: MixBandit | null = null;

  public static getInstance(): MixBandit {
    if (!MixBandit.instance) MixBandit.instance = new MixBandit();
    return MixBandit.instance;
  }

  private userId: string | null = null;
  private loaded = false;

  // Value estimates per source in [-1..+1]
  private values: Record<FeedSource, number> = {
    following: 0,
    reco: 0,
    trending: 0,
    explore: 0,
  };

  private persistTimer: any = null;
  private pendingPersist = false;

  private constructor() {}

  public async ensureLoaded(userId: string): Promise<void> {
    if (!userId) return;
    if (this.loaded && this.userId === userId) return;

    this.userId = userId;
    this.loaded = false;
    this.values = { following: 0, reco: 0, trending: 0, explore: 0 };

    try {
      const raw = await AsyncStorage.getItem(KEY(userId));
      if (raw) {
        const parsed: Persisted = JSON.parse(raw);
        if (parsed?.v === VERSION && parsed?.userId === userId && parsed?.values) {
          this.values = {
            following: clamp(parsed.values.following ?? 0, -1, 1),
            reco: clamp(parsed.values.reco ?? 0, -1, 1),
            trending: clamp(parsed.values.trending ?? 0, -1, 1),
            explore: clamp(parsed.values.explore ?? 0, -1, 1),
          };
        }
      }
    } catch {
      // ignore
    } finally {
      this.loaded = true;
    }
  }

  public getWeights(): Record<FeedSource, number> {
    // Convert values into weights, anchored on base weights.
    const beta = 1.35; // responsiveness
    const logits: Record<FeedSource, number> = {
      following: Math.log(baseWeights.following) + beta * this.values.following,
      reco: Math.log(baseWeights.reco) + beta * this.values.reco,
      trending: Math.log(baseWeights.trending) + beta * this.values.trending,
      explore: Math.log(baseWeights.explore) + beta * this.values.explore,
    };

    let w = softmax(logits);

    // Apply guardrails, then renormalize.
    w = {
      following: clamp(w.following, guardrails.following.min, guardrails.following.max),
      reco: clamp(w.reco, guardrails.reco.min, guardrails.reco.max),
      trending: clamp(w.trending, guardrails.trending.min, guardrails.trending.max),
      explore: clamp(w.explore, guardrails.explore.min, guardrails.explore.max),
    };

    const s = w.following + w.reco + w.trending + w.explore;
    return { following: w.following / s, reco: w.reco / s, trending: w.trending / s, explore: w.explore / s };
  }

  /**
   * Reward should be in roughly [-1..+1].
   * - like/save/share/follow: +0.7..+1.0
   * - dwell: +0.1..+0.35
   * - skip_fast: -0.35
   * - skip: -0.12
   */
  public update(source: FeedSource, reward: number): void {
    const r = clamp(reward, -1, 1);
    const lr = 0.18; // EMA smoothing
    this.values[source] = clamp(this.values[source] * (1 - lr) + r * lr, -1, 1);
    this.schedulePersist();
  }

  private schedulePersist(): void {
    if (!this.userId) return;
    this.pendingPersist = true;
    if (this.persistTimer) return;

    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      if (!this.pendingPersist) return;
      this.pendingPersist = false;
      void this.persist();
    }, 1500);
  }

  private async persist(): Promise<void> {
    if (!this.userId) return;
    try {
      const obj: Persisted = {
        v: VERSION,
        userId: this.userId,
        updatedAt: nowMs(),
        values: this.values,
      };
      await AsyncStorage.setItem(KEY(this.userId), JSON.stringify(obj));
    } catch {
      // ignore
    }
  }
}
