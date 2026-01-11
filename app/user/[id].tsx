import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Share,
  FlatList,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
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
  getFeedCandidates,
  getFollowedUserIds,
  // sendPushNotification <-- ELIMINADO
} from "@/lib/appwrite";
import { useLanguage } from "@/context/LanguageContext";

const { width, height } = Dimensions.get("window");
const ITEM_SIZE = width / 3;

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
  const dangerColor = "#EF4444";

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
    return { id: "unknown", username: "anon", name: "Usuario", avatar: null };
  };
  const fetchData = async () => {
    if (!userId) return;

    try {
      const feedCandidates = await getFeedCandidates();
      const myFollows = await getFollowedUserIds(userId);

      const uniqueUsersMap = new Map();

      feedCandidates.forEach((post) => {
        const creator = getCreatorFromPost(post);
        if (
          creator.id !== "unknown" &&
          creator.id !== userId &&
          !myFollows.includes(creator.id)
        ) {
          if (!uniqueUsersMap.has(creator.id)) {
            uniqueUsersMap.set(creator.id, creator);
          }
        }
      });

      setSuggestedUsers(Array.from(uniqueUsersMap.values()).slice(0, 10));
      const myUser = await getCurrentUser();
      const userData = await getUser(userId);

      setCurrentUser(myUser);
      setVisitedUser(userData);

      let currentStatus = null;
      if (myUser && userData) {
        currentStatus = await checkFollowStatus(myUser.$id, userData.$id);
        setFollowStatus(currentStatus);
        const reverseStatus = await checkFollowStatus(userData.$id, myUser.$id);
        setIsFollowingMe(reverseStatus === "accepted");
      }

      const counts = await getFollowCounts(userId);
      setStats(counts);

      const iBlockedThem = myUser?.blockedUsers?.includes(userData?.$id);
      const theyBlockedMe = userData?.blockedUsers?.includes(myUser?.$id);

      if (iBlockedThem || theyBlockedMe) {
        setPosts([]);
        setTopSongs([]);
        return;
      }

      const isMe = myUser?.$id === userData?.$id;
      const isPublic = !userData?.isPrivate;
      const isFollower = currentStatus === "accepted";

      if (isMe || isPublic || isFollower) {
        const userPosts = await getUserPosts(userId);
        setPosts(userPosts);

        const sortedPosts = [...userPosts].sort((a, b) => {
          const likesA = a.likedBy ? a.likedBy.length : 0;
          const likesB = b.likedBy ? b.likedBy.length : 0;
          return likesB - likesA;
        });

        const top3 = sortedPosts
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
      } else {
        setPosts([]);
        setTopSongs([]);
      }
    } catch (error) {
      console.log("Error cargando perfil:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleShare = async () => {
    if (!visitedUser) return;
    try {
      const message = `¡Mira el perfil de ${visitedUser.username} en Mood! 🎵`;
      await Share.share({
        message: message,
      });
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
    if (!currentUser || !visitedUser) return;
    if (currentUser.$id === visitedUser.$id) {
      router.push("/(settings)/privacy" as any);
      return;
    }
    setShowOptionsModal(true);
  };

  const handleFollowAction = async () => {
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
        // La función followUser en appwrite.ts ya maneja:
        // 1. Crear el documento de follow
        // 2. Enviar la Push Notification automáticamente
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
    setActiveTab(index);
    horizontalScrollRef.current?.scrollTo({ x: index * width, animated: true });
  };
  const scrollToMoods = () => {
    mainScrollRef.current?.scrollTo({ y: 450, animated: true });
    handleTabPress(0);
  };
  const renderSuggestedUser = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="mr-3 p-3 rounded-2xl border w-[110px] items-center"
      style={{ backgroundColor: cardBg, borderColor: borderColor }}
      onPress={() =>
        router.push({
          pathname: "/user/[id]",
          params: {
            id: item.id,
            username: item.username,
            avatar: item.avatar,
            name: item.name,
          },
        } as any)
      }
    >
      <Image
        source={
          item.avatar ? { uri: item.avatar } : require("@/assets/noPfp.jpg")
        }
        className="w-14 h-14 rounded-full mb-2"
        style={{ backgroundColor: isDark ? "#27272A" : "#E4E4E7" }}
      />
      <Text
        className="text-xs font-bold text-center mb-1"
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
  );

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
      >
        <Image
          source={{ uri: imageUrl }}
          style={{
            width: ITEM_SIZE,
            height: ITEM_SIZE,
            backgroundColor: cardBg,
            borderColor: borderColor,
            borderWidth: 0.5,
          }}
          resizeMode="cover"
        />
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
      <Text
        className="font-bold text-lg mr-4 w-4 text-center"
        style={{ color: activeColor }}
      >
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
        style={{ backgroundColor: cardBg }}
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
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: bgColor }}
      >
        <ActivityIndicator size="large" color={activeColor} />
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

  const modalTitle = t("userProfile.actions.options");
  const displayModalTitle =
    modalTitle && modalTitle !== "userProfile.actions.options"
      ? modalTitle
      : "Opciones";

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: bgColor }}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <Modal
        animationType="fade"
        transparent={true}
        visible={showOptionsModal}
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <TouchableWithoutFeedback>
            <View
              style={{
                backgroundColor: isDark ? "#18181B" : "#FFFFFF",
                width: "80%",
                borderRadius: 24,
                padding: 24,
                borderWidth: 1,
                borderColor: borderColor,
              }}
            >
              <View className="items-center mb-6">
                <View className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center mb-4">
                  <Ionicons
                    name="shield-outline"
                    size={32}
                    color={dangerColor}
                  />
                </View>
                <Text
                  className="text-xl font-bold text-center mb-2"
                  style={{ color: textColor }}
                >
                  {displayModalTitle}
                </Text>
                <Text
                  className="text-center text-sm"
                  style={{ color: subTextColor }}
                >
                  ¿Deseas bloquear el acceso de @{visitedUser.username} a tu
                  perfil?
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleBlockUser}
                className="w-full py-4 rounded-xl bg-red-500 mb-3 items-center flex-row justify-center"
              >
                <Ionicons
                  name="ban"
                  size={20}
                  color="white"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-white font-bold text-base">
                  {t("userProfile.actions.block") || "Bloquear"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowOptionsModal(false)}
                className="w-full py-4 rounded-xl items-center"
                style={{ backgroundColor: cardBg }}
              >
                <Text
                  className="font-bold text-base"
                  style={{ color: textColor }}
                >
                  {t("userProfile.actions.cancel") || "Cancelar"}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
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
                resizeMode="contain"
              />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
      <ScrollView
        ref={mainScrollRef}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[4]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={activeColor}
          />
        }
      >
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
        <View className="items-center">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setShowFullImageModal(true)}
            className="p-1 rounded-full border-2 border-[#5E17EB] shadow-lg shadow-[#5E17EB]/30"
          >
            <Image
              source={pfpUrl ? { uri: pfpUrl } : require("@/assets/noPfp.jpg")}
              className="w-32 h-32 rounded-full"
              style={{ backgroundColor: cardBg }}
            />
          </TouchableOpacity>
          <Text
            className="text-2xl font-bold mt-4"
            style={{ color: textColor }}
          >
            {visitedUser?.name || "Usuario"}
          </Text>
          <Text className="font-medium mt-1" style={{ color: activeColor }}>
            @{visitedUser?.username || "usuario"}
          </Text>
        </View>
        <View className="px-6 mt-6 min-h-[50px]">
          {currentUser && currentUser.$id !== visitedUser.$id && (
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
          )}
        </View>
        <View
          className="flex-row justify-between items-center mx-4 h-[70px] mt-6 mb-3 px-2 rounded-3xl border shadow-sm"
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

        {suggestedUsers.length > 0 && (
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
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}
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
                  {posts.map(renderMoodItem)}
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
                  {topSongs.map((song, index) => renderMusicItem(song, index))}
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
