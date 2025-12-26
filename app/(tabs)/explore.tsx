import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAudioPlayer } from "expo-audio";

import {
  getLatestUsers,
  getAllPosts,
  getFeedCandidates,
  getFollowedUserIds,
} from "@/lib/appwrite";
import { useGlobalContext } from "@/context/GlobalProvider";

const { width } = Dimensions.get("window");

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

const formatTimeAgo = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  if (diff < 1) return "Reciente";
  if (diff < 24) return `${Math.floor(diff)}h`;
  return `${Math.floor(diff / 24)}d`;
};

// 1. CAMBIO: Reemplazamos "Álbumes" por "Artistas"
const CATEGORIES = ["Posts", "Música", "Artistas", "Perfiles"];

const Explore = () => {
  const { user } = useGlobalContext();

  const [activeCategory, setActiveCategory] = useState("Posts");
  const [searchText, setSearchText] = useState("");

  const [explorePosts, setExplorePosts] = useState<any[]>([]);
  const [rankedUsers, setRankedUsers] = useState<any[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]); // 2. NUEVO ESTADO

  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [currentSongUrl, setCurrentSongUrl] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const player = useAudioPlayer(currentSongUrl);

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

  // --- ALGORITMOS DE RANKING ---
  const rankExplorePosts = (posts: any[]) => {
    return posts
      .map((post) => {
        let score = 0;
        const likes = post.likedBy ? post.likedBy.length : 0;
        const comments = post.comments ? post.comments.length : 0;
        score += likes * 10;
        score += comments * 15;
        score += Math.random() * 50;
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

  // --- FETCH DATA ---
  const fetchCategoryData = async () => {
    setIsLoading(true);
    try {
      const [rawPosts, myFollowsList] = await Promise.all([
        getFeedCandidates(),
        user?.$id ? getFollowedUserIds(user.$id) : Promise.resolve([]),
      ]);
      const safeFollows = Array.isArray(myFollowsList) ? myFollowsList : [];

      if (activeCategory === "Posts") {
        const filteredPosts = rawPosts.filter((post: any) => {
          const creator = getCreatorFromPost(post);
          const isMe = creator.id === user?.$id;
          const isFollowing = safeFollows.includes(creator.id);
          return !isMe && !isFollowing;
        });
        setExplorePosts(rankExplorePosts(filteredPosts));
      }

      if (activeCategory === "Perfiles") {
        const latestUsers = await getLatestUsers();
        setRankedUsers(calculateTopMooders(rawPosts, latestUsers, safeFollows));
      }

      // Lógica compartida para Música y Artistas (necesitan todos los posts)
      if (activeCategory === "Música" || activeCategory === "Artistas") {
        const allPosts = await getAllPosts();

        if (activeCategory === "Música") {
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
            .slice(0, 10)
            .map((s: any, i) => ({ ...s, rank: i + 1 }));
          setTopSongs(charts);
        }

        // 3. NUEVA LÓGICA: ARTISTAS DEL MOMENTO
        if (activeCategory === "Artistas") {
          const artistMap = new Map();

          allPosts.forEach((post: any) => {
            const songData = parseSongFromPost(post.songData);
            if (!songData) return;

            const artistName = songData.artist;
            // Contamos MENCIONES (cuántos posts usan a este artista)
            // O podriamos contar likes totales. Vamos a contar Menciones para variar.
            const mentions = 1;

            if (artistMap.has(artistName)) {
              const data = artistMap.get(artistName);
              data.count += mentions;
              // Actualizamos la imagen por si acaso (para tener variedad)
              if (Math.random() > 0.5) data.cover = songData.cover;
            } else {
              artistMap.set(artistName, {
                id: artistName,
                name: artistName,
                cover: songData.cover, // Usamos la portada de una de sus canciones como foto
                count: 1,
              });
            }
          });

          // Ordenamos por cantidad de menciones
          const trendingArtists = Array.from(artistMap.values())
            .sort((a: any, b: any) => b.count - a.count)
            .slice(0, 12); // Top 12 artistas

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

  const getData = () => {
    switch (activeCategory) {
      case "Música":
        return topSongs;
      case "Artistas":
        return topArtists; // 4. CAMBIO
      case "Perfiles":
        return rankedUsers;
      default:
        return explorePosts;
    }
  };

  // --- RENDERIZADORES ---
  const renderPostItem = ({ item, index }: { item: any; index: number }) => {
    const creator = getCreatorFromPost(item);
    const songData = parseSongFromPost(item.songData);
    const likesCount = item.likedBy ? item.likedBy.length : 0;
    const commentsCount = item.comments ? item.comments.length : 0;
    const isThisPlaying = playingId === item.$id;
    const showPause = isThisPlaying && isPlaying;
    const isLastItem = index === explorePosts.length - 1;

    return (
      <View className="flex-row px-4 pt-4">
        <View className="items-center mr-3">
          <TouchableOpacity
            onPress={() => router.push(`/user/${creator.id}` as any)}
          >
            <Image
              source={
                creator.avatar
                  ? { uri: creator.avatar }
                  : require("@/assets/noPfp.jpg")
              }
              className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-900"
              resizeMode="cover"
            />
          </TouchableOpacity>
          {!isLastItem && <View className="w-[2px] flex-1 bg-zinc-800 my-2" />}
        </View>
        <View className="flex-1 pb-6 border-b border-zinc-900">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center flex-wrap flex-1 mr-2">
              <Text className="text-white font-bold mr-1 text-base">
                {creator.name}
              </Text>
              <Text className="text-zinc-500 text-sm">
                @{creator.username} · {formatTimeAgo(item.$createdAt)}
              </Text>
            </View>
            <Ionicons name="ellipsis-horizontal" size={18} color="#71717A" />
          </View>
          <Text className="text-white text-base mb-3 leading-5">
            {item.comment}
          </Text>
          {songData && (
            <View className="bg-zinc-900 rounded-xl p-2 flex-row items-center mb-3 border border-zinc-800">
              <Image
                source={{ uri: songData.cover }}
                className="w-12 h-12 rounded-lg mr-3 bg-zinc-800"
                resizeMode="cover"
              />
              <View className="flex-1 justify-center mr-2">
                <Text className="text-white font-bold" numberOfLines={1}>
                  {songData.title}
                </Text>
                <Text className="text-zinc-500 text-xs" numberOfLines={1}>
                  {songData.artist}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handlePlayPreview(songData.preview, item.$id)}
                className="bg-[#5E17EB] w-8 h-8 rounded-full items-center justify-center"
              >
                <Ionicons
                  name={showPause ? "pause" : "play"}
                  size={16}
                  color="white"
                  style={showPause ? {} : { marginLeft: 2 }}
                />
              </TouchableOpacity>
            </View>
          )}
          <View className="flex-row items-center justify-between pr-8 mt-1">
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => router.push(`/post/${item.$id}` as any)}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#71717A" />
              <Text className="text-zinc-500 text-xs ml-1">
                {commentsCount}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center">
              <Ionicons name="heart-outline" size={18} color="#71717A" />
              <Text className="text-zinc-500 text-xs ml-1">{likesCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="share-outline" size={18} color="#71717A" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderProfileItem = ({ item }: { item: any }) => {
    const isTrending = item.totalLikes >= 5;
    return (
      <View className="flex-row items-center px-4 py-4 justify-between border-b border-zinc-900">
        <View className="flex-row items-center flex-1">
          <Image
            source={
              item.avatar ? { uri: item.avatar } : require("@/assets/noPfp.jpg")
            }
            className="w-14 h-14 rounded-full border border-zinc-800 bg-zinc-800"
            resizeMode="cover"
          />
          <View className="ml-3 flex-1 mr-2">
            <Text className="text-white font-bold text-base">
              {item.name || "Usuario"}
            </Text>
            <Text className="text-zinc-500 text-sm">@{item.username}</Text>
            <View className="flex-row items-center mt-1">
              {isTrending ? (
                <>
                  <Ionicons name="flame" size={12} color="#EF4444" />
                  <Text className="text-[#EF4444] text-xs ml-1 font-bold">
                    Trending • {item.totalLikes} Likes
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={10} color="#5E17EB" />
                  <Text className="text-[#5E17EB] text-xs ml-1">
                    Nuevo en Mood
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push(`/user/${item.id}` as any)}
          className="px-4 py-2 rounded-full bg-[#5E17EB] border border-[#5E17EB]"
        >
          <Text className="font-bold text-sm text-white">Ver</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMusicItem = ({ item }: { item: any }) => {
    const isThisPlaying = playingId === item.id;
    const showPause = isThisPlaying && isPlaying;
    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => router.push(`/post/${item.postId}` as any)}
        className="flex-row items-center px-4 py-3 mb-2 active:bg-zinc-900/50 rounded-xl mx-2"
      >
        <Text
          className={`text-xl font-bold w-8 text-center mr-2 ${
            item.rank <= 3 ? "text-[#5E17EB]" : "text-white"
          }`}
        >
          {item.rank}
        </Text>
        <Image
          source={{ uri: item.cover }}
          className="w-14 h-14 rounded-lg mr-4 bg-zinc-800"
          resizeMode="cover"
        />
        <View className="flex-1 justify-center">
          <Text className="text-white font-bold text-base" numberOfLines={1}>
            {item.title}
          </Text>
          <Text className="text-zinc-400 text-sm" numberOfLines={1}>
            {item.artist}
          </Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="heart" size={12} color="#EF4444" />
            <Text className="text-zinc-500 text-[10px] ml-1 uppercase font-bold">
              {item.likes} Likes Globales
            </Text>
          </View>
        </View>
        <TouchableOpacity
          className="p-2"
          onPress={(e) => {
            e.stopPropagation();
            handlePlayPreview(item.preview, item.id);
          }}
        >
          <Ionicons
            name={showPause ? "pause-circle-outline" : "play-circle-outline"}
            size={32}
            color={showPause ? "#5E17EB" : "white"}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // 5. NUEVO RENDER: ARTISTAS DEL MOMENTO (Diseño Cuadrícula)
  const renderArtistItem = ({ item, index }: { item: any; index: number }) => (
    <View className="flex-1 m-2 bg-zinc-900 rounded-2xl p-3 border border-zinc-800 items-center shadow-sm">
      {/* Badge de Ranking para el Top 3 */}
      {index < 3 && (
        <View className="absolute top-2 right-2 bg-[#5E17EB] w-6 h-6 rounded-full items-center justify-center z-10">
          <Text className="text-white font-bold text-xs">#{index + 1}</Text>
        </View>
      )}

      <Image
        source={{ uri: item.cover }}
        className="w-24 h-24 rounded-full mb-3 bg-zinc-800"
        resizeMode="cover"
      />

      <Text
        className="text-white font-bold text-center text-sm mb-1"
        numberOfLines={1}
      >
        {item.name}
      </Text>

      <View className="flex-row items-center bg-black/40 px-2 py-1 rounded-lg">
        <Ionicons name="musical-notes" size={10} color="#A1A1AA" />
        <Text className="text-zinc-400 text-[10px] ml-1 font-medium">
          {item.count} {item.count === 1 ? "post" : "posts"}
        </Text>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View className="pb-2 pt-2 bg-black">
      <View className="px-4">
        <Text className="text-white text-3xl font-bold mb-4 mt-2">
          Explorar
        </Text>
        <View className="flex-row items-center bg-zinc-900 h-12 rounded-2xl px-4 border border-zinc-800 mb-4">
          <Ionicons name="search" size={20} color="#71717A" />
          <TextInput
            placeholder={`Buscar en ${activeCategory.toLowerCase()}...`}
            placeholderTextColor="#71717A"
            className="flex-1 ml-3 text-white text-base font-medium"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>
      <FlatList
        horizontal
        data={CATEGORIES}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        keyExtractor={(item) => item}
        renderItem={({ item }) => {
          const isActive = activeCategory === item;
          return (
            <TouchableOpacity
              onPress={() => setActiveCategory(item)}
              className={`mr-2 px-4 py-[6px] rounded-full ${
                isActive ? "bg-[#5E17EB]" : "bg-zinc-900"
              }`}
            >
              <Text
                className={`${
                  isActive
                    ? "text-white font-bold"
                    : "text-zinc-400 font-medium"
                } text-sm`}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
      <View className="h-[1px] bg-zinc-900 w-full mt-3" />
      <View className="px-4 py-3 flex-row justify-between items-center">
        <Text className="text-white font-bold text-lg">
          {activeCategory === "Perfiles"
            ? "Top Mooders & Descubrir"
            : activeCategory === "Música"
            ? "Top 10 Global"
            : activeCategory === "Artistas"
            ? "Artistas del Momento"
            : "Tendencias para ti"}
        </Text>
        {isLoading && <ActivityIndicator size="small" color="#5E17EB" />}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      <FlatList
        data={getData()}
        // 6. CAMBIO: NumColumns para la grilla de artistas
        key={activeCategory === "Artistas" ? "artists-grid" : "list"}
        numColumns={activeCategory === "Artistas" ? 2 : 1}
        columnWrapperStyle={
          activeCategory === "Artistas"
            ? { justifyContent: "space-between", paddingHorizontal: 10 }
            : undefined
        }
        keyExtractor={(item) => item.id || item.$id || Math.random().toString()}
        renderItem={({ item, index }) => {
          switch (activeCategory) {
            case "Música":
              return renderMusicItem({ item });
            case "Artistas":
              return renderArtistItem({ item, index });
            case "Perfiles":
              return renderProfileItem({ item });
            default:
              return renderPostItem({ item, index });
          }
        }}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5E17EB"
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <Text className="text-zinc-500 text-center mt-10">
              No hay resultados.
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

export default Explore;
