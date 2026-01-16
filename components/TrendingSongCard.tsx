import React, { useState, useEffect } from "react";
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
import { Audio } from "expo-av";
import { useAudioContext } from "@/context/AudioContext";
import { getDeezerTrackUrl } from "@/lib/appwrite";

// 🔥 IMPORTS PARA LA ACCIÓN
import { useFeed } from "@/context/FeedProvider";
import { useModal } from "@/context/ModalContext";

const TrendingSongCard = ({ song }: { song: any }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Contextos para acción
  const { setViralSongToUse } = useFeed();
  const { setPostModalVisible } = useModal();

  // Audio State
  const { currentPlayingId, setPlayingId } = useAudioContext();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  useEffect(() => {
    const manageGlobalAudio = async () => {
      if (currentPlayingId && currentPlayingId !== song.id && sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        }
      }
    };
    manageGlobalAudio();
  }, [currentPlayingId, song.id, sound]);

  const handlePlayPause = async () => {
    try {
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
            setPlayingId(null);
          } else {
            if (status.positionMillis >= status.durationMillis!) {
              await sound.replayAsync();
            } else {
              await sound.playAsync();
            }
            setPlayingId(song.id);
            setIsPlaying(true);
          }
        }
        return;
      }

      setIsLoadingAudio(true);
      const previewUrl = song.preview || (await getDeezerTrackUrl(song.id));

      if (!previewUrl) {
        setIsLoadingAudio(false);
        return;
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: previewUrl },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);
      setPlayingId(song.id);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          setPlayingId(null);
        }
      });

      setIsLoadingAudio(false);
    } catch (error) {
      console.log("Error playing viral song:", error);
      setIsLoadingAudio(false);
    }
  };

  const handleUseSound = () => {
    // 1. Pausar si está sonando
    if (sound && isPlaying) {
      sound.pauseAsync();
      setIsPlaying(false);
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
        >
          Viral en Mood
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
              {isLoadingAudio ? (
                <ActivityIndicator color="white" />
              ) : (
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={32}
                  color="white"
                  style={{ marginLeft: isPlaying ? 0 : 4 }}
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
            <Text className="text-white font-bold text-sm ml-2">
              Usar este sonido
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default TrendingSongCard;
