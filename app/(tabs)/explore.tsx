import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

// 1. Importamos la función de Appwrite
import { getLatestUsers } from "@/lib/appwrite";
import { useGlobalContext } from "@/context/GlobalProvider";

// --- HELPERS ---
const getCover = (id: number) => `https://picsum.photos/id/${id + 50}/300/300`;

// --- MOCK DATA (Solo para Posts, Música, Álbumes) ---
const CATEGORIES = ["Posts", "Música", "Álbumes", "Perfiles"];

const MOCK_FEED = [
  {
    id: "1",
    type: "post",
    user: {
      name: "Eslender Cruz",
      username: "@eslendercruz",
      avatar: "https://ui-avatars.com/api/?name=Eslender+Cruz",
    },
    time: "2h",
    text: "This Kendrick Lamar track is literally on repeat all day. 🔥",
    track: {
      title: "Money Trees",
      artist: "Kendrick Lamar",
      cover: getCover(10),
    },
    stats: { comments: 5, likes: 24 },
  },
  {
    id: "2",
    type: "post",
    user: {
      name: "Sarah Parker",
      username: "@sarah_music",
      avatar: "https://ui-avatars.com/api/?name=Sarah+Parker",
    },
    time: "5h",
    text: "Can we talk about how good the production on this album is? 🎹",
    track: { title: "After Hours", artist: "The Weeknd", cover: getCover(25) },
    stats: { comments: 12, likes: 156 },
  },
];

const MOCK_MUSIC = [
  {
    id: "1",
    type: "music",
    rank: 1,
    title: "Not Like Us",
    artist: "Kendrick Lamar",
    cover: getCover(30),
    trend: "up",
  },
  {
    id: "2",
    type: "music",
    rank: 2,
    title: "Espresso",
    artist: "Sabrina Carpenter",
    cover: getCover(31),
    trend: "same",
  },
  {
    id: "3",
    type: "music",
    rank: 3,
    title: "BIRDS OF A FEATHER",
    artist: "Billie Eilish",
    cover: getCover(32),
    trend: "down",
  },
];

const MOCK_ALBUMS = [
  {
    id: "1",
    type: "album",
    title: "HIT ME HARD AND SOFT",
    artist: "Billie Eilish",
    year: "2024",
    cover: getCover(40),
  },
  {
    id: "2",
    type: "album",
    title: "COWBOY CARTER",
    artist: "Beyoncé",
    year: "2024",
    cover: getCover(41),
  },
];

const Explore = () => {
  const [activeCategory, setActiveCategory] = useState("Posts");
  const [searchText, setSearchText] = useState("");

  // Estados para Usuarios Reales
  const [realUsers, setRealUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // --- CARGAR USUARIOS ---
  useEffect(() => {
    const fetchUsers = async () => {
      if (activeCategory === "Perfiles") {
        setIsLoadingUsers(true);
        try {
          const users = await getLatestUsers();
          setRealUsers(users);
        } catch (error) {
          console.log("Error al cargar usuarios", error);
        } finally {
          setIsLoadingUsers(false);
        }
      }
    };

    fetchUsers();
  }, [activeCategory]);

  const getData = () => {
    switch (activeCategory) {
      case "Música":
        return MOCK_MUSIC;
      case "Álbumes":
        return MOCK_ALBUMS;
      case "Perfiles":
        return realUsers;
      default:
        return MOCK_FEED;
    }
  };

  // --- RENDERIZADORES ---

  const renderPostItem = (item: any, isLastItem: boolean) => (
    <View className="flex-row px-4 pt-4">
      <View className="items-center mr-3">
        <Image
          source={{ uri: item.user.avatar }}
          className="w-10 h-10 rounded-full bg-zinc-800"
          resizeMode="cover"
        />
        {!isLastItem && <View className="w-[2px] flex-1 bg-zinc-800 my-2" />}
      </View>
      <View className="flex-1 pb-6 border-b border-zinc-900">
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center flex-wrap flex-1 mr-2">
            <Text className="text-white font-bold mr-1 text-base">
              {item.user.name}
            </Text>
            <Text className="text-zinc-500 text-sm">
              {item.user.username} · {item.time}
            </Text>
          </View>
          <Ionicons name="ellipsis-horizontal" size={18} color="#71717A" />
        </View>
        <Text className="text-white text-base mb-3 leading-5">{item.text}</Text>
        {item.track && (
          <View className="bg-zinc-900 rounded-xl p-2 flex-row items-center mb-3 border border-zinc-800">
            <Image
              source={{ uri: item.track.cover }}
              className="w-12 h-12 rounded-lg mr-3 bg-zinc-800"
              resizeMode="cover"
            />
            <View className="flex-1 justify-center mr-2">
              <Text className="text-white font-bold" numberOfLines={1}>
                {item.track.title}
              </Text>
              <Text className="text-zinc-500 text-xs" numberOfLines={1}>
                {item.track.artist}
              </Text>
            </View>
            <TouchableOpacity className="bg-[#5E17EB] w-8 h-8 rounded-full items-center justify-center">
              <Ionicons
                name="play"
                size={16}
                color="white"
                style={{ marginLeft: 2 }}
              />
            </TouchableOpacity>
          </View>
        )}
        <View className="flex-row items-center justify-between pr-8 mt-1">
          <TouchableOpacity className="flex-row items-center">
            <Ionicons name="chatbubble-outline" size={18} color="#71717A" />
            <Text className="text-zinc-500 text-xs ml-1">
              {item.stats.comments}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center">
            <Ionicons name="heart-outline" size={18} color="#71717A" />
            <Text className="text-zinc-500 text-xs ml-1">
              {item.stats.likes}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="share-outline" size={18} color="#71717A" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // --- RENDERIZADOR DE PERFIL REAL (CORREGIDO CON NO-PFP) ---
  const renderProfileItem = (item: any) => (
    <View className="flex-row items-center px-4 py-4 justify-between border-b border-zinc-900">
      <View className="flex-row items-center flex-1">
        <Image
          // AQUÍ ESTÁ EL CAMBIO: Usamos tu imagen local si no hay pfp
          source={item.pfp ? { uri: item.pfp } : require("@/assets/noPfp.jpg")}
          className="w-14 h-14 rounded-full border border-zinc-800 bg-zinc-800"
          resizeMode="cover"
        />
        <View className="ml-3 flex-1 mr-2">
          <Text className="text-white font-bold text-base">
            {item.username || "Usuario"}
          </Text>
          <Text className="text-zinc-500 text-sm">@{item.username}</Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="sparkles" size={10} color="#5E17EB" />
            <Text className="text-[#5E17EB] text-xs ml-1" numberOfLines={1}>
              Nuevo en Mood
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity className="px-4 py-2 rounded-full bg-[#5E17EB] border border-[#5E17EB]">
        <Text className="font-bold text-sm text-white">Seguir</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMusicItem = (item: any) => (
    <TouchableOpacity className="flex-row items-center px-4 py-3 mb-2 active:bg-zinc-900/50 rounded-xl mx-2">
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
          {item.trend === "up" && (
            <Ionicons name="caret-up" size={12} color="#22c55e" />
          )}
          <Text className="text-zinc-500 text-[10px] ml-1 uppercase font-bold">
            Trending
          </Text>
        </View>
      </View>
      <TouchableOpacity className="p-2">
        <Ionicons name="play-circle-outline" size={32} color="white" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderAlbumItem = (item: any) => (
    <View className="flex-row items-center px-4 py-4 border-b border-zinc-900">
      <Image
        source={{ uri: item.cover }}
        className="w-20 h-20 rounded-xl mr-4 bg-zinc-800"
        resizeMode="cover"
      />
      <View className="flex-1">
        <Text className="text-white font-bold text-lg mb-1">{item.title}</Text>
        <Text className="text-zinc-400 text-base">{item.artist}</Text>
        <Text className="text-zinc-600 text-xs mt-2">Released {item.year}</Text>
      </View>
      <TouchableOpacity className="bg-zinc-800 p-2 rounded-full">
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    switch (activeCategory) {
      case "Música":
        return renderMusicItem(item);
      case "Álbumes":
        return renderAlbumItem(item);
      case "Perfiles":
        return renderProfileItem(item);
      default:
        return renderPostItem(item, index === MOCK_FEED.length - 1);
    }
  };

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
          {activeCategory === "Perfiles" ? "Descubrir Gente" : "Para ti"}
        </Text>
        {isLoadingUsers && <ActivityIndicator size="small" color="#5E17EB" />}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      <FlatList
        data={getData()}
        keyExtractor={(item) => item.$id || item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          !isLoadingUsers && activeCategory === "Perfiles" ? (
            <Text className="text-zinc-500 text-center mt-10">
              No se encontraron usuarios.
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

export default Explore;
