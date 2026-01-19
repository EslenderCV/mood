export const getDeezerTrackUrl = async (trackId: string | number) => {
  if (!trackId) return null;
  try {
    const response = await fetch(`https://api.deezer.com/track/${trackId}`);
    const data = await response.json();

    if (data && data.preview) {
      return data.preview;
    }
    return null;
  } catch (error) {
    console.error("Error fetching Deezer url", error);
    return null;
  }
};

export const searchSongs = async (query: string) => {
  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=15`
    );
    const data = await response.json();

    if (!data.data) return [];

    return data.data.map((track: any) => ({
      id: track.id.toString(),
      title: track.title,
      artist: track.artist.name,
      cover: track.album.cover_medium || track.album.cover_big,
      preview: track.preview,
      duration: track.duration,
      album: {
        cover_xl: track.album.cover_xl,
        cover_medium: track.album.cover_medium,
      },
    }));
  } catch (e) {
    console.log("Error searching songs:", e);
    return [];
  }
};