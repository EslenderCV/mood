import { View, Text, FlatList, Image, TouchableOpacity } from "react-native";
import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// Mock Data de Usuarios
const USERS_LIST = [
  {
    id: "1",
    name: "Bad Bunny",
    username: "@sanbenito",
    avatar: "https://i.scdn.co/image/ab6761610000e5eb9ad50e564cc8b7dc5da82c50",
    isFollowing: true,
  },
  {
    id: "2",
    name: "Rosalía",
    username: "@rosalia",
    avatar: "https://i.scdn.co/image/ab6761610000e5eb009265f02c6b41295fc37172",
    isFollowing: false,
  },
  {
    id: "3",
    name: "Drake",
    username: "@champagnepapi",
    avatar: "https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9",
    isFollowing: true,
  },
  {
    id: "4",
    name: "Karol G",
    username: "@karolg",
    avatar: "https://i.scdn.co/image/ab6761610000e5eb827c1975e5330368b6d47d6b",
    isFollowing: false,
  },
  {
    id: "5",
    name: "Feid",
    username: "@ferxxo",
    avatar: "https://i.scdn.co/image/ab6761610000e5eb512b186b406df677b1022131",
    isFollowing: true,
  },
];

const UserList = () => {
  const router = useRouter();
  const { title } = useLocalSearchParams(); // Recibe "Seguidores" o "Seguidos"

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-zinc-900">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 p-2 bg-zinc-900 rounded-full"
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">
          {title || "Usuarios"}
        </Text>
      </View>

      <FlatList
        data={USERS_LIST}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            // Al tocar, vamos a su perfil público
            onPress={() =>
              router.push({
                pathname: "/user/[id]",
                params: { id: item.id, user: item.name, avatar: item.avatar },
              })
            }
            className="flex-row items-center justify-between mb-6"
          >
            <View className="flex-row items-center">
              <Image
                source={{ uri: item.avatar }}
                className="w-12 h-12 rounded-full bg-zinc-800 border border-white/10"
              />
              <View className="ml-3">
                <Text className="text-white font-bold text-base">
                  {item.name}
                </Text>
                <Text className="text-zinc-500 text-sm">{item.username}</Text>
              </View>
            </View>

            <TouchableOpacity
              className={`px-4 py-1.5 rounded-lg border ${
                item.isFollowing
                  ? "bg-transparent border-zinc-600"
                  : "bg-[#5E17EB] border-[#5E17EB]"
              }`}
            >
              <Text
                className={`font-bold text-xs ${
                  item.isFollowing ? "text-white" : "text-white"
                }`}
              >
                {item.isFollowing ? "Siguiendo" : "Seguir"}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

export default UserList;
