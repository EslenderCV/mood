import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAudioPlayer } from "expo-audio";
import { useGlobalContext } from "@/context/GlobalProvider";
import TopBar from "@/components/TopBar";
import {
  getFeedCandidates,
  getFollowedUserIds,
  toggleLikePost,
  toggleSavePost,
  getCurrentUser,
  deletePost,
  togglePostPrivacy,
  reportPost,
} from "@/lib/appwrite";
import ShareModal from "@/components/ShareModal";
import OptionsModal from "@/components/OptionsModal"; // Tu nuevo modal bonito
import { useColorScheme } from "nativewind";

import { useLanguage } from "@/context/LanguageContext";
import { getRelativeTime } from "@/lib/dateUtils";

const parseSongData = (songDataString: string) => {
  try {
    if (!songDataString) return null;
    const song = JSON.parse(songDataString);
    if (song.cover && song.cover.includes("100x100bb"))
      song.cover = song.cover.replace("100x100bb", "600x600bb");
    return song;
  } catch (e) {
    return null;
  }
};

const getCreatorFromPost = (item: any) => {
  let userObj = item.creator || item.postedBy || item.users || item.user;
  if (Array.isArray(userObj) && userObj.length > 0) userObj = userObj[0];
  if (userObj && typeof userObj === "object") {
    return {
      id: userObj.$id || userObj.accountId,
      username: userObj.username || "anon",
      name: userObj.name || "Usuario",
      avatar: userObj.avatar || userObj.pfp,
    };
  }
  return {
    id: "unknown",
    username: "anon",
    name: "unknown",
    avatar: null,
  };
};

const Home = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#09090B";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const cardBg = isDark ? "#1C1C1E" : "#F4F4F5";
  const cardBorder = isDark ? "#27272A" : "transparent";
  const iconColor = isDark ? "#A1A1AA" : "#52525B";
  const lineColor = isDark ? "#27272A" : "#E4E4E7";

  const { t, language } = useLanguage();

  const { user, loading, loggedIn } = useGlobalContext();
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Estados para Modales
  const [isShareVisible, setShareVisible] = useState(false);
  const [postToShare, setPostToShare] = useState<string>("");

  // --- ESTADOS PARA EL MODAL DE OPCIONES ---
  const [isOptionsVisible, setOptionsVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  const [currentSongUrl, setCurrentSongUrl] = useState<string | null>(null);
  const [playingPostId, setPlayingPostId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const player = useAudioPlayer(currentSongUrl || "");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (playingPostId && currentSongUrl) {
      player.play();
      setIsPlaying(true);
    } else {
      player.pause();
      setIsPlaying(false);
    }
  }, [currentSongUrl, playingPostId]);

  const handlePlayPreview = (previewUrl: string, postId: string) => {
    if (playingPostId === postId) {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
      return;
    }
    setIsPlaying(true);
    setPlayingPostId(postId);
    setCurrentSongUrl(previewUrl);
  };

  const fetchData = async () => {
    try {
      let activeId = user?.$id;
      if (!activeId) {
        const u = await getCurrentUser();
        if (u) {
          activeId = u.$id;
          setCurrentUserId(u.$id);
        }
      } else setCurrentUserId(activeId);

      let followedIds: string[] = [];
      if (activeId) {
        try {
          followedIds = await getFollowedUserIds(activeId);
        } catch (e) {
          console.log("Error fetching follows:", e);
        }
      }

      let rawPosts: any[] = [];
      try {
        rawPosts = await getFeedCandidates();
      } catch (e) {
        console.log("Error fetching posts:", e);
      }

      const timelinePosts = rawPosts.filter((post: any) => {
        const creator = getCreatorFromPost(post);
        if (!creator.id || creator.id === "unknown") return false;

        // Mostrar posts propios y de seguidos
        const isMine = creator.id === activeId;
        const isFollowed = followedIds.includes(creator.id);

        return isMine || isFollowed;
      });

      timelinePosts.sort((a: any, b: any) => {
        return (
          new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
        );
      });

      setFeedPosts(timelinePosts);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!loading) fetchData();
  }, [user, loading, loggedIn]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (player.playing) player.pause();
    setPlayingPostId(null);
    await fetchData();
  };

  const handleLike = async (post: any) => {
    const uid = user?.$id || currentUserId;
    if (!uid) return;
    const likes = post.likedBy || [];
    const isLiked = likes.includes(uid);
    const newLikes = isLiked
      ? likes.filter((id: string) => id !== uid)
      : [...likes, uid];

    setFeedPosts((prev) =>
      prev.map((p) => (p.$id === post.$id ? { ...p, likedBy: newLikes } : p))
    );
    try {
      await toggleLikePost(post.$id, uid, likes);
    } catch (e) {}
  };

  const handleSave = async (post: any) => {
    const uid = user?.$id || currentUserId;
    if (!uid) return;
    const saves = post.savedBy || [];
    const isSaved = saves.includes(uid);
    const newSaves = isSaved
      ? saves.filter((id: string) => id !== uid)
      : [...saves, uid];

    setFeedPosts((prev) =>
      prev.map((p) => (p.$id === post.$id ? { ...p, savedBy: newSaves } : p))
    );
    try {
      await toggleSavePost(post.$id, uid);
    } catch (e) {}
  };

  // --- LÓGICA DE MODAL DE OPCIONES ---

  const openOptions = (post: any) => {
    setSelectedPost(post);
    setOptionsVisible(true);
  };

  // Acción: Cambiar Privacidad (Solo dueño)
  const handleTogglePrivacyAction = async () => {
    if (!selectedPost) return;
    const post = selectedPost;

    setOptionsVisible(false); // Cerrar modal

    try {
      // Actualización optimista
      setFeedPosts((prev) =>
        prev.map((p) =>
          p.$id === post.$id ? { ...p, isPrivate: !p.isPrivate } : p
        )
      );
      await togglePostPrivacy(post.$id, post.isPrivate);
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar la privacidad");
      onRefresh(); // Revertir si falla
    }
  };

  // Acción: Eliminar (Solo dueño)
  const handleDeleteAction = () => {
    if (!selectedPost) return;
    const post = selectedPost;

    setOptionsVisible(false); // Cerrar modal

    // Confirmación nativa de seguridad
    Alert.alert(
      "¿Eliminar definitivamente?",
      "Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              // Borrado optimista de la lista
              setFeedPosts((prev) => prev.filter((p) => p.$id !== post.$id));
              await deletePost(post.$id);
            } catch (e) {
              Alert.alert("Error", "No se pudo eliminar el post");
              onRefresh();
            }
          },
        },
      ]
    );
  };

  // Acción: Reportar (Solo otros usuarios)
  const handleReportAction = () => {
    if (!selectedPost || !user?.$id) return;

    setOptionsVisible(false); // Cerrar modal

    Alert.alert(
      "Reportar Publicación",
      "¿Por qué quieres reportar este contenido?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Contenido Inapropiado",
          onPress: () => submitReport("inappropriate"),
        },
        {
          text: "Spam",
          onPress: () => submitReport("spam"),
        },
        {
          text: "Otro",
          onPress: () => submitReport("other"),
        },
      ]
    );
  };

  const submitReport = async (reason: string) => {
    // CORRECCIÓN: Verificamos que el usuario exista antes de continuar
    if (!user) {
      Alert.alert("Error", "Debes iniciar sesión para reportar.");
      return;
    }

    try {
      // Ahora TypeScript sabe que 'user' no es null aquí
      await reportPost(selectedPost.$id, user.$id, reason);
      Alert.alert("Gracias", "Hemos recibido tu reporte y lo revisaremos.");
    } catch (error) {
      Alert.alert("Error", "No se pudo enviar el reporte.");
    }
  };

  const renderPost = ({ item }: { item: any }) => {
    const songData = parseSongData(item.songData);
    const creator = getCreatorFromPost(item);
    if (!songData) return null;

    const isActive = playingPostId === item.$id;
    const uid = user?.$id || currentUserId;
    const isLiked = item.likedBy?.includes(uid);
    const isSaved = item.savedBy?.includes(uid);

    // Verificamos si soy el dueño para mostrar ciertas opciones o iconos
    const isOwner = creator.id === uid;

    return (
      <View className="flex-row px-4">
        <View className="items-center mr-3">
          <TouchableOpacity
            className="z-10"
            onPress={() => router.push(`/user/${creator.id}` as any)}
          >
            <Image
              source={
                creator.avatar
                  ? { uri: creator.avatar }
                  : require("@/assets/noPfp.jpg")
              }
              style={{
                borderColor: isDark ? "#000" : "#F4F4F5",
                borderWidth: 2,
              }}
              className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800"
            />
          </TouchableOpacity>
          <View
            className="flex-1 w-[2px] my-1 rounded-full"
            style={{ backgroundColor: lineColor }}
          />
        </View>

        <View className="flex-1 pb-6">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center flex-1 flex-wrap">
              <Text
                className="font-bold text-[15px] mr-1"
                style={{ color: textColor }}
              >
                {creator.name === "unknown"
                  ? t("feed.unknownUser")
                  : creator.name}
              </Text>

              {/* Icono de Candado si es Privado (Solo lo verás tú porque los privados se filtran) */}
              {item.isPrivate && (
                <Ionicons
                  name="lock-closed"
                  size={12}
                  color={subTextColor}
                  style={{ marginRight: 4 }}
                />
              )}

              <Text className="text-[13px]" style={{ color: subTextColor }}>
                @{creator.username} ·{" "}
                {getRelativeTime(item.$createdAt, language)}
              </Text>
            </View>

            {/* BOTÓN DE OPCIONES (VISIBLE PARA TODOS) */}
            <TouchableOpacity
              onPress={() => openOptions(item)}
              className="p-2 -mr-2"
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={18}
                color={subTextColor}
              />
            </TouchableOpacity>
          </View>

          {item.comment && item.comment.trim() !== "" && (
            <Text
              className="text-[15px] mb-3 leading-5"
              style={{ color: textColor }}
            >
              {item.comment}
            </Text>
          )}

          <View
            className="rounded-2xl p-3 flex-row items-center mb-3"
            style={{
              backgroundColor: cardBg,
              borderWidth: isDark ? 1 : 0,
              borderColor: cardBorder,
              marginTop: item.comment ? 0 : 4,
            }}
          >
            <Image
              source={{ uri: songData.cover }}
              className="w-12 h-12 rounded-lg bg-zinc-300 dark:bg-zinc-800"
            />
            <View className="flex-1 ml-3 mr-2">
              <Text
                className="font-bold text-sm"
                numberOfLines={1}
                style={{ color: textColor }}
              >
                {songData.title}
              </Text>
              <Text
                className="text-xs mt-0.5"
                numberOfLines={1}
                style={{ color: subTextColor }}
              >
                {songData.artist}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handlePlayPreview(songData.preview, item.$id)}
              className="w-10 h-10 rounded-full bg-[#5E17EB] items-center justify-center shadow-sm"
              activeOpacity={0.8}
            >
              <Ionicons
                name={isActive && isPlaying ? "pause" : "play"}
                size={20}
                color="white"
                style={{ marginLeft: isActive && isPlaying ? 0 : 2 }}
              />
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-between items-center mt-1 pr-2">
            <TouchableOpacity
              className="flex-row items-center py-1"
              onPress={() => {
                if (item.$id) {
                  router.push(`/post/${item.$id}` as any);
                }
              }}
            >
              <Ionicons name="chatbubble-outline" size={20} color={iconColor} />
              {(item.commentsCount || 0) > 0 && (
                <Text
                  className="text-xs ml-1.5 font-medium"
                  style={{ color: subTextColor }}
                >
                  {item.commentsCount}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleLike(item)}
              className="flex-row items-center py-1"
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={22}
                color={isLiked ? "#EF4444" : iconColor}
              />
              {item.likedBy?.length > 0 && (
                <Text
                  className="text-xs ml-1.5 font-medium"
                  style={{ color: isLiked ? "#EF4444" : subTextColor }}
                >
                  {item.likedBy.length}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSave(item)}
              className="flex-row items-center py-1"
            >
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={22}
                color={isSaved ? "#5E17EB" : iconColor}
              />
              {item.savedBy?.length > 0 && (
                <Text
                  className="text-xs ml-1.5 font-medium"
                  style={{ color: isSaved ? "#5E17EB" : subTextColor }}
                >
                  {item.savedBy.length}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setPostToShare(item.$id);
                setShareVisible(true);
              }}
              className="flex-row items-center py-1"
            >
              <Ionicons
                name={
                  postToShare === item.$id
                    ? "share-social"
                    : "paper-plane-outline"
                }
                size={22}
                color={iconColor}
                style={{ transform: [{ rotate: "-10deg" }], marginTop: -2 }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: bgColor }}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <TopBar />
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#5E17EB" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={feedPosts}
          keyExtractor={(item) => item.$id}
          renderItem={renderPost}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#5E17EB"
            />
          }
          ListEmptyComponent={() => (
            <View className="flex-1 mt-20 items-center px-6">
              <Ionicons name="people-outline" size={48} color={subTextColor} />
              <Text
                className="mt-4 text-center text-lg font-medium"
                style={{ color: subTextColor }}
              >
                {t("feed.emptyTitle")}
              </Text>
              <Text
                className="mt-2 text-center text-sm"
                style={{ color: subTextColor }}
              >
                {t("feed.emptySubtitle")}
              </Text>
            </View>
          )}
        />
      )}

      {/* Modal de Compartir */}
      <ShareModal
        isVisible={isShareVisible}
        onClose={() => setShareVisible(false)}
        postId={postToShare}
      />

      {/* NUEVO: Modal de Opciones (Diseño Twitter/Instagram) */}
      <OptionsModal
        isVisible={isOptionsVisible}
        onClose={() => setOptionsVisible(false)}
        onTogglePrivacy={handleTogglePrivacyAction}
        onDelete={handleDeleteAction}
        onReport={handleReportAction}
        isPrivate={selectedPost?.isPrivate || false}
        // Validamos si el usuario actual es el creador del post seleccionado
        isOwner={
          (selectedPost?.postedBy?.$id || selectedPost?.creator?.$id) ===
          user?.$id
        }
      />
    </SafeAreaView>
  );
};

export default Home;
