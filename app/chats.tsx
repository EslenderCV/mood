import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  StatusBar,
} from "react-native";
import React from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
// 1. DATOS MOCKUP (Simulación de base de datos)
const MOCK_CHATS = [
  {
    id: "1",
    name: "Massi Gang",
    message: "Bro, did you see the new feature? 🔥",
    time: "2m",
    avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
    unread: 2,
  },
  {
    id: "2",
    name: "Sarah Parker",
    message: "Sent a photo 📷",
    time: "15m",
    avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
    unread: 0,
  },
  {
    id: "3",
    name: "Mood Team",
    message: "Welcome to Mood! Start sharing your...",
    time: "1h",
    avatar:
      "https://cloud.appwrite.io/v1/avatars/initials?name=Mood%20Team&project=6689e59b000acd6caf6f", // Logo generado
    unread: 1,
  },
  {
    id: "4",
    name: "David Miller",
    message: "See you at the gym?",
    time: "3h",
    avatar: "https://i.pravatar.cc/150?u=a04258114e29026302d",
    unread: 0,
  },
  {
    id: "5",
    name: "Emma Wilson",
    message: "Loved that song you posted! 🎵",
    time: "1d",
    avatar: "https://i.pravatar.cc/150?u=a04258114e29026702d",
    unread: 0,
  },
  {
    id: "6",
    name: "James Bond",
    message: "Mission accomplished.",
    time: "2d",
    avatar: "https://i.pravatar.cc/150?u=a04258a2462d826712d",
    unread: 0,
  },
  {
    id: "7",
    name: "Ana De Armas",
    message: "Hahaha lol 😂",
    time: "1w",
    avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d2",
    unread: 0,
  },
];

const Chats = () => {
  const router = useRouter();

  // Componente para cada fila del chat
  const renderItem = ({ item }: { item: (typeof MOCK_CHATS)[0] }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      className="flex-row items-center justify-between p-4 border-b border-white/5 bg-black"
    >
      <View className="flex-row items-center flex-1">
        {/* Avatar */}
        <Image
          source={{ uri: item.avatar }}
          className="w-14 h-14 rounded-full bg-zinc-800"
        />

        {/* Info Central */}
        <View className="ml-4 flex-1">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-white font-bold text-base">{item.name}</Text>
            <Text className="text-zinc-500 text-xs">{item.time}</Text>
          </View>

          <Text
            className={
              item.unread > 0 ? "text-white font-semibold" : "text-zinc-400"
            }
            numberOfLines={1}
          >
            {item.message}
          </Text>
        </View>
      </View>

      {/* Indicador de No Leídos (Badge) */}
      {item.unread > 0 && (
        <View className="ml-2 w-5 h-5 bg-[#5E17EB] rounded-full items-center justify-center">
          <Text className="text-white text-[10px] font-bold">
            {item.unread}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />

      {/* --- HEADER --- */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-2 rounded-full active:bg-zinc-900"
          >
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold ml-2">Chats</Text>
        </View>

        <TouchableOpacity className="p-2 bg-zinc-900 rounded-full">
          <Ionicons name="create-outline" size={22} color="#5E17EB" />
        </TouchableOpacity>
      </View>

      {/* --- BUSCADOR --- */}
      <View className="px-4 py-4">
        <View className="flex-row items-center bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
          <Ionicons name="search" size={20} color="#71717A" />
          <TextInput
            placeholder="Search messages..."
            placeholderTextColor="#71717A"
            className="ml-3 flex-1 text-white font-medium"
          />
        </View>
      </View>

      {/* --- LISTA DE CHATS --- */}
      <FlatList
        data={MOCK_CHATS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View className="flex-1 items-center justify-center mt-20">
            <Text className="text-zinc-500">No active chats</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default Chats;
