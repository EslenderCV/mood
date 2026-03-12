import { SessionVector } from "./SessionVector";
import { MoodDigest } from "./MoodDigest";
import { ReorderBuffer } from "../ranking/ReorderBuffer";
import { ResonanceEngine, RankableItem } from "../ranking/ResonanceEngine";
import { SignalNormalizer } from "../signals/SignalNormalizer";
import { AudioSignal, AudioEventType } from "../signals/AudioSignals";
import { InteractionSignal } from "../signals/InteractionSignals";
import { PredictiveEngine } from "../intelligence/PredictiveEngine";

type AnySignal = AudioSignal | InteractionSignal;

/**
 * THE BRAIN.
 * Orquesta señales, estado y ranking en tiempo real.
 */
export class MoodSessionManager {
  private static instance: MoodSessionManager | null = null;

  // --- Subscribers (UI can observe changes without polling) ---
  private feedListeners = new Set<() => void>();
  private stateListeners = new Set<() => void>();

  private notifyFeed() {
    this.feedListeners.forEach((l) => l());
  }

  private notifyState() {
    this.stateListeners.forEach((l) => l());
  }

  /** Subscribe to feed reorders (tail reshuffles). */
  public subscribeFeed(listener: () => void): () => void {
    this.feedListeners.add(listener);
    return () => {
      this.feedListeners.delete(listener);

      // If nobody is listening for feed reorders, stop doing work.
      if (this.feedListeners.size === 0 && this.reorderTimeout) {
        clearTimeout(this.reorderTimeout);
        this.reorderTimeout = null;
      }
    };
  }

  /** Subscribe to session state changes (vector/latent updates). */
  public subscribeState(listener: () => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  // State
  private sessionVector: SessionVector;
  private buffer: ReorderBuffer<RankableItem>;
  private digest: MoodDigest;
  private predictiveEngine: PredictiveEngine;
  private sessionId: string;

  // Cached snapshot for useSyncExternalStore (must be referentially stable)
  private stateSnapshot: string;
  private currentViewableIndex = 0;

  // Session Affinity Maps (memoria de corto plazo)
  private creatorAffinity = new Map<string, number>();
  private tagAffinity = new Map<string, number>();
  private artistAffinity = new Map<string, number>();

  // Debounce
  private reorderTimeout: ReturnType<typeof setTimeout> | null = null;

  // Config
  private readonly DEBOUNCE_MS = 1000;
  private readonly SAFETY_MARGIN = 10;

  private readonly BASE_LEARNING_RATE = 0.25;
  private readonly CREATOR_ALPHA = 0.2;
  private readonly TAG_ALPHA = 0.1;
  private readonly ARTIST_ALPHA = 0.18;

  private constructor() {
    this.sessionVector = new SessionVector(0.5, 0.5);
    this.buffer = new ReorderBuffer<RankableItem>([]);
    this.digest = new MoodDigest(this.sessionVector);
    this.predictiveEngine = new PredictiveEngine();
    this.sessionId = `sess_${Date.now()}`;
    this.stateSnapshot = this.computeStateSnapshot();
  }

  public static getInstance(): MoodSessionManager {
    if (!MoodSessionManager.instance) {
      MoodSessionManager.instance = new MoodSessionManager();
    }
    return MoodSessionManager.instance;
  }

    /** Stable session id for tying feed + telemetry together. */
  public getSessionId(): string {
    return this.sessionId;
  }

// --- INIT ---

  public initializeFeed(items: RankableItem[]): void {
    this.buffer.setItems(items);
    this.notifyFeed();
  }

  public updateViewableIndex(index: number): void {
    this.currentViewableIndex = index;
  }

  private computeStateSnapshot(): string {
    return JSON.stringify({
      vector: this.sessionVector.toJSON(),
      latent: this.predictiveEngine.getLatentState(),
    });
  }

  private refreshStateSnapshot() {
    this.stateSnapshot = this.computeStateSnapshot();
  }

  /** Stable snapshot string for useSyncExternalStore. */
  public getStateSnapshot(): string {
    return this.stateSnapshot;
  }

  // --- CORE ---

  private isAudioSignal(signal: AnySignal): signal is AudioSignal {
    return "trackId" in signal.payload;
  }

  public registerSignal(signal: AnySignal): void {
    this.predictiveEngine.ingestSignal(signal);

    const delta = this.isAudioSignal(signal)
      ? SignalNormalizer.processAudioSignal(signal)
      : SignalNormalizer.processInteraction(signal);

    this.digest.recordSignalType(signal.type as any);

    if (this.isAudioSignal(signal)) {
      this.updateArtistAffinity(signal, delta.weight);
    } else {
      this.updateAffinity(signal, delta.weight);
    }

    // Update Vector
    let target: { energy: number; valence: number } | undefined;

    if (this.isAudioSignal(signal)) {
      target = signal.payload.trackFeatures;
    } else {
      const pf = signal.payload.postFeatures;
      if (
        pf &&
        typeof pf.energy === "number" &&
        typeof pf.valence === "number"
      ) {
        target = { energy: pf.energy, valence: pf.valence };
      }
    }

    if (target) {
      const nextCoords = this.predictiveEngine.calculateNextVector(
        this.sessionVector,
        target,
        this.BASE_LEARNING_RATE * Math.abs(delta.weight),
      );
      this.sessionVector.set(nextCoords.energy, nextCoords.valence);
    } else {
      const dampenedDelta = this.predictiveEngine.calculateHeuristicDelta(
        delta,
        Math.abs(delta.weight),
      );
      this.sessionVector.applyDelta(dampenedDelta, 1.0);
    }

    this.refreshStateSnapshot();
    this.notifyState();
    this.scheduleReorder();
  }

  private updateAffinity(signal: InteractionSignal, weight: number) {
    const { creatorId, emotionalTag } = signal.payload;

    // Creator affinity
    if (creatorId && creatorId !== "system" && creatorId !== "unknown") {
      const current = this.creatorAffinity.get(creatorId) || 0;
      const next = Math.max(
        -3,
        Math.min(3, current + weight * this.CREATOR_ALPHA),
      );
      this.creatorAffinity.set(creatorId, next);
    }

    // Tag affinity
    if (emotionalTag) {
      const current = this.tagAffinity.get(emotionalTag) || 0;
      const next = Math.max(-3, Math.min(3, current + weight * this.TAG_ALPHA));
      this.tagAffinity.set(emotionalTag, next);
    }
  }

  private updateArtistAffinity(signal: AudioSignal, weight: number) {
    const artistRaw = signal.payload.trackMeta?.artist;
    if (!artistRaw) return;

    const key = artistRaw.trim().toLowerCase();
    if (!key) return;

    // Audio weights for TRACK_START are often 0 in the normalizer.
    // We still want a tiny positive signal for "started listening".
    const magnitude =
      signal.type === AudioEventType.TRACK_START
        ? 0.08
        : Math.max(0.05, Math.abs(weight));

    const sign = signal.type === AudioEventType.TRACK_SKIP ? -1 : 1;

    const current = this.artistAffinity.get(key) || 0;
    const next = Math.max(
      -3,
      Math.min(3, current + sign * magnitude * this.ARTIST_ALPHA),
    );
    this.artistAffinity.set(key, next);
  }

  // --- RANKING ---

  private scheduleReorder(): void {
    // No UI consumer => do not waste CPU doing tail reorders in the background.
    // This is especially important when server feed is the source of truth.
    if (this.feedListeners.size === 0) return;

    if (this.reorderTimeout) clearTimeout(this.reorderTimeout);
    this.reorderTimeout = setTimeout(() => {
      this.performReorder();
      this.reorderTimeout = null;
    }, this.DEBOUNCE_MS);
  }

  private performReorder(): void {
    const mutableItems = this.buffer.getMutableTail(
      this.currentViewableIndex,
      this.SAFETY_MARGIN,
    );

    if (mutableItems.length < 3) return;

    const lockedContext = this.buffer.items.slice(
      0,
      this.buffer.items.length - mutableItems.length,
    );

    const sortedTail = ResonanceEngine.rank(
      mutableItems,
      this.sessionVector,
      lockedContext,
      this.creatorAffinity,
      this.tagAffinity,
    );

    this.buffer.mergeSortedTail(
      this.currentViewableIndex,
      sortedTail,
      this.SAFETY_MARGIN,
    );

    this.notifyFeed();

    if (__DEV__) {
      console.log(
        `[Brain] Tail reorder applied @index=${this.currentViewableIndex}`,
      );
    }
  }

  // --- GETTERS ---

  public getSessionVector() {
    return this.sessionVector.toJSON();
  }

  public getLatentState() {
    return this.predictiveEngine.getLatentState();
  }

  public getFeed(): RankableItem[] {
    return this.buffer.items;
  }

  public generateMoodDigest() {
    return this.digest.generate(this.sessionVector, this.sessionId);
  }

  // 🔥 NUEVO: Permite consultar qué tanto nos gusta un creador para sugerirlo
  public getCreatorAffinity(creatorId: string): number {
    return this.creatorAffinity.get(creatorId) || 0;
  }

  /**
   * Short-term affinity for an emotional tag (mood emoji).
   * Used by HomeFeedBrain to adapt quickly based on attention/skip.
   */
  public getTagAffinity(emotionalTag: string): number {
    if (!emotionalTag) return 0;
    return this.tagAffinity.get(emotionalTag) || 0;
  }

  /**
   * Used to personalize music discovery...
   */
  public getArtistAffinity(artistName: string): number {
    const key = (artistName || "").trim().toLowerCase();
    if (!key) return 0;
    return this.artistAffinity.get(key) || 0;
  }

  public resetSession(): void {
    this.sessionVector = new SessionVector(0.5, 0.5);
    this.digest = new MoodDigest(this.sessionVector);
    this.predictiveEngine = new PredictiveEngine();
    this.creatorAffinity.clear();
    this.tagAffinity.clear();
    this.artistAffinity.clear();
    this.sessionId = `sess_${Date.now()}`;
    this.refreshStateSnapshot();
    this.notifyState();
    this.notifyFeed();
  }
}