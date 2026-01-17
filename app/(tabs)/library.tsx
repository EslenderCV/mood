import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  Linking,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
} from "react-native";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import { useColorScheme } from "nativewind";
import { useAudioPlayer } from "expo-audio";
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
import { useLanguage } from "@/context/LanguageContext";

// --- CONFIGURACIÓN DE ESPACIADO ---
const { width } = Dimensions.get("window");
const COLUMN_GAP = 12;
const PADDING_HORIZONTAL = 20;
const CARD_WIDTH = (width - PADDING_HORIZONTAL * 2 - COLUMN_GAP) / 2;

const databases = new Databases(client);

// --- SKELETONS ---
const SongSkeleton = ({ isDark }: { isDark: boolean }) => {
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-200";
  return (
    <View className="mb-6 animate-pulse" style={{ width: CARD_WIDTH }}>
      <View
        className={`w-full aspect-square rounded-[24px] mb-3 ${elementBg}`}
      />
      <View className={`w-3/4 h-4 rounded-md mb-2 ${elementBg}`} />
      <View className={`w-1/2 h-3 rounded-md ${elementBg}`} />
    </View>
  );
};

const PlaylistSkeleton = ({ isDark }: { isDark: boolean }) => {
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-200";
  return (
    <View className="mb-6 animate-pulse" style={{ width: CARD_WIDTH }}>
      <View
        className={`w-full aspect-square rounded-[24px] mb-3 ${elementBg}`}
      />
      <View className={`w-2/3 h-4 rounded-md mb-2 ml-1 ${elementBg}`} />
      <View className={`w-1/3 h-3 rounded-md ml-1 ${elementBg}`} />
    </View>
  );
};

// --- VISUALIZADOR DE AUDIO ---
const AudioVisualizer = ({
  isPlaying,
  color,
}: {
  isPlaying: boolean;
  color: string;
}) => {
  return (
    <View className="flex-row items-end gap-[3px] h-3 ml-2 opacity-90">
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          className={`w-[3px] rounded-full`}
          style={{
            height: isPlaying ? Math.random() * 12 + 4 : 4,
            backgroundColor: isPlaying ? "#5E17EB" : color,
          }}
        />
      ))}
    </View>
  );
};

const Library = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();

  // Paleta de colores
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const modalBgColor = isDark ? "#1C1C1E" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#8E8E93";
  const borderColor = isDark ? "#2C2C2E" : "#E5E5EA";
  const emptyIconColor = isDark ? "#2C2C2E" : "#E5E5EA";
  const accentColor = "#5E17EB";
  const dangerColor = "#FF453A";

  const { user } = useGlobalContext();

  const [activeTab, setActiveTab] = useState<"songs" | "playlists">("songs");
  const [musicCollection, setMusicCollection] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const skeletonData = useMemo(() => Array.from({ length: 6 }), []);

  // Modales
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

  // Audio Player
  const [currentSongUrl, setCurrentSongUrl] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const player = useAudioPlayer(currentSongUrl);

  useEffect(() => {
    if (currentSongUrl && player) {
      if (!player.playing) {
        player.play();
        setIsPlaying(true);
      }
      const statusListener = (status: any) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          player.seekTo(0);
          player.pause();
        }
      };
      if (player.addListener) {
        player.addListener("playbackStatusUpdate", statusListener);
      } else if ((player as any).setOnPlaybackStatusUpdate) {
        (player as any).setOnPlaybackStatusUpdate(statusListener);
      }
      return () => {
        if (player.removeListener) {
          player.removeListener("playbackStatusUpdate", statusListener);
        }
      };
    }
  }, [currentSongUrl, player]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const savedPostsPromise = getSavedPosts(user.$id);
      const savedStoriesPromise = databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.storiesCollectionId,
        [Query.equal("savedBy", user.$id)],
      );

      const [savedPosts, savedStoriesRes] = await Promise.all([
        savedPostsPromise,
        savedStoriesPromise,
      ]);

      const musicFromPosts = savedPosts
        .map((post) => {
          try {
            if (!post.songData) return null;
            const song = JSON.parse(post.songData);
            if (song.cover && song.cover.includes("100x100bb")) {
              song.cover = song.cover.replace("100x100bb", "600x600bb");
            }
            let creatorName = "anon";
            if (post.postedBy)
              creatorName =
                post.postedBy.username || post.postedBy.name || "Usuario";
            return {
              ...song,
              id: post.$id,
              trackId: song.id || song.spotifyId,
              originalPostCreator: creatorName,
              postId: post.$id,
              isStory: false,
              createdAt: post.$createdAt,
            };
          } catch (e) {
            return null;
          }
        })
        .filter((item) => item !== null);

      const musicFromStories = savedStoriesRes.documents
        .map((story) => {
          try {
            if (!story.songData) return null;
            const song = JSON.parse(story.songData);
            if (song.cover && song.cover.includes("100x100bb")) {
              song.cover = song.cover.replace("100x100bb", "600x600bb");
            }
            let creatorName = "Mood Story";
            if (story.user && typeof story.user === "object") {
              creatorName = story.user.username || story.user.name || "Usuario";
            }
            return {
              ...song,
              id: story.$id,
              trackId: song.id || song.spotifyId,
              originalPostCreator: creatorName,
              postId: story.$id,
              isStory: true,
              originalDoc: story,
              createdAt: story.$createdAt,
            };
          } catch (e) {
            return null;
          }
        })
        .filter((item) => item !== null);

      const combinedMusic = [...musicFromPosts, ...musicFromStories].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      setMusicCollection(combinedMusic);
      const userPlaylists = await getUserPlaylists(user.$id);
      setPlaylists(userPlaylists);
    } catch (error) {
      console.log("Error cargando librería:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [user]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handlePlaySong = async (item: any) => {
    const songIdKey = item.id;
    if (playingId === songIdKey) {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
      return;
    }
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    }
    try {
      setLoadingAudioId(songIdKey);
      const trackId = item.trackId || item.spotifyId;
      let finalUrl = null;
      if (trackId) {
        try {
          finalUrl = await getDeezerTrackUrl(String(trackId));
        } catch (e) {
          console.log("API Fetch error", e);
        }
      }
      if (!finalUrl && item.preview) finalUrl = item.preview;
      if (!finalUrl) {
        Alert.alert("Lo sentimos", "Audio no disponible.");
        setLoadingAudioId(null);
        return;
      }
      setPlayingId(songIdKey);
      setCurrentSongUrl(finalUrl);
    } catch (error) {
      Alert.alert("Error", "Error al reproducir.");
    } finally {
      setLoadingAudioId(null);
    }
  };

  const renderPlaylistImage = (coverUrl: string | null, size: number = 24) => {
    const isDefault = !coverUrl || coverUrl.includes("avatars/initials");
    if (!isDefault && coverUrl) {
      return (
        <Image
          source={{ uri: coverUrl }}
          style={{ width: "100%", aspectRatio: 1, borderRadius: 24 }}
          className="bg-zinc-800"
        />
      );
    }
    return (
      <View
        style={{
          width: "100%",
          aspectRatio: 1,
          borderRadius: 24,
          backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7",
          borderWidth: 1,
          borderColor: borderColor,
        }}
        className="items-center justify-center relative overflow-hidden"
      >
        <Ionicons name="musical-notes" size={size} color={subTextColor} />
      </View>
    );
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || !user) return;
    Keyboard.dismiss();
    try {
      if (importPlatform === "spotify" || importPlatform === "apple") {
        Alert.alert("Info", "Sincronización activada.");
      }
      await createPlaylist(newPlaylistName, user.$id, importPlatform);
      setNewPlaylistName("");
      setCreateModalVisible(false);
      fetchData();
    } catch (error) {
      setCreateModalVisible(false);
      Alert.alert("Error", "No se pudo crear la playlist.");
    }
  };

  const openAddToPlaylistModal = () => {
    setOptionsModalVisible(false);
    if (!selectedSong) return;
    if (playlists.length === 0) {
      Alert.alert("Sin Playlists", "Primero crea una playlist.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Crear", onPress: () => setCreateModalVisible(true) },
      ]);
      return;
    }
    setSongToAdd(selectedSong);
    setAddToPlaylistModalVisible(true);
  };

  const confirmAddToPlaylist = async (playlistId: string) => {
    if (!songToAdd) return;
    try {
      await addSongToPlaylist(playlistId, songToAdd);
      setAddToPlaylistModalVisible(false);
      setSongToAdd(null);
      Alert.alert("¡Listo!", "Canción agregada.");
    } catch (error) {
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
        const storyDoc = item.originalDoc;
        const currentSavedBy = storyDoc.savedBy || [];
        const newSavedBy = currentSavedBy.filter(
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
    } catch (error) {
      setMusicCollection(previousList);
      Alert.alert("Error", "Fallo al eliminar.");
    }
  };

  const openSongOptions = (song: any) => {
    setSelectedSong(song);
    setOptionsModalVisible(true);
  };

  // --- TARJETA DE CANCIÓN ---
  const renderCollectionItem = ({ item }: { item: any }) => {
    const isThisPlaying = playingId === item.id;
    const isLoadingThis = loadingAudioId === item.id;
    const showPause = isThisPlaying && isPlaying;

    return (
      <View style={{ width: CARD_WIDTH, marginBottom: 24 }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onLongPress={() => openSongOptions(item)}
          onPress={() => {
            if (!item.isStory) {
              router.push(`/post/${item.postId}` as any);
            } else {
              handlePlaySong(item);
            }
          }}
          className="flex-col"
        >
          <View className="relative mb-3.5 shadow-lg shadow-black/20">
            <Image
              source={{ uri: item.cover }}
              style={{ width: "100%", aspectRatio: 1 }}
              className="rounded-[24px] bg-zinc-800"
              resizeMode="cover"
            />
            <View className="absolute inset-0 rounded-[24px] bg-black/5" />

            {/* BOTÓN PLAY CORREGIDO: SIEMPRE MORADO */}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handlePlaySong(item);
              }}
              className="absolute bottom-3 left-3 items-center justify-center shadow-lg shadow-black/30 z-10"
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: accentColor, // SIEMPRE MORADO
              }}
            >
              {isLoadingThis ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons
                  name={showPause ? "pause" : "play"}
                  size={18}
                  color="white" // ICONO SIEMPRE BLANCO
                  style={{ marginLeft: showPause ? 0 : 2 }}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                openSongOptions(item);
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md items-center justify-center"
            >
              <Ionicons name="ellipsis-horizontal" size={16} color="white" />
            </TouchableOpacity>
          </View>

          <View className="pl-1 pr-1">
            <View className="flex-row justify-between items-start">
              <Text
                className="font-bold text-[15px] leading-5 flex-1 mr-2"
                numberOfLines={1}
                style={{ color: isThisPlaying ? accentColor : textColor }}
              >
                {item.title}
              </Text>
            </View>

            <View className="flex-row items-center mt-0.5">
              <Text
                className="text-[13px] font-medium"
                numberOfLines={1}
                style={{ color: subTextColor, maxWidth: "90%" }}
              >
                {item.artist}
              </Text>
              {isThisPlaying && isPlaying && (
                <AudioVisualizer isPlaying={true} color={accentColor} />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPlaylistItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => router.push(`/playlist/${item.$id}` as any)}
      className="mb-6"
      style={{ width: CARD_WIDTH }}
    >
      <View className="relative mb-3">
        {renderPlaylistImage(item.cover, 50)}
        {item.platform !== "mood" && (
          <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-full backdrop-blur-md">
            <Ionicons
              name={
                (item.platform === "spotify"
                  ? "logo-rss"
                  : item.platform === "apple"
                    ? "logo-apple"
                    : "musical-notes") as any
              }
              size={10}
              color={
                item.platform === "spotify"
                  ? "#1DB954"
                  : item.platform === "apple"
                    ? "#FA243C"
                    : "white"
              }
            />
          </View>
        )}
      </View>
      <Text
        className="font-bold text-[15px] ml-1 mb-0.5"
        numberOfLines={1}
        style={{ color: textColor }}
      >
        {item.name}
      </Text>
      <Text className="text-xs ml-1 opacity-70" style={{ color: subTextColor }}>
        {item.songs?.length || 0} {t("library.songsCount")}
      </Text>
    </TouchableOpacity>
  );

  const renderPlatformOptions = () => {
    const myPlatform =
      user?.preferredPlatform === "apple" ? "apple" : "spotify";
    const brandColor = myPlatform === "apple" ? "#FA243C" : "#1DB954";
    const iconName = myPlatform === "apple" ? "logo-apple" : "spotify";
    const label = myPlatform === "apple" ? "Apple Music" : "Spotify";

    return (
      <View className="flex-row gap-3 mb-8">
        <TouchableOpacity
          onPress={() => setImportPlatform("mood")}
          className={`flex-1 p-3 rounded-2xl border items-center ${
            importPlatform === "mood"
              ? "border-[#5E17EB] bg-[#5E17EB]/10"
              : "border-transparent bg-zinc-100 dark:bg-zinc-800"
          }`}
        >
          <Ionicons
            name="musical-notes"
            size={24}
            color={importPlatform === "mood" ? "#5E17EB" : subTextColor}
          />
          <Text className="font-bold mt-2" style={{ color: textColor }}>
            {t("library.local")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setImportPlatform(myPlatform)}
          className={`flex-1 p-3 rounded-2xl border items-center`}
          style={{
            backgroundColor:
              importPlatform === myPlatform
                ? isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.05)"
                : isDark
                  ? "#27272A"
                  : "#F4F4F5",
            borderColor:
              importPlatform === myPlatform ? brandColor : "transparent",
          }}
        >
          <Ionicons
            name={iconName as any}
            size={24}
            color={importPlatform === myPlatform ? brandColor : subTextColor}
          />
          <Text className="font-bold mt-2" style={{ color: textColor }}>
            {label} Sync
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <SafeAreaView
        className="flex-1"
        edges={["top"]}
        style={{ backgroundColor: bgColor }}
      >
        <StatusBar style={isDark ? "light" : "dark"} />

        <View className="px-6 pt-6 pb-2">
          <Text
            className="text-[36px] font-extrabold tracking-tight"
            style={{ color: textColor }}
          >
            {t("library.title")}
          </Text>
        </View>

        <View className="px-6 py-4 flex-row gap-3 mb-2">
          <TouchableOpacity
            onPress={() => setActiveTab("songs")}
            className="px-7 py-3 rounded-full"
            style={{
              backgroundColor:
                activeTab === "songs"
                  ? accentColor
                  : isDark
                    ? "#1C1C1E"
                    : "#F2F2F7",
            }}
          >
            <Text
              className={`font-bold text-[15px] ${activeTab === "songs" ? "text-white" : isDark ? "text-zinc-400" : "text-zinc-600"}`}
            >
              {t("library.tabs.songs")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("playlists")}
            className="px-7 py-3 rounded-full"
            style={{
              backgroundColor:
                activeTab === "playlists"
                  ? accentColor
                  : isDark
                    ? "#1C1C1E"
                    : "#F2F2F7",
            }}
          >
            <Text
              className={`font-bold text-[15px] ${activeTab === "playlists" ? "text-white" : isDark ? "text-zinc-400" : "text-zinc-600"}`}
            >
              {t("library.tabs.playlists")}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "songs" ? (
          <FlatList
            data={isLoading ? skeletonData : musicCollection}
            keyExtractor={(item, index) => item?.id || `skeleton-${index}`}
            renderItem={({ item }) => {
              if (isLoading) return <SongSkeleton isDark={isDark} />;
              return renderCollectionItem({ item });
            }}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: "space-between" }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: PADDING_HORIZONTAL,
              paddingTop: 10,
              paddingBottom: 20,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={accentColor}
              />
            }
            ListEmptyComponent={
              !isLoading ? (
                <EmptyState
                  t={t}
                  textColor={textColor}
                  subTextColor={subTextColor}
                  emptyIconColor={emptyIconColor}
                />
              ) : null
            }
          />
        ) : (
          <View className="flex-1 px-5">
            <TouchableOpacity
              onPress={() => setCreateModalVisible(true)}
              className="flex-row items-center mb-8 p-5 rounded-[24px] border border-dashed"
              style={{
                borderColor: borderColor,
                backgroundColor: "rgba(94, 23, 235, 0.03)",
              }}
            >
              <View className="w-14 h-14 rounded-full bg-[#5E17EB]/10 items-center justify-center mr-4">
                <Ionicons name="add" size={28} color={accentColor} />
              </View>
              <View className="flex-1">
                <Text
                  className="font-bold text-lg"
                  style={{ color: textColor }}
                >
                  {t("library.createBtn")}
                </Text>
                <Text
                  className="text-xs mt-1 leading-4"
                  style={{ color: subTextColor }}
                >
                  {t("library.syncText")}
                </Text>
              </View>
            </TouchableOpacity>
            <FlatList
              data={isLoading ? skeletonData : playlists}
              keyExtractor={(item, index) =>
                item?.$id || `skeleton-playlist-${index}`
              }
              renderItem={({ item }) => {
                if (isLoading) return <PlaylistSkeleton isDark={isDark} />;
                return renderPlaylistItem({ item });
              }}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: "space-between" }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 120, paddingTop: 5 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={accentColor}
                />
              }
              ListEmptyComponent={
                !isLoading ? (
                  <Text
                    className="text-center mt-10"
                    style={{ color: subTextColor }}
                  >
                    {t("library.empty.title")}
                  </Text>
                ) : null
              }
            />
          </View>
        )}

        {/* MODAL DE OPCIONES DE CANCIÓN */}
        <Modal
          animationType="slide"
          transparent
          visible={isOptionsModalVisible}
          onRequestClose={() => setOptionsModalVisible(false)}
        >
          <TouchableWithoutFeedback
            onPress={() => setOptionsModalVisible(false)}
          >
            <View className="flex-1 justify-end bg-black/60">
              <TouchableWithoutFeedback>
                <View
                  className="rounded-t-[32px] p-6 pb-10"
                  style={{ backgroundColor: modalBgColor }}
                >
                  <View className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded-full self-center mb-6 opacity-50" />

                  {selectedSong && (
                    <View className="flex-row items-center mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                      <Image
                        source={{ uri: selectedSong.cover }}
                        className="w-16 h-16 rounded-2xl bg-zinc-800 mr-4"
                      />
                      <View className="flex-1">
                        <Text
                          className="font-bold text-lg"
                          style={{ color: textColor }}
                          numberOfLines={1}
                        >
                          {selectedSong.title}
                        </Text>
                        <Text
                          className="text-base"
                          style={{ color: subTextColor }}
                          numberOfLines={1}
                        >
                          {selectedSong.artist}
                        </Text>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={openAddToPlaylistModal}
                    className="flex-row items-center p-4 rounded-2xl mb-2 active:bg-zinc-100 dark:active:bg-zinc-800"
                  >
                    <View className="w-10 h-10 rounded-full bg-blue-500/10 items-center justify-center mr-4">
                      <Ionicons name="add-circle" size={24} color="#3B82F6" />
                    </View>
                    <Text
                      className="font-semibold text-lg"
                      style={{ color: textColor }}
                    >
                      {t("library.addTo")} Playlist
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleUnsave}
                    className="flex-row items-center p-4 rounded-2xl active:bg-zinc-100 dark:active:bg-zinc-800"
                  >
                    <View className="w-10 h-10 rounded-full bg-red-500/10 items-center justify-center mr-4">
                      <Ionicons name="trash" size={24} color={dangerColor} />
                    </View>
                    <Text
                      className="font-semibold text-lg"
                      style={{ color: dangerColor }}
                    >
                      {t("library.removeFromLibrary") || "Eliminar de Librería"}
                    </Text>
                  </TouchableOpacity>

                  {/* BOTÓN CANCELAR CORREGIDO */}
                  <TouchableOpacity
                    onPress={() => setOptionsModalVisible(false)}
                    className="mt-6 p-4 rounded-2xl border items-center justify-center"
                    style={{
                      borderColor: borderColor,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "transparent",
                    }}
                  >
                    <Text
                      className="font-bold text-lg"
                      style={{ color: textColor }}
                    >
                      {t("library.cancel")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* MODALES EXISTENTES */}
        <Modal
          animationType="fade"
          transparent
          visible={isCreateModalVisible}
          onRequestClose={() => setCreateModalVisible(false)}
        >
          <TouchableWithoutFeedback
            onPress={() => setCreateModalVisible(false)}
          >
            <View className="flex-1 justify-end bg-black/70">
              <TouchableWithoutFeedback>
                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : "height"}
                  className="w-full"
                >
                  <View
                    className="rounded-t-[32px] p-8 pb-10"
                    style={{ backgroundColor: modalBgColor }}
                  >
                    <View className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full self-center mb-8 opacity-50" />
                    <Text
                      className="text-2xl font-bold mb-6"
                      style={{ color: textColor }}
                    >
                      {t("library.newPlaylist")}
                    </Text>
                    <TextInput
                      className="p-5 rounded-2xl mb-8 text-xl border-2"
                      style={{
                        backgroundColor: bgColor,
                        color: textColor,
                        borderColor: borderColor,
                      }}
                      placeholder={t("library.createBtn") + "..."}
                      placeholderTextColor={subTextColor}
                      value={newPlaylistName}
                      onChangeText={setNewPlaylistName}
                      autoFocus
                    />
                    <Text
                      className="text-sm font-bold mb-4 uppercase tracking-wider opacity-70"
                      style={{ color: subTextColor }}
                    >
                      {t("library.platformLabel")}
                    </Text>
                    {renderPlatformOptions()}
                    <View className="flex-row gap-4 mt-2">
                      <TouchableOpacity
                        onPress={() => setCreateModalVisible(false)}
                        className="flex-1 p-4 rounded-full items-center bg-zinc-100 dark:bg-zinc-800"
                      >
                        <Text
                          className="font-bold text-lg"
                          style={{ color: subTextColor }}
                        >
                          {t("library.cancel")}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleCreatePlaylist}
                        className="flex-1 bg-[#5E17EB] p-4 rounded-full items-center shadow-lg shadow-purple-500/30"
                      >
                        <Text className="text-white font-bold text-lg">
                          {t("library.create")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </KeyboardAvoidingView>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal
          animationType="slide"
          transparent
          visible={isAddToPlaylistModalVisible}
          onRequestClose={() => setAddToPlaylistModalVisible(false)}
        >
          <TouchableWithoutFeedback
            onPress={() => setAddToPlaylistModalVisible(false)}
          >
            <View className="flex-1 justify-end bg-black/70">
              <TouchableWithoutFeedback>
                <View
                  className="rounded-t-[32px] p-6 h-[55%]"
                  style={{ backgroundColor: modalBgColor }}
                >
                  <View className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full self-center mb-6 opacity-50" />
                  <Text
                    className="text-xl font-bold mb-6 text-center"
                    style={{ color: textColor }}
                  >
                    {t("library.addTo")}
                  </Text>
                  <FlatList
                    data={playlists}
                    keyExtractor={(item) => item.$id}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => confirmAddToPlaylist(item.$id)}
                        className="flex-row items-center p-4 border-b border-zinc-100 dark:border-zinc-800/50 mb-1"
                      >
                        <View
                          style={{ width: 56, height: 56, marginRight: 16 }}
                        >
                          {renderPlaylistImage(item.cover, 28)}
                        </View>
                        <View className="flex-1 justify-center">
                          <Text
                            className="font-bold text-lg mb-1"
                            style={{ color: textColor }}
                          >
                            {item.name}
                          </Text>
                          <Text
                            className="text-xs font-medium opacity-60"
                            style={{ color: subTextColor }}
                          >
                            {item.songs.length} {t("library.songsCount")}
                          </Text>
                        </View>
                        <View className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center">
                          <Ionicons name="add" size={24} color={accentColor} />
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const EmptyState = ({ t, textColor, subTextColor, emptyIconColor }: any) => (
  <View className="items-center justify-center py-24 opacity-80">
    <View className="w-24 h-24 rounded-full bg-zinc-50 dark:bg-zinc-900/50 items-center justify-center mb-6 border border-zinc-100 dark:border-zinc-800">
      <Ionicons name="musical-notes" size={48} color={emptyIconColor} />
    </View>
    <Text
      className="mt-2 font-bold text-2xl text-center"
      style={{ color: textColor }}
    >
      {t("library.empty.title")}
    </Text>
    <Text
      className="text-center mt-3 px-12 leading-6 font-medium"
      style={{ color: subTextColor }}
    >
      {t("library.emptySubtitle")}
    </Text>
  </View>
);

export default Library;
