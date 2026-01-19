import { Query, ID } from "react-native-appwrite";
import { databases, appwriteConfig } from "./config";

export async function createPlaylist(
  name: string,
  userId: string,
  platform: string = "mood"
) {
  try {
    const coverUrl = `${
      appwriteConfig.endpoint
    }/avatars/initials?name=${encodeURIComponent(name)}&project=${
      appwriteConfig.projectId
    }`;

    const newPlaylist = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.playlistsCollectionId,
      ID.unique(),
      {
        name: name,
        ownerId: userId,
        songs: [],
        cover: coverUrl,
        platform: platform,
        externalId: null,
      }
    );
    return newPlaylist;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getUserPlaylists(userId: string) {
  try {
    const playlists = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.playlistsCollectionId,
      [Query.equal("ownerId", userId), Query.orderDesc("$createdAt")]
    );
    return playlists.documents;
  } catch (error) {
    console.log("Error getting playlists:", error);
    return [];
  }
}

export async function addSongToPlaylist(playlistId: string, songData: any) {
  try {
    const playlist = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.playlistsCollectionId,
      playlistId
    );

    const songString = JSON.stringify(songData);

    if (playlist.songs.includes(songString)) return playlist;

    const updatedSongs = [...playlist.songs, songString];

    const updated = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.playlistsCollectionId,
      playlistId,
      { songs: updatedSongs }
    );

    return updated;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function removeSongFromPlaylist(
  playlistId: string,
  songStringToRemove: string
) {
  try {
    const playlist = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.playlistsCollectionId,
      playlistId
    );

    const updatedSongs = playlist.songs.filter(
      (s: string) => s !== songStringToRemove
    );

    const updated = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.playlistsCollectionId,
      playlistId,
      { songs: updatedSongs }
    );

    return updated;
  } catch (error: any) {
    throw new Error("No se pudo eliminar la canción");
  }
}

export async function deletePlaylist(playlistId: string) {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.playlistsCollectionId,
      playlistId
    );
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function renamePlaylist(playlistId: string, newName: string) {
  try {
    const updated = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.playlistsCollectionId,
      playlistId,
      { name: newName }
    );
    return updated;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getPlaylistById(playlistId: string) {
  try {
    const playlist = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.playlistsCollectionId,
      playlistId
    );
    return playlist;
  } catch (error) {
    console.log("Error getPlaylistById", error);
    return null;
  }
}