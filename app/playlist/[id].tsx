import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Animated,
  ActivityIndicator,
} from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import {
  databases,
  appwriteConfig,
  renamePlaylist,
  removeSongFromPlaylist,
  getSavedPosts,
  addSongToPlaylist,
  getDeezerTrackUrl,
} from "@/lib/appwrite";
import { useColorScheme } from "nativewind";
import { useAudioPlayer } from "expo-audio";
import ShareModal from "@/components/ShareModal";
import {
  Swipeable,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useGlobalContext } from "@/context/GlobalProvider";

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

export default function PlaylistDetail() {
  const { id } = useLocalSearchParams();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useGlobalContext();

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const cardBg = isDark ? "#18181B" : "#F4F4F5";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const accentColor = "#5E17EB";

  const [playlist, setPlaylist] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [isShareVisible, setShareVisible] = useState(false);

  const [isAddSongModalVisible, setAddSongModalVisible] = useState(false);
  const [savedSongs, setSavedSongs] = useState<any[]>([]);

  // --- AUDIO STATES ---
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

  const fetchPlaylist = useCallback(async () => {
    try {
      const doc = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.playlistsCollectionId,
        id as string
      );
      setPlaylist(doc);
      setNewName(doc.name);

      const parsedSongs = doc.songs
        .map((s: string) => {
          try {
            return JSON.parse(s);
          } catch {
            return null;
          }
        })
        .filter((s: any) => s !== null);

      setSongs(parsedSongs);
    } catch {
      Alert.alert("Error", "No se pudo cargar la playlist");
      router.back();
    }
  }, [id]);

  useEffect(() => {
    fetchPlaylist();
  }, [fetchPlaylist]);

  const fetchSavedSongs = async () => {
    if (!user) return;
    try {
      const posts = await getSavedPosts(user.$id);
      const parsed = posts
        .map((post) => {
          try {
            const s = JSON.parse(post.songData);
            return { ...s, postId: post.$id };
          } catch {
            return null;
          }
        })
        .filter((s) => s !== null);
      setSavedSongs(parsed);
    } catch {
      // Silent error
    }
  };

  const handlePlaySong = async (song: any) => {
    const songIdKey = song.id || song.title;

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

      const rawId = song.trackId || song.spotifyId || song.id;
      const trackId = rawId ? String(rawId) : null;

      let finalUrl = null;

      if (trackId) {
        try {
          finalUrl = await getDeezerTrackUrl(trackId);
        } catch {}
      }

      if (!finalUrl && song.preview) {
        finalUrl = song.preview;
      }

      if (!finalUrl) {
        setLoadingAudioId(null);
        Alert.alert(
          "No disponible",
          "No se encontró un audio válido para esta canción."
        );
        return;
      }

      setPlayingId(songIdKey);
      setCurrentSongUrl(finalUrl);
    } catch {
      Alert.alert("Error", "Ocurrió un error inesperado al reproducir.");
    } finally {
      setLoadingAudioId(null);
    }
  };

  const handleAddSongFromModal = async (song: any) => {
    try {
      await addSongToPlaylist(playlist.$id, song);
      setSongs((prev) => [...prev, song]);
      setAddSongModalVisible(false);
      Alert.alert("Añadida", `${song.title} agregada a la playlist.`);
    } catch {
      Alert.alert("Error", "No se pudo agregar.");
    }
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      await renamePlaylist(id as string, newName);
      setPlaylist({ ...playlist, name: newName });
      setEditModalVisible(false);
    } catch {
      Alert.alert("Error", "No se pudo renombrar.");
    }
  };

  const handleRemoveSong = async (song: any) => {
    const previousSongs = [...songs];
    setSongs((prev) => prev.filter((s) => s.title !== song.title));

    try {
      const songString = JSON.stringify(song);
      await removeSongFromPlaylist(id as string, songString);
    } catch {
      setSongs(previousSongs);
      Alert.alert("Error", "No se pudo eliminar la canción.");
    }
  };

  const handleSync = () => {
    const targetPlatform =
      user?.preferredPlatform === "apple" ? "Apple Music" : "Spotify";

    Alert.alert(
      "Sincronizar Playlist",
      `¿Quieres exportar "${playlist.name}" a ${targetPlatform}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sincronizar",
          onPress: () =>
            Alert.alert(
              "Sincronizando...",
              "Estamos procesando tu solicitud en segundo plano."
            ),
        },
      ]
    );
  };

  const renderCover = () => {
    const isDefaultCover =
      !playlist.cover || playlist.cover.includes("avatars/initials");

    if (!isDefaultCover) {
      return (
        <Image
          source={{ uri: playlist.cover }}
          className="w-56 h-56 rounded-2xl shadow-2xl mb-6 bg-zinc-800"
          style={{
            shadowColor: accentColor,
            shadowOpacity: 0.3,
            shadowRadius: 20,
          }}
        />
      );
    }

    return (
      <View
        className="w-56 h-56 rounded-3xl mb-6 items-center justify-center shadow-xl overflow-hidden"
        style={{
          backgroundColor: isDark ? "#18181B" : "#F4F4F5",
          borderWidth: 1,
          borderColor: borderColor,
        }}
      >
        <View className="absolute inset-0 bg-[#5E17EB] opacity-5" />
        <Ionicons name="musical-notes" size={80} color={accentColor} />
      </View>
    );
  };

  const renderRightActions = (progress: any, dragX: any, item: any) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });
    return (
      <View className="justify-center items-end pr-6 mb-2 rounded-2xl bg-red-500 w-full mt-0">
        <Animated.View style={{ transform: [{ scale }], marginRight: 10 }}>
          <Ionicons name="trash-outline" size={24} color="white" />
        </Animated.View>
      </View>
    );
  };

  const renderSong = ({ item, index }: { item: any; index: number }) => {
    const songKey = item.id || item.title;
    const isThisPlaying = playingId === songKey;
    const isLoadingThis = loadingAudioId === songKey;
    const showPause = isThisPlaying && isPlaying;

    return (
      <Swipeable
        renderRightActions={(p, d) => renderRightActions(p, d, item)}
        onSwipeableRightOpen={() => handleRemoveSong(item)}
        containerStyle={{ overflow: "visible" }}
      >
        <TouchableOpacity
          onPress={() =>
            item.postId ? router.push(`/post/${item.postId}` as any) : null
          }
          activeOpacity={0.7}
          className="flex-row items-center p-3 mb-2 rounded-2xl border"
          style={{ backgroundColor: cardBg, borderColor: borderColor }}
        >
          <Text
            className="font-bold w-6 mr-2 text-center text-sm"
            style={{ color: isThisPlaying ? accentColor : subTextColor }}
          >
            {index + 1}
          </Text>

          <Image
            source={{ uri: item.cover }}
            className="w-12 h-12 rounded-lg bg-zinc-800 mr-3"
          />

          <View className="flex-1 justify-center">
            <Text
              className="font-bold text-[15px] mb-0.5"
              numberOfLines={1}
              style={{ color: isThisPlaying ? accentColor : textColor }}
            >
              {item.title}
            </Text>
            <View className="flex-row items-center">
              <Text
                className="text-xs"
                numberOfLines={1}
                style={{ color: subTextColor }}
              >
                {item.artist}
              </Text>
              {isThisPlaying && isPlaying && (
                <AudioVisualizer isPlaying={true} color={accentColor} />
              )}
            </View>
          </View>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handlePlaySong(item);
            }}
            // BOTÓN DE PLAY CORREGIDO (Color Acento)
            className="w-10 h-10 rounded-full items-center justify-center shadow-sm"
            style={{ backgroundColor: accentColor }}
          >
            {isLoadingThis ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons
                name={showPause ? "pause" : "play"}
                size={20}
                color="white"
                style={{ marginLeft: showPause ? 0 : 2 }}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (!playlist)
    return <View className="flex-1" style={{ backgroundColor: bgColor }} />;

  const platformIcon =
    user?.preferredPlatform === "apple" ? "apple" : "spotify";
  const platformColor =
    user?.preferredPlatform === "apple" ? "#FA243C" : "#1DB954";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: bgColor }}>
        {/* HEADER LIMPIO (Botones transparentes) */}
        <View className="px-4 py-2 flex-row items-center justify-between z-10">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-2 rounded-full active:bg-zinc-100 dark:active:bg-zinc-800"
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>

          <View className="flex-row gap-1 items-center">
            <TouchableOpacity
              onPress={handleSync}
              className="p-2 rounded-full active:bg-zinc-100 dark:active:bg-zinc-800"
            >
              <FontAwesome5
                name={platformIcon}
                size={20}
                color={platformColor}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setEditModalVisible(true)}
              className="p-2 rounded-full active:bg-zinc-100 dark:active:bg-zinc-800"
            >
              <Ionicons name="create-outline" size={24} color={textColor} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShareVisible(true)}
              className="p-2 -mr-2 rounded-full active:bg-zinc-100 dark:active:bg-zinc-800"
            >
              <Ionicons
                name="share-social-outline"
                size={24}
                color={textColor}
              />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={songs}
          renderItem={renderSong}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View className="items-center mt-4 mb-8">
              {renderCover()}

              <Text
                className="text-2xl font-bold text-center mb-1 px-4"
                style={{ color: textColor }}
              >
                {playlist.name}
              </Text>

              <View className="flex-row items-center mb-6 opacity-70">
                <Ionicons
                  name={playlist.platform === "mood" ? "list" : "cloud-done"}
                  size={14}
                  color={subTextColor}
                  style={{ marginRight: 6 }}
                />
                <Text
                  className="text-sm font-medium"
                  style={{ color: subTextColor }}
                >
                  {playlist.platform === "mood"
                    ? "Local Playlist"
                    : "Sincronizada"}{" "}
                  • {songs.length} tracks
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  fetchSavedSongs();
                  setAddSongModalVisible(true);
                }}
                className="flex-row items-center justify-center py-3.5 px-8 rounded-full shadow-lg w-full max-w-[260px]"
                style={{ backgroundColor: accentColor }}
              >
                <Ionicons name="add" size={24} color="white" />
                <Text className="font-bold ml-2 text-base text-white">
                  Agregar Canciones
                </Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center mt-10 opacity-50">
              <Ionicons
                name="musical-notes-outline"
                size={60}
                color={subTextColor}
              />
              <Text
                className="text-center mt-4 font-medium"
                style={{ color: subTextColor }}
              >
                Esta playlist está vacía.
              </Text>
            </View>
          }
        />

        {/* MODAL RENOMBRAR */}
        <Modal
          animationType="fade"
          transparent
          visible={isEditModalVisible}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/70 px-6">
            <View
              className="w-full p-6 rounded-3xl"
              style={{ backgroundColor: isDark ? "#18181B" : "white" }}
            >
              <Text
                className="font-bold text-xl mb-4"
                style={{ color: textColor }}
              >
                Renombrar Playlist
              </Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                className="p-4 rounded-xl mb-6 border"
                style={{
                  backgroundColor: bgColor,
                  color: textColor,
                  borderColor: borderColor,
                }}
                placeholder="Nuevo nombre..."
                placeholderTextColor={subTextColor}
                autoFocus
              />
              <View className="flex-row justify-end gap-6">
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Text
                    className="font-bold text-lg"
                    style={{ color: subTextColor }}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRename}>
                  <Text
                    className="font-bold text-lg"
                    style={{ color: accentColor }}
                  >
                    Guardar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODAL AGREGAR CANCIONES */}
        <Modal
          animationType="slide"
          transparent
          visible={isAddSongModalVisible}
          onRequestClose={() => setAddSongModalVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/60">
            <View
              className="h-[75%] w-full rounded-t-[32px] overflow-hidden"
              style={{ backgroundColor: isDark ? "#18181B" : "white" }}
            >
              <View
                className="items-center pt-4 pb-2 border-b"
                style={{ borderColor }}
              >
                <View className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mb-4" />
                <Text
                  className="text-xl font-bold mb-2"
                  style={{ color: textColor }}
                >
                  Tus Canciones Guardadas
                </Text>
              </View>

              <FlatList
                data={savedSongs}
                keyExtractor={(item) => item.postId || Math.random().toString()}
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleAddSongFromModal(item)}
                    className="flex-row items-center p-3 border-b mb-1 rounded-xl active:bg-zinc-100 dark:active:bg-zinc-800"
                    style={{ borderColor: "transparent" }}
                  >
                    <Image
                      source={{ uri: item.cover }}
                      className="w-12 h-12 rounded-lg bg-zinc-800 mr-3"
                    />
                    <View className="flex-1">
                      <Text
                        className="font-bold text-[15px]"
                        numberOfLines={1}
                        style={{ color: textColor }}
                      >
                        {item.title}
                      </Text>
                      <Text
                        className="text-xs mt-0.5"
                        style={{ color: subTextColor }}
                      >
                        {item.artist}
                      </Text>
                    </View>
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center border"
                      style={{ borderColor: accentColor }}
                    >
                      <Ionicons name="add" size={20} color={accentColor} />
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View className="items-center mt-20">
                    <Ionicons
                      name="musical-notes"
                      size={40}
                      color={subTextColor}
                      style={{ opacity: 0.5 }}
                    />
                    <Text
                      style={{
                        color: subTextColor,
                        textAlign: "center",
                        marginTop: 10,
                      }}
                    >
                      No tienes canciones guardadas.
                    </Text>
                  </View>
                }
              />

              <TouchableOpacity
                onPress={() => setAddSongModalVisible(false)}
                className="absolute top-4 right-4 p-2 bg-zinc-200 dark:bg-zinc-800 rounded-full"
              >
                <Ionicons name="close" size={20} color={textColor} />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <ShareModal
          isVisible={isShareVisible}
          onClose={() => setShareVisible(false)}
          postId={`playlist:${playlist.$id}`}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
