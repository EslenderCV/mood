import { AudioEventType, AudioSignal } from "./AudioSignals";
import { InteractionType, InteractionSignal } from "./InteractionSignals";

export interface EmotionalDelta {
  energyDelta: number;
  valenceDelta: number;
  weight: number;
}

export class SignalNormalizer {
  static processAudioSignal(signal: AudioSignal): EmotionalDelta {
    switch (signal.type) {
      case AudioEventType.TRACK_COMPLETE:
        return { energyDelta: 0, valenceDelta: 0, weight: 0.15 };

      case AudioEventType.TRACK_SKIP:
        return { energyDelta: -0.1, valenceDelta: -0.1, weight: 0.4 };

      case AudioEventType.VOLUME_UP:
        return { energyDelta: 0.1, valenceDelta: 0, weight: 0.2 };

      case AudioEventType.VOLUME_DOWN:
        return { energyDelta: -0.05, valenceDelta: 0, weight: 0.1 };

      default:
        return { energyDelta: 0, valenceDelta: 0, weight: 0.0 };
    }
  }

  static processInteraction(signal: InteractionSignal): EmotionalDelta {
    const duration = signal.payload.durationMs || 0;

    switch (signal.type) {
      case InteractionType.LIKE:
        return { energyDelta: 0, valenceDelta: 0, weight: 1.0 };

      case InteractionType.SAVE:
        return { energyDelta: 0, valenceDelta: 0, weight: 1.2 };

      case InteractionType.SHARE:
        return { energyDelta: 0, valenceDelta: 0, weight: 1.4 };

      case InteractionType.OPEN_PROFILE:
      case InteractionType.PROFILE_TAP:
        return { energyDelta: 0, valenceDelta: 0, weight: 0.6 };

      case InteractionType.OPEN_COMMENTS:
        return { energyDelta: 0, valenceDelta: 0, weight: 0.4 };

      case InteractionType.FOLLOW:
        return { energyDelta: 0, valenceDelta: 0, weight: 1.5 };

      case InteractionType.DWELL:
      case InteractionType.DWELL_TIME_LONG: {
        const dwellFactor = Math.min(duration / 4000, 1.0);
        return { energyDelta: 0, valenceDelta: 0, weight: 0.8 * dwellFactor };
      }

      case InteractionType.SKIP: {
        const skipFactor = Math.max(0, 1 - duration / 1200);
        return { energyDelta: 0.1, valenceDelta: -0.1, weight: -0.8 * skipFactor };
      }

      case InteractionType.SCROLL_VELOCITY_PEAK:
        return { energyDelta: 0.1, valenceDelta: -0.1, weight: 0.3 };

      default:
        return { energyDelta: 0, valenceDelta: 0, weight: 0.1 };
    }
  }
}
