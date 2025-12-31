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
} from "@/lib/appwrite";

const { width } = Dimensions.get("window");
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
  const [stats, setStats] = useState({ followersCount: 0, followingCount: 0 });
  const [followLoading, setFollowLoading] = useState(false);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const mainScrollRef = useRef<ScrollView>(null);

  const fetchData = async () => {
    if (!userId) return;
    try {
      const myUser = await getCurrentUser();
      const userData = await getUser(userId);

      setCurrentUser(myUser);
      setVisitedUser(userData);

      let currentStatus = null;
      if (myUser && userData) {
        currentStatus = await checkFollowStatus(myUser.$id, userData.$id);
        setFollowStatus(currentStatus);
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

  const handleBlockUser = async () => {
    Alert.alert(
      "Bloquear usuario",
      "No podrán ver tu perfil, posts ni enviarte mensajes. ¿Estás seguro?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Bloquear",
          style: "destructive",
          onPress: async () => {
            try {
              if (!currentUser || !visitedUser) return;
              await blockUser(currentUser.$id, visitedUser.$id);
              Alert.alert("Usuario bloqueado", "", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert("Error", "No se pudo bloquear al usuario.");
            }
          },
        },
      ]
    );
  };

  const handleOptions = () => {
    if (!currentUser || !visitedUser) return;
    if (currentUser.$id === visitedUser.$id) {
      router.push("/(settings)/privacy" as any);
      return;
    }
    Alert.alert("Opciones", "", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Bloquear Usuario",
        style: "destructive",
        onPress: handleBlockUser,
      },
    ]);
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

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    horizontalScrollRef.current?.scrollTo({ x: index * width, animated: true });
  };

  const scrollToMoods = () => {
    mainScrollRef.current?.scrollTo({ y: 450, animated: true });
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

  if (!visitedUser) {
    return (
      <SafeAreaView
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: bgColor }}
      >
        <Text style={{ color: textColor }}>Usuario no encontrado</Text>
      </SafeAreaView>
    );
  }

  const iBlockedThem = currentUser?.blockedUsers?.includes(visitedUser?.$id);
  const theyBlockedMe = visitedUser?.blockedUsers?.includes(currentUser?.$id);

  if (iBlockedThem || theyBlockedMe) {
    return (
      <SafeAreaView
        className="flex-1"
        edges={["top"]}
        style={{ backgroundColor: bgColor }}
      >
        <View className="flex-row justify-between items-center px-6 py-2 mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-full"
            style={{ backgroundColor: cardBg }}
          >
            <Ionicons name="arrow-back" size={24} color={iconColor} />
          </TouchableOpacity>
          <Text className="text-xl font-bold" style={{ color: textColor }}>
            Perfil
          </Text>
          <TouchableOpacity onPress={handleOptions} className="p-2">
            <Ionicons name="ellipsis-horizontal" size={24} color={iconColor} />
          </TouchableOpacity>
        </View>
        <View className="flex-1 justify-center items-center px-10">
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: cardBg }}
          >
            <Ionicons name="ban-outline" size={50} color={subTextColor} />
          </View>
          <Text
            className="font-bold text-xl text-center"
            style={{ color: textColor }}
          >
            Perfil no disponible
          </Text>
          <Text className="text-center mt-2" style={{ color: subTextColor }}>
            {iBlockedThem
              ? "Has bloqueado a este usuario."
              : "No se puede mostrar la información de este perfil."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPrivateAccount = visitedUser?.isPrivate;
  const isMe = currentUser?.$id === visitedUser?.$id;
  const showContent = isMe || !isPrivateAccount || followStatus === "accepted";

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: bgColor }}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
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
          <Text className="text-xl font-bold" style={{ color: textColor }}>
            Perfil
          </Text>
          <TouchableOpacity onPress={handleOptions} className="p-2">
            <Ionicons name="ellipsis-horizontal" size={24} color={iconColor} />
          </TouchableOpacity>
        </View>
        <View className="items-center">
          <View className="p-1 rounded-full border-2 border-[#5E17EB] shadow-lg shadow-[#5E17EB]/30">
            <Image
              source={
                visitedUser?.pfp
                  ? { uri: visitedUser.pfp }
                  : require("@/assets/noPfp.jpg")
              }
              className="w-32 h-32 rounded-full"
              style={{ backgroundColor: cardBg }}
            />
          </View>
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
        <View className="px-6 mt-6 min-h-[50px] justify-center">
          {currentUser && currentUser.$id !== visitedUser.$id && (
            <TouchableOpacity
              onPress={handleFollowAction}
              disabled={followLoading}
              className="w-full py-3 rounded-2xl items-center justify-center border"
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
                    ? "Siguiendo"
                    : followStatus === "pending"
                    ? "Solicitado"
                    : "Seguir"}
                </Text>
              )}
            </TouchableOpacity>
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
              })
            }
          >
            <Text className="text-xl font-bold" style={{ color: textColor }}>
              {stats.followersCount}
            </Text>
            <Text
              className="text-[10px] font-bold mt-1"
              style={{ color: subTextColor }}
            >
              SEGUIDORES
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
              MOODS
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
              })
            }
          >
            <Text className="text-xl font-bold" style={{ color: textColor }}>
              {stats.followingCount}
            </Text>
            <Text
              className="text-[10px] font-bold mt-1"
              style={{ color: subTextColor }}
            >
              SEGUIDOS
            </Text>
          </TouchableOpacity>
        </View>
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
                MOODS
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
                TOP HITS
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {!showContent ? (
          <View className="items-center justify-center py-20 px-6">
            <View
              className="w-20 h-20 rounded-full border-2 items-center justify-center mb-4"
              style={{ borderColor: borderColor }}
            >
              <Ionicons
                name="lock-closed-outline"
                size={40}
                color={iconColor}
              />
            </View>
            <Text className="font-bold text-lg" style={{ color: textColor }}>
              Esta cuenta es privada
            </Text>
            <Text className="text-center mt-2" style={{ color: subTextColor }}>
              Sigue a esta cuenta para ver sus moods y playlists.
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
                <View className="flex-1 justify-center items-center py-20">
                  <Ionicons
                    name="images-outline"
                    size={48}
                    color={subTextColor}
                  />
                  <Text className="mt-4" style={{ color: subTextColor }}>
                    No hay publicaciones aún
                  </Text>
                </View>
              ) : (
                <View className="flex-row flex-wrap">
                  {posts.map(renderMoodItem)}
                </View>
              )}
            </View>
            <View style={{ width }} className="min-h-[200px]">
              {topSongs.length === 0 ? (
                <View className="flex-1 justify-center items-center py-10">
                  <Ionicons
                    name="musical-note"
                    size={40}
                    color={subTextColor}
                  />
                  <Text className="mt-2" style={{ color: subTextColor }}>
                    No hay canciones populares aún
                  </Text>
                </View>
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
