import { useState, useEffect } from "react";
import { Alert, Keyboard } from "react-native";
// 🔥 CAMBIO: Usamos expo-av en lugar de expo-audio
import { Audio } from "expo-av";
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

  // Audio Player State (expo-av)
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // --- AUDIO LOGIC: Limpieza al desmontar ---
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

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

      const musicFromPosts = savedPosts
        .map((post) => parseMusicItem(post, false))
        .filter(Boolean);
      const musicFromStories = savedStoriesRes.documents
        .map((story) => parseMusicItem(story, true))
        .filter(Boolean);

      setMusicCollection(
        [...musicFromPosts, ...musicFromStories].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
      setPlaylists(await getUserPlaylists(user.$id));
    } catch (error) {
      console.log("Error cargando librería:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const parseMusicItem = (doc: any, isStory: boolean) => {
    try {
      if (!doc.songData) return null;
      const song = JSON.parse(doc.songData);
      if (song.cover?.includes("100x100bb"))
        song.cover = song.cover.replace("100x100bb", "600x600bb");
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // --- HANDLERS ---
  const handlePlaySong = async (item: any) => {
    // 1. Lógica de Pausa/Play si es la misma canción
    if (playingId === item.id) {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      }
      return;
    }

    // 2. Detener canción anterior si existe
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      }

      setLoadingAudioId(item.id);

      // Obtener URL
      let finalUrl = item.trackId
        ? await getDeezerTrackUrl(String(item.trackId))
        : item.preview;
      if (!finalUrl) {
        Alert.alert("Lo sentimos", "Audio no disponible.");
        setLoadingAudioId(null);
        return;
      }

      // 🔥 CONFIGURACIÓN CRÍTICA: PERMITIR AUDIO EN SILENCIO (IPHONE SWITCH)
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Cargar y Reproducir
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: finalUrl },
        { shouldPlay: true },
      );

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPlayingId(null);
            // newSound.unloadAsync(); // Opcional: descargar para ahorrar memoria
          }
        }
      });

      setSound(newSound);
      setPlayingId(item.id);
      setIsPlaying(true);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Error al reproducir.");
    } finally {
      setLoadingAudioId(null);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || !user) return;
    Keyboard.dismiss();
    try {
      await createPlaylist(newPlaylistName, user.$id, importPlatform);
      setNewPlaylistName("");
      setCreateModalVisible(false);
      fetchData();
    } catch {
      setCreateModalVisible(false);
      Alert.alert("Error", "No se pudo crear.");
    }
  };

  const confirmAddToPlaylist = async (playlistId: string) => {
    if (!songToAdd) return;
    try {
      await addSongToPlaylist(playlistId, songToAdd);
      setAddToPlaylistModalVisible(false);
      setSongToAdd(null);
      Alert.alert("¡Listo!", "Canción agregada.");
    } catch {
      Alert.alert("Error", "No se pudo agregar.");
    }
  };

  const handleUnsave = async () => {
    setOptionsModalVisible(false);
    if (!selectedSong || !user) return;
    const item = selectedSong;
    const previousList = [...musicCollection];
    setMusicCollection((prev) => prev.filter((i) => i.id !== item.id));

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
