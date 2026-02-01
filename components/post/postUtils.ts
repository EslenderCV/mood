export type ParsedSongData = {
  id?: string;
  spotifyId?: string;
  title?: string;
  artist?: string;
  cover?: string;
  preview?: string;
  mood?: string;
  [key: string]: any;
} | null;

export const parseSongData = (songDataString: string): ParsedSongData => {
  try {
    if (!songDataString) return null;
    const song = JSON.parse(songDataString);

    // Normalizamos covers de Deezer a una resolución mejor
    if (song.cover && typeof song.cover === "string" && song.cover.includes("100x100bb")) {
      song.cover = song.cover.replace("100x100bb", "600x600bb");
    }

    return song;
  } catch {
    return null;
  }
};
