import { parseSongData as parseSongDataCore } from "@/lib/postUtils";

export type ParsedSongData = {
  id?: string;
  spotifyId?: string;
  title?: string;
  artist?: string;
  artistName?: string;
  cover?: string;
  preview?: string;
  mood?: string;
  text?: string;
  [key: string]: any;
} | null;

// Single source of truth (lib/postUtils.ts)
export const parseSongData = (songDataString: string): ParsedSongData => {
  return (parseSongDataCore(songDataString) as any) ?? null;
};
