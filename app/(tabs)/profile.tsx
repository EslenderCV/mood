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
} from "react-native";
import React, { useState, useRef, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useGlobalContext } from "@/context/GlobalProvider";
import { router, useFocusEffect } from "expo-router";
import {
  getUserPosts,
  getFollowCounts,
  getFeedCandidates,
  getFollowedUserIds,
} from "@/lib/appwrite";

const { width } = Dimensions.get("window");
const ITEM_SIZE = width / 3;

// --- HELPERS ---
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
  return { id: "unknown", username: "anon", name: "Usuario", avatar: null };
};

const Profile = () => {
  const { user } = useGlobalContext();
  const [activeTab, setActiveTab] = useState(0);

  const [posts, setPosts] = useState<any[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ followersCount: 0, followingCount: 0 });

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const horizontalScrollRef = useRef<ScrollView>(null);
  const mainScrollRef = useRef<ScrollView>(null);

  // --- ALGORITMO DE RANKING ---
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

      // A. Cargar MIS Posts
      const rawMyPosts = await getUserPosts(myId);
      const rankedMyPosts = rankPosts(rawMyPosts);
      setPosts(rankedMyPosts);

      // B. Top 3 Canciones
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

      // C. Estadísticas
      const counts = await getFollowCounts(myId);
      setStats(counts);

      // D. RECOMENDACIONES
      const feedCandidates = await getFeedCandidates();
      const myFollows = await getFollowedUserIds(myId);

      const uniqueUsersMap = new Map();

      feedCandidates.forEach((post) => {
        const creator = getCreatorFromPost(post);
        if (
          creator.id !== "unknown" &&
          creator.id !== myId &&
          !myFollows.includes(creator.id)
        ) {
          if (!uniqueUsersMap.has(creator.id)) {
            uniqueUsersMap.set(creator.id, creator);
          }
        }
      });

      setSuggestedUsers(Array.from(uniqueUsersMap.values()).slice(0, 10));
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
    horizontalScrollRef.current?.scrollTo({ x: index * width, animated: true });
  };

  const scrollToMoods = () => {
    mainScrollRef.current?.scrollTo({ y: 500, animated: true });
    handleTabPress(0);
  };

  // --- RENDERIZADO ---

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

  const renderSuggestedUser = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="bg-zinc-900 mr-3 p-3 rounded-2xl border border-zinc-800 w-[110px] items-center"
      onPress={() =>
        router.push({
          pathname: "/user/[id]",
          params: {
            id: item.id,
            username: item.username,
            avatar: item.avatar,
            name: item.name,
          },
        })
      }
    >
      <Image
        source={
          item.avatar ? { uri: item.avatar } : require("@/assets/noPfp.jpg")
        }
        className="w-14 h-14 rounded-full mb-2 bg-zinc-800"
      />
      <Text
        className="text-white text-xs font-bold text-center mb-1"
        numberOfLines={1}
      >
        {item.name}
      </Text>
      <Text
        className="text-zinc-500 text-[10px] text-center mb-2"
        numberOfLines={1}
      >
        @{item.username}
      </Text>
      <View className="bg-[#5E17EB]/20 w-full py-1 rounded-lg items-center">
        <Text className="text-[#5E17EB] text-[10px] font-bold">Ver Perfil</Text>
      </View>
    </TouchableOpacity>
  );

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
          <Text className="text-white text-3xl font-bold">Perfil</Text>
          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={() => router.push("/editScreen")}
              className="bg-zinc-800 p-3 rounded-2xl"
            >
              <Feather name="edit-2" size={20} color="white" />
            </TouchableOpacity>
            {/* BOTÓN CERRAR SESIÓN ELIMINADO AQUÍ */}
          </View>
        </View>

        {/* INFO USUARIO */}
        <View className="items-center">
          <View className="p-1 rounded-full border-2 border-[#5E17EB] shadow-lg shadow-[#5E17EB]/50">
            <Image
              source={
                user?.pfp ? { uri: user.pfp } : require("@/assets/noPfp.jpg")
              }
              className="w-32 h-32 rounded-full"
            />
          </View>
          <Text className="text-white text-2xl font-bold mt-4">
            {user?.name || "Usuario"}
          </Text>
          <Text className="text-[#5E17EB] font-medium mt-1">
            @{user?.username || "usuario"}
          </Text>
        </View>

        {/* ESTADÍSTICAS */}
        <View className="flex-row justify-between items-center bg-zinc-900 mx-4 h-[70px] mt-8 mb-6 px-2 rounded-3xl border border-zinc-800">
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/user-list",
                params: { userId: user?.$id, type: "followers" },
              })
            }
            className="flex-1 items-center py-4"
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
            onPress={() =>
              router.push({
                pathname: "/user-list",
                params: { userId: user?.$id, type: "following" },
              })
            }
            className="flex-1 items-center py-4"
          >
            <Text className="text-white text-xl font-bold">
              {stats.followingCount}
            </Text>
            <Text className="text-zinc-500 text-[10px] font-bold mt-1">
              SEGUIDOS
            </Text>
          </TouchableOpacity>
        </View>

        {/* GENTE QUE PODRÍAS CONOCER */}
        {suggestedUsers.length > 0 && (
          <View className="mb-6 pl-4">
            <Text className="text-white text-lg font-bold mb-3">
              Gente que podrías conocer
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

        {/* TABS STICKY */}
        <View className="bg-black pt-2 border-t border-zinc-900">
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

        {/* CONTENIDO TABS */}
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
            {isLoading ? (
              <View className="flex-1 justify-center items-center py-10">
                <ActivityIndicator size="large" color="#5E17EB" />
              </View>
            ) : posts.length === 0 ? (
              <View className="flex-1 justify-center items-center py-10">
                <Text className="text-zinc-500">No hay publicaciones aún</Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap">
                {posts.map(renderMoodItem)}
              </View>
            )}
          </View>

          {/* TAB 2: TOP HITS */}
          <View style={{ width }} className="min-h-[200px]">
            {isLoading ? (
              <View className="flex-1 justify-center items-center py-10">
                <ActivityIndicator size="large" color="#5E17EB" />
              </View>
            ) : topSongs.length === 0 ? (
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

export default Profile;
