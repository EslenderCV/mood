import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Share,
  FlatList,
  Modal,
} from "react-native";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

import {
  getUser,
  getUserPosts,
  getCurrentUser,
  followUser,
  unfollowUser,
  checkFollowStatus,
  getFollowCounts,
  blockUser,
  createChat,
  getFollowedUserIds,
  getLatestUsers,
  client,
  appwriteConfig,
} from "@/lib/appwrite";
import { useLanguage } from "@/context/LanguageContext";

// Componentes Premium
import ProfileSkeleton from "@/components/profile/ProfileSkeleton";
import MoodGridItem from "@/components/profile/MoodGridItem";
import TopSongItem from "@/components/profile/TopSongItem";
import UserOptionsModal from "@/components/profile/UserOptionsModal";

const { width, height } = Dimensions.get("window");

const UserProfile = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const cardBg = isDark ? "#18181B" : "#F4F4F5";
  const activeColor = "#5E17EB";
  const iconColor = isDark ? "#FFFFFF" : "#000000";

  const params = useLocalSearchParams();
  const paramId = params.id || params.query;
  const userId = Array.isArray(paramId) ? paramId[0] : paramId;

  const [visitedUser, setVisitedUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followStatus, setFollowStatus] = useState<string | null>(null);
  const [isFollowingMe, setIsFollowingMe] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [stats, setStats] = useState({ followersCount: 0, followingCount: 0 });
  const [followLoading, setFollowLoading] = useState(false);

  const horizontalScrollRef = useRef<ScrollView>(null);
  const mainScrollRef = useRef<ScrollView>(null);

  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showFullImageModal, setShowFullImageModal] = useState(false);

  // REALTIME
  useEffect(() => {
    const unsubscribe = client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.postsCollectionId}.documents`,
      (response) => {
        const event = response.events[0];
        const payload = response.payload as any;
        if (event.includes(".update")) {
          setPosts((prevPosts) =>
            prevPosts.map((post) => {
              if (post.$id === payload.$id) {
                return { ...post, likedBy: payload.likedBy };
              }
              return post;
            }),
          );
        }
      },
    );
    return () => {
      unsubscribe();
    };
  }, []);

  const fetchData = async () => {
    if (!userId) return;
    try {
      const [myUser, targetUser] = await Promise.all([
        getCurrentUser(),
        getUser(userId),
      ]);

      if (!myUser) return;
      setCurrentUser(myUser);
      setVisitedUser(targetUser);

      if (!targetUser) return;

      const iBlockedThem = myUser?.blockedUsers?.includes(targetUser.$id);
      const theyBlockedMe = targetUser?.blockedUsers?.includes(myUser.$id);

      if (iBlockedThem || theyBlockedMe) {
        setPosts([]);
        setTopSongs([]);
        setIsLoading(false);
        return;
      }

      const [statusA, statusB, counts, userPosts, candidates, myFollowsIds] =
        await Promise.all([
          checkFollowStatus(myUser.$id, targetUser.$id),
          checkFollowStatus(targetUser.$id, myUser.$id),
          getFollowCounts(userId),
          getUserPosts(userId),
          getLatestUsers(),
          getFollowedUserIds(myUser.$id),
        ]);

      setFollowStatus(statusA);
      setIsFollowingMe(statusB === "accepted");
      setStats(counts);

      // Filtro de sugerencias
      const filteredSuggestions = candidates.filter((candidate: any) => {
        const cId = candidate.$id || candidate.accountId;
        const isMe = cId === myUser.$id;
        const isVisitedProfile = cId === userId;
        const amIFollowing = myFollowsIds.includes(cId);
        return !isMe && !isVisitedProfile && !amIFollowing;
      });
      setSuggestedUsers(filteredSuggestions.slice(0, 10));

      const isMe = myUser.$id === targetUser.$id;
      const isPublic = !targetUser.isPrivate;
      const isFollower = statusA === "accepted";

      if (isMe || isPublic || isFollower) {
        setPosts(userPosts);
        if (userPosts.length > 0) {
          const sortedPosts = [...userPosts].sort((a, b) => {
            const likesA = a.likedBy ? a.likedBy.length : 0;
            const likesB = b.likedBy ? b.likedBy.length : 0;
            return likesB - likesA;
          });

          const top3 = sortedPosts
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
          setTopSongs(top3);
        } else {
          setTopSongs([]);
        }
      } else {
        setPosts([]);
        setTopSongs([]);
      }
    } catch (error) {
      console.log("Error cargando perfil:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [userId]),
  );

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleShare = async () => {
    if (!visitedUser) return;
    try {
      const message = `¡Mira el perfil de ${visitedUser.username} en Mood! 🎵`;
      await Share.share({ message: message });
    } catch (error) {
      console.log("Error compartiendo:", error);
    }
  };

  const handleBlockUser = async () => {
    try {
      if (!currentUser || !visitedUser) return;
      await blockUser(currentUser.$id, visitedUser.$id);
      setShowOptionsModal(false);
      Alert.alert("Bloqueado", "El usuario ha sido bloqueado correctamente.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      setShowOptionsModal(false);
      Alert.alert("Error", "No se pudo bloquear al usuario.");
    }
  };

  const handleOptionsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!currentUser || !visitedUser) return;
    if (currentUser.$id === visitedUser.$id) {
      router.push("/(settings)/privacy" as any);
      return;
    }
    setShowOptionsModal(true);
  };

  const handleFollowAction = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!currentUser || !visitedUser || followLoading) return;
    if (currentUser.$id === visitedUser.$id) return;

    setFollowLoading(true);
    try {
      if (followStatus) {
        await unfollowUser(currentUser.$id, visitedUser.$id);
        setFollowStatus(null);
        if (followStatus === "accepted") {
          setStats((prev) => ({
            ...prev,
            followersCount: Math.max(0, prev.followersCount - 1),
          }));
        }
      } else {
        await followUser(currentUser.$id, visitedUser.$id);
        if (visitedUser.isPrivate) {
          setFollowStatus("pending");
        } else {
          setFollowStatus("accepted");
          setStats((prev) => ({
            ...prev,
            followersCount: prev.followersCount + 1,
          }));
        }
      }
    } catch (error) {
      console.log("Error follow/unfollow:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleChatPress = async () => {
    Haptics.selectionAsync();
    if (!currentUser || !visitedUser || isChatLoading) return;
    setIsChatLoading(true);
    try {
      const chatDoc = await createChat(currentUser.$id, visitedUser.$id);
      if (chatDoc && chatDoc.$id) {
        router.push(`/chat/${chatDoc.$id}` as any);
      } else {
        Alert.alert("Error", "No se pudo iniciar el chat.");
      }
    } catch (error) {
      console.error("Error al iniciar chat:", error);
      Alert.alert("Error", "Ocurrió un error al intentar abrir el chat.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleTabPress = (index: number) => {
    if (activeTab !== index) Haptics.selectionAsync();
    setActiveTab(index);
    horizontalScrollRef.current?.scrollTo({ x: index * width, animated: true });
  };
  const scrollToMoods = () => {
    mainScrollRef.current?.scrollTo({ y: 450, animated: true });
    handleTabPress(0);
  };

  // Render para usuarios sugeridos (Inline por tener poca lógica)
  const renderSuggestedUser = useCallback(
    ({ item }: { item: any }) => (
      <TouchableOpacity
        className="mr-3 p-3 rounded-2xl border w-[110px] items-center"
        style={{ backgroundColor: cardBg, borderColor: borderColor }}
        onPress={() =>
          router.push({
            pathname: "/user/[id]",
            params: {
              id: item.$id,
              username: item.username,
              avatar: item.pfp || item.avatar,
              name: item.name,
            },
          } as any)
        }
      >
        <Image
          source={
            item.pfp || item.avatar
              ? { uri: item.pfp || item.avatar }
              : require("@/assets/noPfp.jpg")
          }
          style={{ width: 56, height: 56, borderRadius: 999 }}
          contentFit="cover"
          transition={200}
        />
        <Text
          className="text-xs font-bold text-center mb-1 mt-2"
          numberOfLines={1}
          style={{ color: textColor }}
        >
          {item.name}
        </Text>
        <Text
          className="text-[10px] text-center mb-2"
          numberOfLines={1}
          style={{ color: subTextColor }}
        >
          @{item.username}
        </Text>
        <View className="bg-[#5E17EB]/10 w-full py-1 rounded-lg items-center">
          <Text className="text-[#5E17EB] text-[10px] font-bold">
            {t("profile.viewProfile")}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [cardBg, borderColor, isDark, textColor, subTextColor, t],
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

  if (
    !visitedUser ||
    currentUser?.blockedUsers?.includes(visitedUser?.$id) ||
    visitedUser?.blockedUsers?.includes(currentUser?.$id)
  ) {
    return (
      <SafeAreaView
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: bgColor }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute top-12 left-6 p-2 rounded-full"
          style={{ backgroundColor: cardBg }}
        >
          <Ionicons name="arrow-back" size={24} color={iconColor} />
        </TouchableOpacity>
        <Ionicons name="ban-outline" size={50} color={subTextColor} />
        <Text style={{ color: textColor, marginTop: 10 }}>
          {t("userProfile.unavailableMsg") || "Usuario no disponible"}
        </Text>
      </SafeAreaView>
    );
  }

  const isPrivateAccount = visitedUser?.isPrivate;
  const isMe = currentUser?.$id === visitedUser?.$id;
  const showContent = isMe || !isPrivateAccount || followStatus === "accepted";
  const pfpUrl = visitedUser?.pfp || null;

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: bgColor }}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Modal de Opciones (Bloqueo/Reporte) */}
      <UserOptionsModal
        visible={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        onBlock={handleBlockUser}
        username={visitedUser.username}
        isDark={isDark}
      />

      <Modal
        animationType="fade"
        transparent={true}
        visible={showFullImageModal}
        onRequestClose={() => setShowFullImageModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "black" }}>
          <SafeAreaView className="flex-1">
            <TouchableOpacity
              onPress={() => setShowFullImageModal(false)}
              className="absolute top-12 right-6 z-50 p-2 rounded-full bg-black/50"
            >
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
            <View className="flex-1 justify-center items-center">
              <Image
                source={
                  pfpUrl ? { uri: pfpUrl } : require("@/assets/noPfp.jpg")
                }
                style={{ width: width, height: height * 0.7 }}
                contentFit="contain"
              />
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      <ScrollView
        ref={mainScrollRef}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={activeColor}
          />
        }
        removeClippedSubviews={true}
      >
        <View>
          {/* Header NavBar */}
          <View className="flex-row justify-between items-center px-6 py-2 mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 rounded-full"
              style={{ backgroundColor: cardBg }}
            >
              <Ionicons name="arrow-back" size={24} color={iconColor} />
            </TouchableOpacity>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleShare}
                className="p-2 rounded-full"
                style={{ backgroundColor: cardBg }}
              >
                <Ionicons name="share-outline" size={22} color={iconColor} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleOptionsPress}
                className="p-2 rounded-full"
                style={{ backgroundColor: cardBg }}
              >
                <Ionicons
                  name={isMe ? "settings-outline" : "shield-checkmark-outline"}
                  size={22}
                  color={iconColor}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile Info */}
          <View className="items-center">
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                Haptics.selectionAsync();
                setShowFullImageModal(true);
              }}
              className="p-1 rounded-full border-2 border-[#5E17EB] shadow-lg shadow-[#5E17EB]/30"
            >
              <Image
                source={
                  pfpUrl ? { uri: pfpUrl } : require("@/assets/noPfp.jpg")
                }
                style={{ width: 128, height: 128, borderRadius: 999 }}
                contentFit="cover"
                transition={500}
              />
            </TouchableOpacity>

            <View className="flex-row items-center mt-4 justify-center">
              <Text
                className="text-2xl font-bold text-center"
                style={{ color: textColor }}
              >
                {visitedUser?.name || "Usuario"}
              </Text>
              {visitedUser?.isVerified && (
                <MaterialIcons
                  name="verified"
                  size={24}
                  color="#5E17EB"
                  style={{ marginLeft: 6 }}
                />
              )}
            </View>

            <Text className="font-medium mt-1" style={{ color: activeColor }}>
              @{visitedUser?.username || "usuario"}
            </Text>
          </View>

          {/* Botones de Acción */}
          {currentUser && currentUser.$id !== visitedUser.$id && (
            <View className="px-6 mt-6 min-h-[50px]">
              <View className="flex-row items-center gap-3 w-full">
                <TouchableOpacity
                  onPress={handleFollowAction}
                  disabled={followLoading}
                  className="flex-1 py-3 rounded-2xl items-center justify-center border"
                  style={{
                    backgroundColor: followStatus ? cardBg : activeColor,
                    borderColor: followStatus ? borderColor : activeColor,
                  }}
                >
                  {followLoading ? (
                    <ActivityIndicator
                      color={followStatus ? iconColor : "white"}
                      size="small"
                    />
                  ) : (
                    <Text
                      className="font-bold text-base"
                      style={{ color: followStatus ? subTextColor : "white" }}
                    >
                      {followStatus === "accepted"
                        ? isFollowingMe
                          ? "Friends"
                          : "Following"
                        : followStatus === "pending"
                          ? "Requested"
                          : isFollowingMe
                            ? "Follow Back"
                            : "Follow"}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleChatPress}
                  disabled={isChatLoading}
                  className="p-3 rounded-2xl border justify-center items-center aspect-square"
                  style={{ backgroundColor: cardBg, borderColor: borderColor }}
                >
                  {isChatLoading ? (
                    <ActivityIndicator color={activeColor} size="small" />
                  ) : (
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={24}
                      color={activeColor}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {currentUser && currentUser.$id === visitedUser.$id && (
            <View className="h-6" />
          )}

          {/* Stats */}
          <View
            className="flex-row justify-between items-center mx-4 h-[70px] mt-2 mb-3 px-2 rounded-3xl border shadow-sm"
            style={{
              backgroundColor: isDark ? "#121212" : "#FFFFFF",
              borderColor: borderColor,
            }}
          >
            <TouchableOpacity
              className="flex-1 items-center py-4"
              disabled={!showContent}
              onPress={() =>
                router.push({
                  pathname: "/user-list",
                  params: { userId: visitedUser.$id, type: "followers" },
                } as any)
              }
            >
              <Text className="text-xl font-bold" style={{ color: textColor }}>
                {stats.followersCount}
              </Text>
              <Text
                className="text-[10px] font-bold mt-1"
                style={{ color: subTextColor }}
              >
                {t("profile.stats.followers") || "Followers"}
              </Text>
            </TouchableOpacity>
            <View
              className="h-8 w-[1px]"
              style={{ backgroundColor: borderColor }}
            />
            <TouchableOpacity
              onPress={scrollToMoods}
              disabled={!showContent}
              className="flex-1 items-center py-4"
            >
              <Text className="text-xl font-bold" style={{ color: textColor }}>
                {posts.length}
              </Text>
              <Text
                className="text-[10px] font-bold mt-1"
                style={{ color: subTextColor }}
              >
                {t("profile.stats.moods") || "Moods"}
              </Text>
            </TouchableOpacity>
            <View
              className="h-8 w-[1px]"
              style={{ backgroundColor: borderColor }}
            />
            <TouchableOpacity
              className="flex-1 items-center py-4"
              disabled={!showContent}
              onPress={() =>
                router.push({
                  pathname: "/user-list",
                  params: { userId: visitedUser.$id, type: "following" },
                } as any)
              }
            >
              <Text className="text-xl font-bold" style={{ color: textColor }}>
                {stats.followingCount}
              </Text>
              <Text
                className="text-[10px] font-bold mt-1"
                style={{ color: subTextColor }}
              >
                {t("profile.stats.following") || "Following"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sugerencias */}
          {!isMe && suggestedUsers.length > 0 && (
            <View className="mb-6 pl-4">
              <Text
                className="text-lg font-bold mb-3"
                style={{ color: textColor }}
              >
                {t("profile.suggested")}
              </Text>
              <FlatList
                horizontal
                data={suggestedUsers}
                renderItem={renderSuggestedUser}
                keyExtractor={(item) => item.$id || item.accountId}
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}
        </View>

        {/* TABS */}
        <View
          className="pt-4"
          style={{
            backgroundColor: bgColor,
            display: !showContent ? "none" : "flex",
          }}
        >
          <View className="flex-row px-4 mb-4 gap-4">
            <TouchableOpacity
              onPress={() => handleTabPress(0)}
              className="flex-1 py-3 rounded-xl items-center justify-center flex-row"
              style={{
                backgroundColor: activeTab === 0 ? activeColor : "transparent",
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
                {t("profile.tabs.moods") || "Moods"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleTabPress(1)}
              className="flex-1 py-3 rounded-xl items-center justify-center flex-row"
              style={{
                backgroundColor: activeTab === 1 ? activeColor : "transparent",
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
                {t("profile.tabs.topHits") || "Top Hits"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {!showContent ? (
          <View className="items-center justify-center py-20 px-6">
            <Ionicons name="lock-closed-outline" size={40} color={iconColor} />
            <Text
              className="font-bold text-lg mt-4"
              style={{ color: textColor }}
            >
              {t("userProfile.privateTitle") || "Cuenta Privada"}
            </Text>
          </View>
        ) : (
          <ScrollView
            ref={horizontalScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setActiveTab(Math.round(e.nativeEvent.contentOffset.x / width))
            }
            scrollEventThrottle={16}
          >
            <View style={{ width }} className="min-h-[200px]">
              {posts.length === 0 ? (
                <Text
                  className="text-center mt-10"
                  style={{ color: subTextColor }}
                >
                  No posts
                </Text>
              ) : (
                <View className="flex-row flex-wrap">
                  {posts.map((item) => (
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
            <View style={{ width }} className="min-h-[200px]">
              {topSongs.length === 0 ? (
                <Text
                  className="text-center mt-10"
                  style={{ color: subTextColor }}
                >
                  No songs
                </Text>
              ) : (
                <View>
                  {topSongs.map((song, index) => (
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
          </ScrollView>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default UserProfile;
