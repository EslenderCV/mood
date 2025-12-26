import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
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
  getCurrentUser,
} from "@/lib/appwrite";
import ShareModal from "@/components/ShareModal";

// --- UTILIDAD: Formato de Tiempo ---
const formatTimeAgo = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "hace unos segundos";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ayer";
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
};

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

// --- FUNCIÓN DEPURADA PARA ENCONTRAR AL USUARIO ---
const getCreatorFromPost = (item: any) => {
  // 1. Buscamos el objeto en todas las propiedades posibles
  let userObj = item.creator || item.postedBy || item.users || item.user;

  // 🔴 CORRECCIÓN CRÍTICA: Appwrite a veces devuelve las relaciones como ARRAYS
  // Si es un array (lista), tomamos el primer elemento (el creador)
  if (Array.isArray(userObj) && userObj.length > 0) {
    userObj = userObj[0];
  }

  // 2. Si encontramos un objeto de usuario válido
  if (userObj && typeof userObj === "object") {
    return {
      id: userObj.$id || userObj.accountId,
      username: userObj.username || "anon",
      name: userObj.name || "Usuario", // Si name está vacío, usa "Usuario"
      avatar: userObj.avatar || userObj.pfp,
    };
  }

  // 3. Si no hay objeto, buscamos propiedades planas en el post
  if (item.username || item.creatorUsername) {
    return {
      id: item.creatorId || item.$id,
      username: item.username || item.creatorUsername || "anon",
      name: item.name || item.creatorName || "Usuario",
      avatar: item.avatar || item.pfp || item.creatorAvatar,
    };
  }

  return {
    id: "unknown",
    username: "anon",
    name: "Usuario Desconocido",
    avatar: null,
  };
};

const Home = () => {
  const { user, loading, loggedIn } = useGlobalContext();
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Estados Share
  const [isShareVisible, setShareVisible] = useState(false);
  const [postToShare, setPostToShare] = useState<string>("");

  // Audio Player
  const [currentSongUrl, setCurrentSongUrl] = useState<string | null>(null);
  const [playingPostId, setPlayingPostId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useAudioPlayer(currentSongUrl);

  useEffect(() => {
    if (currentSongUrl && player) {
      player.play();
      setIsPlaying(true);
    }
  }, [currentSongUrl, player]);

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
    setIsPlaying(false);
    setPlayingPostId(postId);
    setCurrentSongUrl(previewUrl);
  };

  // --- ALGORITMO DE RECOMENDACIÓN ---
  const rankPosts = (posts: any[], followedIds: string[], myId: string) => {
    const now = new Date().getTime();

    const scoredPosts = posts.map((post) => {
      let score = 0;

      const creator = getCreatorFromPost(post);
      const creatorId = creator.id;

      // 1. Social
      if (followedIds.includes(creatorId)) score += 50;
      // 2. Popularidad
      const likesCount = post.likedBy ? post.likedBy.length : 0;
      score += likesCount * 2;
      // 3. Tiempo
      const postDate = new Date(post.$createdAt).getTime();
      const hoursAgo = (now - postDate) / (1000 * 60 * 60);
      score -= hoursAgo * 0.5;
      // 4. Yo
      if (creatorId === myId) score += 20;
      // 5. Random
      score += Math.random() * 5;

      return { ...post, score };
    });

    return scoredPosts.sort((a, b) => b.score - a.score);
  };

  const fetchData = async () => {
    try {
      let activeId = user?.$id;
      if (!activeId) {
        const currentUserData = await getCurrentUser();
        if (currentUserData) {
          activeId = currentUserData.$id;
          setCurrentUserId(activeId);
        }
      } else {
        setCurrentUserId(activeId);
      }

      const rawPosts = await getFeedCandidates();

      let followedIds: string[] = [];
      if (activeId) {
        followedIds = await getFollowedUserIds(activeId);
      }

      const rankedFeed = rankPosts(rawPosts, followedIds, activeId || "");
      console.log("📊 --- REPORTE DEL ALGORITMO --- 📊");
      rankedFeed.forEach((post, index) => {
        const creator = post.postedBy || {};
        console.log(
          `#${index + 1} | Puntos: ${post.score.toFixed(2)} | Autor: ${
            creator.name || "Anon"
          } | Likes: ${post.likedBy?.length || 0}`
        );
      });
      console.log("---------------------------------------");
      setFeedPosts(rankedFeed);
    } catch (error) {
      console.log("Error fetching feed:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    fetchData();
  }, [user, loading, loggedIn]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (player && isPlaying) {
      player.pause();
      setIsPlaying(false);
    }
    setPlayingPostId(null);
    setCurrentSongUrl(null);
    await fetchData();
  };

  const handleLike = async (post: any) => {
    const userId = user?.$id || currentUserId;
    if (!userId) return;

    const originalLikes = post.likedBy || [];
    const isLiked = originalLikes.includes(userId);
    let newLikes = isLiked
      ? originalLikes.filter((id: string) => id !== userId)
      : [...originalLikes, userId];

    const updatedPosts = feedPosts.map((p) =>
      p.$id === post.$id ? { ...p, likedBy: newLikes } : p
    );
    setFeedPosts(updatedPosts);

    try {
      await toggleLikePost(post.$id, userId, originalLikes);
    } catch (error) {
      setFeedPosts(feedPosts);
    }
  };

  const handleOpenShare = (postId: string) => {
    setPostToShare(postId);
    setShareVisible(true);
  };

  // --- RENDER ---
  const renderPost = ({ item, index }: { item: any; index: number }) => {
    const songData = parseSongData(item.songData);

    // USAMOS LA FUNCIÓN CORREGIDA
    const creator = getCreatorFromPost(item);

    if (!songData) return null;

    const isActive = playingPostId === item.$id;
    const showPauseIcon = isActive && isPlaying;

    const userId = user?.$id || currentUserId;
    const likedBy = item.likedBy || [];
    const isLiked = userId ? likedBy.includes(userId) : false;

    const isLastItem = index === feedPosts.length - 1;
    const hasCaption = item.comment && item.comment.trim() !== "";

    return (
      <View className="flex-row px-4">
        {/* AVATAR */}
        <View className="items-center mr-3">
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/user/[id]",
                params: {
                  id: creator.id,
                  username: creator.username,
                  avatar: creator.avatar,
                  name: creator.name,
                },
              })
            }
            className="z-10"
          >
            <Image
              source={
                creator.avatar
                  ? { uri: creator.avatar }
                  : require("@/assets/noPfp.jpg")
              }
              className="w-10 h-10 rounded-full bg-zinc-800 border border-black"
            />
          </TouchableOpacity>

          {!isLastItem && <View className="flex-1 w-[2px] bg-zinc-800 my-1" />}
        </View>

        {/* CONTENIDO */}
        <View className="flex-1 pb-6">
          {/* HEADER */}
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center flex-1 flex-wrap">
              <Text className="text-white font-bold text-[15px] mr-1">
                {creator.name}
              </Text>
              <Text className="text-zinc-500 text-[14px]">
                @{creator.username} · {formatTimeAgo(item.$createdAt)}
              </Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="ellipsis-horizontal" size={18} color="#71717A" />
            </TouchableOpacity>
          </View>

          {/* TEXTO */}
          {hasCaption && (
            <Text className="text-white text-[15px] mb-3 leading-5">
              {item.comment}
            </Text>
          )}

          {/* MUSICA */}
          <View
            className={`bg-[#1C1C1E] rounded-2xl p-3 flex-row items-center border border-zinc-800/50 mb-3 ${
              hasCaption ? "" : "mt-2"
            }`}
          >
            <Image
              source={{ uri: songData.cover }}
              className="w-12 h-12 rounded-lg bg-zinc-800"
            />
            <View className="flex-1 ml-3 mr-2">
              <Text className="text-white font-bold text-sm" numberOfLines={1}>
                {songData.title}
              </Text>
              <Text className="text-zinc-400 text-xs" numberOfLines={1}>
                {songData.artist}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handlePlayPreview(songData.preview, item.$id)}
              className="w-10 h-10 rounded-full bg-[#5E17EB] items-center justify-center"
              activeOpacity={0.8}
            >
              <Ionicons
                name={showPauseIcon ? "pause" : "play"}
                size={20}
                color="white"
                style={{ marginLeft: showPauseIcon ? 0 : 2 }}
              />
            </TouchableOpacity>
          </View>

          {/* FOOTER */}
          <View className="flex-row justify-between items-center mt-1">
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/post/[id]",
                  params: {
                    id: item.$id,
                    content: item.comment,
                  },
                })
              }
              className="flex-row items-center py-1 pr-2"
            >
              <Ionicons name="chatbubble-outline" size={20} color="#71717A" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleLike(item)}
              className="flex-row items-center py-1 px-2"
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={22}
                color={isLiked ? "#EF4444" : "#71717A"}
              />
              {likedBy.length > 0 && (
                <Text
                  className={`text-xs ml-1 ${
                    isLiked ? "text-red-500" : "text-zinc-500"
                  }`}
                >
                  {likedBy.length}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleOpenShare(item.$id)}
              className="flex-row items-center py-1 pl-2"
            >
              <Ionicons name="share-outline" size={22} color="#71717A" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      <StatusBar style="light" />
      <TopBar />

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#5E17EB" />
        </View>
      ) : (
        <FlatList
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
            <View className="flex-1 justify-center items-center mt-20">
              <Text className="text-zinc-500 text-lg">No hay posts aún</Text>
            </View>
          )}
        />
      )}

      <ShareModal
        isVisible={isShareVisible}
        onClose={() => setShareVisible(false)}
        postId={postToShare}
      />
    </SafeAreaView>
  );
};

export default Home;
