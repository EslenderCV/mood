import React, { useState, useEffect } from "react";
import {
  View,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  KeyboardAvoidingView,
  StyleSheet,
} from "react-native";
import { useColorScheme } from "nativewind";
import { usePostModalController } from "@/hooks/usePostModalController";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";
import PostModalHeader from "./PostModalHeader";
import PostComposer from "./PostComposer";
import MoodStyleSelector from "./MoodStyleSelector";
import MusicSection from "./MusicSection";
import PostToast from "./PostToast";

const searchDeezer = async (query: string) => {
  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=15`,
    );
    const data = await response.json();
    return data.data.map((track: any) => ({
      id: track.id.toString(),
      title: track.title,
      artist: track.artist.name,
      cover: track.album.cover_medium,
      preview: track.preview,
      duration: track.duration,
    }));
  } catch (e) {
    console.error("Error buscando en Deezer:", e);
    return [];
  }
};

const fetchSuggestedSongs = async () => {
  try {
    const response = await fetch(
      "https://api.deezer.com/chart/0/tracks?limit=50",
    );
    const json = await response.json();

    if (!json.data) return [];

    const uniqueTracks: any[] = [];
    const seenArtists = new Set();

    for (const track of json.data) {
      if (!seenArtists.has(track.artist.id)) {
        seenArtists.add(track.artist.id);
        uniqueTracks.push(track);
      }
    }

    const shuffled = uniqueTracks.sort(() => 0.5 - Math.random());

    return shuffled.slice(0, 5).map((track: any) => ({
      id: track.id.toString(),
      title: track.title,
      artist: track.artist.name,
      cover: track.album.cover_medium,
      preview: track.preview,
      duration: track.duration,
    }));
  } catch (e) {
    console.error("Error fetching suggestions:", e);
    return [];
  }
};

export default function PostModal() {
  const controller = usePostModalController();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const canPublish = Boolean(
    (controller.text.trim() || controller.linkedSong) &&
    (controller.linkedSong ||
      controller.user?.$id === controller.MOOD_OFFICIAL_ID),
  );

  const [localSearchResults, setLocalSearchResults] = useState<any[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState(false);

  useEffect(() => {
    const query = controller.searchQuery;

    if (!query || query.trim().length === 0) {
      const loadSuggestions = async () => {
        if (controller.isSearchingMusic) {
          setIsLocalLoading(true);
          const suggestions = await fetchSuggestedSongs();
          setLocalSearchResults(suggestions);
          setIsLocalLoading(false);
        }
      };
      loadSuggestions();
      return;
    }

    if (query.trim().length >= 2) {
      setIsLocalLoading(true);
      const timer = setTimeout(async () => {
        const results = await searchDeezer(query);
        setLocalSearchResults(results);
        setIsLocalLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [controller.searchQuery, controller.isSearchingMusic]);

  const blurTint = isDark
    ? "systemUltraThinMaterialDark"
    : "systemUltraThinMaterialLight";

  const glassBorder = isDark
    ? "rgba(255,255,255,0.15)"
    : "rgba(255,255,255,0.6)";

  const gradientColors = isDark
    ? (["rgba(30,30,35,0.7)", "rgba(10,10,12,0.8)"] as const)
    : (["rgba(255,255,255,0.85)", "rgba(240,240,255,0.9)"] as const);

  return (
    <>
      <PostToast
        visible={controller.toast.visible}
        type={controller.toast.type}
        title={controller.toast.title}
        message={controller.toast.message}
        translateY={controller.toastAnim}
      />

      <Modal
        animationType="none"
        transparent
        visible={controller.isPostModalVisible}
        onRequestClose={controller.closeModal}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={controller.closeModal}>
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
              style={styles.backdrop}
            >
              <TouchableWithoutFeedback>
                <Animated.View
                  entering={ZoomIn.springify().damping(18).mass(0.9)}
                  exiting={ZoomOut.duration(150)}
                  style={[
                    styles.glassContainer,
                    {
                      borderColor: glassBorder,
                      shadowColor: isDark ? "#5E17EB" : "#A78BFA",
                    },
                  ]}
                >
                  <BlurView
                    intensity={Platform.OS === "ios" ? 40 : 100}
                    tint={blurTint as any}
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    colors={["rgba(94, 23, 235, 0.15)", "transparent"] as const}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 0.4 }}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 150,
                    }}
                  />
                  <View style={styles.contentContainer}>
                    <View className="mt-[-10px] z-10">
                      <PostModalHeader
                        onClose={controller.closeModal}
                        onPublish={controller.handlePost}
                        canPublish={canPublish}
                      />
                    </View>
                    <View
                      style={{
                        minHeight: 70,
                        maxHeight: 160,
                        marginBottom: 10,
                      }}
                    >
                      <PostComposer
                        user={controller.user}
                        text={controller.text}
                        onChangeText={controller.setText}
                        showSuggestions={controller.showSuggestions}
                        suggestions={controller.suggestions}
                        onSelectUser={controller.handleSelectUser}
                      />
                    </View>
                    <View style={{ height: 10 }} />
                    <View>
                      {!controller.linkedSong &&
                        controller.user?.$id ===
                          controller.MOOD_OFFICIAL_ID && (
                          <View className="mb-3">
                            <MoodStyleSelector
                              moodStyle={controller.moodStyle}
                              setMoodStyle={controller.setMoodStyle}
                            />
                          </View>
                        )}

                      <MusicSection
                        isSearchingMusic={controller.isSearchingMusic}
                        setIsSearchingMusic={controller.setIsSearchingMusic}
                        linkedSong={controller.linkedSong}
                        onRemoveSong={controller.removeLinkedSong}
                        searchQuery={controller.searchQuery}
                        setSearchQuery={controller.setSearchQuery}
                        isLoadingSearch={isLocalLoading}
                        searchResults={localSearchResults}
                        onSelectSong={controller.handleSelectSong}
                        onPlayPreview={controller.handlePlayMusic}
                        isPlaying={controller.isPlaying}
                        currentPlayingUrl={controller.currentPlayingUrl}
                        onShazam={controller.handleShazam}
                        isRecording={controller.recorder.isRecording}
                      />
                    </View>
                  </View>
                </Animated.View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  glassContainer: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 36,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 24,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 20,
  },
});
