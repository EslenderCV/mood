import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import React, { useState, useRef, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useGlobalContext } from "@/context/GlobalProvider";
import { router, useFocusEffect } from "expo-router";
// AGREGADO: Importamos getFollowCounts
import { signOut, getUserPosts, getFollowCounts } from "@/lib/appwrite";

// --- DATOS MOCK PARA LA PESTAÑA DE MÚSICA (TAB 2) ---
const ALBUM_COVERS = [
  "https://i.scdn.co/image/ab67616d0000b2731ea0c62b2339cbf493a999ad",
  "https://i.scdn.co/image/ab67616d0000b2737b1fc51ff32b312d4363c288",
  "https://i.scdn.co/image/ab67616d0000b273f5507e7d6928e190dc450422",
];

const MOCK_MUSIC = [
  {
    id: "1",
    title: "Money Trees",
    artist: "Kendrick Lamar",
    cover: ALBUM_COVERS[0],
  },
  { id: "2", title: "MONACO", artist: "Bad Bunny", cover: ALBUM_COVERS[1] },
  { id: "3", title: "Gogo Dance", artist: "El Alfa", cover: ALBUM_COVERS[2] },
];

const { width } = Dimensions.get("window");
const ITEM_SIZE = width / 3;

// --- FUNCIÓN AUXILIAR CORREGIDA PARA TU JSON ---
const getPostImage = (songDataString: string) => {
  try {
    if (!songDataString) return "https://via.placeholder.com/300";

    const song = JSON.parse(songDataString);
    const coverUrl = song.cover;

    if (!coverUrl) return "https://via.placeholder.com/300";

    const highResImage = coverUrl.replace("100x100bb", "600x600bb");

    return highResImage;
  } catch (error) {
    console.log("Error parsing song data image", error);
    return "https://via.placeholder.com/300";
  }
};

const Profile = () => {
  const { user } = useGlobalContext();
  const [activeTab, setActiveTab] = useState(0);
  const [posts, setPosts] = useState<any[]>([]);
  // AGREGADO: Estado para los contadores
  const [stats, setStats] = useState({ followersCount: 0, followingCount: 0 });

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const horizontalScrollRef = useRef<ScrollView>(null);
  const mainScrollRef = useRef<ScrollView>(null);

  // --- LOGICA DE CARGA DE DATOS ---
  const fetchData = async () => {
    if (!user) return;
    try {
      // 1. Cargar Posts
      const response = await getUserPosts(user.$id);
      setPosts(response);

      // 2. Cargar Estadísticas Reales (AGREGADO)
      const counts = await getFollowCounts(user.$id);
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

  const handleLogout = async () => {
    Alert.alert("Cerrar Sesión", "¿Seguro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/signIn");
        },
      },
    ]);
  };

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    horizontalScrollRef.current?.scrollTo({ x: index * width, animated: true });
  };

  const scrollToMoods = () => {
    mainScrollRef.current?.scrollTo({ y: 380, animated: true });
    handleTabPress(0);
  };

  // --- RENDER ITEM: MOODS ---
  const renderMoodItem = (item: any) => {
    const imageUrl = getPostImage(item.songData);

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

  // --- RENDER ITEM: MUSICA ---
  const renderMusicItem = (item: any) => (
    <View
      key={item.id}
      className="flex-row items-center px-6 py-3 border-b border-zinc-900/50 w-full"
    >
      <Image
        source={{ uri: item.cover }}
        className="w-14 h-14 rounded-xl mr-4 bg-zinc-800"
      />
      <View className="flex-1">
        <Text className="text-white font-bold text-base">{item.title}</Text>
        <Text className="text-zinc-500 text-sm">{item.artist}</Text>
      </View>
      <TouchableOpacity className="bg-zinc-800 p-2 rounded-full">
        <Ionicons name="play" size={16} color="white" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      <StatusBar style="light" />
      <ScrollView
        ref={mainScrollRef}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[3]}
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
            <TouchableOpacity
              onPress={handleLogout}
              className="bg-red-500/10 p-3 rounded-2xl border border-red-500/20"
            >
              <Ionicons name="log-out-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* INFO DE USUARIO */}
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
        <View className="flex-row justify-between items-center bg-zinc-900 mx-4 h-[70px] mt-8 mb-3 px-2 rounded-3xl border border-zinc-800">
          {/* BOTÓN SEGUIDORES */}
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/user-list",
                // Enviamos userId y type correcto para ver la lista real
                params: { userId: user?.$id, type: "followers" },
              })
            }
            className="flex-1 items-center py-4"
          >
            {/* Dato Real */}
            <Text className="text-white text-xl font-bold">
              {stats.followersCount}
            </Text>
            <Text className="text-zinc-500 text-[10px] font-bold mt-1">
              SEGUIDORES
            </Text>
          </TouchableOpacity>

          <View className="h-8 w-[1px] bg-zinc-700" />

          {/* BOTÓN MOODS */}
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

          {/* BOTÓN SEGUIDOS */}
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/user-list",
                // Enviamos userId y type correcto
                params: { userId: user?.$id, type: "following" },
              })
            }
            className="flex-1 items-center py-4"
          >
            {/* Dato Real */}
            <Text className="text-white text-xl font-bold">
              {stats.followingCount}
            </Text>
            <Text className="text-zinc-500 text-[10px] font-bold mt-1">
              SEGUIDOS
            </Text>
          </TouchableOpacity>
        </View>

        {/* TABS STICKY */}
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
                MÚSICA
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CONTENIDO SWIPEABLE */}
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
          {/* TAB 1: MOODS (DINÁMICO) */}
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

          {/* TAB 2: MÚSICA (MOCK) */}
          <View style={{ width }}>{MOCK_MUSIC.map(renderMusicItem)}</View>
        </ScrollView>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
