import { MoodSessionManager } from "@/src/brain/session/MoodSessionManager";
import { AudioSignal, AudioEventType } from "./AudioSignals";
import { InteractionSignal, InteractionType, InteractionSignalPayload } from "./InteractionSignals";

// Defaults seguros
const getDefaultFeatures = () => ({ energy: 0.5, valence: 0.5, bpm: 120 });

export const BrainEmitter = {
  audio: (
    type: AudioEventType,
    trackId: string,
    durationMs: number,
    playedMs: number,
    features?: { energy: number; valence: number; bpm: number },
    meta?: { title?: string; artist?: string }
  ) => {
    const signal: AudioSignal = {
      type,
      timestamp: Date.now(),
      payload: {
        trackId,
        totalDurationMs: durationMs,
        durationPlayedMs: playedMs,
        trackFeatures: features || getDefaultFeatures(),
        trackMeta: meta,
      },
    };
    MoodSessionManager.getInstance().registerSignal(signal);
  },

  /**
   * Compatibilidad:
   * - (type, postId: string) -> defaults neutros
   * - (type, payload: InteractionSignalPayload) -> payload enriquecido
   */
  interaction: (type: InteractionType, data: string | InteractionSignalPayload) => {
    let payload: InteractionSignalPayload;

    if (typeof data === "string") {
      payload = {
        postId: data,
        postFeatures: { energy: 0.5, valence: 0.5 },
      };
    } else {
      payload = {
        ...data,
        postFeatures: {
          energy: data.postFeatures?.energy ?? 0.5,
          valence: data.postFeatures?.valence ?? 0.5,
          emotionalTag: data.postFeatures?.emotionalTag ?? data.emotionalTag,
        },
      };
    }

    const signal: InteractionSignal = {
      type,
      timestamp: Date.now(),
      payload,
    };

    MoodSessionManager.getInstance().registerSignal(signal);
  },
};
