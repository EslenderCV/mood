import { View, Text, FlatList, Image, TouchableOpacity } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const FAVORITES = [
  {
    id: "1",
    title: "Money Trees",
    artist: "Kendrick Lamar",
    cover: "https://i.scdn.co/image/ab67616d0000b2731ea0c62b2339cbf493a999ad",
  },
  {
    id: "2",
    title: "MONACO",
    artist: "Bad Bunny",
    cover: "https://i.scdn.co/image/ab67616d0000b2737b1fc51ff32b312d4363c288",
  },
  {
    id: "3",
    title: "SAOKO",
    artist: "Rosalía",
    cover: "https://i.scdn.co/image/ab67616d0000b2734a7b838e3610351292680794",
  },
];

const Favorites = () => {
  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-6 py-4 flex-row items-center border-b border-zinc-900">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 p-2 bg-zinc-900 rounded-full"
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">Favoritos</Text>
      </View>
      <View className="items-end px-6 -mt-6 mb-4">
        <TouchableOpacity className="bg-[#5E17EB] w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-[#5E17EB]/40">
          <Ionicons
            name="play"
            size={28}
            color="white"
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>
      </View>
      <FlatList
        data={FAVORITES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row items-center px-6 py-3 mb-2"
          >
            <Image
              source={{ uri: item.cover }}
              className="w-14 h-14 rounded-xl bg-zinc-800 mr-4"
            />
            <View className="flex-1">
              <Text className="text-white font-bold text-base">
                {item.title}
              </Text>
              <Text className="text-zinc-500 text-sm">{item.artist}</Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="heart" size={24} color="#5E17EB" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center mt-20 px-10">
            <Ionicons name="heart-dislike-outline" size={50} color="#3F3F46" />
            <Text className="text-zinc-500 text-center mt-4">
              Aún no tienes favoritos.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default Favorites;
