import {
  View,
  Text,
  Image,
  TouchableOpacity,
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

const ALBUM_COVERS = [
  "https://i.scdn.co/image/ab67616d0000b2731ea0c62b2339cbf493a999ad",
  "https://i.scdn.co/image/ab67616d0000b2737b1fc51ff32b312d4363c288",
  "https://i.scdn.co/image/ab67616d0000b273f5507e7d6928e190dc450422",
  "https://i.scdn.co/image/ab67616d0000b2734718e28d24527d9774635ded",
  "https://i.scdn.co/image/ab67616d0000b2734a7b838e3610351292680794",
];

const MOCK_MOODS = ALBUM_COVERS.map((coverUrl, i) => ({
  id: `mood-${i}`,
  image: coverUrl,
}));
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

const Profile = () => {
  const { user } = useGlobalContext();
  const [activeTab, setActiveTab] = useState(0);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const mainScrollRef = useRef<ScrollView>(null);

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
      <ScrollView
        ref={mainScrollRef}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[3]}
      >
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

        <View className="flex-row justify-between items-center bg-zinc-900 mx-4 h-[70px] mt-8 mb-3 px-2 rounded-3xl border border-zinc-800">
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/user-list",
                params: { title: "Seguidores" },
              })
            }
            className="flex-1 items-center py-4"
          >
            <Text className="text-white text-xl font-bold">15</Text>
            <Text className="text-zinc-500 text-[10px] font-bold mt-1">
              SEGUIDORES
            </Text>
          </TouchableOpacity>
          <View className="h-8 w-[1px] bg-zinc-700" />
          <TouchableOpacity
            onPress={scrollToMoods}
            className="flex-1 items-center py-4"
          >
            <Text className="text-white text-xl font-bold">
              {MOCK_MOODS.length}
            </Text>
            <Text className="text-zinc-500 text-[10px] font-bold mt-1">
              MOODS
            </Text>
          </TouchableOpacity>
          <View className="h-8 w-[1px] bg-zinc-700" />
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/user-list",
                params: { title: "Seguidos" },
              })
            }
            className="flex-1 items-center py-4"
          >
            <Text className="text-white text-xl font-bold">24</Text>
            <Text className="text-zinc-500 text-[10px] font-bold mt-1">
              SEGUIDOS
            </Text>
          </TouchableOpacity>
        </View>

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
          <View style={{ width }} className="flex-row flex-wrap">
            {MOCK_MOODS.map(renderMoodItem)}
          </View>
          <View style={{ width }}>{MOCK_MUSIC.map(renderMusicItem)}</View>
        </ScrollView>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
