import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

interface SongResultRowProps {
  song: any;
  onSelect: () => void;
  onPlay: () => void;
  isPlaying: boolean;
}

export default function SongResultRow({
  song,
  onSelect,
  onPlay,
  isPlaying,
}: SongResultRowProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className="flex-row items-center justify-between py-2 px-1 mb-1 rounded-xl">
      <TouchableOpacity
        onPress={onSelect}
        className="flex-row items-center flex-1"
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: song.cover || song.album?.cover_medium }}
          className="w-10 h-10 rounded-lg bg-zinc-800"
          contentFit="cover"
        />

        <View className="ml-3 flex-1">
          <Text
            numberOfLines={1}
            className="font-semibold text-[14px]"
            style={{ color: isDark ? "white" : "black" }}
          >
            {song.title}
          </Text>
          <Text
            numberOfLines={1}
            className="text-[12px]"
            style={{ color: isDark ? "#A1A1AA" : "#71717A" }}
          >
            {song.artist?.name || song.artist}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Botón de Previsualización */}
      <TouchableOpacity
        onPress={onPlay}
        className="w-8 h-8 items-center justify-center rounded-full ml-2"
        style={{
          backgroundColor: isPlaying
            ? "#5E17EB"
            : isDark
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.05)",
        }}
      >
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={14}
          color={isPlaying ? "white" : isDark ? "white" : "black"}
          style={{ marginLeft: isPlaying ? 0 : 2 }}
        />
      </TouchableOpacity>
    </View>
  );
}
