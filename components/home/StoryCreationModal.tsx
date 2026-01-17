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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudioPlayer } from "expo-audio";
import { Video, ResizeMode } from "expo-av";
import { pickMedia, uploadFile } from "@/lib/appwrite";
import { useLanguage } from "@/context/LanguageContext";
import CustomToast from "../shared/CustomToast";

const MOOD_OFFICIAL_ID = "696b571b00112fd5c1e9";

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
  const [media, setMedia] = useState<any>(null);

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

  const isOfficialAccount = currentUser?.$id === MOOD_OFFICIAL_ID;

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
    setMedia(null);
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
    setMedia(null);
    setPreviewTrackUrl(null);
    setStep("preview");
  };

  const handlePickMedia = async (type: "image" | "video") => {
    try {
      const result = await pickMedia(type);
      if (result) {
        setMedia({ uri: result.uri, type: type, file: result });
        setSelectedSong(null);
        setStep("preview");
      }
    } catch (error) {
      console.log("Error picking media:", error);
    }
  };

  const handleUpload = async () => {
    if ((!selectedSong && !media) || !currentUser) return;

    setLoading(true);
    try {
      if (player) player.pause();
    } catch (e) {}

    try {
      let payloadString = "";

      if (media && isOfficialAccount) {
        const uploadedUrl = await uploadFile(media.file, media.type);
        const mediaData = {
          mediaUrl: uploadedUrl,
          mediaType: media.type,
          caption: caption,
          duration: media.type === "video" ? 15000 : 5000,
          isMediaStory: true,
        };
        payloadString = JSON.stringify(mediaData);
      } else if (selectedSong) {
        const songId =
          selectedSong.id || selectedSong.spotifyId || selectedSong.trackId;
        const songData = {
          title: selectedSong.title,
          artist: selectedSong.artist,
          cover: selectedSong.cover,
          preview: selectedSong.preview,
          spotifyId: songId,
          caption: caption,
          mediaType: "music",
          isMediaStory: false,
        };
        payloadString = JSON.stringify(songData);
      }

      await createStory(payloadString, currentUser.$id);

      onClose();
      setTimeout(() => {
        showToast("success", t("common.posted"), t("story.postedMsg"));
      }, 300);
      onSuccess();
    } catch (error) {
      console.log(error);
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
        setMedia(null);
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
                      {isOfficialAccount && (
                        <View className="mb-6">
                          <Text className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3 text-center">
                            Admin Tools
                          </Text>
                          <View className="flex-row gap-4 justify-center">
                            <TouchableOpacity
                              onPress={() => handlePickMedia("image")}
                              className="flex-1 bg-zinc-900 p-4 rounded-2xl items-center border border-zinc-800"
                            >
                              <Ionicons
                                name="image"
                                size={24}
                                color="#5E17EB"
                              />
                              <Text className="text-white font-medium mt-2">
                                Foto
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handlePickMedia("video")}
                              className="flex-1 bg-zinc-900 p-4 rounded-2xl items-center border border-zinc-800"
                            >
                              <Ionicons
                                name="videocam"
                                size={24}
                                color="#5E17EB"
                              />
                              <Text className="text-white font-medium mt-2">
                                Video
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <View className="h-[1px] bg-zinc-900 w-full mt-6" />
                        </View>
                      )}

                      <View className="bg-zinc-900 flex-row items-center px-4 py-4 rounded-3xl mb-6 border border-zinc-800 shadow-sm">
                        <Ionicons name="search" size={20} color="#A1A1AA" />
                        <TextInput
                          placeholder={t("story.searchPlaceholder")}
                          placeholderTextColor="#71717A"
                          className="flex-1 ml-3 text-white text-lg font-medium"
                          value={query}
                          onChangeText={setQuery}
                          autoFocus={!isOfficialAccount}
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
                        {media ? (
                          media.type === "video" ? (
                            <Video
                              source={{ uri: media.uri }}
                              style={{ width: "100%", height: "100%" }}
                              resizeMode={ResizeMode.COVER}
                              shouldPlay
                              isLooping
                            />
                          ) : (
                            <Image
                              source={{ uri: media.uri }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          )
                        ) : (
                          <>
                            <Image
                              source={{ uri: selectedSong?.cover }}
                              className="absolute w-full h-full"
                              blurRadius={90}
                              style={{ opacity: 0.6 }}
                            />
                            <LinearGradient
                              colors={["transparent", "#000000"] as const}
                              className="absolute w-full h-full"
                              style={{ opacity: 0.8 }}
                            />
                          </>
                        )}

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
                          {!media && selectedSong && (
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
                          )}

                          <View
                            className={`w-full px-4 mb-6 ${media ? "absolute bottom-32" : ""}`}
                          >
                            <TextInput
                              placeholder={t("story.captionPlaceholder")}
                              placeholderTextColor="rgba(255,255,255,0.7)"
                              className="text-white text-2xl py-2 text-center font-medium shadow-md"
                              style={{
                                textShadowColor: "rgba(0,0,0,0.8)",
                                textShadowOffset: { width: 0, height: 1 },
                                textShadowRadius: 4,
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
