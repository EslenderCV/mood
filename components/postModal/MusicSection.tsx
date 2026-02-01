import React, { useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Text,
  TextInput,
  Modal,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons , Fontisto } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
// Subcomponentes
import LinkedSongCard from "./LinkedSongCard";
import SongResultRow from "./SongResultRow";
import { MoodState } from "@/hooks/usePostModalController";

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
  isShazamScanning: boolean;
  shazamUiState: "idle" | "listening" | "matching";
  shazamSecondsLeft: number;
  shazamDetected: { title: string; artist: string; artworkURL?: string } | null;
  onCancelShazam: () => void;
  openMoodPopup: () => void;
  mood: any;
  setMood: (v: MoodState | null) => void;
}

const moodButtonBorder = "#5E17EB";
// Componente pa' las onditas de la animación (Pulsing Circles)
const PulsingCircle = ({ delay, size }: { delay: number; size: number }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(2, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#5E17EB", // Morado Mood
        },
        animatedStyle,
      ]}
    />
  );
};

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
  isShazamScanning,
  shazamUiState,
  shazamSecondsLeft,
  shazamDetected,
  onCancelShazam,
  openMoodPopup,
  mood,
  setMood,
}: MusicSectionProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? "#A1A1AA" : "#71717A";

  const overlayTitle =
    shazamUiState === "matching" ? "¡Encontrada!" : "Escuchando…";
  const overlaySubtitle =
    shazamUiState === "matching"
      ? "Buscando detalles para añadirla al post…"
      : shazamSecondsLeft > 0
        ? `Quedan ${shazamSecondsLeft}s`
        : "Procesando…";

  if (linkedSong) {
    return (
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        className="flex-column"
      >
        <LinkedSongCard
          song={linkedSong}
          onRemove={onRemoveSong}
          onPlay={() => onPlayPreview(linkedSong.preview)}
          isPlaying={isPlaying && currentPlayingUrl === linkedSong.preview}
        />
        <View className="mt-4 flex-row justify-center w-full">
          <TouchableOpacity
            onPress={openMoodPopup}
            style={[
              styles.moodButton,
              {
                backgroundColor: "transparent",
                borderColor: moodButtonBorder,
              },
            ]}
          >
            {mood ? (
              // Estado: Mood Seleccionado
              <View className="flex-row items-center">
                <Text style={{ fontSize: 18, marginRight: 6 }}>
                  {mood.emoji}
                </Text>
                <Text style={styles.selectedMoodText} numberOfLines={1}>
                  {mood.text || "Mood"}
                </Text>
                <TouchableOpacity
                  onPress={() => setMood(null)}
                  style={{ marginLeft: 8, padding: 2 }}
                  hitSlop={10}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color="#5E17EB"
                    opacity={0.7}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              // Estado: Sin Mood (Agregar)
              <View className="flex-row items-center">
                <Ionicons name="cloudy" size={24} color="#5E17EB" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

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
        <View className="h-40">
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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

  return (
    <Animated.View
      entering={FadeIn}
      className="flex-row items-center justify-between pt-2"
    >
      <View className="flex-row gap-4">
        {/* BOTÓN DE BÚSQUEDA NORMAL */}
        <TouchableOpacity
          onPress={() => setIsSearchingMusic(true)}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{
            backgroundColor: isDark ? "#181818" : "rgba(0,0,0,0.05)",
            borderColor: "#5E17EB",
            borderWidth: 0.9,
          }}
        >
          <Ionicons name="musical-notes" size={25} color="#5E17EB" />
        </TouchableOpacity>

        {/* 🔥 BOTÓN SHAZAM MORADO 🔥 */}
        <TouchableOpacity
          onPress={onShazam}
          className="flex w-auto h-auto rounded-full items-center justify-center bg-primaryy"
          style={{
            shadowColor: "#5E17EB",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          {/* Usamos el icono de Shazam real o algo parecido si no está disponible */}
          <Fontisto
            name="shazam"
            size={38}
            color={isDark ? "#181818" : "rgba(0,0,0,0.05)"}
            style={{
              width: 40,
              height: 40,
              borderRadius: 100,
              textAlign: "center",
            }}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={openMoodPopup}
          style={[
            styles.moodButton,
            {
              backgroundColor: "transparent",
              borderColor: moodButtonBorder,
            },
          ]}
        >
          {mood ? (
            // Estado: Mood Seleccionado
            <View className="flex-row items-center">
              <Text style={{ fontSize: 18, marginRight: 6 }}>{mood.emoji}</Text>
              <Text style={styles.selectedMoodText} numberOfLines={1}>
                {mood.text || "Mood"}
              </Text>
              <TouchableOpacity
                onPress={() => setMood(null)}
                style={{ marginLeft: 8, padding: 2 }}
                hitSlop={10}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color="#5E17EB"
                  opacity={0.7}
                />
              </TouchableOpacity>
            </View>
          ) : (
            // Estado: Sin Mood (Agregar)
            <View className="flex-row items-center">
              <Ionicons name="cloudy-night" size={24} color="#5E17EB" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 🔥 EL MODAL DE ESCANEO (OVERLAY) 🔥 */}
      <Modal
        visible={isShazamScanning}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.overlayContainer}>
          {/* Fondo con Blur */}
          <BlurView
            intensity={20}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "rgba(0,0,0,0.7)",
            }}
          />

          {/* Contenedor Central */}
          <View className="items-center justify-center">
            {/* Ondas de Animación */}
            <View className="absolute bottom-44 left-9">
              <PulsingCircle delay={0} size={150} />
              <PulsingCircle delay={1000} size={150} />
            </View>
            {/* Logo Central */}
            <View
              className="flex w-auto h-auto rounded-full items-center justify-center bg-white"
              style={{
                shadowColor: "#5E17EB",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              <Fontisto
                name="shazam"
                size={100}
                color="#5E17EB"
                style={{
                  borderRadius: 100,
                  width: 105,
                  height: 105,
                  textAlign: "center",
                }}
              />
            </View>

            {/* Texto */}
            
{/* Track detectada (preview) */}
{shazamDetected ? (
  <View
    style={{
      marginTop: 22,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      backgroundColor: "rgba(20, 20, 23, 0.55)",
      flexDirection: "row",
      alignItems: "center",
      maxWidth: 320,
    }}
  >
    {shazamDetected.artworkURL ? (
      <Image
        source={{ uri: shazamDetected.artworkURL }}
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          marginRight: 12,
          backgroundColor: "rgba(255,255,255,0.08)",
        }}
      />
    ) : (
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          marginRight: 12,
          backgroundColor: "rgba(255,255,255,0.08)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="musical-notes" size={22} color="#A78BFA" />
      </View>
    )}

    <View style={{ flex: 1 }}>
      <Text
        numberOfLines={1}
        style={{
          color: "white",
          fontWeight: "800",
          fontSize: 15,
        }}
      >
        {shazamDetected.title}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          color: "rgba(255,255,255,0.7)",
          fontWeight: "600",
          fontSize: 13,
          marginTop: 2,
        }}
      >
        {shazamDetected.artist}
      </Text>
    </View>
  </View>
) : null}

{/* Texto principal */}
<Text className="text-white font-bold text-xl mt-8 tracking-wide">
  {overlayTitle}
</Text>
<Text
  style={{
    marginTop: 8,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "600",
    fontSize: 13,
  }}
>
  {overlaySubtitle}
</Text>

{/* Cancel */}
<TouchableOpacity
  onPress={onCancelShazam}
  accessibilityRole="button"
  accessibilityLabel="Cancelar reconocimiento"
  style={{
    marginTop: 22,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
  }}
>
  <Text style={{ color: "white", fontWeight: "700" }}>
    Cancelar
  </Text>
</TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  moodButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: "flex-start",
    borderWidth: 0.8,
  },
  moodButtonText: {
    color: "#5E17EB",
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 8,
  },
  selectedMoodText: {
    color: "#5E17EB",
    fontWeight: "700",
    fontSize: 14,
    maxWidth: 150,
  },
});
