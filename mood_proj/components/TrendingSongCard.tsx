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
import { AudioActions, useAudioContext } from "@/context/AudioContext";

import { tStatic } from "@/context/LanguageContext";
import { useFeed } from "@/context/FeedProvider";
import { useModal } from "@/context/ModalContext";

const TrendingSongCard = ({ song }: { song: any }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const { setViralSongToUse } = useFeed();
  const { setPostModalVisible } = useModal();

  // Solo usamos el context para reflejar el estado visual del player global.
  const { currentPlayingId, isPlaying, isLoading, isBuffering } =
    useAudioContext();

  const trackId = useMemo(() => {
    if (song?.id === undefined || song?.id === null) return null;
    return String(song.id);
  }, [song?.id]);

  const normalizedCurrentPlayingId = useMemo(() => {
    if (currentPlayingId === undefined || currentPlayingId === null) return null;
    return String(currentPlayingId);
  }, [currentPlayingId]);

  const isThisTrackActive = useMemo(
    () => normalizedCurrentPlayingId === trackId,
    [normalizedCurrentPlayingId, trackId],
  );
  const isThisTrackPlaying = isThisTrackActive && isPlaying;
  const isThisTrackLoading = isThisTrackActive && (isLoading || isBuffering);

  const handlePlayPause = async () => {
    try {
      if (!trackId) return;

      // Misma lógica que el audio global del home/feed:
      // usamos AudioActions para interactuar con la fuente única del reproductor.
      const state = AudioActions.getState();
      const isThisTrack =
        state.currentPlayingId !== null &&
        state.currentPlayingId !== undefined &&
        String(state.currentPlayingId) === trackId;

      if (isThisTrack) {
        if (state.isPlaying) await AudioActions.pauseTrack();
        else await AudioActions.resumeTrack();
        return;
      }

      await AudioActions.playTrack(trackId, song?.preview, {
        title: song?.title,
        artist: song?.artist?.name || song?.artist,
        cover: song?.cover || song?.album?.cover_xl || song?.album?.cover_big,
      });
    } catch (error) {
      console.log("Error playing viral song via global player:", error);
    }
  };

  const handleUseSound = async () => {
    try {
      const state = AudioActions.getState();
      if (state.currentPlayingId && state.isPlaying) {
        await AudioActions.pauseTrack();
      }
    } catch {}

    setViralSongToUse(song);
    setPostModalVisible(true);
  };

  const handleUseSoundPress = (event?: any) => {
    event?.stopPropagation?.();
    void handleUseSound();
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
        >
          {tStatic("ui.s_18b9d3db")}
        </Text>
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

          <TouchableOpacity
            onPress={handleUseSoundPress}
            className="mt-6 flex-row items-center bg-white/10 self-start px-4 py-3 rounded-full backdrop-blur-md border border-white/10 active:bg-white/20"
          >
            <Ionicons name="musical-notes" size={16} color="#fff" />
            <Text className="text-white font-bold text-sm ml-2">
              {tStatic("ui.s_22051e50")}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default TrendingSongCard;
