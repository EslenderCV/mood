import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  Share as SystemShare,
  Clipboard,
  ScrollView,
  LayoutAnimation,
  Keyboard,
  useWindowDimensions,
  Pressable,
  Platform,
} from "react-native";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Ionicons,
  FontAwesome5,
  Feather,
  MaterialIcons,
} from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAudioPlayer } from "expo-audio";
import { useColorScheme } from "nativewind";
import { LinearGradient } from "expo-linear-gradient";
import { Databases, Query, ID } from "react-native-appwrite";

import {
  GestureHandlerRootView,
  FlingGestureHandler,
  Directions,
  State,
} from "react-native-gesture-handler";

import {
  getLatestUsers,
  getAllPosts,
  getFeedCandidates,
  getFollowedUserIds,
  deletePost,
  reportPost,
  getDeezerTrackUrl,
  client,
  appwriteConfig,
  getUser,
  createStory,
  getOrCreateChat,
} from "@/lib/appwrite";

import { useGlobalContext } from "@/context/GlobalProvider";
import { useLanguage } from "@/context/LanguageContext";
import ShareModal from "@/components/ShareModal";
import OptionsModal from "@/components/OptionsModal";
import PostItem from "@/components/PostItem";
import MoodShareCard from "@/components/MoodShareCard";

const { width, height } = Dimensions.get("window");
const databases = new Databases(client);

// --- SKELETONS ---
const ExplorePostSkeleton = ({ isDark }: { isDark: boolean }) => {
  const cardBg = isDark ? "bg-zinc-900" : "bg-zinc-100";
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  return (
    <View
      className={`py-4 px-4 mb-2 animate-pulse ${
        isDark ? "border-b border-zinc-900/50" : "border-b border-zinc-200"
      }`}
    >
      <View className="flex-row items-center mb-3">
        <View className={`w-10 h-10 rounded-full ${elementBg} mr-3`} />
        <View className="space-y-1.5">
          <View className={`w-24 h-3.5 rounded ${elementBg}`} />
          <View className={`w-32 h-2.5 rounded ${elementBg}`} />
        </View>
      </View>
      <View
        className={`w-full h-[100px] rounded-[24px] ${cardBg} mb-4 flex-row items-center p-3`}
      >
        <View
          className={`w-[76px] h-[76px] rounded-[18px] ${elementBg} mr-3`}
        />
        <View className="flex-1 justify-center space-y-2">
          <View className={`w-3/4 h-4 rounded ${elementBg}`} />
          <View className={`w-1/2 h-3 rounded ${elementBg}`} />
        </View>
        <View className={`w-10 h-10 rounded-full ${elementBg} mr-2`} />
      </View>
      <View className="flex-row items-center justify-between px-2">
        <View className="flex-row items-center space-x-6">
          <View className={`w-6 h-6 rounded-full ${elementBg}`} />
          <View className={`w-6 h-6 rounded-full ${elementBg}`} />
          <View className={`w-6 h-6 rounded-full ${elementBg}`} />
        </View>
        <View className={`w-6 h-6 rounded-full ${elementBg}`} />
      </View>
    </View>
  );
};

const MusicSkeleton = ({ isDark }: { isDark: boolean }) => {
  const cardBg = isDark ? "bg-[#18181B]" : "bg-[#F8FAFC]";
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  const borderColor = isDark ? "border-zinc-800" : "border-zinc-200";
  return (
    <View
      className={`flex-row items-center px-4 py-3 mb-3 mx-4 rounded-2xl border ${borderColor} ${cardBg} animate-pulse`}
    >
      <View className={`w-8 h-8 rounded-full ${elementBg} mr-3`} />
      <View className={`w-14 h-14 rounded-xl ${elementBg} mr-4`} />
      <View className="flex-1 space-y-2">
        <View className={`w-32 h-4 rounded ${elementBg}`} />
        <View className={`w-20 h-3 rounded ${elementBg}`} />
      </View>
      <View className={`w-10 h-10 rounded-full ${elementBg}`} />
    </View>
  );
};

const ArtistSkeleton = ({ isDark }: { isDark: boolean }) => {
  const cardBg = isDark ? "bg-[#18181B]" : "bg-[#F8FAFC]";
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  const borderColor = isDark ? "border-zinc-800" : "border-zinc-200";
  return (
    <View
      className={`flex-1 m-2 p-3 rounded-3xl border items-center justify-center ${borderColor} ${cardBg} animate-pulse`}
      style={{ aspectRatio: 0.85 }}
    >
      <View className={`w-24 h-24 rounded-full ${elementBg} mb-3`} />
      <View className={`w-20 h-4 rounded ${elementBg} mb-2`} />
      <View className={`w-12 h-3 rounded ${elementBg}`} />
    </View>
  );
};

const ProfileSkeleton = ({ isDark }: { isDark: boolean }) => {
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  const borderColor = isDark ? "border-zinc-800" : "border-zinc-200";
  return (
    <View
      className={`flex-row items-center px-5 py-4 border-b ${borderColor} animate-pulse`}
    >
      <View className={`w-14 h-14 rounded-full ${elementBg}`} />
      <View className="ml-4 flex-1 space-y-2">
        <View className={`w-32 h-4 rounded ${elementBg}`} />
        <View className={`w-24 h-3 rounded ${elementBg}`} />
      </View>
      <View className={`w-20 h-8 rounded-full ${elementBg}`} />
    </View>
  );
};

// --- Helpers ---
const normalizeString = (str: string) => {
  return str ? str.trim().toLowerCase() : "";
};

const parseSongFromPost = (songDataString: string) => {
  try {
    if (!songDataString) return null;
    const song = JSON.parse(songDataString);
    if (song.cover && song.cover.includes("100x100bb")) {
      song.cover = song.cover.replace("100x100bb", "600x600bb");
    }
    return song;
  } catch (error) {
    return null;
  }
};

const getCreatorFromPost = (item: any) => {
  let userObj = item.creator || item.postedBy || item.users || item.user;
  if (Array.isArray(userObj) && userObj.length > 0) userObj = userObj[0];

  if (userObj && typeof userObj === "object") {
    return {
      id: userObj.$id || userObj.accountId,
      username: userObj.username || "anon",
      name: userObj.name || "Usuario",
      avatar: userObj.avatar || userObj.pfp,
      isVerified: userObj.isVerified,
    };
  }

  // FIX: Soporte para IDs planos
  if (typeof userObj === "string") {
    return {
      id: userObj,
      username: "anon",
      name: "Usuario",
      avatar: null,
      isVerified: false,
    };
  }

  return {
    id: "unknown",
    username: "anon",
    name: "unknown",
    avatar: null,
    isVerified: false,
  };
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
    return [];
  }
};

const CATEGORIES = [
  {
    id: "posts",
    labelKey: "explore.categories.posts",
    icon: "compass-outline",
  },
  { id: "music", labelKey: "explore.categories.music", icon: "musical-notes" },
  {
    id: "artists",
    labelKey: "explore.categories.artists",
    icon: "people-outline",
  },
  {
    id: "profiles",
    labelKey: "explore.categories.profiles",
    icon: "person-add-outline",
  },
];

// --- NUEVOS HELPERS PARA EXPLORAR ---

// Algoritmo de mezcla aleatoria (Fisher-Yates)
const shuffleArray = (array: any[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Verificar si el post es reciente (menos de 5 minutos)
const isFreshPost = (createdAt: string) => {
  if (!createdAt) return false;
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.round(diffMs / 60000); // Diferencia en minutos
  return diffMins <= 5 && diffMins >= 0;
};

const DirectShareSheet = ({
  visible,
  onClose,
  contacts,
  onSend,
  onAddToStory,
  onViralCard,
  onSystemShare,
  onCopyLink,
  isDark,
  onSearch,
  isLoadingContacts,
}: any) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const insets = useSafeAreaInsets();
  const bgColor = isDark ? "#18181B" : "#ffffff";
  const textColor = isDark ? "white" : "black";
  const placeholderColor = isDark ? "#A1A1AA" : "#71717A";
  const { height } = useWindowDimensions();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch) onSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };
  const handleSend = () => {
    onSend(selectedUsers, searchQuery);
    setSelectedUsers([]);
    setSearchQuery("");
    onClose();
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
        <View className="flex-1 justify-end bg-black/50">
          <TouchableWithoutFeedback>
            <View
              className="rounded-t-[32px] overflow-hidden"
              style={{
                backgroundColor: bgColor,
                paddingBottom: insets.bottom + 20,
                maxHeight: height * 0.8,
              }}
            >
              <View className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full self-center mt-4 mb-4" />
              <View className="px-5 mb-4">
                <View
                  className={`flex-row items-center px-4 py-3 rounded-2xl ${
                    isDark ? "bg-zinc-800" : "bg-zinc-100"
                  }`}
                >
                  <Ionicons name="search" size={20} color={placeholderColor} />
                  <TextInput
                    placeholder="Buscar persona..."
                    placeholderTextColor={placeholderColor}
                    className="flex-1 ml-3 text-base"
                    style={{ color: textColor }}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={placeholderColor}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View className="h-28 pl-5 mb-4">
                {isLoadingContacts ? (
                  <View className="flex-1 justify-center items-center mr-5">
                    <ActivityIndicator color="#5E17EB" />
                  </View>
                ) : (
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={contacts}
                    keyExtractor={(item) => item.$id}
                    ListEmptyComponent={
                      <Text className="text-zinc-500 mt-8 ml-2">
                        No se encontraron usuarios.
                      </Text>
                    }
                    renderItem={({ item }) => {
                      const isSelected = selectedUsers.includes(item.$id);
                      return (
                        <TouchableOpacity
                          onPress={() => toggleUserSelection(item.$id)}
                          className="mr-6 items-center w-18"
                          activeOpacity={0.8}
                        >
                          <View className="relative">
                            <Image
                              source={{
                                uri:
                                  item.avatar ||
                                  item.pfp ||
                                  "https://cloud.appwrite.io/v1/avatars/initials?name=" +
                                    item.username,
                              }}
                              className="w-16 h-16 rounded-full bg-zinc-700"
                            />
                            {isSelected && (
                              <View
                                className="absolute bottom-0 right-0 bg-[#5E17EB] rounded-full w-6 h-6 items-center justify-center border-2"
                                style={{ borderColor: bgColor }}
                              >
                                <Ionicons
                                  name="checkmark"
                                  size={14}
                                  color="white"
                                />
                              </View>
                            )}
                          </View>
                          <Text
                            className="text-xs mt-2 text-center w-20"
                            numberOfLines={1}
                            style={{ color: textColor }}
                          >
                            {item.name || item.username}
                          </Text>
                          <Text
                            className="text-[10px] text-zinc-500 text-center w-20"
                            numberOfLines={1}
                          >
                            @{item.username}
                          </Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}
              </View>
              <View
                className={`h-[1px] w-full ${
                  isDark ? "bg-zinc-800" : "bg-zinc-200"
                } mb-4`}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="px-5 mb-4"
              >
                <TouchableOpacity
                  onPress={onAddToStory}
                  className="items-center mr-8"
                >
                  <View
                    className={`w-14 h-14 rounded-full items-center justify-center border-2 border-dashed ${
                      isDark ? "border-zinc-600" : "border-zinc-400"
                    }`}
                  >
                    <Ionicons
                      name="add"
                      size={28}
                      color={isDark ? "white" : "black"}
                    />
                  </View>
                  <Text className="text-xs mt-2" style={{ color: textColor }}>
                    Tu historia
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onViralCard}
                  className="items-center mr-8"
                >
                  <View
                    className={`w-14 h-14 rounded-full items-center justify-center ${
                      isDark ? "bg-zinc-800" : "bg-zinc-100"
                    }`}
                  >
                    <Ionicons name="share-social" size={24} color="#ec4899" />
                  </View>
                  <Text className="text-xs mt-2" style={{ color: textColor }}>
                    Viral Card
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onSystemShare}
                  className="items-center mr-8"
                >
                  <View
                    className={`w-14 h-14 rounded-full items-center justify-center ${
                      isDark ? "bg-zinc-800" : "bg-zinc-100"
                    }`}
                  >
                    <Feather name="share" size={24} color={textColor} />
                  </View>
                  <Text className="text-xs mt-2" style={{ color: textColor }}>
                    Compartir via...
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onCopyLink}
                  className="items-center mr-8"
                >
                  <View
                    className={`w-14 h-14 rounded-full items-center justify-center ${
                      isDark ? "bg-zinc-800" : "bg-zinc-100"
                    }`}
                  >
                    <Feather name="link" size={24} color={textColor} />
                  </View>
                  <Text className="text-xs mt-2" style={{ color: textColor }}>
                    Copiar enlace
                  </Text>
                </TouchableOpacity>
              </ScrollView>
              {selectedUsers.length > 0 && (
                <View className="px-5 pt-2">
                  <TouchableOpacity
                    onPress={handleSend}
                    className="w-full bg-[#5E17EB] py-4 rounded-full items-center"
                  >
                    <Text className="text-white font-bold text-base">
                      Enviar ({selectedUsers.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const StoryCreationModal = ({
  visible,
  onClose,
  currentUser,
  onSuccess,
  initialSongData = null,
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
    if (visible && initialSongData) {
      setSelectedSong(initialSongData);
      setStep("preview");
      setPreviewTrackUrl(null);
    } else if (visible && !initialSongData) {
      resetForm();
    }
  }, [visible, initialSongData]);
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
    } catch (e) {}
  }, [activeAudioSource, step]);
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

const Explore = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets(); // Importante para el Modal de búsqueda

  const bgColor = isDark ? "#000" : "#FFFFFF";
  const textColor = isDark ? "#FAFAFA" : "#18181B";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const cardBg = isDark ? "#18181B" : "#F8FAFC";
  const inputBg = isDark ? "#27272A" : "#F3F4F6";
  const borderColor = isDark ? "#27272A" : "#E5E5E5";
  const accentColor = "#5E17EB";

  const { user } = useGlobalContext();

  // 🔥 NUEVO ESTADO PARA EL MODO DE BÚSQUEDA
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState({
    users: [] as any[],
    posts: [] as any[],
    isLoading: false,
  });

  // SUGERENCIAS ALEATORIAS (SHUFFLE)
  const [searchSuggestions, setSearchSuggestions] = useState({
    trendingUsers: [] as any[],
    vibesPosts: [] as any[],
    extraSuggestions: [] as any[],
  });

  const [activeCategory, setActiveCategory] = useState("posts");
  const [data, setData] = useState({
    posts: [] as any[],
    users: [] as any[],
    songs: [] as any[],
    artists: [] as any[],
    isLoading: false,
    refreshing: false,
  });

  const skeletonData = useMemo(() => Array.from({ length: 8 }), []);

  const [isOptionsVisible, setOptionsVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  const [isShareVisible, setShareVisible] = useState(false);
  const [isViralModalVisible, setViralModalVisible] = useState(false);
  const [isShareSelectorVisible, setShareSelectorVisible] = useState(false);
  const [postToShare, setPostToShare] = useState<string>("");
  const [postToShareData, setPostToShareData] = useState<any>(null);

  const [shareContacts, setShareContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  const [isCreationVisible, setCreationVisible] = useState(false);
  const [storyInitialSongData, setStoryInitialSongData] = useState<any>(null);

  const [currentSongUrl, setCurrentSongUrl] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const player = useAudioPlayer(currentSongUrl || "");

  useEffect(() => {
    if (currentSongUrl && player) {
      player.play();
      setIsPlaying(true);
    }
  }, [currentSongUrl, player]);

  // 🔥 OPTIMIZACIÓN CLAVE: ELIMINAMOS EL EFECTO SEPARADO Y LO INTEGRAMOS EN EL FETCH PRINCIPAL
  // Esto evita la doble carga al iniciar.

  const handlePlayMusicItem = async (item: any) => {
    const listId = item.id;
    if (playingId === listId) {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
      return;
    }
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    }
    try {
      setLoadingAudioId(listId);
      const trackId = item.trackId;
      if (!trackId) {
        Alert.alert("Error", "ID de canción no disponible.");
        setLoadingAudioId(null);
        return;
      }
      const previewUrl = await getDeezerTrackUrl(trackId);
      if (!previewUrl) {
        Alert.alert("Error", "No se pudo obtener el audio.");
        setLoadingAudioId(null);
        return;
      }
      setPlayingId(listId);
      setCurrentSongUrl(previewUrl);
    } catch (e) {
      Alert.alert("Error", "Ocurrió un error al reproducir.");
    } finally {
      setLoadingAudioId(null);
    }
  };

  const handleFlingRight = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.ACTIVE) {
      router.push("/home");
    }
  };

  const handleFlingLeft = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.ACTIVE) {
      router.push("/library" as any);
    }
  };

  // --- Lógica de Búsqueda Global ---
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (!searchText.trim()) {
        setSearchResults((prev) => ({
          ...prev,
          users: [],
          posts: [],
          isLoading: false,
        }));
        return;
      }

      setSearchResults((prev) => ({ ...prev, isLoading: true }));

      try {
        // 1. Buscar Usuarios
        const usersRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.usersCollectionId,
          [
            Query.or([
              Query.search("username", searchText),
              Query.search("name", searchText),
            ]),
            Query.limit(5),
          ]
        );

        // Mapear resultados para arreglar avatar
        const mappedUsers = usersRes.documents.map((doc: any) => ({
          ...doc,
          id: doc.$id,
          avatar: doc.pfp || doc.avatar, // FIX: Fallback
        }));

        // 2. Buscar en posts locales (Full Text Search Manual)
        const queryWords = searchText
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 0);

        const filteredPosts = data.posts.filter((post) => {
          const song = parseSongFromPost(post.songData);
          if (!song) return false;

          const title = normalizeString(song.title);
          const artist = normalizeString(song.artist);
          const caption = normalizeString(post.caption || "");

          return queryWords.some(
            (w) =>
              title.includes(w) || artist.includes(w) || caption.includes(w)
          );
        });

        setSearchResults({
          users: mappedUsers,
          posts: filteredPosts,
          isLoading: false,
        });
      } catch (error) {
        console.log("Error buscando:", error);
        setSearchResults((prev) => ({ ...prev, isLoading: false }));
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchText, data.posts]);

  // --- Algoritmo Principal de Explorar ---
  const calculateTopMooders = (
    posts: any[],
    latestUsers: any[],
    myFollows: any[]
  ) => {
    const userScores: Record<string, any> = {};
    posts.forEach((post) => {
      const creator = getCreatorFromPost(post);
      const id = creator.id;
      if (id === "unknown" || id === user?.$id) return;
      if (!userScores[id]) {
        userScores[id] = {
          ...creator,
          totalLikes: 0,
          postCount: 0,
          score: 0,
          isTrending: true,
        };
      }
      const likes = post.likedBy ? post.likedBy.length : 0;
      userScores[id].totalLikes += likes;
      userScores[id].postCount += 1;
      userScores[id].score += likes * 5 + 2;
    });
    latestUsers.forEach((u) => {
      const id = u.$id;
      if (id === user?.$id) return;
      if (!userScores[id]) {
        userScores[id] = {
          id: u.$id,
          username: u.username,
          name: u.name,
          avatar: u.pfp,
          isVerified: u.isVerified,
          totalLikes: 0,
          score: 1,
          isTrending: false,
          isNew: true,
        };
      }
    });
    return Object.values(userScores)
      .filter((u: any) => !myFollows.includes(u.id))
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 50);
  };

  const fetchCategoryData = async () => {
    setData((prev) => ({ ...prev, isLoading: true }));
    try {
      const myFollowsListPromise = user?.$id
        ? getFollowedUserIds(user.$id)
        : Promise.resolve([]);
      let newData = { ...data };

      if (activeCategory === "posts") {
        // 🔥 OPTIMIZACIÓN: Cargar usuarios recientes EN PARALELO aquí mismo
        const [rawPosts, myFollowsList, latestUsers] = await Promise.all([
          getFeedCandidates(),
          myFollowsListPromise,
          getLatestUsers(), // Traemos usuarios aquí para popular sugerencias de una vez
        ]);

        const safeFollows = Array.isArray(myFollowsList)
          ? myFollowsList.map((f: any) =>
              typeof f === "object" && f?.$id ? f.$id : f
            )
          : [];
        const filteredPosts = rawPosts.filter((post: any) => {
          const creator = getCreatorFromPost(post);
          const isMe = creator.id === user?.$id;
          const isFollowing = safeFollows.includes(creator.id);
          const isPrivate =
            post.creator?.isPrivate || post.postedBy?.isPrivate || false;
          return !isMe && !isFollowing && !isPrivate;
        });

        // 🔥 FRESH SHUFFLE LOGIC
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentPosts: any[] = [];
        const olderPosts: any[] = [];

        filteredPosts.forEach((post: any) => {
          const postDate = new Date(post.$createdAt);
          if (postDate > oneDayAgo) {
            recentPosts.push(post);
          } else {
            olderPosts.push(post);
          }
        });

        const shuffledRecent = shuffleArray(recentPosts);
        const shuffledOlder = shuffleArray(olderPosts);
        newData.posts = [...shuffledRecent, ...shuffledOlder];

        // 🔥 POBLAR SUGERENCIAS DE BÚSQUEDA AQUÍ MISMO (Sin doble llamada)
        const validUsers = latestUsers
          .filter((u: any) => u.$id !== user?.$id)
          .map((u: any) => ({
            ...u,
            id: u.$id,
            avatar: u.pfp || u.avatar,
          }));

        const shuffledUsers = shuffleArray(validUsers);
        const shuffledPostsSearch = shuffleArray(filteredPosts); // Reusamos los posts filtrados

        setSearchSuggestions({
          trendingUsers: shuffledUsers.slice(0, 10),
          vibesPosts: shuffledPostsSearch.slice(0, 5),
          extraSuggestions: shuffledUsers.slice(10, 18),
        });
      }

      if (activeCategory === "profiles") {
        const [rawPosts, latestUsers, myFollowsList] = await Promise.all([
          getFeedCandidates(),
          getLatestUsers(),
          myFollowsListPromise,
        ]);
        const safeFollows = Array.isArray(myFollowsList)
          ? myFollowsList.map((f: any) =>
              typeof f === "object" && f?.$id ? f.$id : f
            )
          : [];
        newData.users = calculateTopMooders(rawPosts, latestUsers, safeFollows);
      }

      if (activeCategory === "music" || activeCategory === "artists") {
        const allPosts = await getAllPosts(user?.$id || "");
        if (activeCategory === "music") {
          const songMap = new Map();
          allPosts.forEach((post: any) => {
            const songData = parseSongFromPost(post.songData);
            if (!songData) return;
            const uniqueKey = `${normalizeString(
              songData.title
            )}-${normalizeString(songData.artist)}`;
            const likes = post.likedBy ? post.likedBy.length : 0;
            if (songMap.has(uniqueKey)) {
              songMap.get(uniqueKey).likes += likes;
            } else {
              songMap.set(uniqueKey, {
                ...songData,
                id: uniqueKey,
                trackId: songData.id || songData.spotifyId,
                postId: post.$id,
                likes: likes,
                type: "music",
              });
            }
          });
          newData.songs = Array.from(songMap.values())
            .filter((s: any) => s.likes > 0)
            .sort((a: any, b: any) => b.likes - a.likes)
            .slice(0, 10)
            .map((s: any, i) => ({ ...s, rank: i + 1 }));
        }
        if (activeCategory === "artists") {
          const artistMap = new Map();
          allPosts.forEach((post: any) => {
            const songData = parseSongFromPost(post.songData);
            if (!songData) return;
            const artistName = normalizeString(songData.artist);
            if (artistMap.has(artistName)) {
              const data = artistMap.get(artistName);
              data.count += 1;
              if (Math.random() > 0.5) data.cover = songData.cover;
            } else {
              artistMap.set(artistName, {
                id: artistName,
                name: songData.artist,
                cover: songData.cover,
                count: 1,
              });
            }
          });
          newData.artists = Array.from(artistMap.values())
            .sort((a: any, b: any) => b.count - a.count)
            .slice(0, 16);
        }
      }
      setData({ ...newData, isLoading: false, refreshing: false });
    } catch (error) {
      setData((prev) => ({ ...prev, isLoading: false, refreshing: false }));
    }
  };

  useEffect(() => {
    fetchCategoryData();
  }, [activeCategory, user]);
  const onRefresh = () => {
    setData((prev) => ({ ...prev, refreshing: true }));
    fetchCategoryData();
  };
  const handleOpenOptions = (post: any) => {
    setSelectedPost(post);
    setOptionsVisible(true);
  };
  const openShare = async (post: any) => {
    setPostToShareData(post);
    setPostToShare(post.$id);
    setShareSelectorVisible(true);
    if (user?.$id && shareContacts.length === 0) {
      setIsLoadingContacts(true);
      const contacts = await fetchFollowedUsers(user.$id);
      setShareContacts(contacts);
      setIsLoadingContacts(false);
    }
  };
  const fetchFollowedUsers = async (userId: string) => {
    try {
      const followedIds = await getFollowedUserIds(userId);
      if (followedIds.length > 0) {
        const promises = followedIds.map((id) => getUser(id));
        const users = await Promise.all(promises);
        return users.filter((u) => u !== null);
      }
    } catch (error) {}
    return [];
  };
  const searchUsersInAppwrite = async (query: string) => {
    try {
      return (
        await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.usersCollectionId,
          [
            Query.or([
              Query.search("username", query),
              Query.search("name", query),
            ]),
            Query.limit(10),
          ]
        )
      ).documents;
    } catch (error) {
      return [];
    }
  };
  const handleShareSearch = async (text: string) => {
    setIsLoadingContacts(true);
    if (text.length > 0) {
      const results = await searchUsersInAppwrite(text);
      setShareContacts(results);
    } else if (user?.$id) {
      const contacts = await fetchFollowedUsers(user.$id);
      setShareContacts(contacts);
    }
    setIsLoadingContacts(false);
  };
  const handleSendShare = async (userIds: string[], message: string) => {
    if (!user?.$id || !postToShareData) return;
    try {
      const promises = userIds.map(async (targetId) => {
        const chatDoc = await getOrCreateChat(user.$id, targetId);
        if (!chatDoc)
          throw new Error("No se pudo crear el chat para " + targetId);
        return databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.messagesCollectionId,
          ID.unique(),
          {
            chatId: chatDoc.$id,
            senderId: user.$id,
            receiverId: targetId,
            content: message || "",
            sharedPostId: postToShareData.$id,
            isRead: false,
          }
        );
      });
      await Promise.all(promises);
      Alert.alert("Enviado", "El post se ha compartido correctamente.");
    } catch (error) {
      Alert.alert("Error", "No se pudo compartir el post.");
    }
  };
  const handleAddToStoryFromPost = async () => {
    if (!postToShareData) return;
    const songData = parseSongFromPost(postToShareData.songData);
    if (songData) {
      let freshPreview = songData.preview;
      const trackId = songData.id || songData.spotifyId;
      if (trackId) {
        try {
          const freshUrl = await getDeezerTrackUrl(trackId);
          if (freshUrl) freshPreview = freshUrl;
        } catch (e) {}
      }
      setStoryInitialSongData({ ...songData, preview: freshPreview });
      setShareSelectorVisible(false);
      setTimeout(() => setCreationVisible(true), 300);
    }
  };
  const handleSystemShare = async () => {
    if (!postToShareData) return;
    const link = `https://moodapp.com/post/${postToShareData.$id}`;
    try {
      await SystemShare.share({
        message: `¡Mira esta canción en Mood! ${link}`,
        url: link,
        title: "Compartir desde Mood",
      });
    } catch (error) {}
    setShareSelectorVisible(false);
  };
  const handleCopyLink = () => {
    if (!postToShareData) return;
    const link = `https://moodapp.com/post/${postToShareData.$id}`;
    Clipboard.setString(link);
    Alert.alert("Enlace copiado", "El enlace al post ha sido copiado.");
    setShareSelectorVisible(false);
  };
  const getViralPostData = () => {
    if (!postToShareData) return null;
    const song = parseSongFromPost(postToShareData.songData);
    const creator = getCreatorFromPost(postToShareData);
    return {
      title: song?.title || "Música",
      artist: song?.artist || "Artista",
      cover: song?.cover || null,
      originalPostCreator: creator.username || "usuario",
      creatorPfp: creator.avatar || null,
      comment: postToShareData.comment || null,
    };
  };
  const handleDeleteAction = () => {
    if (!selectedPost) return;
    setOptionsVisible(false);
    Alert.alert("¿Eliminar?", "Esta acción es irreversible.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            setData((prev) => ({
              ...prev,
              posts: prev.posts.filter((p) => p.$id !== selectedPost.$id),
            }));
            await deletePost(selectedPost.$id);
          } catch (e) {
            Alert.alert("Error", "No se pudo eliminar");
            onRefresh();
          }
        },
      },
    ]);
  };
  const handleReportAction = () => {
    setOptionsVisible(false);
    Alert.alert("Reportar", "Selecciona una razón:", [
      { text: "Cancelar", style: "cancel" },
      { text: "Spam/Inapropiado", onPress: () => submitReport("spam") },
      { text: "Otro", onPress: () => submitReport("other") },
    ]);
  };
  const submitReport = async (reason: string) => {
    if (!user || !selectedPost) return;
    try {
      await reportPost(selectedPost.$id, user.$id, reason);
      Alert.alert("Reporte enviado", "Gracias por ayudarnos.");
    } catch (e) {
      Alert.alert("Error", "Inténtalo más tarde.");
    }
  };
  const getSectionTitle = () => {
    switch (activeCategory) {
      case "profiles":
        return t("explore.headers.topMooders");
      case "music":
        return t("explore.headers.topGlobal");
      case "artists":
        return t("explore.headers.topArtists");
      default:
        return t("explore.headers.trending");
    }
  };

  // --- SUB-PAGINA DE BÚSQUEDA (MODAL HEADER) ---
  const renderSearchHeader = () => (
    <View
      className="flex-row items-center justify-between px-5 py-4 border-b border-zinc-800"
      style={{
        backgroundColor: bgColor,
        paddingTop: Platform.OS === "android" ? 20 : 0, // Ajuste para Android si es necesario
      }}
    >
      {/* Input Field with AutoFocus */}
      <View
        className="flex-1 flex-row items-center h-12 rounded-2xl px-4"
        style={{ backgroundColor: inputBg }}
      >
        <Ionicons name="search" size={20} color={subTextColor} />
        <TextInput
          // 🔥 CORRECCIÓN: Eliminado autoFocus para que el teclado no salga automático
          value={searchText}
          onChangeText={setSearchText}
          placeholder={t("explore.search.instruction")}
          placeholderTextColor={subTextColor}
          className="flex-1 ml-3 text-base font-medium"
          style={{ color: textColor }}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <Ionicons name="close-circle" size={18} color={subTextColor} />
          </TouchableOpacity>
        )}
      </View>
      {/* Cancel Button */}
      <TouchableOpacity
        onPress={() => {
          setIsSearchActive(false);
          setSearchText("");
        }}
        className="ml-3"
      >
        <Text className="text-[#5E17EB] font-bold text-base">{"cancel"}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={{ backgroundColor: bgColor }} className="pb-2">
      <View className="px-5 pt-2 pb-4">
        <Text className="text-3xl font-bold mb-4" style={{ color: textColor }}>
          {t("explore.title")}
        </Text>
        {/* FAKE SEARCH BAR (TRIGGER) */}
        <Pressable
          onPress={() => setIsSearchActive(true)}
          className="flex-row items-center h-12 rounded-2xl px-4 border"
          style={{ backgroundColor: inputBg, borderColor: "transparent" }}
        >
          <Ionicons name="search" size={20} color={subTextColor} />
          <Text
            className="flex-1 ml-3 text-base font-medium"
            style={{ color: subTextColor }}
          >
            {t("explore.searchPlaceholder")}
          </Text>
        </Pressable>
      </View>
      <FlatList
        horizontal
        data={CATEGORIES}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isActive = activeCategory === item.id;
          return (
            <TouchableOpacity
              onPress={() => setActiveCategory(item.id)}
              className={`mr-3 px-5 py-2.5 rounded-full flex-row items-center border`}
              style={{
                backgroundColor: isActive ? accentColor : "transparent",
                borderColor: isActive ? accentColor : borderColor,
              }}
            >
              <Ionicons
                name={item.icon as any}
                size={16}
                color={isActive ? "white" : subTextColor}
                style={{ marginRight: 6 }}
              />
              <Text
                className={`${
                  isActive ? "font-bold" : "font-medium"
                } text-[15px]`}
                style={{ color: isActive ? "white" : subTextColor }}
              >
                {t(item.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
      <View className="px-5 mt-6 mb-2 flex-row justify-between items-end">
        <Text className="font-bold text-xl" style={{ color: textColor }}>
          {getSectionTitle()}
        </Text>
      </View>
    </View>
  );

  const renderMusicItem = ({ item }: { item: any }) => {
    const isThisPlaying = playingId === item.id;
    const isLoadingThis = loadingAudioId === item.id;
    const showPause = isThisPlaying && isPlaying;
    let rankColor = subTextColor;
    let rankIcon = null;
    let bgRank = "transparent";
    if (item.rank === 1) {
      rankColor = "#FFD700";
      rankIcon = "trophy";
      bgRank = "rgba(255, 215, 0, 0.1)";
    } else if (item.rank === 2) {
      rankColor = "#C0C0C0";
      rankIcon = "medal";
      bgRank = "rgba(192, 192, 192, 0.1)";
    } else if (item.rank === 3) {
      rankColor = "#CD7F32";
      rankIcon = "medal";
      bgRank = "rgba(205, 127, 50, 0.1)";
    }
    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => router.push(`/post/${item.postId}` as any)}
        className="flex-row items-center px-4 py-3 mb-3 mx-4 rounded-2xl border"
        style={{ backgroundColor: cardBg, borderColor: borderColor }}
      >
        <View className="w-10 items-center justify-center mr-3">
          {item.rank <= 3 ? (
            <View
              className="items-center justify-center w-8 h-8 rounded-full"
              style={{ backgroundColor: bgRank }}
            >
              <FontAwesome5
                name={rankIcon as any}
                size={14}
                color={rankColor}
              />
            </View>
          ) : (
            <Text className="text-lg font-bold" style={{ color: subTextColor }}>
              {item.rank}
            </Text>
          )}
        </View>
        <Image
          source={{ uri: item.cover }}
          className="w-14 h-14 rounded-xl mr-4"
          style={{ backgroundColor: "#27272A" }}
        />
        <View className="flex-1 justify-center">
          <Text
            className="font-bold text-[16px] mb-0.5"
            numberOfLines={1}
            style={{ color: textColor }}
          >
            {item.title}
          </Text>
          <Text
            className="text-sm font-medium"
            numberOfLines={1}
            style={{ color: subTextColor }}
          >
            {item.artist}
          </Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="heart" size={12} color="#EF4444" />
            <Text
              className="text-xs ml-1 font-semibold"
              style={{ color: subTextColor }}
            >
              {item.likes} likes
            </Text>
          </View>
        </View>
        <TouchableOpacity
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{
            backgroundColor: isThisPlaying
              ? accentColor
              : "rgba(255,255,255,0.1)",
          }}
          onPress={(e) => {
            e.stopPropagation();
            handlePlayMusicItem(item);
          }}
        >
          {isLoadingThis ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons
              name={showPause ? "pause" : "play"}
              size={20}
              color={isThisPlaying ? "white" : accentColor}
              style={{ marginLeft: showPause ? 0 : 2 }}
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderArtistItem = ({ item }: { item: any }) => (
    <View
      className="flex-1 m-2 p-3 rounded-3xl border items-center justify-center"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
        aspectRatio: 0.85,
      }}
    >
      <Image
        source={{ uri: item.cover }}
        className="w-24 h-24 rounded-full mb-3 border-2"
        style={{ borderColor: isDark ? "#27272A" : "#FFFFFF" }}
      />
      <Text
        className="font-bold text-center text-base mb-1 px-1"
        numberOfLines={1}
        style={{ color: textColor }}
      >
        {item.name}
      </Text>
      <Text className="text-xs font-medium" style={{ color: subTextColor }}>
        {item.count} {item.count === 1 ? "track" : "tracks"}
      </Text>
    </View>
  );

  const renderProfileItem = ({ item }: { item: any }) => {
    const isTrending = item.totalLikes >= 5;
    return (
      <TouchableOpacity
        onPress={() => {
          setIsSearchActive(false);
          router.push(`/user/${item.id}` as any);
        }}
        className="flex-row items-center px-5 py-4 border-b active:opacity-70"
        style={{ borderColor: borderColor, backgroundColor: bgColor }}
      >
        <Image
          source={
            item.avatar ? { uri: item.avatar } : require("@/assets/noPfp.jpg")
          }
          className="w-14 h-14 rounded-full border-2"
          style={{ borderColor: borderColor }}
        />
        <View className="ml-4 flex-1">
          <View className="flex-row items-center">
            <Text
              className="font-bold text-[17px] mr-2"
              style={{ color: textColor }}
            >
              {item.name || "Usuario"}
            </Text>
            {item.isVerified && (
              <MaterialIcons
                name="verified"
                size={14}
                color="#5E17EB"
                style={{ marginLeft: -4 }}
              />
            )}
            {isTrending && (
              <View className="bg-red-500/10 px-1.5 py-0.5 rounded flex-row items-center ml-2">
                <Ionicons name="flame" size={10} color="#EF4444" />
              </View>
            )}
          </View>
          <Text
            className="text-sm font-medium mt-0.5"
            style={{ color: subTextColor }}
          >
            @{item.username}
          </Text>
        </View>
        <View
          className="px-4 py-2 rounded-full border"
          style={{
            borderColor: borderColor,
            backgroundColor: isDark ? "#18181B" : "#F4F4F5",
          }}
        >
          <Text className="text-xs font-bold" style={{ color: textColor }}>
            {t("explore.actions.view")}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // --- RENDER DE RESULTADOS DE BÚSQUEDA (MODAL BODY) ---
  const renderSearchResults = () => {
    // ESTADO VACIO: SUGERENCIAS DINÁMICAS (FIX DEL "ERROR")
    if (searchText.trim() === "") {
      return (
        <ScrollView
          className="flex-1 pt-6"
          keyboardShouldPersistTaps="handled"
          // 🔥 CORRECCIÓN: Eliminar indicador de scroll
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Gente Trending - Carrusel Horizontal */}
          {searchSuggestions.trendingUsers.length > 0 && (
            <View className="mb-8">
              <Text
                className="px-5 mb-4 font-bold text-lg"
                style={{ color: textColor }}
              >
                {t("explore.suggestions.people")}
              </Text>
              <FlatList
                horizontal
                data={searchSuggestions.trendingUsers} // Mostrar top 8 random
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setIsSearchActive(false);
                      router.push(`/user/${item.id}` as any);
                    }}
                    className="mr-5 items-center"
                  >
                    <Image
                      source={
                        item.avatar
                          ? { uri: item.avatar }
                          : require("@/assets/noPfp.jpg")
                      }
                      className="w-16 h-16 rounded-full border-2 bg-zinc-800"
                      style={{
                        borderColor: item.isTrending ? "#EF4444" : borderColor,
                      }}
                    />
                    <Text
                      className="mt-2 text-xs font-bold text-center w-16"
                      numberOfLines={1}
                      style={{ color: textColor }}
                    >
                      {item.name || item.username}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* 2. Vibras del Momento - Lista Vertical Simple */}
          {searchSuggestions.vibesPosts.length > 0 && (
            <View className="mb-12">
              <Text
                className="px-5 mb-4 font-bold text-lg"
                style={{ color: textColor }}
              >
                {t("explore.suggestions.vibes")}
              </Text>
              {searchSuggestions.vibesPosts.map((post) => {
                // Mostrar top 5 canciones random
                const song = parseSongFromPost(post.songData);
                if (!song) return null;
                return (
                  <TouchableOpacity
                    key={post.$id}
                    onPress={() => {
                      setIsSearchActive(false);
                      router.push(`/post/${post.$id}` as any);
                    }}
                    className="flex-row items-center px-5 py-3 border-b"
                    style={{ borderColor: borderColor }}
                  >
                    <Image
                      source={{ uri: song.cover }}
                      className="w-12 h-12 rounded-lg mr-4 bg-zinc-800"
                    />
                    <View>
                      <Text
                        className="font-bold text-base"
                        style={{ color: textColor }}
                      >
                        {song.title}
                      </Text>
                      <Text className="text-xs" style={{ color: subTextColor }}>
                        {song.artist}
                      </Text>
                    </View>
                    <View className="flex-1 items-end">
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={subTextColor}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* 3. 🔥 NUEVA SECCIÓN: QUIZÁS CONOZCAS (ESTILO DIFERENTE "Glass Dark") */}
          {searchSuggestions.extraSuggestions.length > 0 && (
            <View className="mb-20">
              <Text
                className="px-5 mb-4 font-bold text-lg"
                style={{ color: textColor }}
              >
                {t("explore.suggestions.discover")}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
              >
                {searchSuggestions.extraSuggestions.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    onPress={() => {
                      setIsSearchActive(false);
                      router.push(`/user/${user.id}` as any);
                    }}
                    className="mr-3 p-4 rounded-3xl w-40 items-center justify-between"
                    style={{ backgroundColor: "#1E1E24", height: 160 }} // Fondo oscuro sólido pero suave
                  >
                    <View className="items-center">
                      <Image
                        source={
                          user.avatar
                            ? { uri: user.avatar }
                            : require("@/assets/noPfp.jpg")
                        }
                        className="w-14 h-14 rounded-full mb-2 bg-zinc-700"
                      />
                      <Text
                        className="text-white font-bold text-center text-sm"
                        numberOfLines={1}
                      >
                        {user.name}
                      </Text>
                      <Text
                        className="text-zinc-500 text-center text-xs"
                        numberOfLines={1}
                      >
                        @{user.username}
                      </Text>
                    </View>
                    <View className="w-full bg-[#5E17EB] py-1.5 rounded-full items-center mt-2">
                      <Text className="text-white text-xs font-bold">
                        {t("explore.actions.view")}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      );
    }

    if (searchResults.isLoading) {
      return (
        <View className="flex-1 pt-20">
          <ActivityIndicator size="large" color="#5E17EB" />
        </View>
      );
    }

    if (searchResults.users.length === 0 && searchResults.posts.length === 0) {
      return (
        <View className="flex-1 items-center justify-center opacity-50 pb-20">
          <Text className="font-medium" style={{ color: subTextColor }}>
            {t("explore.search.noResults")}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        // 🔥 CORRECCIÓN: Eliminar indicador de scroll
        showsVerticalScrollIndicator={false}
      >
        {/* SECCIÓN PERSONAS (RESULTADOS) */}
        {searchResults.users.length > 0 && (
          <View className="mb-6">
            <Text
              className="px-5 py-3 font-bold text-lg opacity-80"
              style={{ color: textColor }}
            >
              {t("explore.search.people")}
            </Text>
            {searchResults.users.map((user) => (
              <View key={user.$id}>
                {renderProfileItem({
                  item: { ...user, id: user.$id, totalLikes: 0 },
                })}
              </View>
            ))}
          </View>
        )}

        {/* SECCIÓN PUBLICACIONES (RESULTADOS) */}
        {searchResults.posts.length > 0 && (
          <View className="pb-10">
            <Text
              className="px-5 py-3 font-bold text-lg opacity-80"
              style={{ color: textColor }}
            >
              {t("explore.search.posts")}
            </Text>
            {searchResults.posts.map((post) => (
              <View
                key={post.$id}
                className="py-4 border-b"
                style={{ borderColor: borderColor }}
              >
                <PostItem
                  post={post}
                  currentUserId={user?.$id || ""}
                  onProfilePress={(id) => {
                    setIsSearchActive(false);
                    router.push(`/user/${id}` as any);
                  }}
                  onCommentPress={(id) => {
                    setIsSearchActive(false);
                    router.push(`/post/${id}` as any);
                  }}
                  onOptionsPress={() => handleOpenOptions(post)}
                  onSharePress={() => openShare(post)}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderContent = () => {
    const contentData = data.isLoading
      ? skeletonData
      : (() => {
          switch (activeCategory) {
            case "music":
              return data.songs;
            case "artists":
              return data.artists;
            case "profiles":
              return data.users;
            default:
              return data.posts;
          }
        })();

    return (
      <FlatList
        data={contentData}
        key={activeCategory === "artists" ? "grid" : "list"}
        numColumns={activeCategory === "artists" ? 2 : 1}
        columnWrapperStyle={
          activeCategory === "artists" ? { paddingHorizontal: 12 } : undefined
        }
        keyExtractor={(item, index) =>
          data.isLoading
            ? `skeleton-${index}`
            : item.id || item.$id || Math.random().toString()
        }
        // 🔥 CORRECCIÓN: Optimizaciones de rendimiento para la lista
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        renderItem={({ item, index }) => {
          if (data.isLoading) {
            switch (activeCategory) {
              case "music":
                return <MusicSkeleton isDark={isDark} />;
              case "artists":
                return <ArtistSkeleton isDark={isDark} />;
              case "profiles":
                return <ProfileSkeleton isDark={isDark} />;
              default:
                return <ExplorePostSkeleton isDark={isDark} />;
            }
          }
          switch (activeCategory) {
            case "music":
              return renderMusicItem({ item });
            case "artists":
              return renderArtistItem({ item });
            case "profiles":
              return renderProfileItem({ item });
            default:
              return (
                <View className="relative">
                  {/* 🔥 ETIQUETA MOOD FRESH (ACABA DE SALIR) */}
                  {isFreshPost(item.$createdAt) && (
                    <LinearGradient
                      colors={["#5E17EB", "#9333EA"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        position: "absolute",
                        top: 24,
                        right: 20,
                        zIndex: 10,
                        borderRadius: 100,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons
                        name="sparkles"
                        size={10}
                        color="white"
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={{
                          color: "white",
                          fontSize: 10,
                          fontWeight: "bold",
                        }}
                      >
                        {t("explore.badge.fresh")}
                      </Text>
                    </LinearGradient>
                  )}

                  <View
                    className="py-4 border-1 border-b"
                    style={{ borderColor: borderColor }}
                  >
                    <PostItem
                      post={item}
                      currentUserId={user?.$id || ""}
                      onProfilePress={(id) => router.push(`/user/${id}` as any)}
                      onCommentPress={(id) => router.push(`/post/${id}` as any)}
                      onOptionsPress={() => handleOpenOptions(item)}
                      onSharePress={() => openShare(item)}
                    />
                  </View>
                </View>
              );
          }
        }}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !data.isLoading ? (
            <View className="items-center justify-center mt-20 opacity-50">
              <Ionicons name="planet-outline" size={60} color={subTextColor} />
              <Text
                className="text-center mt-4 font-medium"
                style={{ color: subTextColor }}
              >
                {t("explore.noResults")}
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={data.refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
      />
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FlingGestureHandler
        direction={Directions.RIGHT}
        onHandlerStateChange={handleFlingRight}
      >
        <FlingGestureHandler
          direction={Directions.LEFT}
          onHandlerStateChange={handleFlingLeft}
        >
          <View style={{ flex: 1, backgroundColor: bgColor }}>
            <SafeAreaView className="flex-1" edges={["top"]}>
              <StatusBar style={isDark ? "light" : "dark"} />
              {renderContent()}

              {/* --- SEARCH MODAL (SUB-PAGE FIXED) --- */}
              <Modal
                visible={isSearchActive}
                animationType="fade"
                transparent={false}
                onRequestClose={() => setIsSearchActive(false)}
              >
                {/* FIX DEL LAYOUT: Añadimos paddingTop manual para librar el notch */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: bgColor,
                    paddingTop: insets.top,
                  }}
                >
                  {renderSearchHeader()}
                  {renderSearchResults()}
                </View>
              </Modal>

              <DirectShareSheet
                visible={isShareSelectorVisible}
                onClose={() => setShareSelectorVisible(false)}
                contacts={shareContacts}
                isDark={isDark}
                isLoadingContacts={isLoadingContacts}
                onSearch={handleShareSearch}
                onSend={handleSendShare}
                onAddToStory={handleAddToStoryFromPost}
                onViralCard={() => {
                  setShareSelectorVisible(false);
                  setTimeout(() => setViralModalVisible(true), 300);
                }}
                onSystemShare={handleSystemShare}
                onCopyLink={handleCopyLink}
              />
              <StoryCreationModal
                visible={isCreationVisible}
                onClose={() => setCreationVisible(false)}
                currentUser={user}
                onSuccess={() => {
                  setCreationVisible(false);
                }}
                initialSongData={storyInitialSongData}
              />
              <MoodShareCard
                isVisible={isViralModalVisible}
                onClose={() => setViralModalVisible(false)}
                post={getViralPostData()}
              />
              <ShareModal
                isVisible={isShareVisible}
                onClose={() => setShareVisible(false)}
                postId={postToShare}
              />
              <OptionsModal
                isVisible={isOptionsVisible}
                onClose={() => setOptionsVisible(false)}
                onDelete={handleDeleteAction}
                onReport={handleReportAction}
                isOwner={
                  user?.$id && selectedPost
                    ? (selectedPost.postedBy?.$id ||
                        selectedPost.creator?.id ||
                        getCreatorFromPost(selectedPost).id) === user.$id
                    : false
                }
              />
            </SafeAreaView>
          </View>
        </FlingGestureHandler>
      </FlingGestureHandler>
    </GestureHandlerRootView>
  );
};

export default Explore;
