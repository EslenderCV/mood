export type MatchedItem = {
  isrc?: string;
  title?: string;
  artist?: string;
  shazamID?: string;
  appleMusicID?: string;
  appleMusicURL?: string;
  artworkURL?: string;
  genres: string[];
  webURL?: string;
  subtitle?: string;
  videoURL?: string | null;
  explicitContent: boolean;
  matchOffset: number;
};
