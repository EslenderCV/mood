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

const MOCK_CHATS = [
  {
    id: "1",
    name: "Bad Bunny",
    message: "Hablamos luego 👁️",
    time: "2m",
    avatar: "https://i.scdn.co/image/ab6761610000e5eb9ad50e564cc8b7dc5da82c50",
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
    name: "El Alfa",
    message: "Toy en el estudio, llega",
    time: "1h",
    avatar: "https://i.scdn.co/image/ab6761610000e5ebf8697e555476a6d68205cd9c",
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
    name: "Rosalía",
    message: "Gracias por compartir! 🦋",
    time: "1d",
    avatar: "https://i.scdn.co/image/ab6761610000e5eb009265f02c6b41295fc37172",
    unread: 0,
  },
];

const Chats = () => {
  const router = useRouter();

  const renderItem = ({ item }: { item: (typeof MOCK_CHATS)[0] }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      className="flex-row items-center justify-between p-4 border-b border-white/5 bg-black"
      onPress={() =>
        router.push({
          pathname: "/chat/[id]",
          params: { id: item.id, name: item.name, avatar: item.avatar },
        })
      }
    >
      <View className="flex-row items-center flex-1">
        <Image
          source={{ uri: item.avatar }}
          className="w-14 h-14 rounded-full bg-zinc-800"
        />
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
