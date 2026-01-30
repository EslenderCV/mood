import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAudioContext } from "@/context/AudioContext";

interface MusicMessageBubbleProps {
  songData: string; // JSON string
  isMe: boolean;
}

export const MusicMessageBubble = ({
  songData,
  isMe,
}: MusicMessageBubbleProps) => {
  const { playTrack, currentPlayingId, isPlaying, isLoading } =
    useAudioContext();

  let song: any = {};
  try {
    song = JSON.parse(songData);
  } catch (e) {
    return <Text style={{ color: "red" }}>Error loading song</Text>;
  }

  const isThisPlaying = currentPlayingId === song.id && isPlaying;
  const isThisLoading = currentPlayingId === song.id && isLoading;

  const handlePlay = async () => {
    if (song.preview) {
      await playTrack(song.id, song.preview, {
        title: song.title,
        artist: song.artist,
        cover: song.cover,
      });
    }
  };

  const iconColor = isMe ? "#5E17EB" : "white";
  const btnBg = isMe ? "white" : "#5E17EB";
  const textColor = isMe ? "white" : "black";
  const subTextColor = isMe ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.6)";

  return (
    <View style={{ width: 200, padding: 4 }}>
      <View className="flex-row items-center mb-2">
        <Image
          source={{ uri: song.cover }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            backgroundColor: "#333",
          }}
          contentFit="cover"
        />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text
            style={{ color: textColor, fontWeight: "bold", fontSize: 14 }}
            numberOfLines={1}
          >
            {song.title}
          </Text>
          <Text style={{ color: subTextColor, fontSize: 11 }} numberOfLines={1}>
            {song.artist}
          </Text>
        </View>
      </View>

      {/* Player Bar Visual */}
      <View
        style={{
          height: 36,
          backgroundColor: isMe ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.05)",
          borderRadius: 18,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 4,
        }}
      >
        <TouchableOpacity
          onPress={handlePlay}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: btnBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isThisLoading ? (
            <ActivityIndicator size="small" color={iconColor} />
          ) : (
            <Ionicons
              name={isThisPlaying ? "pause" : "play"}
              size={16}
              color={iconColor}
              style={{ marginLeft: isThisPlaying ? 0 : 2 }}
            />
          )}
        </TouchableOpacity>

        {/* Fake Waveform Lines */}
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-evenly",
            height: 16,
            marginHorizontal: 8,
          }}
        >
          {[...Array(15)].map((_, i) => (
            <View
              key={i}
              style={{
                width: 2,
                height: isThisPlaying
                  ? Math.random() * 14 + 4
                  : 4 + (i % 3) * 3,
                backgroundColor: subTextColor,
                borderRadius: 1,
                opacity: 0.7,
              }}
            />
          ))}
        </View>

        <Text style={{ fontSize: 9, color: subTextColor, marginRight: 4 }}>
          0:30
        </Text>
      </View>
    </View>
  );
};
