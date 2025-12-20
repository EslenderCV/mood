import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

const RECENTLY_PLAYED = [
  {
    id: "1",
    title: "Money Trees",
    artist: "Kendrick Lamar",
    cover: "https://i.scdn.co/image/ab67616d0000b2731ea0c62b2339cbf493a999ad",
  },
  {
    id: "2",
    title: "Starboy",
    artist: "The Weeknd",
    cover: "https://i.scdn.co/image/ab67616d0000b2734718e28d24527d9774635ded",
  },
  {
    id: "3",
    title: "MONACO",
    artist: "Bad Bunny",
    cover: "https://i.scdn.co/image/ab67616d0000b2737b1fc51ff32b312d4363c288",
  },
];

const MY_ARTISTS = [
  {
    id: "1",
    name: "Drake",
    img: "https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9",
  },
  {
    id: "2",
    name: "Bad Bunny",
    img: "https://i.scdn.co/image/ab6761610000e5eb9ad50e564cc8b7dc5da82c50",
  },
  {
    id: "3",
    name: "Rosalía",
    img: "https://i.scdn.co/image/ab6761610000e5eb009265f02c6b41295fc37172",
  },
  {
    id: "4",
    name: "El Alfa",
    img: "https://i.scdn.co/image/ab6761610000e5ebf8697e555476a6d68205cd9c",
  },
];

const Library = () => {
  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <View className="px-6 pt-4 pb-2 flex-row justify-between items-center">
        <Text className="text-white text-3xl font-bold">Librería</Text>
        <TouchableOpacity
          className="bg-zinc-800 p-2 rounded-full"
          onPress={() => router.push("/post/create" as any)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="px-6 mt-4">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push("/favorites")}
            className="w-full h-32 rounded-3xl overflow-hidden relative mb-4 bg-[#5E17EB]"
          >
            <View className="absolute top-0 left-0 w-full h-full bg-white/10" />
            <View className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-2xl" />
            <View className="flex-1 p-5 justify-end">
              <View className="flex-row justify-between items-end">
                <View>
                  <Text className="text-white font-bold text-2xl">
                    Favoritos
                  </Text>
                  <Text className="text-white/70 font-medium text-sm mt-1">
                    124 canciones • 8 horas
                  </Text>
                </View>
                <View className="bg-white/20 p-3 rounded-full backdrop-blur-md">
                  <Ionicons name="heart" size={24} color="white" />
                </View>
              </View>
            </View>
          </TouchableOpacity>

          <View className="flex-row gap-4 mb-8">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/my-uploads")}
              className="flex-1 bg-zinc-900 rounded-2xl p-4 border border-zinc-800 h-28 justify-between"
            >
              <View className="bg-[#5E17EB]/20 w-10 h-10 rounded-full items-center justify-center">
                <Ionicons name="cloud-upload" size={20} color="#5E17EB" />
              </View>
              <Text className="text-white font-bold text-lg">Tus Subidas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/playlists")}
              className="flex-1 bg-zinc-900 rounded-2xl p-4 border border-zinc-800 h-28 justify-between"
            >
              <View className="bg-blue-500/20 w-10 h-10 rounded-full items-center justify-center">
                <MaterialCommunityIcons
                  name="playlist-music"
                  size={22}
                  color="#3B82F6"
                />
              </View>
              <Text className="text-white font-bold text-lg">Playlists</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-8">
          <View className="px-6 flex-row justify-between items-center mb-4">
            <Text className="text-white text-xl font-bold">Recientes</Text>
            {RECENTLY_PLAYED.length > 0 && (
              <Text className="text-zinc-500 text-xs font-bold">VER TODO</Text>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 24, paddingRight: 10 }}
          >
            {RECENTLY_PLAYED.map((item) => (
              <TouchableOpacity
                key={item.id}
                className="mr-4 w-32"
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: item.cover }}
                  className="w-32 h-32 rounded-2xl mb-2 bg-zinc-800 border border-white/5"
                />
                <Text
                  className="text-white font-bold text-sm truncate"
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text
                  className="text-zinc-500 text-xs truncate"
                  numberOfLines={1}
                >
                  {item.artist}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View>
          <Text className="text-white text-xl font-bold px-6 mb-4">
            Tus Artistas
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 24, paddingRight: 10 }}
          >
            <TouchableOpacity className="items-center mr-5">
              <View className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700 items-center justify-center mb-2 border-dashed">
                <Ionicons name="add" size={24} color="#71717A" />
              </View>
              <Text className="text-zinc-500 text-xs font-medium">Añadir</Text>
            </TouchableOpacity>
            {MY_ARTISTS.map((artist) => (
              <TouchableOpacity
                key={artist.id}
                className="items-center mr-5"
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: artist.img }}
                  className="w-20 h-20 rounded-full mb-2 bg-zinc-800 border border-white/10"
                />
                <Text className="text-white text-xs font-medium text-center">
                  {artist.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Library;
