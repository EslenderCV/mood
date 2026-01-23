import { SessionVector } from './SessionVector';

export interface MoodDigestPayload {
  sessionId: string;
  startTime: number;
  endTime: number;
  startVector: { energy: number; valence: number };
  endVector: { energy: number; valence: number };
  dominantSignals: string[];
  interactionCount: number;
}

export class MoodDigest {
  private startTime: number;
  private startVector: SessionVector;
  private signalTypes: Set<string> = new Set();
  private interactionCount: number = 0;

  constructor(initialVector: SessionVector) {
    this.startTime = Date.now();
    this.startVector = initialVector.clone();
  }

  public recordSignalType(type: string) {
    this.signalTypes.add(type);
    this.interactionCount++;
  }

  public generate(currentVector: SessionVector, sessionId: string): MoodDigestPayload {
    return {
      sessionId,
      startTime: this.startTime,
      endTime: Date.now(),
      startVector: this.startVector.toJSON(),
      endVector: currentVector.toJSON(),
      dominantSignals: Array.from(this.signalTypes),
      interactionCount: this.interactionCount,
    };
  }
}