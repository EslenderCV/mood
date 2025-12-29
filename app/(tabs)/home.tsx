import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAudioPlayer } from "expo-audio";
import { useGlobalContext } from "@/context/GlobalProvider";
import { useModal } from "@/context/ModalContext";
import TopBar from "@/components/TopBar";
import {
  getFeedCandidates,
  getFollowedUserIds,
  toggleLikePost,
  toggleSavePost,
  getCurrentUser,
} from "@/lib/appwrite";
import ShareModal from "@/components/ShareModal";
import { useColorScheme } from "nativewind";
import PagerView from "react-native-pager-view";

// --- IMPORTAR PANTALLAS ---
import ExploreScreen from "./explore";
import LibraryScreen from "./library";

const { width } = Dimensions.get("window");

// --- HELPERS ---
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
    name: "Usuario Desconocido",
    avatar: null,
  };
};

// --- ICONO ANIMADO (Corrección: Opacidad en vez de Color) ---
const NavIcon = ({
  name,
  focusedName,
  size = 26,
  index,
  scrollOffset,
  activeColor = "#5E17EB",
  inactiveColor,
}: any) => {
  const opacity = scrollOffset.interpolate({
    inputRange: [index - 1, index, index + 1],
    outputRange: [0, 1, 0],
    extrapolate: "clamp",
  });

  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Ionicons
        name={name as any}
        size={size}
        color={inactiveColor}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
        <Ionicons name={focusedName as any} size={size} color={activeColor} />
      </Animated.View>
    </View>
  );
};

// ==========================================
// 1. FEED SCREEN (Tu Home original)
// ==========================================
const FeedScreen = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#09090B";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const cardBg = isDark ? "#1C1C1E" : "#F4F4F5";
  const cardBorder = isDark ? "#27272A" : "transparent";
  const iconColor = isDark ? "#A1A1AA" : "#52525B";
  const lineColor = isDark ? "#27272A" : "#E4E4E7";

  const { user, loading, loggedIn } = useGlobalContext();
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isShareVisible, setShareVisible] = useState(false);
  const [postToShare, setPostToShare] = useState<string>("");
  const [currentSongUrl, setCurrentSongUrl] = useState<string | null>(null);
  const [playingPostId, setPlayingPostId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useAudioPlayer(currentSongUrl);

  const flatListRef = useRef<FlatList>(null);

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

      let rawPosts: any[] = [];
      try {
        rawPosts = await getFeedCandidates();
      } catch (e) {}

      let followedIds: string[] = [];
      if (activeId) {
        try {
          followedIds = await getFollowedUserIds(activeId);
        } catch (e) {}
      }

      const validPosts = rawPosts.filter((post: any) => {
        let creator = getCreatorFromPost(post);
        return !(!creator.id || creator.id === "unknown");
      });

      // Orden básico por fecha (puedes mejorar esto)
      setFeedPosts(validPosts.reverse());
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
    if (player) player.pause();
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

  const renderPost = ({ item }: { item: any }) => {
    const songData = parseSongData(item.songData);
    const creator = getCreatorFromPost(item);
    if (!songData) return null;

    const isActive = playingPostId === item.$id;
    const uid = user?.$id || currentUserId;
    const isLiked = item.likedBy?.includes(uid);
    const isSaved = item.savedBy?.includes(uid);

    return (
      <View className="flex-row px-4">
        <View className="items-center mr-3">
          <TouchableOpacity className="z-10">
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
                {creator.name}
              </Text>
              <Text className="text-[13px]" style={{ color: subTextColor }}>
                @{creator.username} · {formatTimeAgo(item.$createdAt)}
              </Text>
            </View>
            <TouchableOpacity>
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
            <TouchableOpacity className="flex-row items-center py-1">
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
                name="paper-plane-outline"
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
            <View className="flex-1 mt-20 items-center">
              <Text style={{ color: subTextColor }}>No hay posts aún</Text>
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

// ==========================================
// 2. COMPONENTE PRINCIPAL (PAGER)
// ==========================================
const HomePager = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useGlobalContext();
  const { setPostModalVisible } = useModal();

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const tabBarBg = isDark ? "#121212" : "#FFFFFF";
  const borderColor = isDark ? "#27272A" : "#F4F4F5";
  const inactiveColor = isDark ? "#71717A" : "#9CA3AF";

  const pagerRef = useRef<PagerView>(null);
  const scrollOffset = useRef(new Animated.Value(0)).current;
  const [currentPage, setCurrentPage] = useState(0);

  // --- CORRECCIÓN ERROR: Usamos función manual en lugar de Animated.event ---
  const handlePageScroll = (e: any) => {
    const { position, offset } = e.nativeEvent;
    // Actualizamos el valor animado manualmente desde el evento
    // Esto es mucho más seguro y evita el crash de "not a function"
    scrollOffset.setValue(position + offset);
  };

  const onPageSelected = (e: any) => {
    setCurrentPage(e.nativeEvent.position);
  };

  const goToPage = (index: number) => {
    pagerRef.current?.setPage(index);
  };

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageScroll={handlePageScroll} // Función normal, segura
        onPageSelected={onPageSelected}
      >
        <View key="0">
          <FeedScreen />
        </View>
        <View key="1">
          <ExploreScreen />
        </View>
        <View key="2">
          <LibraryScreen />
        </View>
      </PagerView>

      <View
        className="flex-row items-center justify-between px-2 pb-5 pt-3 absolute bottom-0 w-full"
        style={{
          backgroundColor: tabBarBg,
          borderTopColor: borderColor,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === "ios" ? 25 : 10,
        }}
      >
        <TouchableOpacity
          onPress={() => goToPage(0)}
          className="flex-1 items-center py-2"
        >
          <NavIcon
            name="home-outline"
            focusedName="home"
            index={0}
            scrollOffset={scrollOffset}
            inactiveColor={inactiveColor}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => goToPage(1)}
          className="flex-1 items-center py-2"
        >
          <NavIcon
            name="compass-outline"
            focusedName="compass"
            index={1}
            scrollOffset={scrollOffset}
            inactiveColor={inactiveColor}
            size={30}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setPostModalVisible(true)}
          className="flex-1 items-center -mt-8"
        >
          <View
            className="bg-[#5E17EB] p-3.5 rounded-full shadow-lg shadow-[#5E17EB]/40"
            style={{ borderWidth: 4, borderColor: tabBarBg }}
          >
            <Image
              source={require("@/assets/mood.png")}
              resizeMode="contain"
              style={{ width: 24, height: 24, tintColor: "white" }}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => goToPage(2)}
          className="flex-1 items-center py-2"
        >
          <NavIcon
            name="albums-outline"
            focusedName="albums"
            index={2}
            scrollOffset={scrollOffset}
            inactiveColor={inactiveColor}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/profile")}
          className="flex-1 items-center py-2"
        >
          <View
            className="rounded-full border-2"
            style={{ borderColor: "transparent" }}
          >
            <Image
              source={
                user?.pfp ? { uri: user.pfp } : require("@/assets/noPfp.jpg")
              }
              className="w-7 h-7 rounded-full"
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default HomePager;
