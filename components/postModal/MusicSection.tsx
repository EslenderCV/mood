import React from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Text,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

// Subcomponentes
import LinkedSongCard from "./LinkedSongCard";
import SongResultRow from "./SongResultRow";

interface MusicSectionProps {
  isSearchingMusic: boolean;
  setIsSearchingMusic: (v: boolean) => void;
  linkedSong: any;
  onRemoveSong: () => void;
  searchQuery: string;
  setSearchQuery: (t: string) => void;
  isLoadingSearch: boolean;
  searchResults: any[];
  onSelectSong: (s: any) => void;
  onPlayPreview: (url: string) => void;
  isPlaying: boolean;
  currentPlayingUrl: string | null;
  onShazam: () => void;
  isRecording: boolean;
}

export default function MusicSection({
  isSearchingMusic,
  setIsSearchingMusic,
  linkedSong,
  onRemoveSong,
  searchQuery,
  setSearchQuery,
  isLoadingSearch,
  searchResults,
  onSelectSong,
  onPlayPreview,
  isPlaying,
  currentPlayingUrl,
  onShazam,
  isRecording,
}: MusicSectionProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Colores para iconos
  const iconColor = isDark ? "#A1A1AA" : "#71717A";

  // 1. SI YA HAY CANCIÓN -> Muestra la tarjeta de la canción
  if (linkedSong) {
    return (
      <Animated.View entering={FadeIn} exiting={FadeOut}>
        <LinkedSongCard
          song={linkedSong}
          onRemove={onRemoveSong}
          onPlay={() => onPlayPreview(linkedSong.preview)}
          isPlaying={isPlaying && currentPlayingUrl === linkedSong.preview}
        />
      </Animated.View>
    );
  }

  // 2. MODO BUSCADOR -> Input expandido
  if (isSearchingMusic) {
    return (
      <Animated.View entering={FadeIn} exiting={FadeOut} className="w-full">
        <View
          className="flex-row items-center px-3 py-2 rounded-xl mb-2"
          style={{
            backgroundColor: isDark
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.05)",
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          }}
        >
          <Ionicons name="search" size={18} color={iconColor} />
          <TextInput
            className="flex-1 ml-2 text-[15px] font-medium"
            style={{ color: isDark ? "white" : "black" }}
            placeholder="Buscar artista o canción..."
            placeholderTextColor={isDark ? "#52525B" : "#A1A1AA"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          <TouchableOpacity onPress={() => setIsSearchingMusic(false)}>
            <Ionicons name="close-circle" size={18} color={iconColor} />
          </TouchableOpacity>
        </View>

        {/* Lista de Resultados */}
        <View className="h-40">
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 🔥 CORRECCIÓN AQUÍ: Usamos index como fallback para la key */}
            {searchResults.map((song, index) => (
              <SongResultRow
                key={song.id ? `${song.id}-${index}` : index}
                song={song}
                onSelect={() => {
                  onSelectSong(song);
                  setIsSearchingMusic(false);
                }}
                onPlay={() => onPlayPreview(song.preview)}
                isPlaying={isPlaying && currentPlayingUrl === song.preview}
              />
            ))}
            {searchResults.length === 0 &&
              searchQuery.length > 2 &&
              !isLoadingSearch && (
                <Text className="text-zinc-500 text-center mt-4 text-xs">
                  No encontrado
                </Text>
              )}
          </ScrollView>
        </View>
      </Animated.View>
    );
  }

  // 3. MODO TOOLBAR (ICONOS) -> Vista por defecto
  return (
    <Animated.View
      entering={FadeIn}
      className="flex-row items-center justify-between pt-2"
    >
      <View className="flex-row gap-4">
        {/* BOTÓN MÚSICA */}
        <TouchableOpacity
          onPress={() => setIsSearchingMusic(true)}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{
            backgroundColor: isDark
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.05)",
          }}
        >
          <Ionicons name="musical-notes" size={20} color="#5E17EB" />
        </TouchableOpacity>

        {/* BOTÓN MICRÓFONO / SHAZAM */}
        <TouchableOpacity
          onPress={onShazam}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{
            backgroundColor: isRecording
              ? "#EF4444"
              : isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.05)",
          }}
        >
          <Ionicons
            name={isRecording ? "mic" : "mic-outline"}
            size={22}
            color={isRecording ? "white" : iconColor}
          />
        </TouchableOpacity>

        {/* BOTÓN LOCATION (Placeholder visual) */}
        <TouchableOpacity
          disabled
          className="w-10 h-10 rounded-full items-center justify-center opacity-50"
        >
          <Ionicons name="location-outline" size={22} color={iconColor} />
        </TouchableOpacity>
      </View>

      {/* Texto de ayuda sutil a la derecha */}
      <Text style={{ color: iconColor, fontSize: 12, opacity: 0.6 }}>
        Add to your post
      </Text>
    </Animated.View>
  );
}
