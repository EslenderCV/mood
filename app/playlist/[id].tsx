import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  Animated,
} from "react-native";
import React, { useEffect, useState } from "react";
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
} from "@/lib/appwrite";
import { useColorScheme } from "nativewind";
import { useAudioPlayer } from "expo-audio";
import ShareModal from "@/components/ShareModal";
import {
  Swipeable,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useGlobalContext } from "@/context/GlobalProvider";

const { width } = Dimensions.get("window");

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

  // Agregar Canciones
  const [isAddSongModalVisible, setAddSongModalVisible] = useState(false);
  const [savedSongs, setSavedSongs] = useState<any[]>([]);

  // Audio
  const [currentSongUrl, setCurrentSongUrl] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useAudioPlayer(currentSongUrl || "");

  useEffect(() => {
    if (currentSongUrl && player) {
      player.play();
      setIsPlaying(true);
    }
  }, [currentSongUrl, player]);

  useEffect(() => {
    fetchPlaylist();
  }, [id]);

  const fetchPlaylist = async () => {
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
          } catch (e) {
            return null;
          }
        })
        .filter((s: any) => s !== null);

      setSongs(parsedSongs);
    } catch (e) {
      Alert.alert("Error", "No se pudo cargar la playlist");
      router.back();
    }
  };

  const fetchSavedSongs = async () => {
    if (!user) return;
    try {
      const posts = await getSavedPosts(user.$id);
      const parsed = posts
        .map((post) => {
          try {
            const s = JSON.parse(post.songData);
            return { ...s, postId: post.$id };
          } catch (e) {
            return null;
          }
        })
        .filter((s) => s !== null);
      setSavedSongs(parsed);
    } catch (error) {
      console.log(error);
    }
  };

  const handleAddSongFromModal = async (song: any) => {
    try {
      await addSongToPlaylist(playlist.$id, song);
      setSongs((prev) => [...prev, song]); // Optimistic
      setAddSongModalVisible(false);
      Alert.alert("Añadida", `${song.title} agregada a la playlist.`);
    } catch (error) {
      Alert.alert("Error", "No se pudo agregar.");
    }
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      await renamePlaylist(id as string, newName);
      setPlaylist({ ...playlist, name: newName });
      setEditModalVisible(false);
    } catch (e) {
      Alert.alert("Error", "No se pudo renombrar.");
    }
  };

  const handleRemoveSong = async (song: any) => {
    const previousSongs = [...songs];
    setSongs((prev) => prev.filter((s) => s.title !== song.title));

    try {
      const songString = JSON.stringify(song);
      await removeSongFromPlaylist(id as string, songString);
    } catch (e) {
      setSongs(previousSongs);
      Alert.alert("Error", "No se pudo eliminar la canción.");
    }
  };

  const handlePlayPreview = (previewUrl: string, songId: string) => {
    if (!previewUrl) return;
    if (playingId === songId) {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
      return;
    }
    setIsPlaying(false);
    setPlayingId(songId);
    setCurrentSongUrl(previewUrl);
  };

  const handleSync = () => {
    // Determinamos la plataforma destino basada en la preferencia del usuario o la playlist
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

  // --- RENDERERS ---

  const renderCover = () => {
    const isDefaultCover =
      !playlist.cover || playlist.cover.includes("avatars/initials");

    if (!isDefaultCover) {
      return (
        <Image
          source={{ uri: playlist.cover }}
          className="w-64 h-64 rounded-xl shadow-2xl mb-6 bg-zinc-800"
        />
      );
    }

    return (
      <View
        className="w-64 h-64 rounded-2xl mb-6 items-center justify-center shadow-xl overflow-hidden"
        style={{
          backgroundColor: isDark ? "#27272A" : "#E4E4E7",
          borderWidth: 1,
          borderColor: borderColor,
        }}
      >
        <View className="absolute inset-0 bg-[#5E17EB] opacity-10" />
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
    const isThisPlaying = playingId === (item.id || item.title);
    return (
      <Swipeable
        renderRightActions={(p, d) => renderRightActions(p, d, item)}
        onSwipeableRightOpen={() => handleRemoveSong(item)}
      >
        <TouchableOpacity
          onPress={() => router.push(`/post/${item.postId}` as any)}
          className="flex-row items-center p-3 mb-2 rounded-xl border"
          style={{ backgroundColor: cardBg, borderColor: borderColor }}
        >
          <Text
            className="font-bold w-6 mr-3 text-center"
            style={{ color: subTextColor }}
          >
            {index + 1}
          </Text>
          <Image
            source={{ uri: item.cover }}
            className="w-12 h-12 rounded-lg bg-zinc-700 mr-3"
          />
          <View className="flex-1">
            <Text
              className="font-bold text-base"
              numberOfLines={1}
              style={{ color: textColor }}
            >
              {item.title}
            </Text>
            <Text
              className="text-xs"
              numberOfLines={1}
              style={{ color: subTextColor }}
            >
              {item.artist}
            </Text>
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handlePlayPreview(item.preview, item.id || item.title);
            }}
            className="p-2"
          >
            <Ionicons
              name={isThisPlaying && isPlaying ? "pause" : "play"}
              size={24}
              color={accentColor}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (!playlist)
    return <View className="flex-1" style={{ backgroundColor: bgColor }} />;

  // Configuración de iconos de plataforma
  const platformIcon =
    user?.preferredPlatform === "apple" ? "apple" : "spotify";
  const platformColor =
    user?.preferredPlatform === "apple" ? "#FA243C" : "#1DB954";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: bgColor }}>
        {/* HEADER: Navegación y Acciones (Arriba a la derecha) */}
        <View
          className="px-4 py-2 flex-row items-center justify-between border-b"
          style={{ borderColor: "transparent" }}
        >
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>

          <View className="flex-row gap-2 items-center">
            {/* 1. Botón Sync (Logo Spotify/Apple) */}
            <TouchableOpacity
              onPress={handleSync}
              className="p-2 rounded-full"
              style={{
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.05)",
              }}
            >
              <FontAwesome5
                name={platformIcon}
                size={20}
                color={platformColor}
              />
            </TouchableOpacity>

            {/* 2. Botón Editar (Lápiz mejorado) */}
            <TouchableOpacity
              onPress={() => setEditModalVisible(true)}
              className="p-2"
            >
              <Ionicons name="create-outline" size={24} color={textColor} />
            </TouchableOpacity>

            {/* 3. Botón Compartir */}
            <TouchableOpacity
              onPress={() => setShareVisible(true)}
              className="p-2 -mr-2"
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
          ListHeaderComponent={
            <View className="items-center mt-6 mb-8">
              {/* PORTADA UNIFICADA */}
              {renderCover()}

              <Text
                className="text-2xl font-bold text-center mb-1"
                style={{ color: textColor }}
              >
                {playlist.name}
              </Text>
              <View className="flex-row items-center mb-6">
                <Text
                  className="text-sm text-center"
                  style={{ color: subTextColor }}
                >
                  {playlist.platform === "mood"
                    ? "Playlist Local"
                    : `Sincronizada`}{" "}
                  • {songs.length} canciones
                </Text>
              </View>

              {/* BOTÓN "AGREGAR CANCIONES" GRANDE Y VISIBLE */}
              <TouchableOpacity
                onPress={() => {
                  fetchSavedSongs();
                  setAddSongModalVisible(true);
                }}
                className="flex-row items-center justify-center py-3 px-8 rounded-full w-full max-w-[240px] shadow-sm"
                style={{ backgroundColor: isDark ? "#27272A" : "#E4E4E7" }}
              >
                <Ionicons name="add" size={22} color={textColor} />
                <Text
                  className="font-bold ml-2 text-base"
                  style={{ color: textColor }}
                >
                  Agregar Canciones
                </Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center mt-10 opacity-50">
              <Ionicons
                name="musical-note-outline"
                size={48}
                color={subTextColor}
              />
              <Text
                className="text-center mt-4"
                style={{ color: subTextColor }}
              >
                Esta playlist está vacía.
              </Text>
            </View>
          }
        />

        {/* MODAL EDITAR NOMBRE */}
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
              className="h-[70%] w-full rounded-t-3xl p-6"
              style={{ backgroundColor: isDark ? "#18181B" : "white" }}
            >
              <View className="w-12 h-1 bg-zinc-500 rounded-full self-center mb-6 opacity-20" />
              <Text
                className="text-xl font-bold mb-4"
                style={{ color: textColor }}
              >
                Tus Canciones Guardadas
              </Text>

              <FlatList
                data={savedSongs}
                keyExtractor={(item) => item.postId || Math.random().toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleAddSongFromModal(item)}
                    className="flex-row items-center p-3 border-b mb-1"
                    style={{ borderColor: borderColor }}
                  >
                    <Image
                      source={{ uri: item.cover }}
                      className="w-12 h-12 rounded-md bg-zinc-800 mr-3"
                    />
                    <View className="flex-1">
                      <Text
                        className="font-bold"
                        numberOfLines={1}
                        style={{ color: textColor }}
                      >
                        {item.title}
                      </Text>
                      <Text className="text-xs" style={{ color: subTextColor }}>
                        {item.artist}
                      </Text>
                    </View>
                    <Ionicons
                      name="add-circle-outline"
                      size={28}
                      color={accentColor}
                    />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text
                    style={{
                      color: subTextColor,
                      textAlign: "center",
                      marginTop: 20,
                    }}
                  >
                    No tienes canciones guardadas.
                  </Text>
                }
              />
              <TouchableOpacity
                onPress={() => setAddSongModalVisible(false)}
                className="mt-4 items-center p-3"
              >
                <Text
                  className="font-bold text-lg"
                  style={{ color: subTextColor }}
                >
                  Cerrar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* MODAL COMPARTIR */}
        <ShareModal
          isVisible={isShareVisible}
          onClose={() => setShareVisible(false)}
          postId={`playlist:${playlist.$id}`}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
