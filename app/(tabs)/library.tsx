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
  useWindowDimensions,
} from "react-native";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import { useColorScheme } from "nativewind";
import { useAudioPlayer } from "expo-audio";
import { Databases, Query } from "react-native-appwrite";

import {
  GestureHandlerRootView,
  FlingGestureHandler,
  Directions,
  State,
  Swipeable,
} from "react-native-gesture-handler";

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

const { width } = Dimensions.get("window");
const databases = new Databases(client);

// --- SKELETONS ---

const SongSkeleton = ({ isDark }: { isDark: boolean }) => {
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  const containerBg = isDark ? "bg-[#18181B]" : "bg-[#FFFFFF]";

  return (
    <View
      className={`flex-row items-center p-3 mb-3 rounded-2xl animate-pulse`}
      style={{
        backgroundColor: containerBg,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0 : 0.05,
        shadowRadius: 3,
        elevation: isDark ? 0 : 1,
      }}
    >
      <View className={`w-14 h-14 rounded-xl mr-4 ${elementBg}`} />
      <View className="flex-1 mr-2 space-y-2">
        <View className={`w-32 h-4 rounded ${elementBg}`} />
        <View className={`w-24 h-3 rounded ${elementBg}`} />
        <View className={`w-20 h-2.5 rounded ${elementBg} mt-1`} />
      </View>
      <View className={`w-9 h-9 rounded-full ${elementBg}`} />
    </View>
  );
};

const PlaylistSkeleton = ({ isDark }: { isDark: boolean }) => {
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";

  return (
    <View
      className="flex-1 m-1.5 mb-4 animate-pulse"
      style={{ maxWidth: "48%" }}
    >
      <View className={`w-full aspect-square rounded-xl mb-2 ${elementBg}`} />
      <View className={`w-24 h-4 rounded ml-1 mb-1 ${elementBg}`} />
      <View className={`w-12 h-3 rounded ml-1 ${elementBg}`} />
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
    <View className="flex-row items-end gap-[2px] h-3 ml-2 opacity-80">
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          className={`w-[3px] rounded-full`}
          style={{
            height: isPlaying ? Math.random() * 10 + 4 : 4,
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

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#09090B";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const emptyIconColor = isDark ? "#27272A" : "#E4E4E7";
  const accentColor = "#5E17EB";
  const dangerColor = "#EF4444";
  const successColor = "#10B981";

  const { user } = useGlobalContext();

  const [activeTab, setActiveTab] = useState<"songs" | "playlists">("songs");
  const [musicCollection, setMusicCollection] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- SKELETON DATA ---
  const skeletonData = useMemo(() => Array.from({ length: 8 }), []);

  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [importPlatform, setImportPlatform] = useState<
    "mood" | "spotify" | "apple"
  >("mood");

  const [isAddToPlaylistModalVisible, setAddToPlaylistModalVisible] =
    useState(false);
  const [songToAdd, setSongToAdd] = useState<any>(null);

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
      // 1. Obtener POSTS guardados
      const savedPostsPromise = getSavedPosts(user.$id);

      // 2. Obtener HISTORIAS guardadas (Query manual)
      const savedStoriesPromise = databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.storiesCollectionId,
        [Query.equal("savedBy", user.$id)]
      );

      const [savedPosts, savedStoriesRes] = await Promise.all([
        savedPostsPromise,
        savedStoriesPromise,
      ]);

      // Procesar Posts
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
              id: post.$id, // ID único para key
              trackId: song.id || song.spotifyId,
              originalPostCreator: creatorName,
              postId: post.$id,
              isStory: false,
              createdAt: post.$createdAt, // IMPORTANTE: Fecha para ordenar
            };
          } catch (e) {
            return null;
          }
        })
        .filter((item) => item !== null);

      // Procesar Historias
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
              createdAt: story.$createdAt, // IMPORTANTE: Fecha para ordenar
            };
          } catch (e) {
            return null;
          }
        })
        .filter((item) => item !== null);

      // 3. COMBINAR Y ORDENAR POR FECHA DESCENDENTE (Lo más nuevo arriba)
      const combinedMusic = [...musicFromPosts, ...musicFromStories].sort(
        (a, b) => {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
      );

      setMusicCollection(combinedMusic);

      // Playlists
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
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleFlingRight = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.ACTIVE) router.push("/explore" as any);
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

      if (!finalUrl && item.preview) {
        finalUrl = item.preview;
      }

      if (!finalUrl) {
        Alert.alert("Lo sentimos", "Audio no disponible.");
        setLoadingAudioId(null);
        return;
      }

      setPlayingId(songIdKey);
      setCurrentSongUrl(finalUrl);
    } catch (error) {
      console.log(error);
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
          style={{ width: "100%", aspectRatio: 1, borderRadius: 12 }}
          className="bg-zinc-800"
        />
      );
    }
    return (
      <View
        style={{
          width: "100%",
          aspectRatio: 1,
          borderRadius: 12,
          backgroundColor: isDark ? "#27272A" : "#E4E4E7",
          borderWidth: 1,
          borderColor: borderColor,
        }}
        className="items-center justify-center relative overflow-hidden"
      >
        <View className="absolute inset-0 bg-[#5E17EB] opacity-10" />
        <Ionicons name="musical-notes" size={size} color={accentColor} />
      </View>
    );
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || !user) return;
    Keyboard.dismiss();

    try {
      if (importPlatform === "spotify" || importPlatform === "apple") {
        Alert.alert(
          "Sincronización",
          "Crearemos una playlist local en Mood sincronizada con tu plataforma."
        );
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

  const openAddToPlaylistModal = (song: any) => {
    if (playlists.length === 0) {
      Alert.alert("Sin Playlists", "Primero crea una playlist.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Crear", onPress: () => setCreateModalVisible(true) },
      ]);
      return;
    }
    setSongToAdd(song);
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

  const handleUnsave = async (item: any) => {
    if (!user) return;
    const previousList = [...musicCollection];
    setMusicCollection((prev) => prev.filter((i) => i.id !== item.id));

    try {
      if (item.isStory) {
        // Lógica especial para historias: Update manual del array savedBy
        const storyDoc = item.originalDoc;
        const currentSavedBy = storyDoc.savedBy || [];
        const newSavedBy = currentSavedBy.filter(
          (id: string) => id !== user.$id
        );

        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.storiesCollectionId,
          item.postId, // ID de la historia
          {
            savedBy: newSavedBy,
          }
        );
      } else {
        // Lógica estándar para posts
        await toggleSavePost(item.postId, user.$id);
      }
    } catch (error) {
      setMusicCollection(previousList);
      Alert.alert("Error", "Fallo al eliminar.");
      console.log(error);
    }
  };

  const openExternalMusic = async (song: any) => {
    const cleanTitle = song.title ? song.title.split("(")[0].trim() : "";
    const query = `${cleanTitle} ${song.artist}`;
    const platform = user?.preferredPlatform || "spotify";
    let appUrl = "",
      webUrl = "";

    if (platform === "apple") {
      appUrl = `music://music.apple.com/us/search?term=${encodeURIComponent(
        query
      )}`;
      webUrl = `https://music.apple.com/us/search?term=${encodeURIComponent(
        query
      )}`;
    } else {
      appUrl = `spotify:search:${encodeURIComponent(query)}`;
      webUrl = `https://open.spotify.com/search/${encodeURIComponent(query)}`;
    }

    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) await Linking.openURL(appUrl);
      else await Linking.openURL(webUrl);
    } catch (err) {
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(
        query + " " + platform
      )}`;
      await Linking.openURL(googleUrl);
    }
  };

  const renderRightActions = (progress: any, dragX: any, item: any) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });
    return (
      <View
        className="justify-center items-end pr-6 mb-2 rounded-2xl"
        style={{ backgroundColor: dangerColor, width: "100%" }}
      >
        <Animated.View style={{ transform: [{ scale }], marginRight: 10 }}>
          <Ionicons name="trash-outline" size={24} color="white" />
        </Animated.View>
      </View>
    );
  };

  const renderLeftActions = (progress: any, dragX: any, item: any) => {
    const scale = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 1],
      extrapolate: "clamp",
    });
    return (
      <View
        className="justify-center items-start pl-6 mb-2 rounded-2xl"
        style={{ backgroundColor: successColor, width: "100%" }}
      >
        <Animated.View style={{ transform: [{ scale }], marginLeft: 10 }}>
          <Ionicons name="add-circle-outline" size={24} color="white" />
        </Animated.View>
      </View>
    );
  };

  const renderCollectionItem = ({ item }: { item: any }) => {
    const platform = user?.preferredPlatform || "spotify";
    const iconName = platform === "apple" ? "apple" : "spotify";
    const brandColor = platform === "apple" ? "#FA243C" : "#1DB954";

    const isThisPlaying = playingId === item.id;
    const isLoadingThis = loadingAudioId === item.id;
    const showPause = isThisPlaying && isPlaying;

    return (
      <Swipeable
        renderRightActions={(progress, dragX) =>
          renderRightActions(progress, dragX, item)
        }
        renderLeftActions={(progress, dragX) =>
          renderLeftActions(progress, dragX, item)
        }
        overshootRight={false}
        overshootLeft={false}
        onSwipeableRightOpen={() => handleUnsave(item)}
        onSwipeableLeftOpen={() => openAddToPlaylistModal(item)}
        containerStyle={{ marginBottom: 12 }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            // Solo navegar si es POST. Si es historia, solo reproducir (o mostrar alerta?)
            if (!item.isStory) {
              router.push(`/post/${item.postId}` as any);
            } else {
              handlePlaySong(item);
            }
          }}
          className="flex-row items-center p-3 rounded-2xl"
          style={{
            backgroundColor: isDark ? "#18181B" : "#FFFFFF",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0 : 0.05,
            shadowRadius: 3,
            elevation: isDark ? 0 : 1,
          }}
        >
          <View className="relative mr-4 shadow-sm">
            <Image
              source={{ uri: item.cover }}
              className="w-14 h-14 rounded-xl bg-zinc-800"
              resizeMode="cover"
            />
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handlePlaySong(item);
              }}
              className="absolute inset-0 items-center justify-center bg-black/10 rounded-xl"
            >
              {isLoadingThis ? (
                <View className="bg-black/50 w-8 h-8 rounded-full items-center justify-center backdrop-blur-sm">
                  <ActivityIndicator size="small" color="white" />
                </View>
              ) : (
                (showPause || isThisPlaying) && (
                  <View className="bg-black/50 w-8 h-8 rounded-full items-center justify-center backdrop-blur-sm">
                    <Ionicons
                      name={showPause ? "pause" : "stats-chart"}
                      size={14}
                      color="white"
                    />
                  </View>
                )
              )}
              {!isLoadingThis && !isThisPlaying && (
                <View className="bg-black/20 w-8 h-8 rounded-full items-center justify-center">
                  <Ionicons
                    name="play"
                    size={14}
                    color="white"
                    style={{ marginLeft: 2 }}
                  />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-1 justify-center mr-2">
            <Text
              className="font-bold text-[16px] mb-1"
              numberOfLines={1}
              style={{ color: isThisPlaying ? accentColor : textColor }}
            >
              {item.title}
            </Text>

            <View className="flex-row items-center">
              <Text
                className="text-[13px] font-medium"
                numberOfLines={1}
                style={{ color: subTextColor, maxWidth: "85%" }}
              >
                {item.artist}
              </Text>
              {isThisPlaying && isPlaying && (
                <AudioVisualizer isPlaying={true} color={accentColor} />
              )}
            </View>

            <View className="flex-row items-center mt-1">
              {item.isStory ? (
                <Ionicons
                  name="time-outline"
                  size={10}
                  color={accentColor}
                  style={{ opacity: 0.8 }}
                />
              ) : (
                <Ionicons
                  name="arrow-redo"
                  size={10}
                  color={subTextColor}
                  style={{ opacity: 0.6 }}
                />
              )}

              <Text
                className="text-[10px] ml-1 font-medium opacity-60"
                style={{ color: item.isStory ? accentColor : subTextColor }}
                numberOfLines={1}
              >
                {item.isStory
                  ? "Guardado de Historia"
                  : `Agregado por ${item.originalPostCreator}`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              openExternalMusic(item);
            }}
            className="w-9 h-9 rounded-full items-center justify-center shadow-sm"
            style={{ backgroundColor: brandColor }}
          >
            <FontAwesome5 name={iconName} size={16} color="white" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderPlaylistItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => router.push(`/playlist/${item.$id}` as any)}
      className="flex-1 m-1.5 mb-4"
      style={{ maxWidth: "48%" }}
    >
      <View className="relative">
        {renderPlaylistImage(item.cover, 40)}

        {item.platform !== "mood" && (
          <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-full flex-row items-center backdrop-blur-sm">
            <Ionicons
              name={
                (item.platform === "spotify"
                  ? "spotify"
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
        className="font-bold text-base mt-2 ml-1"
        numberOfLines={1}
        style={{ color: textColor }}
      >
        {item.name}
      </Text>
      <Text className="text-xs ml-1" style={{ color: subTextColor }}>
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
          className={`flex-1 p-3 rounded-xl border-2 items-center ${
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
          <Text className="font-bold mt-1" style={{ color: textColor }}>
            {t("library.local")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setImportPlatform(myPlatform)}
          className={`flex-1 p-3 rounded-xl border-2 items-center`}
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
          <Text className="font-bold mt-1" style={{ color: textColor }}>
            {label} Sync
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FlingGestureHandler
        direction={Directions.RIGHT}
        onHandlerStateChange={handleFlingRight}
      >
        <View style={{ flex: 1, backgroundColor: bgColor }}>
          <SafeAreaView
            className="flex-1"
            edges={["top"]}
            style={{ backgroundColor: bgColor }}
          >
            <StatusBar style={isDark ? "light" : "dark"} />

            <View className="px-6 pt-6 pb-2">
              <Text
                className="text-4xl font-bold mb-4"
                style={{ color: textColor }}
              >
                {t("library.title")}
              </Text>
              <View className="flex-row items-center mb-2">
                <TouchableOpacity
                  onPress={() => setActiveTab("songs")}
                  className={`mr-6 ${
                    activeTab === "songs" ? "opacity-100" : "opacity-40"
                  }`}
                >
                  <Text
                    className="text-xl font-bold"
                    style={{ color: textColor }}
                  >
                    {t("library.tabs.songs")}
                  </Text>
                  {activeTab === "songs" && (
                    <View className="h-1 bg-[#5E17EB] rounded-full mt-1 w-1/2" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab("playlists")}
                  className={`mr-6 ${
                    activeTab === "playlists" ? "opacity-100" : "opacity-40"
                  }`}
                >
                  <Text
                    className="text-xl font-bold"
                    style={{ color: textColor }}
                  >
                    {t("library.tabs.playlists")}
                  </Text>
                  {activeTab === "playlists" && (
                    <View className="h-1 bg-[#5E17EB] rounded-full mt-1 w-1/2" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {activeTab === "songs" ? (
              <FlatList
                data={isLoading ? skeletonData : musicCollection}
                keyExtractor={(item, index) => item?.id || `skeleton-${index}`}
                renderItem={({ item }) => {
                  if (isLoading) return <SongSkeleton isDark={isDark} />;
                  return renderCollectionItem({ item });
                }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 20,
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
              <View className="flex-1 px-4">
                <TouchableOpacity
                  onPress={() => setCreateModalVisible(true)}
                  className="flex-row items-center mb-4 p-4 rounded-2xl border border-dashed"
                  style={{
                    borderColor: borderColor,
                    backgroundColor: "rgba(94, 23, 235, 0.05)",
                  }}
                >
                  <View className="w-12 h-12 rounded-full bg-[#5E17EB]/10 items-center justify-center mr-3">
                    <Ionicons name="add" size={24} color={accentColor} />
                  </View>
                  <View>
                    <Text
                      className="font-bold text-base"
                      style={{ color: textColor }}
                    >
                      {t("library.createBtn")}
                    </Text>
                    <Text className="text-xs" style={{ color: subTextColor }}>
                      {t("library.syncText")}{" "}
                      {user?.preferredPlatform === "apple"
                        ? "Apple Music"
                        : "Spotify"}{" "}
                      {t("library.orLocal")}
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
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 100 }}
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

            {/* MODALS */}
            <Modal
              animationType="slide"
              transparent
              visible={isCreateModalVisible}
              onRequestClose={() => setCreateModalVisible(false)}
            >
              <TouchableWithoutFeedback
                onPress={() => setCreateModalVisible(false)}
              >
                <View className="flex-1 justify-end bg-black/60">
                  <TouchableWithoutFeedback>
                    <KeyboardAvoidingView
                      behavior={Platform.OS === "ios" ? "padding" : "height"}
                      className="w-full"
                    >
                      <View
                        className="rounded-t-3xl p-6"
                        style={{
                          backgroundColor: isDark ? "#18181B" : "white",
                        }}
                      >
                        <View className="w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full self-center mb-6" />
                        <Text
                          className="text-xl font-bold mb-4"
                          style={{ color: textColor }}
                        >
                          {t("library.newPlaylist")}
                        </Text>

                        <TextInput
                          className="p-4 rounded-xl mb-6 text-lg border"
                          style={{
                            backgroundColor: bgColor,
                            color: textColor,
                            borderColor,
                          }}
                          placeholder={t("library.createBtn") + "..."}
                          placeholderTextColor={subTextColor}
                          value={newPlaylistName}
                          onChangeText={setNewPlaylistName}
                          autoFocus
                        />

                        <Text
                          className="text-sm font-bold mb-3"
                          style={{ color: subTextColor }}
                        >
                          {t("library.platformLabel")}
                        </Text>
                        {renderPlatformOptions()}

                        <View className="flex-row gap-3">
                          <TouchableOpacity
                            onPress={() => setCreateModalVisible(false)}
                            className="flex-1 p-4 rounded-full items-center"
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
                            className="flex-1 bg-[#5E17EB] p-4 rounded-full items-center"
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
                <View className="flex-1 justify-end bg-black/60">
                  <TouchableWithoutFeedback>
                    <View
                      className="rounded-t-3xl p-6 h-[50%]"
                      style={{ backgroundColor: isDark ? "#18181B" : "white" }}
                    >
                      <View className="w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full self-center mb-6" />
                      <Text
                        className="text-xl font-bold mb-4 text-center"
                        style={{ color: textColor }}
                      >
                        {t("library.addTo")}
                      </Text>
                      <FlatList
                        data={playlists}
                        keyExtractor={(item) => item.$id}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            onPress={() => confirmAddToPlaylist(item.$id)}
                            className="flex-row items-center p-4 border-b"
                            style={{ borderColor: borderColor }}
                          >
                            <View
                              style={{ width: 48, height: 48, marginRight: 16 }}
                            >
                              {renderPlaylistImage(item.cover, 24)}
                            </View>
                            <View className="flex-1">
                              <Text
                                className="font-bold text-lg"
                                style={{ color: textColor }}
                              >
                                {item.name}
                              </Text>
                              <Text
                                className="text-xs"
                                style={{ color: subTextColor }}
                              >
                                {item.songs.length} {t("library.songsCount")}
                              </Text>
                            </View>
                            <Ionicons
                              name="add-circle-outline"
                              size={24}
                              color={accentColor}
                            />
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
      </FlingGestureHandler>
    </GestureHandlerRootView>
  );
};

const EmptyState = ({ t, textColor, subTextColor, emptyIconColor }: any) => (
  <View className="items-center justify-center py-20">
    <View className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 items-center justify-center mb-6">
      <Ionicons name="musical-notes" size={40} color={emptyIconColor} />
    </View>
    <Text
      className="mt-2 font-bold text-xl text-center"
      style={{ color: textColor }}
    >
      {t("library.empty.title")}
    </Text>
    <Text
      className="text-center mt-2 px-10 leading-6"
      style={{ color: subTextColor }}
    >
      {t("library.emptySubtitle")}
    </Text>
  </View>
);

export default Library;
