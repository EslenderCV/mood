import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

interface LinkedSongCardProps {
  song: any;
  onRemove: () => void;
  onPlay: () => void;
  isPlaying: boolean;
}

export default function LinkedSongCard({
  song,
  onRemove,
  onPlay,
  isPlaying,
}: LinkedSongCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View
      className="flex-row items-center p-3 rounded-2xl border"
      style={{
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
      }}
    >
      {/* Portada */}
      <View className="relative">
        <Image
          source={{ uri: song.cover || song.album?.cover_medium }}
          className="w-12 h-12 rounded-lg"
          contentFit="cover"
        />
        {/* Botón Play sobre la portada */}
        <TouchableOpacity
          onPress={onPlay}
          className="absolute inset-0 items-center justify-center bg-black/30 rounded-lg"
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={18}
            color="white"
          />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View className="flex-1 ml-3">
        <Text
          numberOfLines={1}
          className="font-bold text-[15px]"
          style={{ color: isDark ? "white" : "black" }}
        >
          {song.title}
        </Text>
        <Text
          numberOfLines={1}
          className="text-xs"
          style={{ color: isDark ? "#A1A1AA" : "#71717A" }}
        >
          {song.artist?.name || song.artist}
        </Text>
      </View>

      {/* Botón Eliminar */}
      <TouchableOpacity
        onPress={onRemove}
        className="p-2 rounded-full"
        style={{
          backgroundColor: isDark
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.05)",
        }}
      >
        <Ionicons
          name="close"
          size={16}
          color={isDark ? "#A1A1AA" : "#71717A"}
        />
      </TouchableOpacity>
    </View>
  );
}
