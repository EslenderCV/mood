import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  StyleSheet, // ✅ IMPORT FALTANTE AGREGADO
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useAudioContext } from "@/context/AudioContext";
import LoadingDots from "@/components/shared/LoadingDots";

const GlobalAudioPlayerBar = () => {
  const { activeTrackMetadata, isPlaying, isLoading, isBuffering, pauseTrack, resumeTrack, stopTrack } =
    useAudioContext();

  const translateY = useRef(new Animated.Value(100)).current;

  const hasActiveTrack = !!activeTrackMetadata;

  // Animación de entrada/salida
  useEffect(() => {
    if (hasActiveTrack) {
      Animated.spring(translateY, {
        toValue: 0,
        damping: 16,
        stiffness: 120,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 150, // Lo escondemos bien abajo
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [hasActiveTrack, translateY]);

  const togglePlayPause = () => {
    if (isPlaying) pauseTrack();
    else resumeTrack();
  };

  if (!hasActiveTrack) return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: Platform.OS === "ios" ? 90 : 70, // Ajustado para flotar sobre el TabBar
        left: 12,
        right: 12,
        height: 60,
        borderRadius: 14,
        overflow: "hidden",
        transform: [{ translateY }],
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
        zIndex: 9999,
      }}
    >
      {/* Fondo Glassmorphism */}
      <BlurView
        intensity={Platform.OS === "ios" ? 40 : 80}
        tint="dark"
        style={StyleSheet.absoluteFill} // ✅ CORREGIDO: Uso directo de StyleSheet
      >
        <LinearGradient
          colors={["rgba(25,25,25,0.9)", "rgba(10,10,10,0.95)"]}
          style={{ flex: 1 }}
        />
        {/* Línea de progreso decorativa */}
        <LinearGradient
          colors={isPlaying ? ["#5E17EB", "#EC4899"] : ["#3F3F46", "#52525B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 2, width: "100%", opacity: 0.8 }}
        />
      </BlurView>

      <View className="flex-1 flex-row items-center px-2">
        {/* Portada */}
        <Image
          source={{ uri: activeTrackMetadata?.cover }}
          style={{ width: 44, height: 44, borderRadius: 10 }}
          className="bg-zinc-800"
          contentFit="cover"
        />

        {/* Info Texto */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={{ flex: 1, marginLeft: 10, marginRight: 10 }}
        >
          <Text className="text-white font-bold text-[14px]" numberOfLines={1}>
            {activeTrackMetadata?.title || "Música"}
          </Text>
          <Text
            className="text-zinc-400 text-[11px] font-medium"
            numberOfLines={1}
          >
            {activeTrackMetadata?.artist || "Artista desconocido"}
          </Text>
        </TouchableOpacity>

        {/* Controles */}
        <View className="flex-row items-center gap-2 pr-2">
          {/* Play/Pause */}
          <TouchableOpacity
            onPress={togglePlayPause}
            className="w-9 h-9 items-center justify-center rounded-full"
            style={{
              backgroundColor: isPlaying
                ? "rgba(94, 23, 235, 0.15)"
                : "transparent",
            }}
          >
            {isPlaying ? (
              <Ionicons name="pause" size={24} color="#A78BFA" />
            ) : isLoading || isBuffering ? (
              <LoadingDots size={3.5} gap={3} />
            ) : (
              <Ionicons name="play" size={24} color="white" />
            )}
          </TouchableOpacity>

          {/* Cerrar (X) */}
          <TouchableOpacity
            onPress={() => {
              stopTrack();
            }}
            className="w-9 h-9 items-center justify-center rounded-full active:bg-white/10"
          >
            <Ionicons name="close" size={20} color="#71717A" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

export default GlobalAudioPlayerBar;
