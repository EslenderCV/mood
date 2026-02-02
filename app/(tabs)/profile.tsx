import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  RefreshControl,
  Modal,
} from "react-native";
import React, { useState, useRef, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image"; // 🔥 Premium Image
import * as Haptics from "expo-haptics"; // 🔥 Haptics
import { router, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";

import { useGlobalContext } from "@/context/GlobalProvider";
import { getUserPosts, getFollowCounts } from "@/lib/appwrite";
import { useLanguage } from "@/context/LanguageContext";

// Componentes Premium
import ProfileSkeleton from "@/components/profile/ProfileSkeleton";
import MoodGridItem from "@/components/profile/MoodGridItem";
import TopSongItem from "@/components/profile/TopSongItem";

const { width } = Dimensions.get("window");

const Profile = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();
  const { user } = useGlobalContext();

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const cardBg = isDark ? "#18181B" : "#F4F4F5";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const iconColor = isDark ? "#FFFFFF" : "#000000";
  const statBorder = isDark ? "#3F3F46" : "#E4E4E7";

  const [activeTab, setActiveTab] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);

  const [data, setData] = useState({
    posts: [] as any[],
    topSongs: [] as any[],
    stats: { followersCount: 0, followingCount: 0 },
    isLoading: true,
    refreshing: false,
  });

  const mainScrollRef = useRef<ScrollView>(null);

  // Lógica de Ranking
  const rankPosts = useCallback((postsToSort: any[]) => {
    const now = new Date().getTime();
    return postsToSort
      .map((post) => {
        let score = 0;
        const likesCount = post.likedBy ? post.likedBy.length : 0;
        score += likesCount * 4;
        const postDate = new Date(
          post.originalTime || post.$createdAt,
        ).getTime();
        const hoursAgo = (now - postDate) / (1000 * 60 * 60);
        score -= hoursAgo * 0.2;
        return { ...post, score };
      })
      .sort((a, b) => b.score - a.score);
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const myId = user.$id;
      const [rawMyPosts, counts] = await Promise.all([
        getUserPosts(myId),
        getFollowCounts(myId),
      ]);
      const rankedMyPosts = rankPosts(rawMyPosts);
      const sortedByLikes = [...rawMyPosts].sort((a, b) => {
        const likesA = a.likedBy ? a.likedBy.length : 0;
        const likesB = b.likedBy ? b.likedBy.length : 0;
        return likesB - likesA;
      });

      const top3 = sortedByLikes
        .filter((post) => post.likedBy && post.likedBy.length > 0)
        .slice(0, 3)
        .map((post) => {
          try {
            const song = JSON.parse(post.songData);
            if (song.cover?.includes("100x100bb")) {
              song.cover = song.cover.replace("100x100bb", "600x600bb");
            }
            return {
              ...song,
              postId: post.$id,
              likes: post.likedBy ? post.likedBy.length : 0,
            };
          } catch {
            return null;
          }
        })
        .filter((item) => item !== null);

      setData((prev) => ({
        ...prev,
        posts: rankedMyPosts,
        topSongs: top3,
        stats: counts,
        isLoading: false,
        refreshing: false,
      }));
    } catch (error) {
      console.log("Error cargando perfil:", error);
      setData((prev) => ({ ...prev, isLoading: false, refreshing: false }));
    }
  }, [rankPosts, user]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setData((prev) => ({ ...prev, refreshing: true }));
    await fetchData();
  };

  const handleTabPress = (index: number) => {
    if (activeTab !== index) Haptics.selectionAsync();
    setActiveTab(index);
  };

  const scrollToMoods = () => {
    mainScrollRef.current?.scrollTo({ y: 400, animated: true });
    handleTabPress(0);
  };

  if (data.isLoading) {
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

      {/* Modal Foto Perfil Full Screen */}
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
            contentFit="contain"
            transition={300}
          />
        </View>
      </Modal>

      <ScrollView
        ref={mainScrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
        refreshControl={
          <RefreshControl
            refreshing={data.refreshing}
            onRefresh={onRefresh}
            tintColor="#5E17EB"
          />
        }
      >
        {/* HEADER */}
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

        {/* INFO USUARIO */}
        <View className="items-center">
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              setShowImageModal(true);
            }}
            activeOpacity={0.8}
            className="p-1 rounded-full border-2 border-[#5E17EB] shadow-lg shadow-[#5E17EB]/50"
          >
            <Image
              source={
                user?.pfp ? { uri: user.pfp } : require("@/assets/noPfp.jpg")
              }
              style={{ width: 128, height: 128, borderRadius: 999 }}
              contentFit="cover"
              transition={500}
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

        {/* ESTADÍSTICAS */}
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
              {data.stats.followersCount}
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
              {data.posts.length}
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
              {data.stats.followingCount}
            </Text>
            <Text
              className="text-[10px] font-bold mt-1"
              style={{ color: subTextColor }}
            >
              {t("profile.stats.following")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* TABS */}
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

        {/* CONTENIDO */}
        <View className="min-h-[200px]">
          {activeTab === 0 ? (
            <View>
              {data.posts.length === 0 ? (
                <View className="flex-1 justify-center items-center py-10">
                  <Text style={{ color: subTextColor }}>
                    {t("profile.empty.posts")}
                  </Text>
                </View>
              ) : (
                <View className="flex-row flex-wrap">
                  {data.posts.map((item) => (
                    <MoodGridItem
                      key={item.$id}
                      item={item}
                      cardBg={cardBg}
                      borderColor={borderColor}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View>
              {data.topSongs.length === 0 ? (
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
                  {data.topSongs.map((song, index) => (
                    <TopSongItem
                      key={song.postId || index}
                      item={song}
                      index={index}
                      textColor={textColor}
                      subTextColor={subTextColor}
                      cardBg={cardBg}
                      borderColor={borderColor}
                      activeColor="#5E17EB"
                      isDark={isDark}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};
export default Profile;
