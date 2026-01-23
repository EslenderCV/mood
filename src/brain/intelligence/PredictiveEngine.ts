import { AudioSignal, AudioEventType } from '../signals/AudioSignals';
import { InteractionSignal, InteractionType } from '../signals/InteractionSignals';
import { LatentState, DEFAULT_LATENT_STATE } from './LatentState';
import { SessionVector } from '../session/SessionVector';

type AnySignal = AudioSignal | InteractionSignal;

/**
 * INTELLIGENCE LAYER.
 * Analyzes temporal patterns to predict intent and modulate vector physics.
 * Pure logic. No side effects.
 */
export class PredictiveEngine {
  private latentState: LatentState;
  private signalBuffer: AnySignal[];
  private readonly BUFFER_SIZE = 10;

  constructor() {
    this.latentState = { ...DEFAULT_LATENT_STATE };
    this.signalBuffer = [];
  }

  public getLatentState(): LatentState {
    return { ...this.latentState };
  }

  /**
   * Ingests a signal into the temporal buffer and updates the Latent State.
   */
  public ingestSignal(signal: AnySignal): void {
    this.signalBuffer.push(signal);
    if (this.signalBuffer.length > this.BUFFER_SIZE) {
      this.signalBuffer.shift();
    }
    this.analyzeMicroPatterns();
  }

  /**
   * Detects patterns like "Rapid Skips" or "Deep Engagement".
   */
  private analyzeMicroPatterns(): void {
    const recentSignals = this.signalBuffer.slice(-5);
    if (recentSignals.length < 3) return;

    // PATTERN 1: Frustration / Rapid Skips
    const skipCount = recentSignals.filter(
      (s) => 'type' in s && s.type === AudioEventType.TRACK_SKIP
    ).length;
    
    const scrollPeaks = recentSignals.filter(
      (s) => 'type' in s && s.type === InteractionType.SCROLL_VELOCITY_PEAK
    ).length;

    if (skipCount >= 2 || scrollPeaks >= 2) {
      // User is restless -> Reduce inertia, Increase novelty
      this.latentState.emotionalInertia = Math.max(0.1, this.latentState.emotionalInertia - 0.2);
      this.latentState.noveltyTolerance = Math.min(1.0, this.latentState.noveltyTolerance + 0.2);
      this.latentState.cognitiveLoad = Math.min(1.0, this.latentState.cognitiveLoad + 0.2);
    } 
    // PATTERN 2: Deep Engagement
    else if (recentSignals.some(s => 
      ('type' in s && s.type === AudioEventType.TRACK_COMPLETE) || 
      ('type' in s && s.type === InteractionType.LIKE)
    )) {
      // User found gold -> Increase inertia (lock in mood)
      this.latentState.emotionalInertia = Math.min(0.9, this.latentState.emotionalInertia + 0.1);
      this.latentState.cognitiveLoad = Math.max(0.1, this.latentState.cognitiveLoad - 0.1);
    }
  }

  /**
   * Calculates the next absolute coordinates for the vector using Momentum Physics.
   */
  public calculateNextVector(
    currentVector: SessionVector,
    targetVector: { energy: number; valence: number },
    baseLearningRate: number
  ): { energy: number; valence: number } {
    
    // Low Inertia = Fast adaptation
    const adaptionFactor = (1 - this.latentState.emotionalInertia);
    const effectiveAlpha = baseLearningRate * adaptionFactor;

    const energyDelta = (targetVector.energy - currentVector.energy) * effectiveAlpha;
    const valenceDelta = (targetVector.valence - currentVector.valence) * effectiveAlpha;

    return {
      energy: currentVector.energy + energyDelta,
      valence: currentVector.valence + valenceDelta
    };
  }

  /**
   * Calculates a dampened delta for heuristic pushes respecting inertia.
   */
  public calculateHeuristicDelta(
    rawDelta: { energyDelta: number; valenceDelta: number },
    weight: number
  ) {
    const adaptionFactor = (1 - this.latentState.emotionalInertia);
    const effectiveWeight = weight * adaptionFactor;

    return {
      energyDelta: rawDelta.energyDelta * effectiveWeight,
      valenceDelta: rawDelta.valenceDelta * effectiveWeight
    };
  }
}