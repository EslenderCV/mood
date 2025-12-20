import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
  ScrollView,
} from "react-native";
import React, { useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useGlobalContext } from "@/context/GlobalProvider";
import { router } from "expo-router";
import { signOut } from "@/lib/appwrite";

// --- MOCK DATA (Se mantiene igual) ---
const ALBUM_COVERS = [
  "https://i.scdn.co/image/ab67616d0000b2731ea0c62b2339cbf493a999ad",
  "https://i.scdn.co/image/ab67616d0000b27371d62ea7ea8a5be92d3c1f62",
  "https://i.scdn.co/image/ab67616d0000b273881d8d8378cd01099babcd44",
  "https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96",
  "https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1",
];

const MOCK_MOODS = ALBUM_COVERS.map((coverUrl, i) => ({
  id: `mood-${i}`,
  image: coverUrl,
}));
const MOCK_MUSIC = [
  {
    id: "1",
    title: "wacced out murals",
    artist: "Kendrick Lamar",
    cover: ALBUM_COVERS[0],
  },
  {
    id: "2",
    title: "Espresso",
    artist: "Sabrina Carpenter",
    cover: ALBUM_COVERS[1],
  },
  { id: "3", title: "LUNCH", artist: "Billie Eilish", cover: ALBUM_COVERS[2] },
];

const { width } = Dimensions.get("window");
const ITEM_SIZE = width / 3;

const Profile = () => {
  const { user } = useGlobalContext();
  const [activeTab, setActiveTab] = useState(0); // 0 para Moods, 1 para Música
  const scrollRef = useRef<ScrollView>(null);

  // --- LOGIC (Logout y Edit se mantienen) ---
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

  // Función para cambiar de pestaña con deslizamiento
  const handleTabPress = (index: number) => {
    setActiveTab(index);
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
  };

  // Render Helpers
  const renderMoodItem = (item: any) => (
    <TouchableOpacity
      key={item.id}
      activeOpacity={0.8}
      onPress={() => router.push(`/post/${item.id}` as any)}
    >
      <Image
        source={{ uri: item.image }}
        style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
        className="border-[0.5px] border-black/20"
      />
    </TouchableOpacity>
  );

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

      {/* Usamos ScrollView principal para que el Header también suba */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[3]}
      >
        {/* 1. HEADER SUPERIOR */}
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

        {/* 2. INFO USUARIO */}
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

        {/* 3. STATS */}
        <View className="flex-row justify-between items-center bg-zinc-900 mx-4 h-[70px] mt-8 mb-3 py-5 px-8 rounded-3xl border border-zinc-800">
          <View className="items-center">
            <Text className="text-white text-xl font-bold">15</Text>
            <Text className="text-zinc-500 text-[10px] font-bold mt-1">
              SEGUIDORES
            </Text>
          </View>
          <View className="h-8 w-[1px] bg-zinc-700" />
          <View className="items-center">
            <Text className="text-white text-xl font-bold">
              {MOCK_MOODS.length}
            </Text>
            <Text className="text-zinc-500 text-[10px] font-bold mt-1">
              MOODS
            </Text>
          </View>
          <View className="h-8 w-[1px] bg-zinc-700" />
          <View className="items-center">
            <Text className="text-white text-xl font-bold">24</Text>
            <Text className="text-zinc-500 text-[10px] font-bold mt-1">
              SEGUIDOS
            </Text>
          </View>
        </View>

        {/* 4. TABS (Sticky) */}
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

        {/* 5. CONTENIDO DESLIZABLE (SLIDE) */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setActiveTab(Math.round(e.nativeEvent.contentOffset.x / width))
          }
          scrollEventThrottle={16}
        >
          {/* Lado Moods (Grid) */}
          <View style={{ width }} className="flex-row flex-wrap">
            {MOCK_MOODS.map(renderMoodItem)}
          </View>

          {/* Lado Música (Lista) */}
          <View style={{ width }}>{MOCK_MUSIC.map(renderMusicItem)}</View>
        </ScrollView>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
