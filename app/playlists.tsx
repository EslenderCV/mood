import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const { width } = Dimensions.get("window");
const ITEM_SIZE = (width - 48 - 16) / 2;

const PLAYLISTS = [
  {
    id: "1",
    name: "Vibra Nocturna",
    count: "24 canciones",
    cover: "https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96",
  },
  {
    id: "2",
    name: "Gym Motivation",
    count: "50 canciones",
    cover: "https://i.scdn.co/image/ab67616d0000b273881d8d8378cd01099babcd44",
  },
  {
    id: "3",
    name: "Sad Hours",
    count: "12 canciones",
    cover: "https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1",
  },
];

const Playlists = () => {
  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-6 py-4 flex-row items-center border-b border-zinc-900 mb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 p-2 bg-zinc-900 rounded-full"
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">Playlists</Text>
      </View>

      <FlatList
        data={PLAYLISTS}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{
          justifyContent: "space-between",
          paddingHorizontal: 24,
        }}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            className="mb-6"
            onPress={() =>
              router.push({
                pathname: "/playlist/[id]",
                params: {
                  id: item.id,
                  name: item.name,
                  cover: item.cover,
                  count: item.count,
                },
              })
            }
          >
            <Image
              source={{ uri: item.cover }}
              style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
              className="rounded-2xl bg-zinc-800 mb-3 border border-white/5"
            />
            <Text
              className="text-white font-bold text-base ml-1"
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text className="text-zinc-500 text-xs ml-1">{item.count}</Text>
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <TouchableOpacity className="mx-6 mb-6 flex-row items-center p-4 bg-[#5E17EB]/10 rounded-2xl border border-[#5E17EB]/30 border-dashed justify-center">
            <Ionicons name="add-circle" size={24} color="#5E17EB" />
            <Text className="text-[#5E17EB] font-bold ml-2">
              Nueva Playlist
            </Text>
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  );
};

export default Playlists;
