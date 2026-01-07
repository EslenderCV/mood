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
import React, { useState, useCallback, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import { useColorScheme } from "nativewind";
import { useAudioPlayer } from "expo-audio";

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
  getDeezerTrackUrl, // IMPORTANTE: Para el audio
} from "@/lib/appwrite";
import { useGlobalContext } from "@/context/GlobalProvider";
import { useLanguage } from "@/context/LanguageContext";

const { width } = Dimensions.get("window");

// --- COMPONENTE VISUALIZADOR DE AUDIO ---
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
  const cardBg = isDark ? "#18181B" : "#F4F4F5";
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

  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [importPlatform, setImportPlatform] = useState<
    "mood" | "spotify" | "apple"
  >("mood");

  const [isAddToPlaylistModalVisible, setAddToPlaylistModalVisible] =
    useState(false);
  const [songToAdd, setSongToAdd] = useState<any>(null);

  // --- AUDIO STATES ---
  const [currentSongUrl, setCurrentSongUrl] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const player = useAudioPlayer(currentSongUrl);

  // Auto-play
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
      const savedDocs = await getSavedPosts(user.$id);
      const musicOnly = savedDocs
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
              id: post.$id, // ID del post guardado
              trackId: song.id || song.spotifyId, // ID REAL de la canción
              originalPostCreator: creatorName,
              postId: post.$id,
            };
          } catch (e) {
            return null;
          }
        })
        .filter((item) => item !== null);
      setMusicCollection(musicOnly);

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
    if (nativeEvent.state === State.ACTIVE) router.push("/explore");
  };

  // --- LÓGICA DE REPRODUCCIÓN (FETCH + FALLBACK) ---
  const handlePlaySong = async (item: any) => {
    const songIdKey = item.id; // ID único en la lista (Post ID)

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
      await toggleSavePost(item.postId, user.$id);
    } catch (error) {
      setMusicCollection(previousList);
      Alert.alert("Error", "Fallo al eliminar.");
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
        className="justify-center items-end pr-6 mb-4 rounded-3xl"
        style={{ backgroundColor: dangerColor, width: "100%", marginTop: 0 }}
      >
        <Animated.View style={{ transform: [{ scale }], marginRight: 10 }}>
          <Ionicons name="trash-outline" size={28} color="white" />
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
        className="justify-center items-start pl-6 mb-4 rounded-3xl"
        style={{ backgroundColor: successColor, width: "100%", marginTop: 0 }}
      >
        <Animated.View style={{ transform: [{ scale }], marginLeft: 10 }}>
          <Ionicons name="add-circle-outline" size={28} color="white" />
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
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push(`/post/${item.postId}` as any)}
          className="mb-3 rounded-2xl p-3 border flex-row items-center relative overflow-hidden"
          style={{ backgroundColor: cardBg, borderColor: borderColor }}
        >
          <View className="relative mr-4">
            <Image
              source={{ uri: item.cover }}
              className="w-16 h-16 rounded-xl bg-zinc-800"
              resizeMode="cover"
            />
            {/* Botón Play sobre la carátula */}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handlePlaySong(item);
              }}
              className="absolute inset-0 items-center justify-center bg-black/20 rounded-xl"
            >
              <View className="bg-black/40 w-8 h-8 rounded-full items-center justify-center backdrop-blur-sm">
                {isLoadingThis ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons
                    name={showPause ? "pause" : "play"}
                    size={16}
                    color="white"
                    style={showPause ? {} : { marginLeft: 2 }}
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>

          <View className="flex-1 justify-center py-1 pr-2">
            <Text
              className="font-bold text-[15px] leading-5 mb-0.5"
              numberOfLines={1}
              style={{ color: isThisPlaying ? accentColor : textColor }}
            >
              {item.title}
            </Text>

            <View className="flex-row items-center mb-1">
              <Text
                className="text-xs font-medium"
                numberOfLines={1}
                style={{ color: subTextColor }}
              >
                {item.artist}
              </Text>
              {isThisPlaying && isPlaying && (
                <AudioVisualizer isPlaying={true} color={accentColor} />
              )}
            </View>

            <View className="flex-row items-center">
              <Ionicons name="flash" size={10} color="#EAB308" />
              <Text
                className="text-yellow-600 dark:text-yellow-500 text-[10px] ml-1 font-bold opacity-80"
                numberOfLines={1}
              >
                via {item.originalPostCreator}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              openExternalMusic(item);
            }}
            className="w-9 h-9 rounded-full items-center justify-center bg-zinc-200 dark:bg-zinc-800"
          >
            <FontAwesome5 name={iconName} size={16} color={brandColor} />
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
                  ? "logo-spotify"
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
    const iconName = myPlatform === "apple" ? "logo-apple" : "logo-spotify";
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
                data={musicCollection}
                keyExtractor={(item) => item.id || Math.random().toString()}
                renderItem={renderCollectionItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 24,
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
                  ) : (
                    <ActivityIndicator
                      color={accentColor}
                      size="large"
                      className="mt-20"
                    />
                  )
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
                  data={playlists}
                  keyExtractor={(item) => item.$id}
                  renderItem={renderPlaylistItem}
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
                    ) : (
                      <ActivityIndicator color={accentColor} size="large" />
                    )
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
