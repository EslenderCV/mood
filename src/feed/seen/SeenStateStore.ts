import AsyncStorage from "@react-native-async-storage/async-storage";

export type SeenEntry = {
  impressions: number;
  lastSeenAt?: number; // ms
  dwellTotalMs: number;
  skipFastCount: number;
  skipCount: number;
  positives: number;
  negatives: number;
};

type PersistedState = {
  v: number;
  userId: string;
  updatedAt: number;
  posts: Record<string, SeenEntry>;
};

const VERSION = 1;
const KEY = (userId: string) => `@mood/seen_state_v${VERSION}:${userId}`;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const nowMs = () => Date.now();

const defaultEntry = (): SeenEntry => ({
  impressions: 0,
  lastSeenAt: undefined,
  dwellTotalMs: 0,
  skipFastCount: 0,
  skipCount: 0,
  positives: 0,
  negatives: 0,
});

/**
 * Client-side persistent seen state.
 * Used to avoid sticky posts and to make the feed respond to skip/dwell quickly.
 */
export class SeenStateStore {
  private static instance: SeenStateStore | null = null;

  public static getInstance(): SeenStateStore {
    if (!SeenStateStore.instance) SeenStateStore.instance = new SeenStateStore();
    return SeenStateStore.instance;
  }

  private userId: string | null = null;
  private loaded = false;
  private posts = new Map<string, SeenEntry>();

  private persistTimer: any = null;
  private pendingPersist = false;

  private constructor() {}

  public isLoadedFor(userId: string): boolean {
    return this.loaded && this.userId === userId;
  }

  public async ensureLoaded(userId: string): Promise<void> {
    if (!userId) return;
    if (this.isLoadedFor(userId)) return;

    this.userId = userId;
    this.loaded = false;
    this.posts.clear();

    try {
      const raw = await AsyncStorage.getItem(KEY(userId));
      if (raw) {
        const parsed: PersistedState = JSON.parse(raw);
        if (parsed?.userId === userId && parsed?.v === VERSION && parsed?.posts) {
          for (const [pid, entry] of Object.entries(parsed.posts)) {
            if (!pid) continue;
            this.posts.set(pid, {
              ...defaultEntry(),
              ...entry,
            });
          }
        }
      }
    } catch {
      // ignore (best-effort)
    } finally {
      this.loaded = true;
    }
  }

  public get(postId: string): SeenEntry {
    if (!postId) return defaultEntry();
    return this.posts.get(postId) || defaultEntry();
  }

  public markImpression(postId: string, ts: number = nowMs()): void {
    if (!postId) return;
    const e = this.posts.get(postId) || defaultEntry();
    e.impressions += 1;
    e.lastSeenAt = ts;
    this.posts.set(postId, e);
    this.schedulePersist();
  }

  public recordViewEnd(postId: string, dwellMs: number, ts: number = nowMs()): void {
    if (!postId) return;
    const e = this.posts.get(postId) || defaultEntry();
    const safeDwell = Math.max(0, Math.floor(dwellMs || 0));
    e.dwellTotalMs += safeDwell;
    e.lastSeenAt = ts;

    // Heuristic thresholds (Phase-2)
    if (safeDwell < 1200) e.skipFastCount += 1;
    else e.skipCount += 1;

    this.posts.set(postId, e);
    this.schedulePersist();
  }

  public recordPositive(postId: string): void {
    if (!postId) return;
    const e = this.posts.get(postId) || defaultEntry();
    e.positives += 1;
    this.posts.set(postId, e);
    this.schedulePersist();
  }

  public recordNegative(postId: string): void {
    if (!postId) return;
    const e = this.posts.get(postId) || defaultEntry();
    e.negatives += 1;
    this.posts.set(postId, e);
    this.schedulePersist();
  }

  /**
   * Hard suppression: remove from top candidates if user repeatedly ignores it.
   */
  public shouldSuppress(postId: string): boolean {
    if (!postId) return false;
    const e = this.get(postId);

    if (e.negatives > 0) return true;
    if (e.positives > 0) return false;

    // 2 impressions + 2 fast skips => kill for this user (re-try only after time decay in later phases)
    if (e.impressions >= 2 && e.skipFastCount >= 2) return true;

    // 3 impressions with almost no dwell => kill
    if (e.impressions >= 3 && e.dwellTotalMs < 1500) return true;

    return false;
  }

  /**
   * Continuous penalty in [0..0.9] with time decay (half-life 6h).
   * Used to downrank ignored content without hard-dropping everything.
   */
  public penalty(postId: string, ts: number = nowMs()): number {
    if (!postId) return 0;
    const e = this.get(postId);
    if (e.negatives > 0) return 0.9;
    if (e.positives > 0) return 0;

    const ageMs = e.lastSeenAt ? Math.max(0, ts - e.lastSeenAt) : 0;
    const halfLifeMs = 6 * 60 * 60 * 1000;
    const decay = Math.pow(0.5, ageMs / halfLifeMs); // 1.0 when fresh, decays over time

    // Base penalty from impressions and skips
    const impPenalty = clamp01((e.impressions - 1) * 0.18);
    const skipPenalty = clamp01(e.skipCount * 0.12 + e.skipFastCount * 0.22);
    const dwellPenalty = e.dwellTotalMs < 1200 ? 0.15 : e.dwellTotalMs < 2500 ? 0.08 : 0;

    const raw = clamp01(impPenalty + skipPenalty + dwellPenalty);
    const decayed = raw * decay;

    return Math.min(0.9, decayed);
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
    }, 1200);
  }

  private async persist(): Promise<void> {
    if (!this.userId) return;
    try {
      const obj: PersistedState = {
        v: VERSION,
        userId: this.userId,
        updatedAt: nowMs(),
        posts: Object.fromEntries(this.posts.entries()),
      };
      await AsyncStorage.setItem(KEY(this.userId), JSON.stringify(obj));
    } catch {
      // ignore
    }
  }
}
