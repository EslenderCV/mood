export enum AudioEventType {
  TRACK_START = 'TRACK_START',
  TRACK_COMPLETE = 'TRACK_COMPLETE', // Natural finish
  TRACK_SKIP = 'TRACK_SKIP',         // Explicit next < 30% duration
  VOLUME_UP = 'VOLUME_UP',           // Significant volume increase
  VOLUME_DOWN = 'VOLUME_DOWN',       // Significant volume decrease
  HEADPHONES_PLUGGED = 'HEADPHONES_PLUGGED'
}

export interface AudioSignalPayload {
  trackId: string;
  durationPlayedMs: number;
  totalDurationMs: number;
  // Metadata of the track triggering the signal
  trackFeatures?: {
    energy: number;
    valence: number;
    bpm: number;
  };
}

export interface AudioSignal {
  type: AudioEventType;
  payload: AudioSignalPayload;
  timestamp: number;
}