export enum InteractionType {
  LIKE = "LIKE",
  SAVE = "SAVE",
  SHARE = "SHARE",
  PROFILE_TAP = "PROFILE_TAP", // Legacy
  OPEN_PROFILE = "OPEN_PROFILE",
  OPEN_COMMENTS = "OPEN_COMMENTS",
  SCROLL_VELOCITY_PEAK = "SCROLL_VELOCITY_PEAK",
  DWELL_TIME_LONG = "DWELL_TIME_LONG", // Legacy
  DWELL = "DWELL",
  SKIP = "SKIP",
  FOLLOW = "FOLLOW",
  REPLY_STORY = "REPLY_STORY",
}

export interface InteractionSignalPayload {
  postId: string;

  // Contexto enriquecido para el Brain
  creatorId?: string;
  emotionalTag?: string;

  // Métricas de consumo
  durationMs?: number;
  anchorIndex?: number;

  // Metadata para el vector emocional (compatibilidad y cálculo)
  postFeatures?: {
    energy?: number;
    valence?: number;
    emotionalTag?: string;
  };
}

export interface InteractionSignal {
  type: InteractionType;
  payload: InteractionSignalPayload;
  timestamp: number;
}
