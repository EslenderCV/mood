import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
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
  Animated,
  Pressable,
  ScrollView,
  Share as SystemShare,
  Clipboard,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
  Easing,
  StyleSheet,
  BackHandler,
  ViewToken,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { router, useFocusEffect, useNavigation } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAudioPlayer } from "expo-audio";
import { Audio } from "expo-av";
import * as Linking from "expo-linking";
import * as ImagePicker from "expo-image-picker"; // IMPORTANTE

import {
  PanGestureHandler,
  State,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { Databases, Query, ID, Storage } from "react-native-appwrite";

import { useGlobalContext } from "@/context/GlobalProvider";
import { FeedProvider, useFeed, FeedItem } from "@/context/FeedProvider";

import {
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
  client,
  appwriteConfig,
  getDeezerTrackUrl,
  getOrCreateChat,
  toggleSavePost,
  searchSongs,
  toggleLikePost,
  getPostComments,
  createComment,
  followUser,
  uploadFile, // Función importada de appwrite.ts
} from "@/lib/appwrite";
import OptionsModal from "@/components/OptionsModal";
import PostItem from "@/components/PostItem";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";
import MoodShareCard from "@/components/MoodShareCard";
import ShareModal from "@/components/ShareModal";
import PostModal from "@/components/PostModal";

import SuggestedUsersCarousel from "@/components/SuggestedUsersCarousel";
import TrendingSongCard from "@/components/TrendingSongCard";

import ChatsList from "../chats";

const { height, width } = Dimensions.get("window");
const ADMIN_USERS = [".angel", "whoseslender"];
const databases = new Databases(client);
const storage = new Storage(client);

// TU ID VERIFICADO
const MOOD_OFFICIAL_ID = "696b571b00112fd5c1e9";

const RANDOM_SEARCH_TERMS = [
  "global top 50",
  "viral hits",
  "reggaeton 2024",
  "pop hits",
  "lo-fi beats",
  "rock classics",
  "hip hop essentials",
  "latin hits",
  "mood booster",
];

const CustomToast = ({ visible, type, title, message, translateY }: any) => {
  if (!visible) return null;
  const isSuccess = type === "success";
  const iconName = isSuccess ? "checkmark-circle" : "alert-circle";
  const iconColor = isSuccess ? "#5E17EB" : "#EF4444";
  const bgColor = "rgba(20, 20, 23, 0.95)";

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        position: "absolute",
        top: Platform.OS === "ios" ? 60 : 40,
        left: 20,
        right: 20,
        zIndex: 9999,
        backgroundColor: bgColor,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: isSuccess
            ? "rgba(94, 23, 235, 0.15)"
            : "rgba(239, 68, 68, 0.15)",
          justifyContent: "center",
          alignItems: "center",
          marginRight: 14,
        }}
      >
        <Ionicons name={iconName} size={28} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: "white",
            fontWeight: "bold",
            fontSize: 16,
            marginBottom: 2,
          }}
        >
          {title}
        </Text>
        <Text style={{ color: "#A1A1AA", fontSize: 13, fontWeight: "500" }}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};

// --- MODAL PERSONALIZADO PARA CREADOR ---
const CreatorModal = ({ visible, onClose, onMusic, onGallery }: any) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-black/60">
          <TouchableWithoutFeedback>
            <View className="bg-[#121212] rounded-t-[32px] p-6 pb-10">
              <View className="w-12 h-1.5 bg-zinc-700 rounded-full self-center mb-6" />
              <Text className="text-white text-xl font-bold text-center mb-8">
                Crear Nueva Historia
              </Text>

              <View className="flex-row gap-4 mb-4">
                <TouchableOpacity
                  onPress={onMusic}
                  className="flex-1 bg-zinc-900 p-6 rounded-2xl items-center border border-zinc-800 active:bg-zinc-800"
                >
                  <View className="w-14 h-14 rounded-full bg-[#5E17EB]/20 items-center justify-center mb-3">
                    <Ionicons name="musical-notes" size={28} color="#5E17EB" />
                  </View>
                  <Text className="text-white font-bold text-lg">Música</Text>
                  <Text className="text-zinc-500 text-xs text-center mt-1">
                    Comparte una canción
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    if (onGallery) onGallery();
                  }}
                  className="flex-1 bg-zinc-900 p-6 rounded-2xl items-center border border-zinc-800 active:bg-zinc-800"
                >
                  <View className="w-14 h-14 rounded-full bg-pink-500/20 items-center justify-center mb-3">
                    <Ionicons name="image" size={28} color="#ec4899" />
                  </View>
                  <Text className="text-white font-bold text-lg">Galería</Text>
                  <Text className="text-zinc-500 text-xs text-center mt-1">
                    Foto o Video
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={onClose} className="mt-2 py-3">
                <Text className="text-zinc-500 text-center font-medium">
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// --- HELPERS ---
const shuffleArray = (array: any[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
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
  return {
    id: "unknown",
    username: "anon",
    name: "Usuario",
    avatar: null,
    isVerified: false,
  };
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

const searchSongsWrapper = async (query: string) => {
  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=15`,
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

const formatTimeAgo = (dateString: string) => {
  if (!dateString) return "";
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  return "1d";
};

// --- COMPONENTES AUXILIARES ---

const StoriesSkeleton = ({ isDark }: { isDark: boolean }) => {
  const bg = isDark ? "bg-zinc-800" : "bg-zinc-200";
  return (
    <View className="flex-row py-4 pl-4 border-b border-zinc-900/50 bg-black">
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} className="items-center mr-5">
          <View
            className={`w-[68px] h-[68px] rounded-full ${bg} mb-2 animate-pulse`}
          />
          <View className={`w-14 h-2.5 rounded-md ${bg} animate-pulse`} />
        </View>
      ))}
    </View>
  );
};

const PostSkeleton = ({ isDark }: { isDark: boolean }) => {
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
        className={`w-full h-[100px] rounded-[24px] ${cardBg} mb-4 flex-row items-center p-3 overflow-hidden`}
      >
        <View
          className={`w-[76px] h-[76px] rounded-[18px] ${elementBg} mr-3`}
        />
        <View className="flex-1 justify-center space-y-2">
          <View className={`w-3/4 h-4 rounded ${elementBg}`} />
          <View className={`w-1/2 h-3 rounded ${elementBg}`} />
        </View>
      </View>
    </View>
  );
};

const FeedSkeleton = ({ isDark }: { isDark: boolean }) => {
  const { height } = useWindowDimensions();
  const POST_HEIGHT_ESTIMATE = 220;
  const itemCount = Math.ceil(height / POST_HEIGHT_ESTIMATE) + 1;
  return (
    <View className="flex-1">
      <StoriesSkeleton isDark={isDark} />
      <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={false}>
        {[...Array(itemCount)].map((_, i) => (
          <PostSkeleton key={i} isDark={isDark} />
        ))}
      </ScrollView>
    </View>
  );
};

const EmptyStateWithSuggestions = ({ suggestions, onGoToExplore }: any) => {
  return (
    <View className="px-4 py-12 items-center justify-center">
      <View className="items-center mb-10">
        <View className="relative">
          <LinearGradient
            colors={["rgba(94, 23, 235, 0.3)", "transparent"] as const}
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
                  source={
                    item.pfp || item.avatar
                      ? { uri: item.pfp || item.avatar }
                      : require("@/assets/noPfp.jpg")
                  }
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
                <View className="w-full h-8 rounded-full overflow-hidden">
                  <LinearGradient
                    colors={["#5E17EB", "#7C3AED"] as const}
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
      <TouchableOpacity
        onPress={onGoToExplore}
        activeOpacity={0.9}
        className="w-full shadow-lg shadow-[#5E17EB]/40 rounded-full overflow-hidden"
      >
        <LinearGradient
          colors={["#5E17EB", "#9333EA"] as const}
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
        : [...prev, userId],
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
                              source={
                                item.avatar || item.pfp
                                  ? { uri: item.avatar || item.pfp }
                                  : require("@/assets/noPfp.jpg")
                              }
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
              {/* Botones de compartir */}
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

const ViewersModal = ({ visible, onClose, viewerIds }: any) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchViewers = async () => {
      if (!visible || !viewerIds || viewerIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const promises = viewerIds.map((id: string) => getUser(id));
        const results = await Promise.all(promises);
        setUsers(results.filter((u) => u !== null));
      } catch (error) {
        console.log("Error fetching viewers", error);
      } finally {
        setLoading(false);
      }
    };
    fetchViewers();
  }, [visible, viewerIds]);
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-black/50">
          <TouchableWithoutFeedback>
            <View className="bg-[#18181B] rounded-t-[32px] h-[60%] w-full overflow-hidden">
              <View className="w-12 h-1.5 bg-zinc-700 rounded-full self-center mt-4 mb-4" />
              <Text className="text-white text-center font-bold text-lg mb-4 border-b border-zinc-800 pb-4">
                {t("story.seenBy")} {users.length}
              </Text>
              {loading ? (
                <ActivityIndicator
                  color="#5E17EB"
                  size="large"
                  className="mt-10"
                />
              ) : (
                <FlatList
                  data={users}
                  keyExtractor={(item) => item.$id}
                  contentContainerStyle={{ padding: 20 }}
                  ListEmptyComponent={
                    <Text className="text-zinc-500 text-center mt-10">
                      {t("story.noViews")}
                    </Text>
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => {
                        onClose();
                        router.push(`/user/${item.$id}` as any);
                      }}
                      className="flex-row items-center mb-5"
                    >
                      <Image
                        source={
                          item.avatar || item.pfp
                            ? { uri: item.avatar || item.pfp }
                            : require("@/assets/noPfp.jpg")
                        }
                        className="w-12 h-12 rounded-full bg-zinc-800 mr-4"
                      />
                      <View>
                        <Text className="text-white font-bold text-base">
                          {item.username}
                        </Text>
                        {item.name && (
                          <Text className="text-zinc-400 text-xs">
                            {item.name}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

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
  const { t } = useLanguage();
  const myStoriesGroup = groupedStories.find(
    (g) => g.userId === currentUser?.$id,
  );
  const friendsStories = groupedStories.filter(
    (g) => g.userId !== currentUser?.$id,
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
            source={
              currentUser?.pfp
                ? { uri: currentUser.pfp }
                : require("@/assets/noPfp.jpg")
            }
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
        {t("story.yourStory")}
      </Text>
    </TouchableOpacity>
  );
  const MyStoryCircle = ({
    group,
    colors,
  }: {
    group: any;
    colors: string[];
  }) => (
    <TouchableOpacity
      onPress={() => onPressStoryGroup(group)}
      className="items-center mr-5"
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={colors as any}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 1, y: 1 }}
        className="rounded-full p-[2.5px]"
      >
        <View className="bg-black rounded-full p-[2.5px]">
          <Image
            source={
              group.user?.pfp
                ? { uri: group.user?.pfp }
                : require("@/assets/noPfp.jpg")
            }
            className="w-[64px] h-[64px] rounded-full bg-zinc-800"
          />
        </View>
      </LinearGradient>
      <Text
        className="text-[11px] mt-1.5 font-medium text-white w-20 text-center"
        numberOfLines={1}
      >
        {t("story.yourStory")}
      </Text>
    </TouchableOpacity>
  );
  const railData = [
    "add-button",
    ...(myStoriesGroup ? [myStoriesGroup] : []),
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

          let isSeen = false;
          if (item.stories && item.stories.length > 0) {
            isSeen = item.stories.every(
              (s: any) => s.viewers && s.viewers.includes(currentUser?.$id),
            );
          }

          const borderColors = isSeen
            ? ["#3F3F46", "#3F3F46", "#3F3F46"]
            : ["#5E17EB", "#9333EA", "#5E17EB"];

          if (item.userId === currentUser?.$id)
            return <MyStoryCircle group={item} colors={borderColors} />;

          const isOfficialMood = item.userId === MOOD_OFFICIAL_ID;
          const isVerified = item.user?.isVerified || isOfficialMood;
          return (
            <TouchableOpacity
              onPress={() => onPressStoryGroup(item)}
              className="items-center mr-5"
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={borderColors as any}
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
                      source={
                        item.user?.pfp
                          ? { uri: item.user?.pfp }
                          : require("@/assets/noPfp.jpg")
                      }
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
                    size={12}
                    color="#5E17EB"
                    style={{ marginLeft: 2 }}
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

const StoryCreationModal = ({
  visible,
  onClose,
  currentUser,
  onSuccess,
  initialSongData,
}: any) => {
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
    type: "success",
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

    // CORRECCIÓN: ID DE CANCIÓN SEGURO
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

const StoryViewer = ({
  visible,
  onClose,
  group,
  currentUserId,
  onAddMore,
  onRefreshFeed,
}: any) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [liveAudioUrl, setLiveAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(10000);
  const [isPaused, setIsPaused] = useState(false);
  const [viewersModalVisible, setViewersModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [previewViewers, setPreviewViewers] = useState<any[]>([]);
  const [realViewersList, setRealViewersList] = useState<string[]>([]);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const pressStartTime = useRef<number>(0);
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;
  const { t } = useLanguage();

  const currentStory = group?.stories ? group.stories[currentIndex] : null;
  const songData = currentStory ? parseSongData(currentStory.songData) : null;
  const isOwner =
    group?.userId === currentUserId || group?.user?.$id === currentUserId;
  const isOfficialMood = group?.userId === MOOD_OFFICIAL_ID;
  const isVerified = group?.user?.isVerified || isOfficialMood;
  const player = useAudioPlayer(
    isAudioReady && liveAudioUrl ? liveAudioUrl : "",
  );

  // --- LOGICA PANTALLA COMPLETA ---
  const isCustomMedia =
    songData?.mediaType === "image" || songData?.mediaType === "video";

  useEffect(() => {
    const fetchRealViewers = async () => {
      if (currentStory && visible) {
        setRealViewersList(currentStory.viewers || []);
        if (isOwner) {
          try {
            const freshStoryDoc = await databases.getDocument(
              appwriteConfig.databaseId,
              appwriteConfig.storiesCollectionId,
              currentStory.$id,
            );
            if (freshStoryDoc && freshStoryDoc.viewers) {
              setRealViewersList(freshStoryDoc.viewers);
            }
          } catch (e) {
            console.log("Error fetching real-time views", e);
          }
        }
      }
    };
    fetchRealViewers();
  }, [currentStory, visible, isOwner]);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      setProgress(0);
      translateY.setValue(0);
      setIsPaused(false);
      setViewersModalVisible(false);
      setDetailsVisible(false);
      setIsAudioReady(false);
      const enableAudio = async () => {
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });
          setIsAudioReady(true);
        } catch (e) {
          setIsAudioReady(true);
        }
      };
      enableAudio();
    } else {
      setIsAudioReady(false);
    }
  }, [visible, group?.userId]);

  useEffect(() => {
    if (currentStory && currentUserId) {
      setIsSaved(currentStory.savedBy?.includes(currentUserId) || false);
    }
  }, [currentStory, currentUserId]);

  useEffect(() => {
    const fetchPreviewViewers = async () => {
      if (isOwner && realViewersList.length > 0) {
        const idsToFetch = realViewersList.slice(-3).reverse();
        try {
          const fetchedUsers = await Promise.all(
            idsToFetch.map((id: string) => getUser(id)),
          );
          setPreviewViewers(fetchedUsers.filter((u) => u !== null));
        } catch (e) {}
      } else {
        setPreviewViewers([]);
      }
    };
    if (visible && currentStory) {
      fetchPreviewViewers();
    }
  }, [realViewersList, visible, isOwner]);

  useEffect(() => {
    if (isOfficialMood) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoScale, {
            toValue: 1.05,
            duration: 2500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ]),
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1.3,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [isOfficialMood, currentIndex]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true },
  );

  const onHandlerStateChange = ({ nativeEvent }: any) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      if (nativeEvent.translationY > 100) {
        setTimeout(() => onClose(), 0);
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  useEffect(() => {
    const fetchFreshAudio = async () => {
      if (!songData) {
        setLiveAudioUrl(null);
        setDuration(10000);
        return;
      }
      setLiveAudioUrl(null);
      try {
        const trackId = songData.id || songData.spotifyId;
        let url = songData.preview;
        if (trackId) {
          const fetchedUrl = await getDeezerTrackUrl(trackId);
          if (fetchedUrl) url = fetchedUrl;
        }
        setLiveAudioUrl(url);
      } catch (e) {
        setLiveAudioUrl(null);
        setDuration(10000);
      }
    };
    if (visible) {
      fetchFreshAudio();
    }
  }, [currentIndex, visible, group]);

  useEffect(() => {
    if (
      visible &&
      currentStory &&
      currentUserId &&
      !isOwner &&
      !isOfficialMood
    ) {
      viewStory(currentStory.$id, currentUserId, currentStory.viewers || []);
    }
  }, [currentIndex, visible, currentStory]);

  useEffect(() => {
    if (!visible || !currentStory || !isAudioReady) {
      if (player && player.playing) player.pause();
      return;
    }
    if (liveAudioUrl && player) {
      try {
        if (!isPaused && !viewersModalVisible && !detailsVisible) {
          player.play();
          player.loop = false;
        } else {
          player.pause();
        }
      } catch (e) {}
    }
    if (isPaused || viewersModalVisible || detailsVisible) return;
    if (liveAudioUrl && player) {
      const interval = setInterval(() => {
        if (player.playing) {
          const current = player.currentTime;
          const total = player.duration > 0 ? player.duration : 30;
          setProgress((current / total) * 100);
          if (current >= total - 0.2 && total > 0) {
            clearInterval(interval);
            handleNext();
          }
        }
      }, 100);
      return () => clearInterval(interval);
    } else {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            handleNext();
            return 0;
          }
          return prev + 100 / (duration / 100);
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [
    currentIndex,
    visible,
    currentStory,
    player,
    liveAudioUrl,
    isPaused,
    viewersModalVisible,
    detailsVisible,
    duration,
    isAudioReady,
  ]);

  const handleNext = () => {
    if (currentIndex < (group?.stories.length || 0) - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      setTimeout(() => onClose(), 0);
    }
  };

  const handlePrev = () => {
    if (player) {
      try {
        player.seekTo(0);
        player.play();
      } catch (e) {}
    }
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  const handleSave = async () => {
    if (!currentStory || !currentUserId) return;
    const prevSaved = isSaved;
    setIsSaved(!prevSaved);
    try {
      const currentSavedBy = currentStory.savedBy || [];
      let newSavedBy = [...currentSavedBy];
      if (newSavedBy.includes(currentUserId)) {
        newSavedBy = newSavedBy.filter((id) => id !== currentUserId);
      } else {
        newSavedBy.push(currentUserId);
      }
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.storiesCollectionId,
        currentStory.$id,
        { savedBy: newSavedBy },
      );
      currentStory.savedBy = newSavedBy;
    } catch (error) {
      setIsSaved(prevSaved);
      Alert.alert(t("common.error"), t("story.saveError"));
    }
  };

  const handleShareSong = async () => {
    try {
      await SystemShare.share({
        message: `🎵 ${t("story.sharingMsg")} "${songData.title}" - ${
          songData.artist
        } on Mood.`,
      });
    } catch (error) {
      console.log("Error sharing:", error);
    }
  };

  const handleDeleteStory = async () => {
    setIsPaused(true);
    Alert.alert(t("story.deleteTitle"), t("story.deleteConfirm"), [
      {
        text: t("common.cancel"),
        style: "cancel",
        onPress: () => setIsPaused(false),
      },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await databases.deleteDocument(
              appwriteConfig.databaseId,
              appwriteConfig.storiesCollectionId,
              currentStory.$id,
            );
            const updatedStories = group.stories.filter(
              (s: any) => s.$id !== currentStory.$id,
            );
            if (updatedStories.length > 0) {
              group.stories = updatedStories;
              if (currentIndex >= updatedStories.length)
                setCurrentIndex(updatedStories.length - 1);
              setIsPaused(false);
            } else {
              setTimeout(() => onClose(), 0);
              if (onRefreshFeed) onRefreshFeed();
            }
          } catch (error) {
            Alert.alert(t("common.error"), t("story.deleteError"));
            setIsPaused(false);
          }
        },
      },
    ]);
  };

  if (!visible || !currentStory || !songData) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={() => setTimeout(onClose, 0)}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: "black" }}>
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
            activeOffsetY={[-10, 10]}
            failOffsetX={[-5, 5]}
          >
            <Animated.View
              style={{
                flex: 1,
                transform: [
                  {
                    translateY: translateY.interpolate({
                      inputRange: [0, 500],
                      outputRange: [0, 500],
                      extrapolateLeft: "clamp",
                    }),
                  },
                ],
              }}
            >
              {/* --- LÓGICA DE RENDERIZADO VISUAL --- */}
              {isCustomMedia ? (
                <View className="absolute w-full h-full bg-black">
                  <Image
                    source={{ uri: songData.cover }}
                    className="w-full h-full"
                    resizeMode="cover" // AHORA ES 'cover' PARA FULLSCREEN REAL
                  />
                </View>
              ) : isOfficialMood ? (
                <View className="absolute w-full h-full bg-black overflow-hidden">
                  <Animated.Image
                    source={require("@/assets/images/icon.png")}
                    style={{
                      position: "absolute",
                      width: "150%",
                      height: "150%",
                      top: "-25%",
                      left: "-25%",
                      opacity: 0.6,
                      transform: [{ scale: glowAnim }],
                    }}
                    blurRadius={100}
                  />
                  <LinearGradient
                    colors={["#4F089A", "transparent", "#000000"] as const}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    className="absolute w-full h-full opacity-80"
                  />
                </View>
              ) : (
                <View className="absolute w-full h-full">
                  <Image
                    source={{ uri: songData.cover }}
                    className="absolute w-full h-full opacity-60"
                    blurRadius={40}
                  />
                  <LinearGradient
                    colors={
                      [
                        "rgba(0,0,0,0.6)",
                        "transparent",
                        "transparent",
                        "rgba(0,0,0,0.9)",
                      ] as const
                    }
                    locations={[0, 0.2, 0.7, 1]}
                    className="absolute w-full h-full"
                  />
                </View>
              )}
              <View
                className="flex-1 justify-between relative"
                style={{
                  paddingTop: insets.top > 0 ? insets.top : 40,
                  paddingBottom: insets.bottom,
                }}
              >
                <View
                  className="absolute w-full h-full flex-row z-10"
                  pointerEvents="box-none"
                >
                  <Pressable
                    className="h-full w-[30%]"
                    onPress={() => {
                      if (Date.now() - pressStartTime.current < 200)
                        handlePrev();
                    }}
                    onPressIn={() => {
                      pressStartTime.current = Date.now();
                      setIsPaused(true);
                    }}
                    onPressOut={() => setIsPaused(false)}
                  />
                  <Pressable
                    className="h-full w-[70%]"
                    onPress={() => {
                      if (Date.now() - pressStartTime.current < 200)
                        handleNext();
                    }}
                    onPressIn={() => {
                      pressStartTime.current = Date.now();
                      setIsPaused(true);
                    }}
                    onPressOut={() => setIsPaused(false)}
                  />
                </View>
                <View pointerEvents="box-none" className="pt-2 z-20 px-2">
                  <View className="flex-row gap-1 px-1 mb-4">
                    {group.stories.map((_: any, index: number) => (
                      <View
                        key={index}
                        className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden"
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
                  <View className="flex-row items-center justify-between px-2">
                    <View className="flex-row items-center gap-3">
                      <Image
                        source={
                          isOfficialMood
                            ? require("@/assets/images/icon.png")
                            : group.user?.pfp
                              ? { uri: group.user?.pfp }
                              : require("@/assets/noPfp.jpg")
                        }
                        className="w-10 h-10 rounded-full border border-white/20"
                      />
                      <View>
                        <View className="flex-row items-center">
                          <Text className="text-white font-bold text-[15px] leading-4 mr-1 shadow-sm">
                            {group.user?.name || group.user?.username}
                          </Text>
                          {isVerified && (
                            <MaterialIcons
                              name="verified"
                              size={16}
                              color="#5E17EB"
                              style={{ marginLeft: 4 }}
                            />
                          )}
                          <Text className="text-zinc-400 text-xs ml-2 font-medium">
                            {formatTimeAgo(currentStory.$createdAt)}
                          </Text>
                        </View>
                        <Text className="text-white/70 text-xs font-medium">
                          {t("story.moodStory")}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-4">
                      {isOwner && (
                        <TouchableOpacity
                          onPress={handleDeleteStory}
                          className="p-1"
                        >
                          <Ionicons
                            name="trash-outline"
                            size={22}
                            color="white"
                          />
                        </TouchableOpacity>
                      )}
                      {isOwner && (
                        <TouchableOpacity
                          onPress={() => {
                            setTimeout(() => onClose(), 0);
                            setTimeout(onAddMore, 300);
                          }}
                          className="bg-white/10 p-2 rounded-full backdrop-blur-md border border-white/5"
                        >
                          <Ionicons name="add" size={24} color="white" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => setTimeout(onClose, 0)}
                        className="p-1"
                      >
                        <Ionicons name="close" size={28} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                <View
                  className="flex-1 justify-center items-center px-8 z-0"
                  pointerEvents="none"
                >
                  {isCustomMedia ? null : isOfficialMood ? (
                    <View className="items-center justify-center w-full">
                      <Animated.View
                        style={{
                          transform: [
                            {
                              translateY: logoScale.interpolate({
                                inputRange: [1, 1.05],
                                outputRange: [0, -15],
                              }),
                            },
                          ],
                          zIndex: 1,
                        }}
                      >
                        <Image
                          source={require("@/assets/images/icon.png")}
                          style={{ width: 140, height: 140, borderRadius: 35 }}
                          resizeMode="contain"
                        />
                      </Animated.View>
                      <Animated.View
                        style={{
                          opacity: fadeAnim,
                          transform: [{ translateY: slideAnim }],
                          marginTop: 50,
                          zIndex: 1,
                        }}
                      >
                        <Text
                          className="text-white font-black text-5xl text-center tracking-tighter leading-tight"
                          style={{
                            textShadowColor: "#5E17EB",
                            textShadowOffset: { width: 0, height: 0 },
                            textShadowRadius: 20,
                          }}
                        >
                          {t("story.official.title")}
                        </Text>
                      </Animated.View>
                      <Animated.View
                        style={{
                          opacity: fadeAnim,
                          transform: [{ translateY: slideAnim }],
                          marginTop: 20,
                          zIndex: 1,
                        }}
                      >
                        <Text className="text-zinc-300 text-center text-xl font-light tracking-widest uppercase">
                          {t("story.official.subtitle")}
                        </Text>
                      </Animated.View>
                    </View>
                  ) : (
                    <>
                      <Image
                        source={{ uri: songData.cover }}
                        style={{ width: width - 60, height: width - 60 }}
                        className="rounded-2xl"
                        resizeMode="cover"
                      />
                      <View className="items-center w-full mt-8">
                        <Text
                          className="text-white font-black text-center text-3xl mb-2 leading-8"
                          style={{
                            textShadowColor: "rgba(0,0,0,0.5)",
                            textShadowOffset: { width: 0, height: 2 },
                            textShadowRadius: 4,
                          }}
                        >
                          {songData.title}
                        </Text>
                        <Text
                          className="text-white/80 font-bold text-center text-lg mb-6"
                          style={{
                            textShadowColor: "rgba(0,0,0,0.5)",
                            textShadowOffset: { width: 0, height: 1 },
                            textShadowRadius: 3,
                          }}
                        >
                          {songData.artist}
                        </Text>
                        {songData.caption && (
                          <Text className="text-white font-medium text-center text-base mb-6 px-4 leading-6 shadow-sm">
                            "{songData.caption}"
                          </Text>
                        )}
                      </View>
                    </>
                  )}
                </View>
                <View className="px-4 pb-6 z-20 w-full flex-row items-center justify-between">
                  {isOwner ? (
                    <TouchableOpacity
                      onPress={() => {
                        setIsPaused(true);
                        setViewersModalVisible(true);
                      }}
                      activeOpacity={0.8}
                      style={{ zIndex: 999 }} // Aseguramos que sea clickeable
                      className="flex-row items-center bg-black/40 px-4 py-2.5 rounded-full border border-white/10 backdrop-blur-md"
                    >
                      <View className="flex-row mr-2 items-center">
                        {previewViewers.length > 0 ? (
                          previewViewers.slice(0, 3).map((v, i) => (
                            <Image
                              key={i}
                              source={
                                v.pfp || v.avatar
                                  ? { uri: v.pfp || v.avatar }
                                  : require("@/assets/noPfp.jpg")
                              }
                              className="w-6 h-6 rounded-full border border-black bg-zinc-700"
                              style={{
                                marginLeft: i === 0 ? 0 : -10,
                                zIndex: 3 - i,
                              }}
                            />
                          ))
                        ) : (
                          <View className="w-6 h-6 rounded-full bg-zinc-700 border border-black items-center justify-center">
                            <Ionicons name="eye" size={12} color="white" />
                          </View>
                        )}
                      </View>
                      <Text className="text-white font-bold text-sm ml-2">
                        {/* USAMOS LA LISTA REAL */}
                        {realViewersList.length} {t("story.views")}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    !isOfficialMood && (
                      <View className="flex-1 flex-row items-center gap-3">
                        <View className="flex-1 h-12 rounded-full border border-white/20 px-5 justify-center bg-black/30 backdrop-blur-md">
                          <TextInput
                            placeholder={t("story.replyPlaceholder")}
                            placeholderTextColor="rgba(255,255,255,0.6)"
                            className="text-white font-medium text-base"
                          />
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            setIsPaused(true);
                            setDetailsVisible(true);
                          }}
                          className="bg-black/30 p-3 rounded-full border border-white/20 backdrop-blur-md"
                        >
                          <Ionicons
                            name="disc-outline"
                            size={24}
                            color="white"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity className="bg-black/30 p-3 rounded-full border border-white/20 backdrop-blur-md">
                          <Ionicons
                            name="heart-outline"
                            size={24}
                            color="white"
                          />
                        </TouchableOpacity>
                      </View>
                    )
                  )}
                </View>
              </View>
            </Animated.View>
          </PanGestureHandler>
        </View>

        <ViewersModal
          visible={viewersModalVisible}
          onClose={() => {
            setViewersModalVisible(false);
            setIsPaused(false);
          }}
          viewerIds={realViewersList}
        />

        <Modal
          animationType="slide"
          transparent={true}
          visible={detailsVisible}
          onRequestClose={() => {
            setDetailsVisible(false);
            setIsPaused(false);
          }}
        >
          <TouchableWithoutFeedback
            onPress={() => {
              setDetailsVisible(false);
              setIsPaused(false);
            }}
          >
            <View className="flex-1 justify-end bg-black/60">
              <TouchableWithoutFeedback>
                <View className="bg-[#1E1E1E] w-full rounded-t-[32px] p-6 pb-12 border-t border-white/10 shadow-2xl">
                  <View className="w-12 h-1 bg-zinc-600 rounded-full self-center mb-6 opacity-50" />
                  <View className="flex-row items-center">
                    <Image
                      source={{ uri: songData.cover }}
                      className="w-24 h-24 rounded-2xl bg-zinc-800"
                    />
                    <View className="flex-1 ml-5">
                      <Text className="text-white font-black text-2xl mb-1 leading-7">
                        {songData.title}
                      </Text>
                      <Text className="text-zinc-400 text-lg font-medium">
                        {songData.artist}
                      </Text>
                      <View className="flex-row items-center mt-3">
                        <Ionicons
                          name="musical-notes"
                          size={14}
                          color="#5E17EB"
                        />
                        <Text className="text-[#5E17EB] text-xs font-bold ml-1 uppercase tracking-widest">
                          Mood Track
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View className="mt-8 flex-row gap-4">
                    <TouchableOpacity
                      onPress={handleSave}
                      className="flex-1 bg-white/5 py-4 rounded-2xl flex-row items-center justify-center border border-white/5 active:bg-white/10"
                    >
                      <Ionicons
                        name={isSaved ? "heart" : "heart-outline"}
                        size={22}
                        color={isSaved ? "#EF4444" : "white"}
                        style={{ marginRight: 8 }}
                      />
                      <Text className="text-white font-bold text-base">
                        {isSaved ? t("common.saved") : t("common.save")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleShareSong}
                      className="flex-1 bg-[#5E17EB] py-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-purple-900/50 active:opacity-90"
                    >
                      <Ionicons
                        name="share-social"
                        size={22}
                        color="white"
                        style={{ marginRight: 8 }}
                      />
                      <Text className="text-white font-bold text-base">
                        {t("common.share")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </GestureHandlerRootView>
    </Modal>
  );
};

// ==========================================
// COMPONENTE HOME CONTENT CON ALGORITMO MEJORADO (SMART SHUFFLE & INFINITE SCROLL)
// ==========================================
const HomeContent = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();
  const { user } = useGlobalContext();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();

  const {
    feed,
    isLoading: isFeedLoading,
    isRefreshing,
    refreshFeed,
  } = useFeed();

  // --- NUEVO ESTADO PARA EL ALGORITMO ---
  const [sortedFeed, setSortedFeed] = useState<FeedItem[]>([]);
  const [myFollowedIds, setMyFollowedIds] = useState<string[]>([]);
  const [poolOfContent, setPoolOfContent] = useState<FeedItem[]>([]); // Pool para re-shuffle infinito

  const [localData, setLocalData] = useState<{
    groupedStories: any[];
    suggestedUsers: any[];
    notiCount: number;
    msgCount: number;
  }>({
    groupedStories: [],
    suggestedUsers: [],
    notiCount: 0,
    msgCount: 0,
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Estados de Modales
  const [shareContacts, setShareContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isViralModalVisible, setViralModalVisible] = useState(false);
  const [isShareVisible, setShareVisible] = useState(false);
  const [isShareSelectorVisible, setShareSelectorVisible] = useState(false);
  const [isStoryViewerVisible, setStoryViewerVisible] = useState(false);
  const [isCreationVisible, setCreationVisible] = useState(false);
  const [isOptionsVisible, setOptionsVisible] = useState(false);
  const [isCreatorModalVisible, setCreatorModalVisible] = useState(false);

  const [activeStoryGroup, setActiveStoryGroup] = useState(null);
  const [postToShareData, setPostToShareData] = useState<any>(null);
  const [sharePostId, setSharePostId] = useState<string>("");
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [storyInitialSongData, setStoryInitialSongData] = useState<any>(null);

  const flatListRef = useRef<FlatList>(null);
  const chatTranslateX = useRef(new Animated.Value(width)).current;
  const [isChatOpen, setIsChatOpen] = useState(false);

  // --- DEFINIR onRefresh Y fetchAuxiliaryData PRIMERO ---

  const fetchAuxiliaryData = useCallback(async () => {
    try {
      let activeId = user?.$id || currentUserId;
      if (!activeId) {
        const u = await getCurrentUser();
        if (u) {
          activeId = u.$id;
          setCurrentUserId(u.$id);
        }
      }
      if (activeId) {
        // --- MODIFICACIÓN CLAVE PARA VISIBILIDAD GLOBAL ---
        // 1. Buscamos las historias del usuario OFICIAL (Mood Team)
        const officialStoriesRes = await databases
          .listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.storiesCollectionId,
            [Query.equal("user", MOOD_OFFICIAL_ID)],
          )
          .catch(() => ({ documents: [] }));

        const officialDocs = officialStoriesRes.documents;

        // 2. Buscamos las historias normales de seguidos + mías
        const myStories = await fetchStoriesInternal(activeId);

        // 3. Fusionamos: Oficiales primero + Resto
        // (La lógica de fetchStoriesInternal ya devuelve grupos, así que insertamos el grupo oficial si existe)
        // Nota: fetchStoriesInternal ya debería traer todo si sigues al Mood Team, pero para forzar visibilidad:

        // Convertimos a array si no lo es, y aseguramos que el oficial esté.
        // Como fetchStoriesInternal ya retorna grupos, podemos buscar si ya existe el grupo oficial.
        const officialGroupIndex = myStories.findIndex(
          (g) => g.userId === MOOD_OFFICIAL_ID,
        );

        if (officialDocs.length > 0) {
          // Si el usuario oficial tiene historias
          const officialGroup = {
            userId: MOOD_OFFICIAL_ID,
            user: {
              $id: MOOD_OFFICIAL_ID,
              username: "Mood",
              name: "Mood Team",
              pfp: null,
              isVerified: true,
            },
            stories: officialDocs,
          };

          if (officialGroupIndex !== -1) {
            // Si ya estaba (porque lo sigues), lo actualizamos y movemos al inicio
            myStories.splice(officialGroupIndex, 1);
            myStories.unshift(officialGroup);
          } else {
            // Si no estaba, lo agregamos al principio
            myStories.unshift(officialGroup);
          }
        }

        // Si el usuario actual tiene historia, la ponemos PRIMERA siempre (sobreescribe la oficial en posición 0)
        const myGroupIndex = myStories.findIndex((g) => g.userId === activeId);
        if (myGroupIndex !== -1 && myGroupIndex !== 0) {
          const myGroup = myStories.splice(myGroupIndex, 1)[0];
          myStories.unshift(myGroup);
        }

        setLocalData((prev) => ({
          ...prev,
          groupedStories: myStories,
        }));

        // Cargar notificaciones y mensajes
        const counts = await fetchCounts(activeId);
        setLocalData((prev) => ({
          ...prev,
          notiCount: counts.noti,
          msgCount: counts.msg,
        }));
      }
    } catch (e) {
      console.log(e);
    }
  }, [user, currentUserId]);

  const onRefresh = useCallback(() => {
    refreshFeed();
    fetchAuxiliaryData();
  }, [refreshFeed, fetchAuxiliaryData]);

  // Usamos useEffect para que SIEMPRE cargue al entrar a la pantalla cuando el usuario esté listo
  useEffect(() => {
    if (user) {
      fetchAuxiliaryData();
    }
  }, [user, fetchAuxiliaryData]);

  // Cargamos también al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      if (user) fetchAuxiliaryData();
    }, [user, fetchAuxiliaryData]),
  );

  // --- LÓGICA DE UPLOAD DE HISTORIA (MODIFICADA PARA MOOD TEAM) ---
  const handleAddStoryPress = () => {
    if (user?.$id === MOOD_OFFICIAL_ID) {
      setCreatorModalVisible(true);
    } else {
      setStoryInitialSongData(null);
      setCreationVisible(true);
    }
  };

  const handleMoodMediaPick = async () => {
    // 1. Cerramos el modal PRIMERO
    setCreatorModalVisible(false);

    // 2. Esperamos un poco para que el modal se anime y cierre (evita conflicto iOS)
    setTimeout(async () => {
      if (!user) return; // Validación TypeScript

      // --- PERMISOS DE iOS ---
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permiso denegado",
          "Necesitamos acceso a la galería para subir historias.",
        );
        return;
      }

      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All, // CORREGIDO A MediaTypeOptions
          allowsEditing: false, // IMPORTANTE: False para mantener pantalla completa original
          quality: 1,
        });

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];

          // --- SUBIDA REAL A APPWRITE STORAGE ---
          // Mostramos indicador de carga o toast simple
          Alert.alert(
            "Subiendo",
            "Tu historia se está subiendo en segundo plano...",
          );

          // AQUI ADAPTAMOS EL OBJETO A LO QUE ESPERA 'appwrite.ts'
          const file = {
            fileName: asset.fileName || `story_${Date.now()}.jpg`,
            mimeType: asset.type === "video" ? "video/mp4" : "image/jpeg",
            uri: asset.uri,
            fileSize: asset.fileSize || 0,
          };

          // Subir archivo
          const uploadedFile = await uploadFile(file); // Usamos la función importada de appwrite.ts

          if (!uploadedFile) throw new Error("Fallo la subida");

          const songData = JSON.stringify({
            title: "Mood Update",
            artist: "Mood Team",
            cover: uploadedFile, // URL REAL DE APPWRITE
            preview: "",
            spotifyId: "mood_custom_" + Date.now(),
            caption: "",
            mediaType: asset.type, // 'image' o 'video'
          });

          await createStory(songData, user.$id);
          fetchAuxiliaryData();
          Alert.alert("Éxito", "Historia publicada");
        }
      } catch (e) {
        console.log("Error picking/uploading media", e);
        Alert.alert("Error", "No se pudo subir la imagen.");
      }
    }, 500); // 500ms de retraso
  };

  // --- 1. OBTENER USUARIOS SEGUIDOS ---
  useEffect(() => {
    const fetchFollows = async () => {
      if (user?.$id) {
        try {
          const ids = await getFollowedUserIds(user.$id);
          setMyFollowedIds(ids);
        } catch (e) {
          console.log("Error fetching follows", e);
        }
      }
    };
    fetchFollows();
  }, [user]);

  // --- 2. ALGORITMO DE ORDENAMIENTO & SHUFFLE ---
  useEffect(() => {
    if (!feed || feed.length === 0) {
      setSortedFeed([]);
      return;
    }

    const priorityPosts: FeedItem[] = []; // Seguidos Recientes No Vistos
    const discoveryPosts: FeedItem[] = []; // Otros Recientes No Vistos
    const generalPool: FeedItem[] = []; // Viejos, Vistos, Random
    const otherItems: FeedItem[] = []; // Elementos no-post

    const FRESHNESS_THRESHOLD = 48 * 60 * 60 * 1000;
    const now = Date.now();

    feed.forEach((item) => {
      if (item.type !== "post") {
        otherItems.push(item);
        return;
      }

      const post = item.data;
      const creatorId =
        post.creator?.$id ||
        post.postedBy?.$id ||
        post.users?.[0]?.$id ||
        post.userId;
      const isMyPost = creatorId === user?.$id;
      const postDate = new Date(post.$createdAt || 0).getTime();
      const isRecent = now - postDate < FRESHNESS_THRESHOLD;

      const hasInteracted =
        (post.likedBy && post.likedBy.includes(user?.$id)) ||
        (post.savedBy && post.savedBy.includes(user?.$id));

      if (isRecent && !hasInteracted) {
        if (myFollowedIds.includes(creatorId) || isMyPost) {
          priorityPosts.push(item);
        } else {
          discoveryPosts.push(item);
        }
      } else {
        // Todo lo demás va al pool general para ser mezclado
        generalPool.push(item);
      }
    });

    const sortByDate = (a: FeedItem, b: FeedItem) => {
      const dateA = new Date(a.data.$createdAt || 0).getTime();
      const dateB = new Date(b.data.$createdAt || 0).getTime();
      return dateB - dateA;
    };

    // Ordenar prioridades por fecha
    priorityPosts.sort(sortByDate);
    discoveryPosts.sort(sortByDate);

    // Guardar el pool general y elementos especiales para re-shuffle infinito
    // Mezclamos el pool general de entrada
    const shuffledGeneralPool = shuffleArray(generalPool);

    // Construir Feed Inicial
    // 1. Prioridad (Seguidos)
    // 2. Discovery (Nuevos de otros)
    // 3. Pool mezclado
    let initialFeed = [
      ...priorityPosts,
      ...discoveryPosts,
      ...shuffledGeneralPool,
    ];

    // INYECTAR ELEMENTOS NO-POST DE FORMA ALEATORIA
    // A partir del índice 2 para no romper la prioridad inicial
    if (otherItems.length > 0) {
      const shuffledOthers = shuffleArray(otherItems);
      shuffledOthers.forEach((item) => {
        const currentLength = initialFeed.length;
        const minIndex = 2;
        if (currentLength < 2) {
          initialFeed.push(item);
        } else {
          const maxIndex = currentLength;
          const randomIndex =
            Math.floor(Math.random() * (maxIndex - minIndex + 1)) + minIndex;
          initialFeed.splice(randomIndex, 0, item);
        }
      });
    }

    setSortedFeed(initialFeed);

    // Guardamos una copia limpia de todo lo "mezclable" para el scroll infinito
    setPoolOfContent([
      ...priorityPosts,
      ...discoveryPosts,
      ...generalPool,
      ...otherItems,
    ]);
  }, [feed, myFollowedIds, user]);

  // --- 3. SCROLL INFINITO (RECICLAJE ALEATORIO) ---
  const handleLoadMore = () => {
    if (poolOfContent.length === 0) return;

    // Tomamos una copia de todo el contenido, lo mezclamos de nuevo
    const recycledBatch = shuffleArray([...poolOfContent]);

    // Para simular "más contenido", tomamos un subconjunto aleatorio (ej: 10 items)
    // O simplemente todo el batch reordenado
    const newItems = recycledBatch
      .slice(0, 15)
      .map((item) => ({ ...item, _id: item._id + Math.random() })); // Hack ID para que FlatList no se queje de duplicados

    setSortedFeed((prev) => [...prev, ...newItems]);
  };

  const openChat = () => {
    setIsChatOpen(true);
    Animated.spring(chatTranslateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 14,
    }).start();
  };
  const closeChat = () => {
    setIsChatOpen(false);
    Animated.timing(chatTranslateX, {
      toValue: width,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    const onBackPress = () => {
      if (isChatOpen) {
        closeChat();
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => subscription.remove();
  }, [isChatOpen]);

  // --- 4. REALTIME SUSCRIPCIÓN (ICONOS TOPBAR) ---
  useEffect(() => {
    if (!user?.$id) return;

    const unsubscribe = client.subscribe(
      [
        `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.notificationsCollectionId}.documents`,
        `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`,
        `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.chatsCollectionId}.documents`,
      ],
      (response) => {
        // Si hay creación o actualización en estas colecciones, refrescamos contadores
        if (
          response.events.some(
            (e) => e.includes("create") || e.includes("update"),
          )
        ) {
          fetchCounts(user.$id).then((counts) => {
            setLocalData((prev) => ({
              ...prev,
              notiCount: counts.noti,
              msgCount: counts.msg,
            }));
          });
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, [user?.$id]);

  // --- 5. LOGICA DEL BOTÓN HOME (SCROLL UP + REFRESH) ---
  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", (e: any) => {
      if (navigation.isFocused()) {
        // Si ya está enfocado (es decir, el usuario tocó el tab de nuevo)
        // 1. Evitar comportamiento por defecto para manejarlo nosotros
        e.preventDefault();
        // 2. Scroll arriba
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        // 3. Refrescar todo
        onRefresh();
      }
    });
    return unsubscribe;
  }, [navigation, onRefresh]);

  // Helpers internos para fetch
  const fetchCounts = async (userId: string) => {
    try {
      const [n, m] = await Promise.all([
        getUnreadNotificationCount(userId),
        getUnreadMessagesCount(userId),
      ]);
      return { noti: n, msg: m };
    } catch {
      return { noti: 0, msg: 0 };
    }
  };
  const fetchStoriesInternal = async (userId: string) => {
    try {
      // 1. OBTENER HISTORIAS DE MOOD TEAM (GLOBALES)
      const officialStoriesRes = await databases
        .listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.storiesCollectionId,
          [Query.equal("user", MOOD_OFFICIAL_ID)],
        )
        .catch(() => ({ documents: [] }));

      const officialDocs = officialStoriesRes.documents;

      // 2. OBTENER HISTORIAS DE SEGUIDOS (NORMAL)
      const storiesDocs = await getStories(userId); // Esto ya trae las de seguidos

      // 3. MERGE (Oficiales + Seguidos) - Eliminando duplicados si ya sigues a Mood Team
      const allDocs = [...officialDocs, ...storiesDocs].filter(
        (doc, index, self) =>
          index === self.findIndex((t) => t.$id === doc.$id),
      );

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentStories = allDocs.filter(
        (doc: any) => new Date(doc.$createdAt) > oneDayAgo,
      );

      // --- LOGICA DE AGRUPACIÓN (IGUAL QUE ANTES) ---
      const uniqueUserIds = new Set<string>();
      const userMap = new Map<string, any>();
      if (user) userMap.set(userId, user);

      // Pre-cargar datos del Mood Team si no vienen
      if (officialDocs.length > 0) {
        // Si no tenemos la data del usuario Mood Team, la "mockeamos" o buscamos
        // En este caso asumimos que getStories trae el objeto user expandido.
      }

      recentStories.forEach((doc: any) => {
        if (doc.user && typeof doc.user === "string" && doc.user !== userId) {
          uniqueUserIds.add(doc.user);
        }
      });
      const idsToFetch = Array.from(uniqueUserIds).filter(
        (id) => !userMap.has(id),
      );
      if (idsToFetch.length > 0) {
        await Promise.all(
          idsToFetch.map(async (id) => {
            try {
              const u = await getUser(id);
              if (u) userMap.set(id, u);
            } catch (e) {}
          }),
        );
      }
      const groups: Record<string, any> = {};
      recentStories.forEach((doc: any) => {
        let docUserId = null;
        let docUserData = null;
        if (typeof doc.user === "object" && doc.user.$id) {
          docUserId = doc.user.$id;
          docUserData = doc.user;
        } else if (typeof doc.user === "string") {
          docUserId = doc.user;
          docUserData = userMap.get(docUserId);
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
      });

      // ORDENAR: MOOD TEAM PRIMERO
      let groupList = Object.values(groups);
      groupList.sort((a: any, b: any) => {
        if (a.userId === MOOD_OFFICIAL_ID) return -1;
        if (b.userId === MOOD_OFFICIAL_ID) return 1;
        return 0;
      });

      return groupList;
    } catch (e) {
      return [];
    }
  };

  const handleDeleteAction = () => {
    if (!selectedPost) return;
    setOptionsVisible(false);
    deletePost(selectedPost.$id).then(() => onRefresh());
  };
  const handleReportAction = () => {
    setOptionsVisible(false);
    Alert.alert("Reportado", "Gracias.");
  };

  const openOptions = (post: any) => {
    setSelectedPost(post);
    setOptionsVisible(true);
  };
  const openShare = async (post: any) => {
    setPostToShareData(post);
    setSharePostId(post.$id);
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
      const f = await getFollowedUserIds(userId);
      const promises = f.map((id) => getUser(id));
      return (await Promise.all(promises)).filter((u) => u !== null);
    } catch {
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
          ],
        )
      ).documents;
    } catch (error) {
      return [];
    }
  };
  const handleSendShare = async (userIds: string[], message: string) => {
    if (!user?.$id || !postToShareData) return;
    try {
      const promises = userIds.map(async (targetId) => {
        const chatDoc = await getOrCreateChat(user.$id, targetId);
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
          },
        );
      });
      await Promise.all(promises);
      Alert.alert("Enviado", "El post se ha compartido correctamente.");
    } catch (error) {
      Alert.alert("Error", "No se pudo compartir el post.");
    }
    setShareSelectorVisible(false);
  };
  const handleAddToStoryFromPost = async () => {
    if (!postToShareData) return;
    const songData = parseSongData(postToShareData.songData);
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
    Alert.alert(
      "Enlace copiado",
      "El enlace al post ha sido copiado al portapapeles.",
    );
    setShareSelectorVisible(false);
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

  const isPostOwner =
    user?.$id === (selectedPost?.postedBy?.$id || selectedPost?.creator?.$id);
  const isAdmin = ADMIN_USERS.includes(user?.username || "");

  const renderFeedItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      switch (item.type) {
        case "post":
          return (
            <View
              className={`py-4 border-b ${
                isDark ? "border-zinc-800" : "border-zinc-200"
              }`}
            >
              {item.status === "uploading" && (
                <View className="px-5 mb-2 flex-row items-center">
                  <ActivityIndicator size="small" color="#5E17EB" />
                  <Text
                    className={`ml-2 text-xs ${
                      isDark ? "text-zinc-400" : "text-zinc-600"
                    }`}
                  >
                    Publicando en Mood...
                  </Text>
                </View>
              )}
              {item.status === "error" && (
                <View className="px-5 mb-2 bg-red-500/10 p-2 rounded-lg mx-4">
                  <Text className="text-red-500 text-xs font-bold text-center">
                    Falló la subida. Toca para reintentar.
                  </Text>
                </View>
              )}
              <PostItem
                post={item.data}
                currentUserId={user?.$id || ""}
                onProfilePress={(userId) =>
                  router.push(`/user/${userId}` as any)
                }
                onCommentPress={(postId) =>
                  router.push(`/post/${postId}` as any)
                }
                onOptionsPress={() => openOptions(item.data)}
                onSharePress={() => openShare(item.data)}
              />
            </View>
          );
        case "suggested_users":
          return <SuggestedUsersCarousel users={item.data} />;
        case "trending_song":
          return <TrendingSongCard song={item.data} />;
        default:
          return null;
      }
    },
    [isDark, user],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: isDark ? "#000" : "#fff" }}>
        {/* VISTA PRINCIPAL (HOME) */}
        <View style={{ flex: 1, zIndex: 0 }}>
          <SafeAreaView
            className="flex-1"
            edges={["top"]}
            style={{ backgroundColor: isDark ? "#000000" : "#FFFFFF" }}
          >
            {/* HEADER CUSTOM (Sin TopBar para cumplir tu diseño limpio) */}
            <View className="flex-row justify-between items-center px-5 py-3 border-b border-transparent">
              <View className="h-[40px] w-[80px] justify-center">
                <Image
                  source={require("@/assets/fullLogo.png")}
                  resizeMode="contain"
                  className="w-full h-full"
                  style={{ tintColor: isDark ? undefined : "#5E17EB" }}
                />
              </View>
              <View className="flex-row items-center gap-4">
                {/* ICONO NOTIFICACIONES */}
                <TouchableOpacity
                  onPress={() => router.push("/notifications" as any)}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={26}
                    color={isDark ? "#5E17EB" : "black"}
                  />
                  {localData.notiCount > 0 && (
                    <View className="absolute top-0 right-0 bg-red-500 w-3 h-3 rounded-full border border-black" />
                  )}
                </TouchableOpacity>

                {/* ICONO CHAT */}
                <TouchableOpacity onPress={openChat} className="relative">
                  <Ionicons
                    name="chatbubble-outline"
                    size={26}
                    color={isDark ? "#5E17EB" : "black"}
                  />
                  {localData.msgCount > 0 && (
                    <View className="absolute top-[-2px] right-[-2px] bg-red-500 w-4 h-4 rounded-full items-center justify-center border border-black">
                      <Text className="text-white text-[9px] font-bold">
                        {localData.msgCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* 🔥 USA sortedFeed EN LUGAR DE feed 🔥 */}
            {isFeedLoading ? (
              <FeedSkeleton isDark={isDark} />
            ) : (
              <FlatList
                ref={flatListRef}
                data={sortedFeed}
                keyExtractor={(item) => item._id}
                renderItem={renderFeedItem}
                ListHeaderComponent={
                  <StoriesRail
                    currentUser={user}
                    groupedStories={localData.groupedStories}
                    onPressStoryGroup={(g: any) => {
                      setActiveStoryGroup(g);
                      setStoryViewerVisible(true);
                    }}
                    onAddStory={handleAddStoryPress} // Usa la nueva función
                  />
                }
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={onRefresh}
                    tintColor="#5E17EB"
                  />
                }
                // PROPS PARA SCROLL INFINITO
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                initialNumToRender={4}
                windowSize={5}
                removeClippedSubviews={Platform.OS === "android"}
                ListEmptyComponent={
                  <EmptyStateWithSuggestions
                    suggestions={[]}
                    onGoToExplore={() => router.push("/explore" as any)}
                  />
                }
              />
            )}
            {/* MODALES DEL HOME */}
            <PostModal />
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
              onSuccess={() => fetchAuxiliaryData()}
              initialSongData={storyInitialSongData}
            />
            <CreatorModal
              visible={isCreatorModalVisible}
              onClose={() => setCreatorModalVisible(false)}
              onMusic={() => {
                setCreatorModalVisible(false);
                setTimeout(() => {
                  setStoryInitialSongData(null);
                  setCreationVisible(true);
                }, 300);
              }}
              onGallery={handleMoodMediaPick}
            />
            <StoryViewer
              visible={isStoryViewerVisible}
              onClose={() => {
                setStoryViewerVisible(false);
                fetchAuxiliaryData();
              }}
              group={activeStoryGroup}
              currentUserId={user?.$id || currentUserId}
              onAddMore={() => {
                setStoryInitialSongData(null);
                setCreationVisible(true);
              }}
              onRefreshFeed={() => fetchAuxiliaryData()}
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
        </View>

        {/* OVERLAY DE CHATS (ANIMATED VIEW) */}
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: width,
            height: height,
            zIndex: 100,
            backgroundColor: isDark ? "#000" : "#fff",
            transform: [{ translateX: chatTranslateX }],
            shadowColor: "#000",
            shadowOffset: { width: -5, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 15,
            elevation: 20,
          }}
        >
          <ChatsList onBackPress={closeChat} />
        </Animated.View>
      </View>
    </GestureHandlerRootView>
  );
};

// Wrapper Final
const HomeWithProvider = () => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <FeedProvider>
      <HomeContent />
    </FeedProvider>
  </GestureHandlerRootView>
);

export default HomeWithProvider;
