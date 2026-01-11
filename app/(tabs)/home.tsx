import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  Dimensions,
  TextInput,
  Keyboard,
  LayoutAnimation,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAudioPlayer } from "expo-audio";

import { useGlobalContext } from "@/context/GlobalProvider";
import TopBar from "@/components/TopBar";
import {
  getFeedCandidates,
  getFollowedUserIds,
  getCurrentUser,
  deletePost,
  reportPost,
  getUnreadNotificationCount,
  getUnreadMessagesCount,
  createStory,
  getStories,
  viewStory,
  getUser,
  client, // Importante para el tiempo real
  appwriteConfig, // Importante para IDs de colecciones
} from "@/lib/appwrite";
import OptionsModal from "@/components/OptionsModal";
import PostItem from "@/components/PostItem";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";
import MoodShareCard from "@/components/MoodShareCard";
import ShareModal from "@/components/ShareModal";

const { height, width } = Dimensions.get("window");
const ADMIN_USERS = [".angel", "whoseslender"];

const MOOD_OFFICIAL_ID = "official_mood_team";
const OFFICIAL_MOOD_STORY = {
  userId: MOOD_OFFICIAL_ID,
  isOfficial: true,
  user: {
    $id: MOOD_OFFICIAL_ID,
    username: "Mood",
    name: "Mood Team",
    pfp: null,
    isVerified: true,
  },
  stories: [
    {
      $id: "mood_welcome_story_01",
      user: MOOD_OFFICIAL_ID,
      songData: JSON.stringify({
        title: "Welcome to Mood! 💜",
        artist: "The Official Guide",
        cover:
          "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2670&auto=format&fit=crop",
        preview: "",
        caption: "Share your music, express your feelings. Tap here to start!",
        spotifyId: "mood_official",
      }),
      viewers: [],
      createdAt: new Date().toISOString(),
    },
  ],
};

// --- HELPERS ---
const getCreatorId = (item: any) => {
  let userObj = item.creator || item.postedBy || item.users || item.user;
  if (Array.isArray(userObj) && userObj.length > 0) userObj = userObj[0];
  if (userObj && typeof userObj === "object") {
    return userObj.$id || userObj.accountId;
  }
  return "unknown";
};

const parseSongData = (songDataString: string) => {
  try {
    if (!songDataString) return null;
    const song = JSON.parse(songDataString);
    if (song.cover && song.cover.includes("100x100bb")) {
      song.cover = song.cover.replace("100x100bb", "600x600bb");
    }
    return song;
  } catch (e) {
    return null;
  }
};

const searchSongs = async (query: string) => {
  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=15`
    );
    const data = await response.json();
    return data.data.map((track: any) => ({
      id: track.id.toString(),
      title: track.title,
      artist: track.artist.name,
      cover: track.album.cover_medium || track.album.cover_big,
      preview: track.preview,
      duration: track.duration,
    }));
  } catch (e) {
    console.error("Error buscando canciones:", e);
    return [];
  }
};

// --- COMPONENTE: Riel de Historias ---
const StoriesRail = ({
  currentUser,
  groupedStories,
  onPressStoryGroup,
  onAddStory,
}: {
  currentUser: any;
  groupedStories: any[];
  onPressStoryGroup: (group: any) => void;
  onAddStory: () => void;
}) => {
  const myStoriesGroup = groupedStories.find(
    (g) => g.userId === currentUser?.$id
  );
  const friendsStories = groupedStories.filter(
    (g) => g.userId !== currentUser?.$id
  );

  const AddStoryButton = () => (
    <TouchableOpacity
      onPress={onAddStory}
      className="items-center mr-5"
      activeOpacity={0.9}
    >
      <View className="relative">
        <View className="w-[68px] h-[68px] rounded-full bg-black border border-zinc-800 items-center justify-center">
          <Image
            source={{
              uri:
                currentUser?.pfp ||
                "https://cloud.appwrite.io/v1/avatars/initials?name=Me",
            }}
            className="w-[62px] h-[62px] rounded-full opacity-60"
          />
          <View className="absolute inset-0 items-center justify-center bg-black/20 rounded-full">
            <Ionicons name="add" size={28} color="white" />
          </View>
        </View>
        <View className="absolute bottom-0 right-0 bg-[#5E17EB] rounded-full w-6 h-6 items-center justify-center border-[3px] border-black">
          <Ionicons name="add" size={14} color="white" />
        </View>
      </View>
      <Text className="text-[11px] mt-1.5 font-medium text-white text-center">
        Your Story
      </Text>
    </TouchableOpacity>
  );

  const MyStoryCircle = ({ group }: { group: any }) => (
    <TouchableOpacity
      onPress={() => onPressStoryGroup(group)}
      className="items-center mr-5"
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={["#5E17EB", "#9333EA", "#5E17EB"]}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 1, y: 1 }}
        className="rounded-full p-[2.5px]"
      >
        <View className="bg-black rounded-full p-[2.5px]">
          <Image
            source={{ uri: group.user?.pfp }}
            className="w-[64px] h-[64px] rounded-full bg-zinc-800"
          />
        </View>
      </LinearGradient>
      <Text
        className="text-[11px] mt-1.5 font-medium text-white w-20 text-center"
        numberOfLines={1}
      >
        Your Story
      </Text>
    </TouchableOpacity>
  );

  const railData = [
    "add-button",
    ...(myStoriesGroup ? [myStoriesGroup] : []),
    OFFICIAL_MOOD_STORY,
    ...friendsStories,
  ];

  return (
    <View className="py-4 border-b border-zinc-900 bg-black">
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        data={railData}
        keyExtractor={(item: any) =>
          typeof item === "string" ? item : item.userId
        }
        renderItem={({ item }) => {
          if (item === "add-button") return <AddStoryButton />;
          if (item.userId === currentUser?.$id)
            return <MyStoryCircle group={item} />;

          const isOfficialMood = item.userId === MOOD_OFFICIAL_ID;
          const isVerified = item.user?.isVerified || isOfficialMood;

          return (
            <TouchableOpacity
              onPress={() => onPressStoryGroup(item)}
              className="items-center mr-5"
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#5E17EB", "#9333EA", "#5E17EB"]}
                start={{ x: 0.1, y: 0.1 }}
                end={{ x: 1, y: 1 }}
                className="rounded-full p-[2.5px]"
              >
                <View className="bg-black rounded-full p-[2.5px]">
                  {isOfficialMood ? (
                    <Image
                      source={require("@/assets/images/icon.png")}
                      className="w-[64px] h-[64px] rounded-full bg-black"
                      resizeMode="cover"
                    />
                  ) : (
                    <Image
                      source={{
                        uri:
                          item.user?.pfp ||
                          "https://cloud.appwrite.io/v1/avatars/initials?name=User",
                      }}
                      className="w-[64px] h-[64px] rounded-full bg-zinc-800"
                    />
                  )}
                </View>
              </LinearGradient>

              <View className="flex-row items-center justify-center mt-1.5 w-20">
                <Text
                  className="text-[11px] font-medium text-white text-center mr-0.5"
                  numberOfLines={1}
                >
                  {item.user?.name || item.user?.username || "Usuario"}
                </Text>
                {isVerified && (
                  <MaterialIcons
                    name="verified"
                    size={10}
                    color={isOfficialMood ? "#5E17EB" : "#00C2FF"}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

// --- NUEVO COMPONENTE: Estado Vacío con Sugerencias (PREMIUM DESIGN) ---
const EmptyStateWithSuggestions = ({ suggestions, onGoToExplore }: any) => {
  return (
    <View className="px-4 py-12 items-center justify-center">
      {/* Ícono Principal con Doble Glow */}
      <View className="items-center mb-10">
        <View className="relative">
          <LinearGradient
            colors={["rgba(94, 23, 235, 0.3)", "transparent"]}
            className="w-32 h-32 rounded-full items-center justify-center absolute -top-4 -left-4"
          />
          <View className="w-24 h-24 bg-zinc-900 rounded-full items-center justify-center border border-zinc-800 shadow-xl shadow-[#5E17EB]/20 z-10">
            <Ionicons name="musical-notes" size={42} color="#5E17EB" />
          </View>
        </View>

        <Text className="text-white text-2xl font-bold text-center mt-6 mb-2 tracking-tight">
          Tu feed está muy callado...
        </Text>
        <Text className="text-zinc-400 text-center text-base px-6 leading-6">
          Sigue a creadores y artistas para llenar tu inicio con la mejor
          música.
        </Text>
      </View>

      {/* Sugerencias Rápidas */}
      {suggestions.length > 0 && (
        <View className="w-full mb-10">
          <View className="flex-row items-center justify-between px-2 mb-4">
            <Text className="text-white font-bold text-lg">
              Sugerencias para ti
            </Text>
            <TouchableOpacity onPress={onGoToExplore}>
              <Text className="text-[#5E17EB] font-bold text-xs">Ver más</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={suggestions}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4 }}
            keyExtractor={(item: any) => item.$id || item.accountId}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  router.push(`/user/${item.$id || item.accountId}` as any)
                }
                className="mr-3 bg-[#18181B] p-4 rounded-[24px] border border-white/5 w-36 items-center shadow-lg"
              >
                <Image
                  source={{ uri: item.pfp || item.avatar }}
                  className="w-16 h-16 rounded-full bg-zinc-800 mb-3 border border-white/10"
                />
                <Text
                  className="text-white font-bold text-sm text-center mb-0.5"
                  numberOfLines={1}
                >
                  {item.name || item.username}
                </Text>
                <Text className="text-zinc-500 text-xs mb-3" numberOfLines={1}>
                  @{item.username}
                </Text>

                {/* Botón dentro de la tarjeta */}
                <View className="w-full h-8 rounded-full overflow-hidden">
                  <LinearGradient
                    colors={["#5E17EB", "#7C3AED"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="w-full h-full items-center justify-center"
                  >
                    <Text className="text-white font-bold text-[10px] uppercase tracking-wide">
                      Ver Perfil
                    </Text>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Botón Principal de Explorar */}
      <TouchableOpacity
        onPress={onGoToExplore}
        activeOpacity={0.9}
        className="w-full shadow-lg shadow-[#5E17EB]/40 rounded-full overflow-hidden"
      >
        <LinearGradient
          colors={["#5E17EB", "#9333EA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="w-full py-4 flex-row items-center justify-center"
        >
          <Ionicons
            name="compass"
            size={22}
            color="white"
            style={{ marginRight: 8 }}
          />
          <Text className="text-white font-bold text-lg">
            Explorar Comunidad
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// --- COMPONENTE: Modal de Creación ---
const StoryCreationModal = ({
  visible,
  onClose,
  currentUser,
  onSuccess,
}: any) => {
  const [step, setStep] = useState<"search" | "preview">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const [previewTrackUrl, setPreviewTrackUrl] = useState<string | null>(null);

  const activeAudioSource =
    step === "preview" && selectedSong?.preview
      ? selectedSong.preview
      : previewTrackUrl || "";

  const player = useAudioPlayer(activeAudioSource);

  useEffect(() => {
    try {
      if (activeAudioSource && player) {
        player.play();
        if (step === "preview") {
          player.loop = true;
        } else {
          player.loop = false;
        }
      } else if (player) {
        player.pause();
      }
    } catch (e) {
      console.log("Audio Error:", e);
    }
  }, [activeAudioSource, player, step]);

  useEffect(() => {
    if (!visible) resetForm();
  }, [visible]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length > 2) {
        setSearching(true);
        const songs = await searchSongs(query);
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

    try {
      const songData = JSON.stringify({
        title: selectedSong.title,
        artist: selectedSong.artist,
        cover: selectedSong.cover,
        preview: selectedSong.preview,
        spotifyId: selectedSong.id,
        caption: caption,
      });

      await createStory(songData, currentUser.$id);

      Alert.alert("¡Publicado!", "Tu historia está en vivo.");
      onSuccess();
      onClose();
    } catch (error) {
      Alert.alert("Error", "No se pudo subir la historia.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "preview") {
      setStep("search");
      setSelectedSong(null);
      setPreviewTrackUrl(null);
    } else {
      onClose();
    }
  };

  if (!visible) return null;

  return (
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
              {/* Header */}
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-zinc-800 z-10 bg-[#121212]">
                <TouchableOpacity onPress={handleBack} className="p-2 -ml-2">
                  <Text className="text-zinc-400 text-lg">Cancelar</Text>
                </TouchableOpacity>
                <Text className="text-white font-bold text-lg">
                  {step === "search" ? "Nueva Historia" : "Vista Previa"}
                </Text>
                {step === "preview" ? (
                  <TouchableOpacity
                    onPress={handleUpload}
                    disabled={loading}
                    className="p-2 -mr-2"
                  >
                    {loading ? (
                      <ActivityIndicator color="#5E17EB" />
                    ) : (
                      <Text className="text-[#5E17EB] font-bold text-lg">
                        Publicar
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 70 }} />
                )}
              </View>

              {step === "search" ? (
                <View className="flex-1 px-4 pt-2">
                  <View className="bg-[#1E1E1E] flex-row items-center px-4 py-3.5 rounded-2xl mb-4 border border-zinc-800">
                    <Ionicons name="search" size={20} color="#71717A" />
                    <TextInput
                      placeholder="Buscar canciones..."
                      placeholderTextColor="#71717A"
                      className="flex-1 ml-3 text-white text-base"
                      value={query}
                      onChangeText={setQuery}
                      autoFocus
                      returnKeyType="search"
                    />
                    {query.length > 0 && (
                      <TouchableOpacity onPress={() => setQuery("")}>
                        <Ionicons
                          name="close-circle"
                          size={18}
                          color="#71717A"
                        />
                      </TouchableOpacity>
                    )}
                  </View>

                  {searching ? (
                    <View className="mt-20">
                      <ActivityIndicator size="large" color="#5E17EB" />
                    </View>
                  ) : (
                    <FlatList
                      data={results}
                      keyExtractor={(item) => item.id}
                      contentContainerStyle={{ paddingBottom: 40 }}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => {
                        const isPlaying =
                          previewTrackUrl === item.preview && player.playing;
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
                                    isPlaying ? "pause-circle" : "play-circle"
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
                <View className="flex-1 bg-black items-center pt-6 px-4">
                  <View
                    className="w-full max-w-[340px] aspect-[4/5] rounded-[32px] overflow-hidden relative shadow-2xl items-center justify-between p-6 border border-white/10"
                    style={{
                      shadowColor: selectedSong ? "#5E17EB" : "transparent",
                      shadowOpacity: 0.6,
                      shadowRadius: 40,
                      backgroundColor: "#18181B",
                    }}
                  >
                    <LinearGradient
                      colors={["#1a0b2e", "#000000"]}
                      className="absolute w-full h-full"
                    />
                    <Image
                      source={{ uri: selectedSong.cover }}
                      className="absolute w-full h-full opacity-30"
                      blurRadius={60}
                    />

                    <View className="w-full flex-1 items-center justify-center">
                      <View
                        className="rounded-2xl shadow-2xl bg-zinc-900 mb-6"
                        style={{
                          shadowColor: "black",
                          shadowOffset: { width: 0, height: 12 },
                          shadowOpacity: 0.6,
                          shadowRadius: 20,
                          elevation: 20,
                        }}
                      >
                        <Image
                          source={{ uri: selectedSong.cover }}
                          className="w-60 h-60 rounded-2xl"
                        />
                      </View>
                      <Text className="text-white text-[26px] font-black text-center mb-2 leading-8 shadow-sm">
                        {selectedSong.title}
                      </Text>
                      <Text className="text-zinc-300 text-lg font-medium text-center">
                        {selectedSong.artist}
                      </Text>
                    </View>

                    <View className="w-full">
                      <View className="bg-white/10 px-4 py-2 rounded-full flex-row items-center border border-white/5 backdrop-blur-md mb-2">
                        <Ionicons
                          name="musical-notes"
                          size={14}
                          color="#5E17EB"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-white/90 font-bold text-xs tracking-widest uppercase">
                          Mood
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="w-full mt-8">
                    <TextInput
                      placeholder="Agrega un comentario..."
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      className="bg-zinc-800/80 text-white px-5 py-4 rounded-full text-center text-base border border-zinc-700"
                      value={caption}
                      onChangeText={setCaption}
                      maxLength={80}
                      returnKeyType="done"
                    />
                  </View>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// --- COMPONENTE: Visor de Historias (CON CORRECCION DE AUDIO) ---
const StoryViewer = ({
  visible,
  onClose,
  group,
  currentUserId,
  onAddMore,
}: any) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // FIX VISUAL
  const cardWidth = width * 0.9;
  const cardHeight = height * 0.6;

  const currentStory = group?.stories ? group.stories[currentIndex] : null;
  const songData = currentStory ? parseSongData(currentStory.songData) : null;
  const isOwner = group?.userId === currentUserId;
  const viewersCount = currentStory?.viewers?.length || 0;

  // VERIFICACION
  const isOfficialMood = group?.userId === MOOD_OFFICIAL_ID;
  const isVerified = group?.user?.isVerified || isOfficialMood;

  const player = useAudioPlayer(songData?.preview || "");
  const STORY_DURATION = 30000;

  useEffect(() => {
    if (visible && currentStory && currentUserId && !isOwner) {
      viewStory(currentStory.$id, currentUserId, currentStory.viewers || []);
    }
  }, [currentIndex, visible, currentStory]);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      setProgress(0);
    }
  }, [visible, group]);

  useEffect(() => {
    if (!visible || !currentStory) {
      if (player && player.playing) {
        try {
          player.pause();
        } catch (e) {}
      }
      return;
    }

    try {
      if (player) {
        player.play();
        player.loop = false;
      }
    } catch (e) {
      console.log("Error playing story audio:", e);
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const newProgress = (elapsedTime / STORY_DURATION) * 100;

      if (newProgress >= 100) {
        clearInterval(interval);
        handleNext();
      } else {
        setProgress(newProgress);
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [currentIndex, visible, currentStory, player]);

  const handleNext = () => {
    if (currentIndex < (group?.stories.length || 0) - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  if (!visible || !currentStory || !songData) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black">
        <Image
          source={{ uri: songData.cover }}
          className="absolute w-full h-full opacity-40"
          blurRadius={50}
        />
        <View className="absolute w-full h-full bg-black/40" />

        <SafeAreaView className="flex-1 justify-between">
          <View className="absolute w-full h-full flex-row z-0 top-0">
            <TouchableOpacity style={{ flex: 1 }} onPress={handlePrev} />
            <TouchableOpacity style={{ flex: 2 }} onPress={handleNext} />
          </View>

          <View pointerEvents="box-none" className="pt-2">
            <View className="flex-row gap-1 px-2 mb-4 z-20">
              {group.stories.map((_: any, index: number) => (
                <View
                  key={index}
                  className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden"
                >
                  <View
                    style={{
                      width:
                        index < currentIndex
                          ? "100%"
                          : index === currentIndex
                          ? `${progress}%`
                          : "0%",
                    }}
                    className="h-full bg-white rounded-full"
                  />
                </View>
              ))}
            </View>

            <View className="flex-row items-center justify-between px-4 z-20">
              <View className="flex-row items-center gap-2.5">
                {isOfficialMood ? (
                  <Image
                    source={require("@/assets/images/icon.png")}
                    className="w-9 h-9 rounded-full border border-white/10"
                    resizeMode="cover"
                  />
                ) : (
                  <Image
                    source={{ uri: group.user?.pfp }}
                    className="w-9 h-9 rounded-full border border-white/10"
                  />
                )}

                <View>
                  <View className="flex-row items-center">
                    <Text className="text-white font-bold text-[15px] leading-4 mr-1">
                      {group.user?.name || group.user?.username}
                    </Text>
                    {isVerified && (
                      <MaterialIcons
                        name="verified"
                        size={14}
                        color={isOfficialMood ? "#5E17EB" : "#00C2FF"}
                      />
                    )}
                  </View>
                  <Text className="text-white/60 text-xs">Mood Story</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-4">
                {isOwner && (
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      setTimeout(onAddMore, 300);
                    }}
                    className="bg-white/10 p-2 rounded-full backdrop-blur-md"
                  >
                    <Ionicons name="add" size={24} color="white" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={28} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View className="flex-1 justify-center items-center px-6 pointer-events-none">
            <View
              className="bg-zinc-900/80 rounded-[32px] overflow-hidden border border-white/10 items-center justify-between p-6 relative shadow-2xl"
              style={{
                width: cardWidth,
                height: cardHeight,
                maxHeight: height * 0.65,
              }}
            >
              <Image
                source={{ uri: songData.cover }}
                className="absolute w-full h-full opacity-20"
                blurRadius={30}
              />
              <View className="w-full items-center flex-1 justify-center py-4">
                {isOfficialMood ? (
                  <Image
                    source={{ uri: songData.cover }}
                    className="w-full h-full absolute opacity-80"
                    resizeMode="cover"
                  />
                ) : (
                  <Image
                    source={{ uri: songData.cover }}
                    className="w-48 h-48 rounded-2xl shadow-2xl mb-6"
                    style={{ width: cardWidth * 0.6, height: cardWidth * 0.6 }}
                  />
                )}

                <View className="items-center px-4 z-10">
                  <Text
                    className="text-white text-[28px] font-black text-center mb-1 leading-8 shadow-sm"
                    style={{
                      textShadowColor: "rgba(0,0,0,0.8)",
                      textShadowOffset: { width: 0, height: 2 },
                      textShadowRadius: 4,
                    }}
                  >
                    {songData.title}
                  </Text>
                  <Text
                    className="text-white/90 text-lg font-bold text-center shadow-sm"
                    style={{
                      textShadowColor: "rgba(0,0,0,0.8)",
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 3,
                    }}
                  >
                    {songData.artist}
                  </Text>
                </View>
              </View>
              {songData.caption && (
                <View className="bg-black/60 px-4 py-2 rounded-xl mb-4 z-10 backdrop-blur-sm">
                  <Text className="text-white font-medium text-center text-sm">
                    {songData.caption}
                  </Text>
                </View>
              )}
              {!isOfficialMood && (
                <View className="w-full">
                  <View className="bg-[#5E17EB] w-full py-3 rounded-full flex-row items-center justify-center gap-2">
                    <Ionicons name="musical-notes" size={16} color="white" />
                    <Text className="text-white font-bold text-sm tracking-wide">
                      Escuchar en Mood
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          <View className="px-4 pb-6 z-20">
            {isOwner ? (
              <View className="flex-row items-center justify-between">
                <TouchableOpacity className="flex-row items-center gap-2 px-4 py-2 bg-black/40 rounded-full">
                  <Ionicons name="eye" size={20} color="white" />
                  <Text className="text-white font-bold">
                    {viewersCount} Vistos
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity className="p-2">
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row items-center gap-4">
                <View className="flex-1 h-12 rounded-full border border-white/30 px-5 justify-center bg-black/20 backdrop-blur-sm">
                  <TextInput
                    placeholder="Enviar mensaje..."
                    placeholderTextColor="rgba(255,255,255,0.7)"
                    className="text-white font-medium"
                  />
                </View>
                <TouchableOpacity>
                  <Ionicons name="heart-outline" size={32} color="white" />
                </TouchableOpacity>
                <TouchableOpacity className="-ml-1">
                  <Ionicons
                    name="paper-plane-outline"
                    size={30}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

// --- PANTALLA PRINCIPAL ---
const Home = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();
  const { user, loading, loggedIn } = useGlobalContext();

  const subTextColor = isDark ? "#A1A1AA" : "#71717A";

  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [groupedStories, setGroupedStories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Nuevo Estado para sugerencias
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);

  // Modales
  const [isViralModalVisible, setViralModalVisible] = useState(false);
  const [isShareVisible, setShareVisible] = useState(false);
  const [isShareSelectorVisible, setShareSelectorVisible] = useState(false);
  const [isStoryViewerVisible, setStoryViewerVisible] = useState(false);
  const [isCreationVisible, setCreationVisible] = useState(false);
  const [isOptionsVisible, setOptionsVisible] = useState(false);

  const [activeStoryGroup, setActiveStoryGroup] = useState(null);
  const [postToShareData, setPostToShareData] = useState<any>(null);
  const [sharePostId, setSharePostId] = useState<string>("");
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [notiCount, setNotiCount] = useState(0);
  const [msgCount, setMsgCount] = useState(0);

  const flatListRef = useRef<FlatList>(null);

  const fetchData = async () => {
    try {
      let activeId = user?.$id;
      if (!activeId) {
        const u = await getCurrentUser();
        if (u) {
          activeId = u.$id;
          setCurrentUserId(u.$id);
        }
      } else setCurrentUserId(activeId);

      if (activeId) {
        updateCounts(activeId);
        fetchStories(activeId);
      }

      let followedIds = activeId
        ? await getFollowedUserIds(activeId).catch(() => [])
        : [];

      let rawPosts = await getFeedCandidates().catch(() => []);

      const timelinePosts = rawPosts.filter((post: any) => {
        const creatorId = getCreatorId(post);
        if (!creatorId || creatorId === "unknown") return false;
        return creatorId === activeId || followedIds.includes(creatorId);
      });

      // LÓGICA DE SUGERENCIAS
      if (timelinePosts.length === 0 && activeId) {
        const uniqueCreators = new Map();
        rawPosts.forEach((post: any) => {
          const creatorId = getCreatorId(post);
          if (
            creatorId &&
            creatorId !== activeId &&
            !followedIds.includes(creatorId)
          ) {
            let creatorObj = post.creator || post.postedBy || post.users?.[0];
            if (creatorObj && !uniqueCreators.has(creatorId)) {
              uniqueCreators.set(creatorId, creatorObj);
            }
          }
        });
        setSuggestedUsers(Array.from(uniqueCreators.values()).slice(0, 5));
      } else {
        setSuggestedUsers([]);
      }

      setFeedPosts(
        timelinePosts.sort(
          (a: any, b: any) =>
            new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
        )
      );
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // --- REALTIME SUBSCRIPTION FOR TOPBAR ICONS ---
  useEffect(() => {
    if (!user?.$id) return;

    // Canales de suscripción: Notificaciones y Mensajes
    const channels = [
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.notificationsCollectionId}.documents`,
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`,
    ];

    const unsubscribe = client.subscribe(channels, (response) => {
      const event = response.events[0];
      const payload: any = response.payload;

      // 1. Notificaciones: Si se crea, elimina o actualiza una notificación para mí
      if (
        event.includes(
          `collections.${appwriteConfig.notificationsCollectionId}`
        )
      ) {
        if (payload.userId === user.$id) {
          updateCounts(user.$id); // Recalcular count
        }
      }

      // 2. Mensajes: Si llega un mensaje para mí o leo uno
      if (
        event.includes(`collections.${appwriteConfig.messagesCollectionId}`)
      ) {
        if (payload.receiverId === user.$id || payload.senderId === user.$id) {
          updateCounts(user.$id); // Recalcular count
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // --- USE FOCUS EFFECT: ACTUALIZAR CONTADORES AL VOLVER (Seguridad extra) ---
  useFocusEffect(
    useCallback(() => {
      if (user?.$id) {
        updateCounts(user.$id);
      }
    }, [user])
  );

  const fetchStories = async (userId: string) => {
    try {
      const storiesDocs = await getStories(userId);
      const groups: Record<string, any> = {};

      await Promise.all(
        storiesDocs.map(async (doc: any) => {
          let docUserId = null;
          let docUserData = null;

          if (doc.user && doc.user.$id) {
            docUserId = doc.user.$id;
            docUserData = doc.user;
          } else if (typeof doc.user === "string") {
            docUserId = doc.user;
            if (docUserId === userId && user) {
              docUserData = user;
            } else {
              try {
                const fetchedUser = await getUser(docUserId);
                if (fetchedUser) docUserData = fetchedUser;
              } catch (err) {
                console.log("Error fetching missing user", err);
              }
            }
          }

          if (!docUserId) return;

          if (!groups[docUserId]) {
            groups[docUserId] = {
              userId: docUserId,
              user: docUserData || {
                name: "Usuario",
                username: "Usuario",
                $id: docUserId,
              },
              stories: [],
            };
          }
          groups[docUserId].stories.push(doc);
        })
      );

      setGroupedStories(Object.values(groups));
    } catch (e) {
      console.error("Error fetching stories:", e);
    }
  };

  const updateCounts = async (userId: string) => {
    try {
      const [nCount, mCount] = await Promise.all([
        getUnreadNotificationCount(userId),
        getUnreadMessagesCount(userId),
      ]);
      setNotiCount(nCount);
      setMsgCount(mCount);
    } catch (error) {}
  };

  useEffect(() => {
    if (!loading) fetchData();
  }, [user, loading, loggedIn]);
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const handleDeleteAction = () => {
    if (!selectedPost) return;
    const post = selectedPost;
    setOptionsVisible(false);
    Alert.alert("¿Eliminar?", "Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            setFeedPosts((prev) => prev.filter((p) => p.$id !== post.$id));
            await deletePost(post.$id);
          } catch (e) {
            Alert.alert("Error", "No se pudo eliminar.");
            onRefresh();
          }
        },
      },
    ]);
  };

  const handleReportAction = () => {
    if (!selectedPost || !user?.$id) return;
    setOptionsVisible(false);
    Alert.alert("Reportar", "Selecciona una razón", [
      { text: "Cancelar", style: "cancel" },
      { text: "Spam", onPress: () => submitReport("spam") },
      { text: "Inapropiado", onPress: () => submitReport("inappropriate") },
    ]);
  };

  const submitReport = async (reason: string) => {
    if (!user) return;
    try {
      await reportPost(selectedPost.$id, user.$id, reason);
      Alert.alert("Gracias", "Reporte enviado.");
    } catch (error) {
      Alert.alert("Error", "No se pudo enviar.");
    }
  };

  const openOptions = (post: any) => {
    setSelectedPost(post);
    setOptionsVisible(true);
  };

  const openShare = (post: any) => {
    setPostToShareData(post);
    setSharePostId(post.$id);
    setShareSelectorVisible(true);
  };

  const getViralPostData = () => {
    if (!postToShareData) return null;
    const song = parseSongData(postToShareData.songData);
    let creator =
      postToShareData.postedBy ||
      postToShareData.creator ||
      postToShareData.users?.[0] ||
      {};

    return {
      title: song?.title || "Música",
      artist: song?.artist || "Artista",
      cover: song?.cover || null,
      originalPostCreator: creator.username || "usuario",
      creatorPfp: creator.pfp || creator.avatar || null,
      comment: postToShareData.comment || null,
    };
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <View
        className="py-4 border-1 border-b"
        style={{ borderColor: isDark ? "#27272A" : "#E5E5E5" }}
      >
        <PostItem
          post={item}
          currentUserId={user?.$id || currentUserId || ""}
          onProfilePress={(userId) => router.push(`/user/${userId}` as any)}
          onCommentPress={(postId) => router.push(`/post/${postId}` as any)}
          onOptionsPress={() => openOptions(item)}
          onSharePress={() => openShare(item)}
        />
      </View>
    );
  };

  const isPostOwner =
    user?.$id === (selectedPost?.postedBy?.$id || selectedPost?.creator?.$id);
  const isAdmin = ADMIN_USERS.includes(user?.username || "");

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: isDark ? "#000000" : "#FFFFFF" }}
    >
      <TopBar notificationCount={notiCount} messageCount={msgCount} />
      {isLoading ? (
        <ActivityIndicator size="large" color="#5E17EB" className="flex-1" />
      ) : (
        <FlatList
          data={feedPosts}
          keyExtractor={(item) => item.$id}
          ListHeaderComponent={
            <StoriesRail
              currentUser={user}
              groupedStories={groupedStories}
              onPressStoryGroup={(g: any) => {
                setActiveStoryGroup(g);
                setStoryViewerVisible(true);
              }}
              onAddStory={() => setCreationVisible(true)}
            />
          }
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#5E17EB"
            />
          }
          ListEmptyComponent={
            <EmptyStateWithSuggestions
              suggestions={suggestedUsers}
              onGoToExplore={() => router.push("/explore" as any)}
            />
          }
        />
      )}

      {/* --- MODAL SELECTOR DE COMPARTIR --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isShareSelectorVisible}
        onRequestClose={() => setShareSelectorVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setShareSelectorVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/60">
            <TouchableWithoutFeedback>
              <View
                className="rounded-t-[32px] p-6 pb-12"
                style={{
                  backgroundColor: isDark ? "#18181B" : "white",
                }}
              >
                <View className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full self-center mb-6" />

                <Text
                  className="text-xl font-bold text-center mb-8"
                  style={{ color: isDark ? "white" : "black" }}
                >
                  Compartir Publicación
                </Text>

                <View className="flex-row gap-4">
                  <TouchableOpacity
                    onPress={() => {
                      setShareSelectorVisible(false);
                      setTimeout(() => setShareVisible(true), 300);
                    }}
                    className="flex-1 p-5 rounded-3xl items-center border"
                    style={{
                      backgroundColor: isDark ? "#27272A" : "#F3F4F6",
                      borderColor: isDark ? "#3F3F46" : "#E5E5E5",
                    }}
                  >
                    <View className="w-14 h-14 bg-[#5E17EB]/10 rounded-full items-center justify-center mb-3">
                      <Ionicons name="repeat" size={28} color="#5E17EB" />
                    </View>
                    <Text
                      className="font-bold text-base mb-1"
                      style={{ color: isDark ? "white" : "black" }}
                    >
                      En Mood
                    </Text>
                    <Text
                      className="text-xs text-center"
                      style={{ color: subTextColor }}
                    >
                      Repostear o enviar a amigos
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setShareSelectorVisible(false);
                      setTimeout(() => setViralModalVisible(true), 300);
                    }}
                    className="flex-1 p-5 rounded-3xl items-center border"
                    style={{
                      backgroundColor: isDark ? "#27272A" : "#F3F4F6",
                      borderColor: isDark ? "#3F3F46" : "#E5E5E5",
                    }}
                  >
                    <View className="w-14 h-14 bg-pink-500/10 rounded-full items-center justify-center mb-3">
                      <Ionicons name="share-social" size={28} color="#ec4899" />
                    </View>
                    <Text
                      className="font-bold text-base mb-1"
                      style={{ color: isDark ? "white" : "black" }}
                    >
                      Viral Card
                    </Text>
                    <Text
                      className="text-xs text-center"
                      style={{ color: subTextColor }}
                    >
                      Stories, Instagram y más
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => setShareSelectorVisible(false)}
                  className="mt-6 p-4 rounded-full items-center"
                >
                  <Text
                    className="font-bold text-base"
                    style={{ color: subTextColor }}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <StoryCreationModal
        visible={isCreationVisible}
        onClose={() => setCreationVisible(false)}
        currentUser={user}
        onSuccess={() => {
          if (currentUserId) fetchStories(currentUserId);
        }}
      />
      <StoryViewer
        visible={isStoryViewerVisible}
        onClose={() => setStoryViewerVisible(false)}
        group={activeStoryGroup}
        currentUserId={currentUserId}
        onAddMore={() => setCreationVisible(true)}
      />

      <OptionsModal
        isVisible={isOptionsVisible}
        onClose={() => setOptionsVisible(false)}
        onDelete={handleDeleteAction}
        onReport={handleReportAction}
        isOwner={isPostOwner || isAdmin}
      />
      <MoodShareCard
        isVisible={isViralModalVisible}
        onClose={() => setViralModalVisible(false)}
        post={getViralPostData()}
      />
      <ShareModal
        isVisible={isShareVisible}
        onClose={() => setShareVisible(false)}
        postId={sharePostId}
      />
    </SafeAreaView>
  );
};

export default Home;
