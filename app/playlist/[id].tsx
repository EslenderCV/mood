import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ScrollView,
} from "react-native";
import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useAudio } from "@/context/AudioContext";
import { LinearGradient } from "expo-linear-gradient"; // Necesitas instalar esto: npx expo install expo-linear-gradient

// Si no quieres instalar linear-gradient, puedes usar un View con bg-color normal,
// pero el gradiente le da el toque "Spotify".
// Si da error, cambia <LinearGradient> por <View className="bg-zinc-900 ...">

const { width } = Dimensions.get("window");

// Mock Songs para la playlist
const PLAYLIST_SONGS = [
  {
    id: "1",
    title: "Money Trees",
    artist: "Kendrick Lamar",
    cover: "https://i.scdn.co/image/ab67616d0000b2731ea0c62b2339cbf493a999ad",
    duration: "6:26",
  },
  {
    id: "2",
    title: "Goosebumps",
    artist: "Travis Scott",
    cover: "https://i.scdn.co/image/ab67616d0000b273881d8d8378cd01099babcd44",
    duration: "4:03",
  },
  {
    id: "3",
    title: "HUMBLE.",
    artist: "Kendrick Lamar",
    cover: "https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1",
    duration: "2:57",
  },
  {
    id: "4",
    title: "SICKO MODE",
    artist: "Travis Scott",
    cover: "https://i.scdn.co/image/ab67616d0000b273072e9faef2ef7b6db63834a3",
    duration: "5:12",
  },
  {
    id: "5",
    title: "God's Plan",
    artist: "Drake",
    cover: "https://i.scdn.co/image/ab67616d0000b273bfad6eb6691fa30f69a45f9c",
    duration: "3:18",
  },
];

const PlaylistDetail = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { playSong } = useAudio();

  const playlist = {
    name: params.name || "Playlist",
    cover:
      params.cover ||
      "https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96",
    count: params.count || "24 canciones",
    author: "Angel Diaz", // Simulando que tú eres el creador
  };

  const renderSong = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      onPress={() => playSong(item)}
      className="flex-row items-center justify-between mb-4 px-4"
    >
      <View className="flex-row items-center flex-1">
        <Text className="text-zinc-500 font-medium w-6 text-center mr-2">
          {index + 1}
        </Text>
        <Image
          source={{ uri: item.cover }}
          className="w-12 h-12 rounded-lg bg-zinc-800"
        />
        <View className="ml-3 flex-1">
          <Text className="text-white font-bold text-base" numberOfLines={1}>
            {item.title}
          </Text>
          <Text className="text-zinc-400 text-xs">{item.artist}</Text>
        </View>
      </View>
      <TouchableOpacity>
        <Ionicons name="ellipsis-horizontal" size={20} color="#71717A" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-black">
      {/* Usamos ScrollView principal */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Grande con Imagen */}
        <View className="relative items-center pt-14 pb-6 bg-zinc-900">
          {/* Botón atrás flotante */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-12 left-6 z-10 bg-black/40 p-2 rounded-full"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <Image
            source={{ uri: playlist.cover as string }}
            style={{ width: 220, height: 220 }}
            className="rounded-2xl shadow-2xl shadow-black/80"
          />

          <Text className="text-white text-2xl font-bold mt-4 text-center px-6">
            {playlist.name}
          </Text>
          <Text className="text-zinc-400 text-sm mt-1">
            Hecha por{" "}
            <Text className="text-white font-bold">{playlist.author}</Text> •{" "}
            {playlist.count}
          </Text>

          {/* Botones de Acción */}
          <View className="flex-row items-center gap-4 mt-6">
            <TouchableOpacity className="w-12 h-12 rounded-full border border-zinc-600 items-center justify-center">
              <Ionicons name="heart-outline" size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity className="w-12 h-12 rounded-full border border-zinc-600 items-center justify-center">
              <Feather name="download" size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity className="w-16 h-16 bg-[#5E17EB] rounded-full items-center justify-center shadow-lg shadow-[#5E17EB]/50">
              <Ionicons
                name="play"
                size={32}
                color="white"
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Lista de Canciones */}
        <View className="px-2 pt-6 pb-24 bg-black">
          {PLAYLIST_SONGS.map((song, index) => (
            <View key={song.id}>{renderSong({ item: song, index })}</View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default PlaylistDetail;
