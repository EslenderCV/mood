import React, { useMemo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "nativewind";
import { useAudioContext } from "@/context/AudioContext";
import { getDeezerTrackUrl } from "@/lib/appwrite";

import { tStatic } from "@/context/LanguageContext";
// 🔥 IMPORTS PARA LA ACCIÓN
import { useFeed } from "@/context/FeedProvider";
import { useModal } from "@/context/ModalContext";

const TrendingSongCard = ({ song }: { song: any }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Contextos para acción
  const { setViralSongToUse } = useFeed();
  const { setPostModalVisible } = useModal();

  // ✅ Usar el reproductor global (evita solapes de audio)
  const {
    currentPlayingId,
    isPlaying,
    isLoading,
    isBuffering,
    playTrack,
    pauseTrack,
    resumeTrack,
  } = useAudioContext();

  const isThisTrackActive = useMemo(() => currentPlayingId === song?.id, [currentPlayingId, song?.id]);
  const isThisTrackPlaying = isThisTrackActive && isPlaying;
  const isThisTrackLoading = isThisTrackActive && (isLoading || isBuffering);

  const handlePlayPause = async () => {
    try {
      // Si ya es la pista activa, solo togglear play/pause
      if (isThisTrackActive) {
        if (isPlaying) await pauseTrack();
        else await resumeTrack();
        return;
      }

      // Caso nuevo track: hacemos play en el player global.
      const previewUrl = song?.preview || (await getDeezerTrackUrl(song?.id));

      await playTrack(
        song?.id,
        previewUrl,
        {
          title: song?.title,
          artist: song?.artist?.name || song?.artist,
          cover: song?.cover || song?.album?.cover_xl,
        },
      );
    } catch (error) {
      console.log("Error playing viral song via global player:", error);
    }
  };

  const handleUseSound = () => {
    // 1. Pausar si está sonando (en el player global)
    if (isThisTrackPlaying) {
      pauseTrack();
    }

    // 2. Establecer la canción en el "Puente" del proveedor
    setViralSongToUse(song);

    // 3. Abrir el modal de crear post
    setPostModalVisible(true);
  };

  if (!song) return null;

  return (
    <View
      className={`py-6 border-b ${
        isDark ? "border-zinc-800" : "border-zinc-200"
      } px-5`}
    >
      <View className="flex-row items-center mb-4">
        <Ionicons
          name="trending-up"
          size={18}
          color="#5E17EB"
          style={{ marginRight: 6 }}
        />
        <Text
          className={`text-base font-bold ${
            isDark ? "text-white" : "text-black"
          }`}
        >{tStatic("ui.s_18b9d3db")}</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePlayPause}
        className="w-full h-[350px] rounded-[32px] overflow-hidden relative shadow-lg"
        style={{
          shadowColor: "#5E17EB",
          shadowOpacity: 0.4,
          shadowRadius: 15,
          elevation: 10,
        }}
      >
        <Image
          source={{ uri: song.cover || song.album?.cover_xl }}
          className="absolute w-full h-full"
          resizeMode="cover"
        />

        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.9)"]}
          className="absolute w-full h-full justify-end p-6"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-white font-black text-3xl leading-tight mb-1 shadow-sm">
                {song.title}
              </Text>
              <Text className="text-zinc-300 text-lg font-medium">
                {song.artist?.name || song.artist}
              </Text>
            </View>

            <View className="bg-[#5E17EB] w-16 h-16 rounded-full items-center justify-center border-2 border-white/20 shadow-xl">
              {isThisTrackLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Ionicons
                  name={isThisTrackPlaying ? "pause" : "play"}
                  size={32}
                  color="white"
                  style={{ marginLeft: isThisTrackPlaying ? 0 : 4 }}
                />
              )}
            </View>
          </View>

          {/* 🔥 BOTÓN CONECTADO */}
          <TouchableOpacity
            onPress={handleUseSound}
            className="mt-6 flex-row items-center bg-white/10 self-start px-4 py-3 rounded-full backdrop-blur-md border border-white/10 active:bg-white/20"
          >
            <Ionicons name="musical-notes" size={16} color="#fff" />
            <Text className="text-white font-bold text-sm ml-2">{tStatic("ui.s_22051e50")}</Text>
          </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default TrendingSongCard;