import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAudioPlayer } from "expo-audio";
import { useColorScheme } from "nativewind";

import {
  GestureHandlerRootView,
  FlingGestureHandler,
  Directions,
  State,
} from "react-native-gesture-handler";

import {
  getLatestUsers,
  getAllPosts,
  getFeedCandidates,
  getFollowedUserIds,
  deletePost,
  reportPost,
} from "@/lib/appwrite";
import { useGlobalContext } from "@/context/GlobalProvider";

import { useLanguage } from "@/context/LanguageContext";
import ShareModal from "@/components/ShareModal";
import OptionsModal from "@/components/OptionsModal";
import PostItem from "@/components/PostItem";

const { width } = Dimensions.get("window");

// --- Helpers ---
const parseSongFromPost = (songDataString: string) => {
  try {
    if (!songDataString) return null;
    const song = JSON.parse(songDataString);
    if (song.cover && song.cover.includes("100x100bb")) {
      song.cover = song.cover.replace("100x100bb", "600x600bb");
    }
    return song;
  } catch (error) {
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
  return { id: "unknown", username: "anon", name: "unknown", avatar: null };
};

const CATEGORIES = [
  {
    id: "posts",
    labelKey: "explore.categories.posts",
    icon: "compass-outline",
  },
  {
    id: "music",
    labelKey: "explore.categories.music",
    icon: "musical-notes-outline",
  },
  {
    id: "artists",
    labelKey: "explore.categories.artists",
    icon: "people-outline",
  },
  {
    id: "profiles",
    labelKey: "explore.categories.profiles",
    icon: "person-add-outline",
  },
];

const Explore = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();

  // --- Paleta de Colores Refinada ---
  const bgColor = isDark ? "#09090B" : "#FFFFFF"; // Zinc 950
  const textColor = isDark ? "#FAFAFA" : "#18181B";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const cardBg = isDark ? "#18181B" : "#F4F4F5"; // Zinc 900
  const inputBg = isDark ? "#27272A" : "#F3F4F6"; // Zinc 800
  const borderColor = isDark ? "#27272A" : "#E5E5E5";
  const accentColor = "#5E17EB";

  const { user } = useGlobalContext();

  const [activeCategory, setActiveCategory] = useState("posts");
  const [searchText, setSearchText] = useState("");

  const [explorePosts, setExplorePosts] = useState<any[]>([]);
  const [rankedUsers, setRankedUsers] = useState<any[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modales
  const [isShareVisible, setShareVisible] = useState(false);
  const [postToShare, setPostToShare] = useState<string>("");
  const [isOptionsVisible, setOptionsVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  // Audio Player
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

  const handlePlayPreview = (previewUrl: string, id: string) => {
    if (!previewUrl) return;
    if (playingId === id) {
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
    setPlayingId(id);
    setCurrentSongUrl(previewUrl);
  };

  // --- Navegación por Gestos ---
  const handleFlingRight = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.ACTIVE) {
      router.push("/home");
    }
  };

  const handleFlingLeft = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.ACTIVE) {
      router.push("/library" as any);
    }
  };

  // --- Lógica de Ranking y Filtrado ---
  const rankExplorePosts = (posts: any[]) => {
    return posts
      .map((post) => {
        let score = 0;
        const likes = post.likedBy ? post.likedBy.length : 0;
        const comments = post.comments ? post.comments.length : 0;
        score += likes * 10;
        score += comments * 15;
        score += Math.random() * 50; // Random factor para variedad
        return { ...post, score };
      })
      .sort((a: any, b: any) => b.score - a.score);
  };

  const calculateTopMooders = (
    posts: any[],
    latestUsers: any[],
    myFollows: any[]
  ) => {
    const userScores: Record<string, any> = {};

    posts.forEach((post) => {
      const creator = getCreatorFromPost(post);
      const id = creator.id;
      if (id === "unknown" || id === user?.$id) return;

      if (!userScores[id]) {
        userScores[id] = {
          ...creator,
          totalLikes: 0,
          postCount: 0,
          score: 0,
          isTrending: true,
        };
      }

      const likes = post.likedBy ? post.likedBy.length : 0;
      userScores[id].totalLikes += likes;
      userScores[id].postCount += 1;
      userScores[id].score += likes * 5 + 2;
    });

    latestUsers.forEach((u) => {
      const id = u.$id;
      if (id === user?.$id) return;
      if (!userScores[id]) {
        userScores[id] = {
          id: u.$id,
          username: u.username,
          name: u.name,
          avatar: u.pfp,
          totalLikes: 0,
          score: 1,
          isTrending: false,
          isNew: true,
        };
      }
    });

    return Object.values(userScores)
      .filter((u: any) => !myFollows.includes(u.id))
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 50);
  };

  const fetchCategoryData = async () => {
    setIsLoading(true);
    try {
      const [rawPosts, myFollowsList] = await Promise.all([
        getFeedCandidates(),
        user?.$id ? getFollowedUserIds(user.$id) : Promise.resolve([]),
      ]);
      const safeFollows = Array.isArray(myFollowsList) ? myFollowsList : [];

      const publicAndVisiblePosts = rawPosts.filter((post: any) => {
        let userObj = post.creator || post.postedBy;
        if (Array.isArray(userObj) && userObj.length > 0) userObj = userObj[0];
        const isPrivate = userObj?.isPrivate || false;
        return !isPrivate;
      });

      if (activeCategory === "posts") {
        const filteredPosts = publicAndVisiblePosts.filter((post: any) => {
          const creator = getCreatorFromPost(post);
          const isMe = creator.id === user?.$id;
          const isFollowing = safeFollows.includes(creator.id);
          return !isMe && !isFollowing;
        });
        setExplorePosts(rankExplorePosts(filteredPosts));
      }

      if (activeCategory === "profiles") {
        const latestUsers = await getLatestUsers();
        setRankedUsers(
          calculateTopMooders(publicAndVisiblePosts, latestUsers, safeFollows)
        );
      }

      if (activeCategory === "music" || activeCategory === "artists") {
        const allPosts = await getAllPosts(user?.$id || "");

        if (activeCategory === "music") {
          const songMap = new Map();
          allPosts.forEach((post: any) => {
            const songData = parseSongFromPost(post.songData);
            if (!songData) return;
            const uniqueKey = `${songData.title}-${songData.artist}`;
            const likes = post.likedBy ? post.likedBy.length : 0;

            if (songMap.has(uniqueKey)) {
              songMap.get(uniqueKey).likes += likes;
            } else {
              songMap.set(uniqueKey, {
                ...songData,
                id: uniqueKey,
                postId: post.$id,
                likes: likes,
                type: "music",
              });
            }
          });
          const charts = Array.from(songMap.values())
            .filter((s: any) => s.likes > 0)
            .sort((a: any, b: any) => b.likes - a.likes)
            .slice(0, 20) // Top 20
            .map((s: any, i) => ({ ...s, rank: i + 1 }));
          setTopSongs(charts);
        }

        if (activeCategory === "artists") {
          const artistMap = new Map();
          allPosts.forEach((post: any) => {
            const songData = parseSongFromPost(post.songData);
            if (!songData) return;
            const artistName = songData.artist;
            if (artistMap.has(artistName)) {
              const data = artistMap.get(artistName);
              data.count += 1;
              // Randomly update cover to keep it fresh
              if (Math.random() > 0.5) data.cover = songData.cover;
            } else {
              artistMap.set(artistName, {
                id: artistName,
                name: artistName,
                cover: songData.cover,
                count: 1,
              });
            }
          });
          const trendingArtists = Array.from(artistMap.values())
            .sort((a: any, b: any) => b.count - a.count)
            .slice(0, 16);
          setTopArtists(trendingArtists);
        }
      }
    } catch (error) {
      console.log("Error cargando explorar:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategoryData();
  }, [activeCategory, user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategoryData();
  };

  // --- Handlers de Acciones ---
  const handleOpenOptions = (post: any) => {
    setSelectedPost(post);
    setOptionsVisible(true);
  };

  const handleShare = (postId: string) => {
    setPostToShare(postId);
    setShareVisible(true);
  };

  const handleDeleteAction = () => {
    if (!selectedPost) return;
    setOptionsVisible(false);
    Alert.alert("¿Eliminar?", "Esta acción es irreversible.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            setExplorePosts((prev) =>
              prev.filter((p) => p.$id !== selectedPost.$id)
            );
            await deletePost(selectedPost.$id);
          } catch (e) {
            Alert.alert("Error", "No se pudo eliminar");
            onRefresh();
          }
        },
      },
    ]);
  };

  const handleReportAction = () => {
    setOptionsVisible(false);
    Alert.alert("Reportar", "Selecciona una razón:", [
      { text: "Cancelar", style: "cancel" },
      { text: "Spam/Inapropiado", onPress: () => submitReport("spam") },
      { text: "Otro", onPress: () => submitReport("other") },
    ]);
  };

  const submitReport = async (reason: string) => {
    if (!user || !selectedPost) return;
    try {
      await reportPost(selectedPost.$id, user.$id, reason);
      Alert.alert("Reporte enviado", "Gracias por ayudarnos.");
    } catch (e) {
      Alert.alert("Error", "Inténtalo más tarde.");
    }
  };

  // --- Render Functions ---

  const getSectionTitle = () => {
    switch (activeCategory) {
      case "profiles":
        return t("explore.headers.topMooders");
      case "music":
        return t("explore.headers.topGlobal");
      case "artists":
        return t("explore.headers.topArtists");
      default:
        return t("explore.headers.trending");
    }
  };

  const renderHeader = () => (
    <View style={{ backgroundColor: bgColor }} className="pb-2">
      <View className="px-5 pt-2 pb-4">
        <Text className="text-3xl font-bold mb-4" style={{ color: textColor }}>
          {t("explore.title")}
        </Text>

        {/* Search Bar Refinado */}
        <View
          className="flex-row items-center h-12 rounded-2xl px-4 border"
          style={{ backgroundColor: inputBg, borderColor: "transparent" }}
        >
          <Ionicons name="search" size={20} color={subTextColor} />
          <TextInput
            placeholder={t("explore.searchPlaceholder")}
            placeholderTextColor={subTextColor}
            className="flex-1 ml-3 text-base font-medium"
            style={{ color: textColor }}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Categorías como Pills elegantes */}
      <FlatList
        horizontal
        data={CATEGORIES}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isActive = activeCategory === item.id;
          return (
            <TouchableOpacity
              onPress={() => setActiveCategory(item.id)}
              className={`mr-3 px-5 py-2.5 rounded-full flex-row items-center border`}
              style={{
                backgroundColor: isActive ? accentColor : "transparent",
                borderColor: isActive ? accentColor : borderColor,
              }}
            >
              <Ionicons
                name={item.icon as any}
                size={16}
                color={isActive ? "white" : subTextColor}
                style={{ marginRight: 6 }}
              />
              <Text
                className={`${
                  isActive ? "font-bold" : "font-medium"
                } text-[15px]`}
                style={{ color: isActive ? "white" : subTextColor }}
              >
                {t(item.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <View className="px-5 mt-6 mb-2 flex-row justify-between items-end">
        <Text className="font-bold text-xl" style={{ color: textColor }}>
          {getSectionTitle()}
        </Text>
        {isLoading && <ActivityIndicator size="small" color={accentColor} />}
      </View>
    </View>
  );

  const renderMusicItem = ({ item }: { item: any }) => {
    const isThisPlaying = playingId === item.id;
    const showPause = isThisPlaying && isPlaying;

    // Colores de medalla para el Top 3
    let rankColor = subTextColor;
    if (item.rank === 1) rankColor = "#FFD700"; // Oro
    if (item.rank === 2) rankColor = "#C0C0C0"; // Plata
    if (item.rank === 3) rankColor = "#CD7F32"; // Bronce

    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => router.push(`/post/${item.postId}` as any)}
        className="flex-row items-center px-4 py-3 mb-3 mx-4 rounded-2xl border"
        style={{ backgroundColor: cardBg, borderColor: borderColor }}
      >
        <Text
          className="text-2xl font-black w-8 text-center mr-3 italic"
          style={{ color: rankColor }}
        >
          {item.rank}
        </Text>
        <Image
          source={{ uri: item.cover }}
          className="w-14 h-14 rounded-xl mr-4"
          style={{ backgroundColor: "#27272A" }}
        />
        <View className="flex-1 justify-center">
          <Text
            className="font-bold text-[16px] mb-0.5"
            numberOfLines={1}
            style={{ color: textColor }}
          >
            {item.title}
          </Text>
          <Text
            className="text-sm font-medium"
            numberOfLines={1}
            style={{ color: subTextColor }}
          >
            {item.artist}
          </Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="heart" size={12} color="#EF4444" />
            <Text
              className="text-xs ml-1 font-semibold"
              style={{ color: subTextColor }}
            >
              {item.likes}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          className="w-10 h-10 rounded-full items-center justify-center bg-white/10"
          onPress={(e) => {
            e.stopPropagation();
            handlePlayPreview(item.preview, item.id);
          }}
        >
          <Ionicons
            name={showPause ? "pause" : "play"}
            size={22}
            color={accentColor}
            style={{ marginLeft: showPause ? 0 : 2 }}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderArtistItem = ({ item }: { item: any }) => (
    <View
      className="flex-1 m-2 p-3 rounded-3xl border items-center justify-center"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
        aspectRatio: 0.85,
      }}
    >
      <Image
        source={{ uri: item.cover }}
        className="w-24 h-24 rounded-full mb-3 border-2"
        style={{ borderColor: isDark ? "#27272A" : "#FFFFFF" }}
      />
      <Text
        className="font-bold text-center text-base mb-1 px-1"
        numberOfLines={1}
        style={{ color: textColor }}
      >
        {item.name}
      </Text>
      <Text className="text-xs font-medium" style={{ color: subTextColor }}>
        {item.count} {item.count === 1 ? "track" : "tracks"}
      </Text>
    </View>
  );

  const renderProfileItem = ({ item }: { item: any }) => {
    const isTrending = item.totalLikes >= 5;
    return (
      <View
        className="flex-row items-center px-5 py-4 border-b"
        style={{ borderColor: borderColor }}
      >
        <Image
          source={
            item.avatar ? { uri: item.avatar } : require("@/assets/noPfp.jpg")
          }
          className="w-14 h-14 rounded-full border-2"
          style={{ borderColor: borderColor }}
        />
        <View className="ml-4 flex-1">
          <Text className="font-bold text-[17px]" style={{ color: textColor }}>
            {item.name || "Usuario"}
          </Text>
          <Text
            className="text-sm font-medium mb-1"
            style={{ color: subTextColor }}
          >
            @{item.username}
          </Text>

          {isTrending && (
            <View className="flex-row items-center bg-red-500/10 self-start px-2 py-0.5 rounded-md">
              <Ionicons name="flame" size={10} color="#EF4444" />
              <Text className="text-[#EF4444] text-[10px] ml-1 font-bold uppercase">
                Trending
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => router.push(`/user/${item.id}` as any)}
          className="w-10 h-10 rounded-full items-center justify-center bg-zinc-100 dark:bg-zinc-800"
        >
          <Ionicons name="chevron-forward" size={20} color={textColor} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderContent = () => {
    const data = (() => {
      switch (activeCategory) {
        case "music":
          return topSongs;
        case "artists":
          return topArtists;
        case "profiles":
          return rankedUsers;
        default:
          return explorePosts;
      }
    })();

    return (
      <FlatList
        data={data}
        key={activeCategory === "artists" ? "grid" : "list"}
        numColumns={activeCategory === "artists" ? 2 : 1}
        columnWrapperStyle={
          activeCategory === "artists" ? { paddingHorizontal: 12 } : undefined
        }
        keyExtractor={(item) => item.id || item.$id || Math.random().toString()}
        renderItem={({ item, index }) => {
          switch (activeCategory) {
            case "music":
              return renderMusicItem({ item });
            case "artists":
              return renderArtistItem({ item });
            case "profiles":
              return renderProfileItem({ item });
            default:
              return (
                <View
                  className="py-4 border-1 border-b"
                  style={{ borderColor: borderColor }}
                >
                  <PostItem
                    post={item}
                    currentUserId={user?.$id || ""}
                    onProfilePress={(id) => router.push(`/user/${id}` as any)}
                    onCommentPress={(id) => router.push(`/post/${id}` as any)}
                    onOptionsPress={() => handleOpenOptions(item)}
                    onSharePress={() => handleShare(item.$id)}
                  />
                </View>
              );
          }
        }}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center justify-center mt-20 opacity-50">
              <Ionicons name="planet-outline" size={60} color={subTextColor} />
              <Text
                className="text-center mt-4 font-medium"
                style={{ color: subTextColor }}
              >
                {t("explore.noResults")}
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
      />
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FlingGestureHandler
        direction={Directions.RIGHT}
        onHandlerStateChange={handleFlingRight}
      >
        <FlingGestureHandler
          direction={Directions.LEFT}
          onHandlerStateChange={handleFlingLeft}
        >
          <View style={{ flex: 1, backgroundColor: bgColor }}>
            <SafeAreaView className="flex-1" edges={["top"]}>
              <StatusBar style={isDark ? "light" : "dark"} />
              {renderContent()}

              <ShareModal
                isVisible={isShareVisible}
                onClose={() => setShareVisible(false)}
                postId={postToShare}
              />

              <OptionsModal
                isVisible={isOptionsVisible}
                onClose={() => setOptionsVisible(false)}
                onDelete={handleDeleteAction}
                onReport={handleReportAction}
                isOwner={
                  user?.$id && selectedPost
                    ? (selectedPost.postedBy?.$id ||
                        selectedPost.creator?.id ||
                        getCreatorFromPost(selectedPost).id) === user.$id
                    : false
                }
              />
            </SafeAreaView>
          </View>
        </FlingGestureHandler>
      </FlingGestureHandler>
    </GestureHandlerRootView>
  );
};

export default Explore;
