import { SessionVector } from "./SessionVector";
import { MoodDigest } from "./MoodDigest";
import { ReorderBuffer } from "../ranking/ReorderBuffer";
import { ResonanceEngine, RankableItem } from "../ranking/ResonanceEngine";
import { SignalNormalizer } from "../signals/SignalNormalizer";
import { AudioSignal } from "../signals/AudioSignals";
import { InteractionSignal } from "../signals/InteractionSignals";
import { PredictiveEngine } from "../intelligence/PredictiveEngine";

type AnySignal = AudioSignal | InteractionSignal;

/**
 * THE BRAIN.
 * Orquesta señales, estado y ranking en tiempo real.
 */
export class MoodSessionManager {
  private static instance: MoodSessionManager | null = null;

  // State
  private sessionVector: SessionVector;
  private buffer: ReorderBuffer<RankableItem>;
  private digest: MoodDigest;
  private predictiveEngine: PredictiveEngine;
  private sessionId: string;
  private currentViewableIndex = 0;

  // Session Affinity Maps (memoria de corto plazo)
  private creatorAffinity = new Map<string, number>();
  private tagAffinity = new Map<string, number>();

  // Debounce
  private reorderTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 300;

  // Config
  private readonly BASE_LEARNING_RATE = 0.25;
  private readonly SAFETY_MARGIN = 2; // zona congelada
  private readonly CREATOR_ALPHA = 0.2;
  private readonly TAG_ALPHA = 0.1;

  private constructor() {
    this.sessionVector = new SessionVector(0.5, 0.5);
    this.buffer = new ReorderBuffer<RankableItem>([]);
    this.digest = new MoodDigest(this.sessionVector);
    this.predictiveEngine = new PredictiveEngine();
    this.sessionId = `sess_${Date.now()}`;
  }

  public static getInstance(): MoodSessionManager {
    if (!MoodSessionManager.instance) {
      MoodSessionManager.instance = new MoodSessionManager();
    }
    return MoodSessionManager.instance;
  }

  // --- INIT ---

  public initializeFeed(items: RankableItem[]): void {
    this.buffer.setItems(items);
  }

  public updateViewableIndex(index: number): void {
    this.currentViewableIndex = index;
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

    if (!this.isAudioSignal(signal)) {
      this.updateAffinity(signal, delta.weight);
    }

    // Update Vector
    let target: { energy: number; valence: number } | undefined;

    if (this.isAudioSignal(signal)) {
      target = signal.payload.trackFeatures;
    } else {
      const pf = signal.payload.postFeatures;
      if (pf && typeof pf.energy === "number" && typeof pf.valence === "number") {
        target = { energy: pf.energy, valence: pf.valence };
      }
    }

    if (target) {
      const nextCoords = this.predictiveEngine.calculateNextVector(
        this.sessionVector,
        target,
        this.BASE_LEARNING_RATE * Math.abs(delta.weight)
      );
      this.sessionVector.set(nextCoords.energy, nextCoords.valence);
    } else {
      const dampenedDelta = this.predictiveEngine.calculateHeuristicDelta(delta, Math.abs(delta.weight));
      this.sessionVector.applyDelta(dampenedDelta, 1.0);
    }

    this.scheduleReorder();
  }

  private updateAffinity(signal: InteractionSignal, weight: number) {
    const { creatorId, emotionalTag } = signal.payload;

    // Creator affinity
    if (creatorId && creatorId !== "system" && creatorId !== "unknown") {
      const current = this.creatorAffinity.get(creatorId) || 0;
      const next = Math.max(-3, Math.min(3, current + weight * this.CREATOR_ALPHA));
      this.creatorAffinity.set(creatorId, next);
    }

    // Tag affinity
    if (emotionalTag) {
      const current = this.tagAffinity.get(emotionalTag) || 0;
      const next = Math.max(-3, Math.min(3, current + weight * this.TAG_ALPHA));
      this.tagAffinity.set(emotionalTag, next);
    }
  }

  // --- RANKING ---

  private scheduleReorder(): void {
    if (this.reorderTimeout) clearTimeout(this.reorderTimeout);
    this.reorderTimeout = setTimeout(() => {
      this.performReorder();
      this.reorderTimeout = null;
    }, this.DEBOUNCE_MS);
  }

  private performReorder(): void {
    const mutableItems = this.buffer.getMutableTail(this.currentViewableIndex, this.SAFETY_MARGIN);
    if (mutableItems.length < 2) return;

    const lockedContext = this.buffer.items.slice(0, this.buffer.items.length - mutableItems.length);

    const sortedTail = ResonanceEngine.rank(
      mutableItems,
      this.sessionVector,
      lockedContext,
      this.creatorAffinity,
      this.tagAffinity
    );

    this.buffer.mergeSortedTail(this.currentViewableIndex, sortedTail, this.SAFETY_MARGIN);
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

  public resetSession(): void {
    this.sessionVector = new SessionVector(0.5, 0.5);
    this.digest = new MoodDigest(this.sessionVector);
    this.predictiveEngine = new PredictiveEngine();
    this.creatorAffinity.clear();
    this.tagAffinity.clear();
    this.sessionId = `sess_${Date.now()}`;
  }
}
