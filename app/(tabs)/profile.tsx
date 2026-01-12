import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
  Modal,
} from "react-native";
import React, { useState, useRef, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { useGlobalContext } from "@/context/GlobalProvider";
import { router, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { getUserPosts, getFollowCounts } from "@/lib/appwrite";
import { useLanguage } from "@/context/LanguageContext";

const { width } = Dimensions.get("window");

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

// --- SKELETON LOADER ---
const ProfileSkeleton = ({ isDark }: { isDark: boolean }) => {
  const bg = isDark ? "bg-zinc-900" : "bg-zinc-100";
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  const { width } = useWindowDimensions();
  const itemSize = width / 3;

  return (
    <View className="flex-1 animate-pulse">
      <View className="flex-row justify-between items-center px-6 py-2 mb-6">
        <View className={`w-32 h-8 rounded ${elementBg}`} />
        <View className={`w-10 h-10 rounded-2xl ${elementBg}`} />
      </View>
      <View className="items-center mb-8">
        <View className={`w-32 h-32 rounded-full ${elementBg} mb-4`} />
        <View className={`w-40 h-6 rounded ${elementBg} mb-2`} />
        <View className={`w-24 h-4 rounded ${elementBg}`} />
      </View>
      <View
        className={`mx-4 h-[70px] mb-6 rounded-3xl ${bg} flex-row items-center justify-between px-6`}
      >
        <View className="items-center gap-2">
          <View className={`w-8 h-5 rounded ${elementBg}`} />
          <View className={`w-12 h-3 rounded ${elementBg}`} />
        </View>
        <View className={`w-[1px] h-8 ${elementBg}`} />
        <View className="items-center gap-2">
          <View className={`w-8 h-5 rounded ${elementBg}`} />
          <View className={`w-12 h-3 rounded ${elementBg}`} />
        </View>
        <View className={`w-[1px] h-8 ${elementBg}`} />
        <View className="items-center gap-2">
          <View className={`w-8 h-5 rounded ${elementBg}`} />
          <View className={`w-12 h-3 rounded ${elementBg}`} />
        </View>
      </View>
      <View className="flex-row px-4 mb-4 gap-4">
        <View className={`flex-1 h-10 rounded-xl ${elementBg}`} />
        <View className={`flex-1 h-10 rounded-xl ${bg}`} />
      </View>
      <View className="flex-row flex-wrap">
        {[...Array(12)].map((_, i) => (
          <View
            key={i}
            style={{ width: itemSize, height: itemSize, padding: 1 }}
          >
            <View className={`w-full h-full ${elementBg}`} />
          </View>
        ))}
      </View>
    </View>
  );
};

const Profile = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();
  const { user } = useGlobalContext();

  // Colores
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const cardBg = isDark ? "#18181B" : "#F4F4F5";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const iconColor = isDark ? "#FFFFFF" : "#000000";
  const statBorder = isDark ? "#3F3F46" : "#E4E4E7";

  const [activeTab, setActiveTab] = useState(0);
  const [posts, setPosts] = useState<any[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [stats, setStats] = useState({ followersCount: 0, followingCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const mainScrollRef = useRef<ScrollView>(null);

  const rankPosts = (postsToSort: any[]) => {
    const now = new Date().getTime();
    return postsToSort
      .map((post) => {
        let score = 0;
        const likesCount = post.likedBy ? post.likedBy.length : 0;
        score += likesCount * 4;
        const postDate = new Date(post.$createdAt).getTime();
        const hoursAgo = (now - postDate) / (1000 * 60 * 60);
        score -= hoursAgo * 0.2;
        return { ...post, score };
      })
      .sort((a, b) => b.score - a.score);
  };

  const fetchData = async () => {
    if (!user) return;
    try {
      const myId = user.$id;
      const rawMyPosts = await getUserPosts(myId);
      const rankedMyPosts = rankPosts(rawMyPosts);
      setPosts(rankedMyPosts);

      const sortedByLikes = [...rawMyPosts].sort((a, b) => {
        const likesA = a.likedBy ? a.likedBy.length : 0;
        const likesB = b.likedBy ? b.likedBy.length : 0;
        return likesB - likesA;
      });
      const top3 = sortedByLikes
        .filter((post) => post.likedBy && post.likedBy.length > 0)
        .slice(0, 3)
        .map((post) => {
          const songData = parseSongFromPost(post.songData);
          if (!songData) return null;
          return {
            ...songData,
            postId: post.$id,
            likes: post.likedBy ? post.likedBy.length : 0,
          };
        })
        .filter((item) => item !== null);
      setTopSongs(top3);

      const counts = await getFollowCounts(myId);
      setStats(counts);
    } catch (error) {
      console.log("Error cargando perfil:", error);
    } finally {
      setIsLoading(false);
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

  const handleTabPress = (index: number) => {
    setActiveTab(index);
  };

  const scrollToMoods = () => {
    mainScrollRef.current?.scrollTo({ y: 400, animated: true });
    handleTabPress(0);
  };

  const renderMoodItem = (item: any) => {
    const songData = parseSongFromPost(item.songData);
    const imageUrl = songData
      ? songData.cover
      : "https://via.placeholder.com/300";

    return (
      <TouchableOpacity
        key={item.$id}
        activeOpacity={0.8}
        onPress={() => router.push(`/post/${item.$id}` as any)}
        style={{
          width: "33.3333%",
          aspectRatio: 1,
          padding: 0.5,
        }}
      >
        <Image
          source={{ uri: imageUrl }}
          style={{ width: "100%", height: "100%", backgroundColor: cardBg }}
          className="border-[0.5px] border-black/10 dark:border-white/10"
          resizeMode="cover"
        />
        {item.likedBy && item.likedBy.length > 0 && (
          <View className="absolute bottom-1 right-1 bg-black/60 px-1 rounded flex-row items-center">
            <Ionicons name="heart" size={10} color="white" />
            <Text className="text-white text-[10px] ml-1">
              {item.likedBy.length}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderMusicItem = (item: any, index: number) => (
    <TouchableOpacity
      key={item.postId || index}
      onPress={() => router.push(`/post/${item.postId}` as any)}
      className="flex-row items-center px-6 py-3 border-b w-full"
      style={{ borderColor: borderColor }}
    >
      <Text className="text-[#5E17EB] font-bold text-lg mr-4 w-4 text-center">
        {index + 1}
      </Text>
      <Image
        source={{ uri: item.cover }}
        className="w-14 h-14 rounded-xl mr-4"
        style={{ backgroundColor: cardBg }}
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
          className="text-sm"
          numberOfLines={1}
          style={{ color: subTextColor }}
        >
          {item.artist}
        </Text>
      </View>
      <View
        className="flex-row items-center px-2 py-1 rounded-lg"
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F4F4F5",
        }}
      >
        <Ionicons
          name="heart"
          size={12}
          color="#EF4444"
          style={{ marginRight: 4 }}
        />
        <Text className="text-xs font-bold" style={{ color: textColor }}>
          {item.likes}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1"
        edges={["top"]}
        style={{ backgroundColor: bgColor }}
      >
        <ProfileSkeleton isDark={isDark} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: bgColor }}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* --- MODAL FOTO COMPLETA --- */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View className="flex-1 bg-black/95 justify-center items-center">
          <TouchableOpacity
            onPress={() => setShowImageModal(false)}
            className="absolute top-12 right-6 z-50 p-2"
          >
            <Ionicons name="close-circle" size={32} color="white" />
          </TouchableOpacity>
          <Image
            source={
              user?.pfp ? { uri: user.pfp } : require("@/assets/noPfp.jpg")
            }
            style={{ width: width, height: width }}
            resizeMode="contain"
          />
        </View>
      </Modal>

      <ScrollView
        ref={mainScrollRef}
        showsVerticalScrollIndicator={false}
        // Se ha eliminado stickyHeaderIndices para que las tabs no bajen
        contentContainerStyle={{ paddingBottom: 50 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5E17EB"
          />
        }
      >
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-2 mb-6">
          <Text className="text-3xl font-bold" style={{ color: textColor }}>
            {t("profile.title")}
          </Text>
          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={() => router.push("/editScreen" as any)}
              className="p-3 rounded-2xl"
              style={{ backgroundColor: cardBg }}
            >
              <Feather name="edit-2" size={20} color={iconColor} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Avatar */}
        <View className="items-center">
          <TouchableOpacity
            onPress={() => setShowImageModal(true)}
            activeOpacity={0.8}
            className="p-1 rounded-full border-2 border-[#5E17EB] shadow-lg shadow-[#5E17EB]/50"
          >
            <Image
              source={
                user?.pfp ? { uri: user.pfp } : require("@/assets/noPfp.jpg")
              }
              className="w-32 h-32 rounded-full"
              style={{ backgroundColor: cardBg }}
            />
          </TouchableOpacity>

          <View className="flex-row items-center mt-4">
            <Text className="text-2xl font-bold" style={{ color: textColor }}>
              {user?.name || "Usuario"}
            </Text>
            {(user as any)?.isVerified && (
              <MaterialIcons
                name="verified"
                size={22}
                color="#5E17EB"
                style={{ marginLeft: 6 }}
              />
            )}
          </View>

          <Text className="text-[#5E17EB] font-medium mt-1">
            @{user?.username || "usuario"}
          </Text>
        </View>

        {/* Stats */}
        <View
          className="flex-row justify-between items-center mx-4 h-[70px] mt-8 mb-6 px-2 rounded-3xl border shadow-sm"
          style={{ backgroundColor: cardBg, borderColor: borderColor }}
        >
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/user-list",
                params: { userId: user?.$id, type: "followers" },
              } as any)
            }
            className="flex-1 items-center py-4"
          >
            <Text className="text-xl font-bold" style={{ color: textColor }}>
              {stats.followersCount}
            </Text>
            <Text
              className="text-[10px] font-bold mt-1"
              style={{ color: subTextColor }}
            >
              {t("profile.stats.followers")}
            </Text>
          </TouchableOpacity>
          <View
            className="h-8 w-[1px]"
            style={{ backgroundColor: statBorder }}
          />
          <TouchableOpacity
            onPress={scrollToMoods}
            className="flex-1 items-center py-4"
          >
            <Text className="text-xl font-bold" style={{ color: textColor }}>
              {posts.length}
            </Text>
            <Text
              className="text-[10px] font-bold mt-1"
              style={{ color: subTextColor }}
            >
              {t("profile.stats.moods")}
            </Text>
          </TouchableOpacity>
          <View
            className="h-8 w-[1px]"
            style={{ backgroundColor: statBorder }}
          />
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/user-list",
                params: { userId: user?.$id, type: "following" },
              } as any)
            }
            className="flex-1 items-center py-4"
          >
            <Text className="text-xl font-bold" style={{ color: textColor }}>
              {stats.followingCount}
            </Text>
            <Text
              className="text-[10px] font-bold mt-1"
              style={{ color: subTextColor }}
            >
              {t("profile.stats.following")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tabs (NO Sticky) */}
        <View
          className="pt-2 border-t"
          style={{ backgroundColor: bgColor, borderColor: borderColor }}
        >
          <View className="flex-row px-4 mb-4 gap-4">
            <TouchableOpacity
              onPress={() => handleTabPress(0)}
              className="flex-1 py-3 rounded-xl items-center justify-center flex-row"
              style={{
                backgroundColor: activeTab === 0 ? "#5E17EB" : "transparent",
              }}
            >
              <Ionicons
                name="grid"
                size={18}
                color={activeTab === 0 ? "white" : subTextColor}
                style={{ marginRight: 8 }}
              />
              <Text
                className="font-bold"
                style={{ color: activeTab === 0 ? "white" : subTextColor }}
              >
                {t("profile.tabs.moods")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleTabPress(1)}
              className="flex-1 py-3 rounded-xl items-center justify-center flex-row"
              style={{
                backgroundColor: activeTab === 1 ? "#5E17EB" : "transparent",
              }}
            >
              <Ionicons
                name="musical-notes"
                size={18}
                color={activeTab === 1 ? "white" : subTextColor}
                style={{ marginRight: 8 }}
              />
              <Text
                className="font-bold"
                style={{ color: activeTab === 1 ? "white" : subTextColor }}
              >
                {t("profile.tabs.topHits")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View className="min-h-[200px]">
          {activeTab === 0 ? (
            <View>
              {posts.length === 0 ? (
                <View className="flex-1 justify-center items-center py-10">
                  <Text style={{ color: subTextColor }}>
                    {t("profile.empty.posts")}
                  </Text>
                </View>
              ) : (
                <View className="flex-row flex-wrap">
                  {posts.map(renderMoodItem)}
                </View>
              )}
            </View>
          ) : (
            <View>
              {topSongs.length === 0 ? (
                <View className="flex-1 justify-center items-center py-10">
                  <Ionicons
                    name="musical-note"
                    size={40}
                    color={isDark ? "#3f3f46" : "#E4E4E7"}
                  />
                  <Text className="mt-2" style={{ color: subTextColor }}>
                    {t("profile.empty.songs")}
                  </Text>
                </View>
              ) : (
                <View>
                  {topSongs.map((song, index) => renderMusicItem(song, index))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;