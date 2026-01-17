import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Image,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  LayoutAnimation,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudioPlayer } from "expo-audio";

import { useLanguage } from "@/context/LanguageContext";
import CustomToast from "../shared/CustomToast";

interface StoryCreationModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: any;
  onSuccess: () => void;
  initialSongData: any;
  createStory: (songData: string, userId: string) => Promise<any>;
  searchSongsWrapper: (query: string) => Promise<any[]>;
  RANDOM_SEARCH_TERMS: string[];
}

const StoryCreationModal = ({
  visible,
  onClose,
  currentUser,
  onSuccess,
  initialSongData,
  createStory,
  searchSongsWrapper,
  RANDOM_SEARCH_TERMS,
}: StoryCreationModalProps) => {
  const [step, setStep] = useState<"search" | "preview">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [previewTrackUrl, setPreviewTrackUrl] = useState<string | null>(null);
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [trendingSongs, setTrendingSongs] = useState<any[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [toast, setToast] = useState({
    visible: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const toastAnim = useRef(new Animated.Value(-150)).current;

  const showToast = (
    type: "success" | "error",
    title: string,
    message: string,
  ) => {
    setToast({ visible: true, type, title, message });
    Animated.spring(toastAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
    setTimeout(() => hideToast(), 3000);
  };
  const hideToast = () => {
    Animated.timing(toastAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setToast((prev) => ({ ...prev, visible: false })));
  };

  const activeAudioSource =
    step === "preview" && selectedSong?.preview
      ? selectedSong.preview
      : previewTrackUrl || "";
  const player = useAudioPlayer(activeAudioSource);

  useEffect(() => {
    if (visible) {
      if (initialSongData) {
        setSelectedSong(initialSongData);
        setStep("preview");
        setPreviewTrackUrl(null);
      } else {
        resetForm();
        fetchRandomTrending();
      }
    }
  }, [visible, initialSongData]);

  const fetchRandomTrending = async () => {
    setLoadingTrending(true);
    const randomTerm =
      RANDOM_SEARCH_TERMS[
        Math.floor(Math.random() * RANDOM_SEARCH_TERMS.length)
      ];
    const songs = await searchSongsWrapper(randomTerm);
    setTrendingSongs(songs);
    setLoadingTrending(false);
  };

  useEffect(() => {
    try {
      if (activeAudioSource && player) {
        if (player.playing) player.pause();
        player.replace(activeAudioSource);
        player.play();
        player.loop = step === "preview";
      } else if (player) {
        player.pause();
      }
    } catch (e) {
      console.log("Audio Error:", e);
    }
  }, [activeAudioSource, step]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length > 2) {
        setSearching(true);
        const songs = await searchSongsWrapper(query);
        setResults(songs);
        setSearching(false);
      } else {
        setResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const resetForm = () => {
    setStep("search");
    setQuery("");
    setResults([]);
    setSelectedSong(null);
    setCaption("");
    setPreviewTrackUrl(null);
    try {
      if (player) player.pause();
    } catch (e) {}
  };

  const handlePlayPreview = (url: string | null) => {
    if (!url) return;
    try {
      if (previewTrackUrl === url) {
        if (player.playing) {
          player.pause();
          setPreviewTrackUrl(null);
        } else {
          player.play();
        }
      } else {
        setPreviewTrackUrl(url);
      }
    } catch (e) {}
  };

  const handleSelectSong = (song: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedSong(song);
    setPreviewTrackUrl(null);
    setStep("preview");
  };

  const handleUpload = async () => {
    if (!selectedSong || !currentUser) return;
    setLoading(true);
    try {
      if (player) player.pause();
    } catch (e) {}

    const songId =
      selectedSong.id || selectedSong.spotifyId || selectedSong.trackId;

    try {
      const songData = JSON.stringify({
        title: selectedSong.title,
        artist: selectedSong.artist,
        cover: selectedSong.cover,
        preview: selectedSong.preview,
        spotifyId: songId,
        caption: caption,
      });
      await createStory(songData, currentUser.$id);
      onClose();
      setTimeout(() => {
        showToast("success", t("common.posted"), t("story.postedMsg"));
      }, 300);
      onSuccess();
    } catch (error) {
      showToast("error", t("common.error"), t("story.errorPosting"));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "preview") {
      if (initialSongData) {
        onClose();
      } else {
        setStep("search");
        setSelectedSong(null);
        setPreviewTrackUrl(null);
      }
    } else {
      onClose();
    }
  };

  if (!visible && !toast.visible) return null;

  return (
    <>
      <CustomToast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        translateY={toastAnim}
      />
      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View className="flex-1 justify-end bg-black/80">
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View
                className="w-full bg-[#121212] rounded-t-[32px] overflow-hidden"
                style={{ height: "92%" }}
              >
                <View className="flex-row items-center justify-between px-5 py-4 border-b border-zinc-900 z-10 bg-[#121212]">
                  <TouchableOpacity onPress={handleBack} className="p-2 -ml-2">
                    <Text className="text-zinc-400 text-lg">
                      {t("common.cancel")}
                    </Text>
                  </TouchableOpacity>
                  <Text className="text-white font-bold text-lg">
                    {t("story.newStory")}
                  </Text>
                  <View style={{ width: 70 }} />
                </View>
                <View className="flex-1 bg-black">
                  {step === "search" ? (
                    <View className="flex-1 px-4 pt-4">
                      <View className="bg-zinc-900 flex-row items-center px-4 py-4 rounded-3xl mb-6 border border-zinc-800 shadow-sm">
                        <Ionicons name="search" size={20} color="#A1A1AA" />
                        <TextInput
                          placeholder={t("story.searchPlaceholder")}
                          placeholderTextColor="#71717A"
                          className="flex-1 ml-3 text-white text-lg font-medium"
                          value={query}
                          onChangeText={setQuery}
                          autoFocus
                          returnKeyType="search"
                        />
                        {query.length > 0 && (
                          <TouchableOpacity onPress={() => setQuery("")}>
                            <Ionicons
                              name="close-circle"
                              size={20}
                              color="#71717A"
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                      {searching ? (
                        <View className="mt-20">
                          <ActivityIndicator size="large" color="#5E17EB" />
                        </View>
                      ) : query.length === 0 ? (
                        <ScrollView showsVerticalScrollIndicator={false}>
                          <Text className="text-white font-bold text-xl mb-4 ml-1">
                            {t("story.trending")}
                          </Text>
                          {loadingTrending ? (
                            <ActivityIndicator
                              color="#5E17EB"
                              className="mt-10"
                            />
                          ) : (
                            trendingSongs.map((song, index) => (
                              <TouchableOpacity
                                key={song.id}
                                onPress={() => handleSelectSong(song)}
                                className="flex-row items-center mb-4 active:opacity-70"
                              >
                                <Text className="text-zinc-500 font-bold text-lg w-6 mr-2 text-center">
                                  {index + 1}
                                </Text>
                                <Image
                                  source={{ uri: song.cover }}
                                  className="w-14 h-14 rounded-xl bg-zinc-800"
                                />
                                <View className="ml-3 flex-1">
                                  <Text
                                    className="text-white font-bold text-[16px]"
                                    numberOfLines={1}
                                  >
                                    {song.title}
                                  </Text>
                                  <Text
                                    className="text-zinc-400 text-sm"
                                    numberOfLines={1}
                                  >
                                    {song.artist}
                                  </Text>
                                </View>
                                <Ionicons
                                  name="chevron-forward"
                                  size={20}
                                  color="#3F3F46"
                                />
                              </TouchableOpacity>
                            ))
                          )}
                        </ScrollView>
                      ) : (
                        <FlatList
                          data={results}
                          keyExtractor={(item) => item.id}
                          contentContainerStyle={{ paddingBottom: 40 }}
                          keyboardShouldPersistTaps="handled"
                          renderItem={({ item }) => {
                            const isPlaying =
                              previewTrackUrl === item.preview &&
                              player.playing;
                            return (
                              <TouchableOpacity
                                onPress={() => handleSelectSong(item)}
                                className="flex-row items-center py-3 border-b border-zinc-900"
                                activeOpacity={0.7}
                              >
                                <Image
                                  source={{ uri: item.cover }}
                                  className="w-14 h-14 rounded-lg bg-zinc-800"
                                />
                                <View className="ml-3 flex-1 pr-2">
                                  <Text
                                    className="text-white font-bold text-[15px] mb-0.5"
                                    numberOfLines={1}
                                  >
                                    {item.title}
                                  </Text>
                                  <Text
                                    className="text-zinc-400 text-xs"
                                    numberOfLines={1}
                                  >
                                    {item.artist}
                                  </Text>
                                </View>
                                {item.preview && (
                                  <TouchableOpacity
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      handlePlayPreview(item.preview);
                                    }}
                                    className="p-2"
                                  >
                                    <Ionicons
                                      name={
                                        isPlaying
                                          ? "pause-circle"
                                          : "play-circle"
                                      }
                                      size={32}
                                      color={isPlaying ? "#5E17EB" : "#71717A"}
                                    />
                                  </TouchableOpacity>
                                )}
                              </TouchableOpacity>
                            );
                          }}
                        />
                      )}
                    </View>
                  ) : (
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                      <View className="flex-1 relative">
                        <Image
                          source={{ uri: selectedSong.cover }}
                          className="absolute w-full h-full"
                          blurRadius={90}
                          style={{ opacity: 0.6 }}
                        />
                        <LinearGradient
                          colors={["transparent", "#000000"] as const}
                          className="absolute w-full h-full"
                          style={{ opacity: 0.8 }}
                        />
                        <View
                          className="absolute top-0 w-full flex-row justify-between items-center px-5 z-20"
                          style={{ paddingTop: insets.top + 10 }}
                        >
                          <TouchableOpacity
                            onPress={handleBack}
                            className="bg-black/20 p-3 rounded-full backdrop-blur-md"
                          >
                            <Ionicons
                              name="chevron-down"
                              size={28}
                              color="white"
                            />
                          </TouchableOpacity>
                        </View>
                        <KeyboardAvoidingView
                          behavior={
                            Platform.OS === "ios" ? "padding" : "height"
                          }
                          className="flex-1 justify-center items-center px-6"
                        >
                          <View
                            className="w-full aspect-square rounded-[32px] overflow-hidden shadow-2xl mb-12 border border-white/10"
                            style={{
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 20 },
                              shadowOpacity: 0.5,
                              shadowRadius: 30,
                              elevation: 10,
                            }}
                          >
                            <Image
                              source={{ uri: selectedSong.cover }}
                              className="w-full h-full"
                            />
                            <LinearGradient
                              colors={
                                ["transparent", "rgba(0,0,0,0.8)"] as const
                              }
                              className="absolute bottom-0 w-full h-32 justify-end px-6 py-6"
                            >
                              <Text className="text-white font-black text-3xl shadow-sm">
                                {selectedSong.title}
                              </Text>
                              <Text className="text-zinc-300 text-lg font-medium">
                                {selectedSong.artist}
                              </Text>
                            </LinearGradient>
                          </View>
                          <View className="w-full px-4 mb-6">
                            <TextInput
                              placeholder={t("story.captionPlaceholder")}
                              placeholderTextColor="rgba(255,255,255,0.5)"
                              className="text-white text-2xl py-2 text-center font-medium shadow-md"
                              style={{
                                textShadowColor: "rgba(0,0,0,0.5)",
                                textShadowOffset: { width: 0, height: 1 },
                                textShadowRadius: 3,
                              }}
                              value={caption}
                              onChangeText={setCaption}
                              maxLength={100}
                              multiline
                              returnKeyType="done"
                              blurOnSubmit
                            />
                          </View>
                        </KeyboardAvoidingView>
                        <View
                          className="absolute bottom-10 right-6 z-20"
                          style={{ paddingBottom: insets.bottom }}
                        >
                          <TouchableOpacity
                            onPress={handleUpload}
                            disabled={loading}
                            className="bg-[#5E17EB] w-16 h-16 rounded-full items-center justify-center shadow-lg shadow-purple-500/40"
                          >
                            {loading ? (
                              <ActivityIndicator size="small" color="white" />
                            ) : (
                              <Ionicons
                                name="arrow-forward"
                                size={32}
                                color="white"
                              />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableWithoutFeedback>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

export default StoryCreationModal;
