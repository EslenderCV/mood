import { useMemo, useRef, useState } from "react";
import { Alert, Keyboard } from "react-native";
import { Databases, Query } from "react-native-appwrite";
import {
  getSavedPosts,
  toggleSavePost,
  getUserPlaylists,
  createPlaylist,
  addSongToPlaylist,
  getDeezerTrackUrl,
  client,
  appwriteConfig,
} from "@/lib/appwrite";
import { useGlobalContext } from "@/context/GlobalProvider";
import { useAudioContext } from "@/context/AudioContext";

const databases = new Databases(client);

export const useLibraryLogic = () => {
  const { user } = useGlobalContext();

  // Tabs & Data
  const [activeTab, setActiveTab] = useState<"songs" | "playlists">("songs");
  const [musicCollection, setMusicCollection] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals & Forms
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [importPlatform, setImportPlatform] = useState<
    "mood" | "spotify" | "apple"
  >("mood");
  const [isAddToPlaylistModalVisible, setAddToPlaylistModalVisible] =
    useState(false);
  const [songToAdd, setSongToAdd] = useState<any>(null);
  const [isOptionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedSong, setSelectedSong] = useState<any>(null);

  // ✅ Audio (fuente única): AudioContext + GlobalAudioPlayerBar
  const {
    currentPlayingId,
    isPlaying: ctxIsPlaying,
    isLoading: ctxIsLoading,
    isBuffering: ctxIsBuffering,
    playTrack,
    pauseTrack,
    resumeTrack,
  } = useAudioContext();

  // 🔥 loadingAudioId local SOLO para el paso "resolver URL" (antes de playTrack)
  const [loadingAudioIdLocal, setLoadingAudioIdLocal] = useState<string | null>(
    null,
  );
  const playReqRef = useRef(0);

  const parseMusicItem = (doc: any, isStory: boolean) => {
    try {
      if (!doc.songData) return null;
      const song = JSON.parse(doc.songData);

      // upgrade cover (iTunes 100x100 => 600x600)
      if (song.cover?.includes("100x100bb")) {
        song.cover = song.cover.replace("100x100bb", "600x600bb");
      }

      return {
        ...song,
        id: doc.$id,
        trackId: song.id || song.spotifyId,
        postId: doc.$id,
        isStory,
        originalDoc: isStory ? doc : null,
        createdAt: doc.$createdAt,
      };
    } catch {
      return null;
    }
  };

  // --- DATA FETCHING ---
  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const [savedPosts, savedStoriesRes] = await Promise.all([
        getSavedPosts(user.$id),
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.storiesCollectionId,
          [Query.equal("savedBy", user.$id)],
        ),
      ]);

      const musicFromPosts = (savedPosts || [])
        .map((post: any) => parseMusicItem(post, false))
        .filter(Boolean);

      const musicFromStories = (savedStoriesRes?.documents || [])
        .map((story: any) => parseMusicItem(story, true))
        .filter(Boolean);

      setMusicCollection(
        [...musicFromPosts, ...musicFromStories].sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );

      const pls = await getUserPlaylists(user.$id);
      setPlaylists(pls || []);
    } catch (error) {
      console.log("Error cargando librería:", error);
      Alert.alert("Error", "No se pudo cargar tu biblioteca.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // --- AUDIO (NO OVERLAP) ---
  const handlePlaySong = async (item: any) => {
    // 0) Toggle rápido si es el mismo track
    if (currentPlayingId === item?.id) {
      if (ctxIsPlaying) await pauseTrack();
      else await resumeTrack();
      return;
    }

    const myReq = ++playReqRef.current;
    setLoadingAudioIdLocal(item?.id ?? null);

    try {
      // 1) Resolver URL final (Deezer o preview directo)
      let finalUrl: string | null = null;

      if (item?.trackId) {
        finalUrl = await getDeezerTrackUrl(String(item.trackId));
      } else {
        finalUrl = item?.preview || null;
      }

      // Si el usuario tocó otra canción en medio, ignoramos el resultado
      if (myReq !== playReqRef.current) return;

      if (!finalUrl) {
        Alert.alert("Lo sentimos", "Audio no disponible.");
        return;
      }

      // 2) Reproducir vía AudioContext (setea metadata => aparece GlobalAudioPlayerBar)
      await playTrack(item.id, finalUrl, {
        title: item?.title,
        artist: item?.artist,
        cover: item?.cover,
      });
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error al reproducir.");
    } finally {
      if (myReq === playReqRef.current) setLoadingAudioIdLocal(null);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || !user) return;
    Keyboard.dismiss();
    try {
      await createPlaylist(newPlaylistName, user.$id, importPlatform);
      setNewPlaylistName("");
      setCreateModalVisible(false);
      await fetchData();
    } catch {
      Alert.alert("Error", "No se pudo crear la playlist.");
    }
  };

  const confirmAddToPlaylist = async (playlist: any) => {
    if (!songToAdd || !playlist) return;
    try {
      await await addSongToPlaylist(playlist.$id, songToAdd);
      setAddToPlaylistModalVisible(false);
      setSongToAdd(null);
      Alert.alert("Listo", "Canción agregada.");
    } catch {
      Alert.alert("Error", "No se pudo agregar la canción.");
    }
  };

  const handleUnsave = async (item: any) => {
    if (!user) return;

    const previousList = musicCollection;
    setMusicCollection((prev) => prev.filter((p) => p.postId !== item.postId));

    try {
      if (item.isStory) {
        const newSavedBy = (item.originalDoc.savedBy || []).filter(
          (id: string) => id !== user.$id,
        );
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.storiesCollectionId,
          item.postId,
          { savedBy: newSavedBy },
        );
      } else {
        await toggleSavePost(item.postId, user.$id);
      }
    } catch {
      setMusicCollection(previousList);
      Alert.alert("Error", "Fallo al eliminar.");
    }
  };

  // Estados expuestos para UI (compat con Library actual)
  const playingId = currentPlayingId;
  const isPlaying = ctxIsPlaying;

  // Spinner: primero "resolviendo URL", luego "cargando/buffer"
  const loadingAudioId = useMemo(() => {
    if (loadingAudioIdLocal) return loadingAudioIdLocal;
    if ((ctxIsLoading || ctxIsBuffering) && currentPlayingId)
      return currentPlayingId;
    return null;
  }, [loadingAudioIdLocal, ctxIsLoading, ctxIsBuffering, currentPlayingId]);

  return {
    user,
    activeTab,
    setActiveTab,
    musicCollection,
    playlists,
    isLoading,
    refreshing,
    onRefresh,
    fetchData,
    // Player
    handlePlaySong,
    playingId,
    loadingAudioId,
    isPlaying,
    // Modals
    isCreateModalVisible,
    setCreateModalVisible,
    newPlaylistName,
    setNewPlaylistName,
    importPlatform,
    setImportPlatform,
    handleCreatePlaylist,
    isAddToPlaylistModalVisible,
    setAddToPlaylistModalVisible,
    confirmAddToPlaylist,
    isOptionsModalVisible,
    setOptionsModalVisible,
    selectedSong,
    setSelectedSong,
    // Actions
    handleUnsave,
    setSongToAdd,
  };
};
