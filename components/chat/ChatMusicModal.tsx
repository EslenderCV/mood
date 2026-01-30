import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";

const { height } = Dimensions.get("window");

interface ChatMusicModalProps {
  visible: boolean;
  onClose: () => void;
  onSendSong: (song: any) => void;
}

export const ChatMusicModal = ({
  visible,
  onClose,
  onSendSong,
}: ChatMusicModalProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Audio State
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);

  // Limpieza al cerrar
  useEffect(() => {
    if (!visible) {
      stopSound();
      setQuery("");
      setResults([]);
    }
  }, [visible]);

  // Buscador Debounce
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query.length > 2) searchDeezer(query);
    }, 600);
    return () => clearTimeout(delayDebounce);
  }, [query]);

  const stopSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {}
      soundRef.current = null;
      setPlayingId(null);
    }
  };

  const handlePlayPreview = async (previewUrl: string, trackId: string) => {
    Haptics.selectionAsync();

    // Si ya suena esta, pausamos (stop)
    if (playingId === trackId) {
      await stopSound();
      return;
    }

    // Parar anterior
    await stopSound();

    if (!previewUrl) return;

    try {
      setLoadingAudioId(trackId);
      const { sound } = await Audio.Sound.createAsync(
        { uri: previewUrl },
        { shouldPlay: true },
      );
      soundRef.current = sound;
      setPlayingId(trackId);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
          soundRef.current = null;
        }
      });
    } catch (error) {
      console.log("Error playing preview", error);
    } finally {
      setLoadingAudioId(null);
    }
  };

  const searchDeezer = async (text: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.deezer.com/search?q=${encodeURIComponent(text)}&limit=15`,
      );
      const data = await response.json();
      const tracks = data.data.map((t: any) => ({
        id: t.id.toString(),
        title: t.title,
        artist: t.artist.name,
        cover: t.album.cover_medium,
        preview: t.preview,
        duration: t.duration,
      }));
      setResults(tracks);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (song: any) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    stopSound();
    onSendSong(song);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>

        <BlurView intensity={90} tint="dark" style={styles.container}>
          {/* Handle Bar */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>Compartir Música</Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#A1A1AA" />
            <TextInput
              style={styles.input}
              placeholder="Busca canciones..."
              placeholderTextColor="#71717A"
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={20} color="#71717A" />
              </TouchableOpacity>
            )}
          </View>

          {/* List */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#5E17EB" />
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isPlaying = playingId === item.id;
                const isLoadingAudio = loadingAudioId === item.id;

                return (
                  <View style={styles.itemContainer}>
                    {/* Cover & Play Button */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handlePlayPreview(item.preview, item.id)}
                      style={styles.coverContainer}
                    >
                      <Image
                        source={{ uri: item.cover }}
                        style={styles.cover}
                      />
                      <View
                        style={[
                          styles.overlay,
                          isPlaying && styles.activeOverlay,
                        ]}
                      >
                        {isLoadingAudio ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Ionicons
                            name={isPlaying ? "pause" : "play"}
                            size={20}
                            color="white"
                          />
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Info */}
                    <View style={styles.infoContainer}>
                      <Text
                        style={[
                          styles.songTitle,
                          isPlaying && { color: "#5E17EB" },
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.songArtist} numberOfLines={1}>
                        {item.artist}
                      </Text>
                    </View>

                    {/* Send Button */}
                    <TouchableOpacity
                      style={styles.sendButton}
                      onPress={() => handleSend(item)}
                    >
                      <LinearGradient
                        colors={["#5E17EB", "#8B5CF6"]}
                        style={styles.gradientButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.sendText}>Enviar</Text>
                        <Ionicons
                          name="arrow-forward"
                          size={14}
                          color="white"
                        />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                );
              }}
              ListEmptyComponent={
                !loading && query.length > 2 ? (
                  <Text style={styles.emptyText}>No encontramos canciones</Text>
                ) : null
              }
            />
          )}
        </BlurView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    height: height * 0.75,
    backgroundColor: "#121212",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 10,
    overflow: "hidden",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#3F3F46",
    borderRadius: 3,
    marginBottom: 15,
    marginTop: 5,
  },
  title: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#27272A",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#3F3F46",
  },
  input: {
    flex: 1,
    color: "white",
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "500",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 8,
    borderRadius: 16,
  },
  coverContainer: {
    position: "relative",
    width: 56,
    height: 56,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#333",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  activeOverlay: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 2,
    borderColor: "#5E17EB",
  },
  infoContainer: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  songTitle: {
    color: "white",
    fontWeight: "bold",
    fontSize: 15,
    marginBottom: 4,
  },
  songArtist: {
    color: "#A1A1AA",
    fontSize: 13,
    fontWeight: "500",
  },
  sendButton: {
    marginLeft: 10,
  },
  gradientButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 4,
  },
  sendText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
  },
  emptyText: {
    color: "#71717A",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
});
