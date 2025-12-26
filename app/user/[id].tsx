import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

// Importamos las funciones de tu librería
import {
  getUser,
  getUserPosts,
  getCurrentUser,
  followUser,
  unfollowUser,
  checkIsFollowing,
  getFollowCounts,
} from "@/lib/appwrite";

const { width } = Dimensions.get("window");
const ITEM_SIZE = width / 3;

// --- FUNCIÓN AUXILIAR ---
const parseSongFromPost = (songDataString: string) => {
  try {
    if (!songDataString) return null;
    const song = JSON.parse(songDataString);

    // Mejorar resolución de imagen de Apple Music
    if (song.cover && song.cover.includes("100x100bb")) {
      song.cover = song.cover.replace("100x100bb", "600x600bb");
    }
    return song;
  } catch (error) {
    return null;
  }
};

const UserProfile = () => {
  const { id } = useLocalSearchParams();
  const userId = Array.isArray(id) ? id[0] : id;

  const [visitedUser, setVisitedUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);

  const [topSongs, setTopSongs] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [stats, setStats] = useState({ followersCount: 0, followingCount: 0 });
  const [followLoading, setFollowLoading] = useState(false);

  const horizontalScrollRef = useRef<ScrollView>(null);
  const mainScrollRef = useRef<ScrollView>(null);

  // --- LOGICA DE CARGA (MODIFICADA) ---
  const fetchData = async () => {
    if (!userId) return;
    try {
      // 1. Perfil visitado
      const userData = await getUser(userId);
      setVisitedUser(userData);

      // 2. Cargar Posts
      const userPosts = await getUserPosts(userId);
      setPosts(userPosts);

      // 3. CALCULAR TOP 3 (Solo con Likes > 0)
      const sortedPosts = [...userPosts].sort((a, b) => {
        const likesA = a.likedBy ? a.likedBy.length : 0;
        const likesB = b.likedBy ? b.likedBy.length : 0;
        return likesB - likesA;
      });

      const top3 = sortedPosts
        // --- FILTRO NUEVO: Solo posts con al menos 1 like ---
        .filter((post) => post.likedBy && post.likedBy.length > 0)
        // ----------------------------------------------------
        .slice(0, 3) // Tomamos máximo 3
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

      // 4. Estadísticas
      const counts = await getFollowCounts(userId);
      setStats(counts);

      // 5. Check Follow Status
      const myUser = await getCurrentUser();
      setCurrentUser(myUser);

      if (myUser && userData) {
        const followingStatus = await checkIsFollowing(
          myUser.$id,
          userData.$id
        );
        setIsFollowing(followingStatus);
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

  const handleFollowAction = async () => {
    if (!currentUser || !visitedUser || followLoading) return;
    if (currentUser.$id === visitedUser.$id) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(currentUser.$id, visitedUser.$id);
        setIsFollowing(false);
        setStats((prev) => ({
          ...prev,
          followersCount: Math.max(0, prev.followersCount - 1),
        }));
      } else {
        await followUser(currentUser.$id, visitedUser.$id);
        setIsFollowing(true);
        setStats((prev) => ({
          ...prev,
          followersCount: prev.followersCount + 1,
        }));
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

  // --- RENDER ITEMS ---
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
          style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
          className="border-[0.5px] border-black/20 bg-zinc-900"
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };

  const renderMusicItem = (item: any, index: number) => (
    <TouchableOpacity
      key={item.postId || index}
      onPress={() => router.push(`/post/${item.postId}` as any)}
      className="flex-row items-center px-6 py-3 border-b border-zinc-900/50 w-full"
    >
      <Text className="text-[#5E17EB] font-bold text-lg mr-4 w-4 text-center">
        {index + 1}
      </Text>

      <Image
        source={{ uri: item.cover }}
        className="w-14 h-14 rounded-xl mr-4 bg-zinc-800"
      />
      <View className="flex-1">
        <Text className="text-white font-bold text-base" numberOfLines={1}>
          {item.title}
        </Text>
        <Text className="text-zinc-500 text-sm" numberOfLines={1}>
          {item.artist}
        </Text>
      </View>

      <View className="flex-row items-center bg-zinc-800/50 px-2 py-1 rounded-lg">
        <Ionicons
          name="heart"
          size={12}
          color="#EF4444"
          style={{ marginRight: 4 }}
        />
        <Text className="text-white text-xs font-bold">{item.likes}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#5E17EB" />
      </SafeAreaView>
    );
  }

  if (!visitedUser) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center">
        <Text className="text-white">Usuario no encontrado</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      <StatusBar style="light" />
      <ScrollView
        ref={mainScrollRef}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[4]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
      >
        {/* HEADER */}
        <View className="flex-row justify-between items-center px-6 py-2 mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 bg-zinc-900 rounded-full"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Perfil</Text>
          <TouchableOpacity className="p-2">
            <Ionicons name="ellipsis-horizontal" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* INFO USUARIO */}
        <View className="items-center">
          <View className="p-1 rounded-full border-2 border-[#5E17EB] shadow-lg shadow-[#5E17EB]/50">
            <Image
              source={
                visitedUser?.pfp
                  ? { uri: visitedUser.pfp }
                  : require("../../assets/noPfp.jpg")
              }
              className="w-32 h-32 rounded-full"
            />
          </View>
          <Text className="text-white text-2xl font-bold mt-4">
            {visitedUser?.name || "Usuario"}
          </Text>
          <Text className="text-[#5E17EB] font-medium mt-1">
            @{visitedUser?.username || "usuario"}
          </Text>
        </View>

        {/* SEGUIR / SIGUIENDO */}
        {currentUser && currentUser.$id !== visitedUser.$id && (
          <View className="px-6 mt-6">
            <TouchableOpacity
              onPress={handleFollowAction}
              disabled={followLoading}
              className={`w-full py-3 rounded-2xl items-center justify-center border ${
                isFollowing
                  ? "bg-zinc-900 border-zinc-700"
                  : "bg-[#5E17EB] border-[#5E17EB]"
              }`}
            >
              {followLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text
                  className={`font-bold text-base ${
                    isFollowing ? "text-zinc-400" : "text-white"
                  }`}
                >
                  {isFollowing ? "Siguiendo" : "Seguir"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ESTADÍSTICAS */}
        <View className="flex-row justify-between items-center bg-zinc-900 mx-4 h-[70px] mt-6 mb-3 px-2 rounded-3xl border border-zinc-800">
          <TouchableOpacity
            className="flex-1 items-center py-4"
            onPress={() =>
              router.push({
                pathname: "/user-list",
                params: { userId: visitedUser.$id, type: "followers" },
              })
            }
          >
            <Text className="text-white text-xl font-bold">
              {stats.followersCount}
            </Text>
            <Text className="text-zinc-500 text-[10px] font-bold mt-1">
              SEGUIDORES
            </Text>
          </TouchableOpacity>

          <View className="h-8 w-[1px] bg-zinc-700" />

          <TouchableOpacity
            onPress={scrollToMoods}
            className="flex-1 items-center py-4"
          >
            <Text className="text-white text-xl font-bold">{posts.length}</Text>
            <Text className="text-zinc-500 text-[10px] font-bold mt-1">
              MOODS
            </Text>
          </TouchableOpacity>

          <View className="h-8 w-[1px] bg-zinc-700" />

          <TouchableOpacity
            className="flex-1 items-center py-4"
            onPress={() =>
              router.push({
                pathname: "/user-list",
                params: { userId: visitedUser.$id, type: "following" },
              })
            }
          >
            <Text className="text-white text-xl font-bold">
              {stats.followingCount}
            </Text>
            <Text className="text-zinc-500 text-[10px] font-bold mt-1">
              SEGUIDOS
            </Text>
          </TouchableOpacity>
        </View>

        {/* TABS */}
        <View className="bg-black pt-4">
          <View className="flex-row px-4 mb-4 gap-4">
            <TouchableOpacity
              onPress={() => handleTabPress(0)}
              className={`flex-1 py-3 rounded-xl items-center justify-center flex-row ${
                activeTab === 0 ? "bg-[#5E17EB]" : "bg-transparent"
              }`}
            >
              <Ionicons
                name="grid"
                size={18}
                color={activeTab === 0 ? "white" : "#71717A"}
                style={{ marginRight: 8 }}
              />
              <Text
                className={`font-bold ${
                  activeTab === 0 ? "text-white" : "text-zinc-500"
                }`}
              >
                MOODS
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleTabPress(1)}
              className={`flex-1 py-3 rounded-xl items-center justify-center flex-row ${
                activeTab === 1 ? "bg-[#5E17EB]" : "bg-transparent"
              }`}
            >
              <Ionicons
                name="musical-notes"
                size={18}
                color={activeTab === 1 ? "white" : "#71717A"}
                style={{ marginRight: 8 }}
              />
              <Text
                className={`font-bold ${
                  activeTab === 1 ? "text-white" : "text-zinc-500"
                }`}
              >
                TOP HITS
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CONTENIDO */}
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
          {/* TAB 1: MOODS */}
          <View style={{ width }} className="min-h-[200px]">
            {posts.length === 0 ? (
              <View className="flex-1 justify-center items-center py-20">
                <Ionicons name="images-outline" size={48} color="#27272a" />
                <Text className="text-zinc-500 mt-4">
                  No hay publicaciones aún
                </Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap">
                {posts.map(renderMoodItem)}
              </View>
            )}
          </View>

          {/* TAB 2: TOP HITS */}
          <View style={{ width }} className="min-h-[200px]">
            {topSongs.length === 0 ? (
              <View className="flex-1 justify-center items-center py-10">
                <Ionicons name="musical-note" size={40} color="#3f3f46" />
                <Text className="text-zinc-500 mt-2">
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
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default UserProfile;
