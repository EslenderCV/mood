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

// --- Deezer charts helpers (generally much better "recognizable" results than raw keyword search) ---

function mapDeezerTrack(track: any) {
  return {
    id: track?.id?.toString?.() ?? String(track?.id ?? ""),
    title: track?.title ?? "",
    artist: track?.artist?.name ?? "",
    cover: track?.album?.cover_medium || track?.album?.cover_big || track?.album?.cover_xl,
    preview: track?.preview,
    duration: track?.duration,
    rank: track?.rank,
    album: {
      cover_xl: track?.album?.cover_xl,
      cover_medium: track?.album?.cover_medium,
    },
  };
}

export const getDeezerChartTracks = async (limit: number = 30, index: number = 0) => {
  try {
    const response = await fetch(
      `https://api.deezer.com/chart/0/tracks?limit=${limit}&index=${index}`
    );
    const data = await response.json();
    if (!data?.data) return [];
    return data.data.map(mapDeezerTrack);
  } catch (e) {
    console.log("Error fetching Deezer chart tracks:", e);
    return [];
  }
};

export const getDeezerChartPlaylists = async (limit: number = 50, index: number = 0) => {
  try {
    const response = await fetch(
      `https://api.deezer.com/chart/0/playlists?limit=${limit}&index=${index}`
    );
    const data = await response.json();
    if (!data?.data) return [];
    return data.data as Array<{ id: number; title: string }>;
  } catch (e) {
    console.log("Error fetching Deezer chart playlists:", e);
    return [];
  }
};

export const getDeezerPlaylistTracks = async (playlistId: number | string, limit: number = 30, index: number = 0) => {
  try {
    const response = await fetch(
      `https://api.deezer.com/playlist/${playlistId}/tracks?limit=${limit}&index=${index}`
    );
    const data = await response.json();
    if (!data?.data) return [];
    return data.data.map(mapDeezerTrack);
  } catch (e) {
    console.log("Error fetching Deezer playlist tracks:", e);
    return [];
  }
};