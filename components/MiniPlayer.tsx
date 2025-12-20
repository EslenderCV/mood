import { View, Text, Image, TouchableOpacity } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAudio } from "@/context/AudioContext";

const MiniPlayer = () => {
  const router = useRouter();
  const { currentSong, isPlaying, togglePlay, closePlayer } = useAudio();

  if (!currentSong) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      // ACCIÓN: Abre el reproductor en grande
      onPress={() => router.push("/music-player" as any)}
      className="absolute bottom-[95px] left-3 right-3 bg-[#18181B] rounded-2xl p-2 border border-white/10 shadow-xl shadow-black z-50"
    >
      {/* Barra de Progreso Simulada */}
      <View className="absolute top-0 left-2 right-2 h-[2px] bg-zinc-800 rounded-full overflow-hidden mt-[-1px]">
        <View style={{ width: "35%" }} className="h-full bg-[#5E17EB]" />
      </View>

      <View className="flex-row items-center">
        <Image
          source={{ uri: currentSong.cover }}
          className="w-11 h-11 rounded-lg bg-zinc-800"
        />

        <View className="flex-1 ml-3 justify-center">
          <Text className="text-white font-bold text-sm" numberOfLines={1}>
            {currentSong.title}
          </Text>
          <Text className="text-zinc-400 text-xs" numberOfLines={1}>
            {currentSong.artist}
          </Text>
        </View>

        <View className="flex-row items-center gap-1">
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="p-2"
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={24}
              color="white"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              closePlayer();
            }}
            className="p-2"
          >
            <Ionicons name="close" size={20} color="#71717A" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default MiniPlayer;
