import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
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
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { Databases, Query, ID } from "react-native-appwrite";

import { useGlobalContext } from "@/context/GlobalProvider";
import {
  getPostById,
  createComment,
  getPostComments,
  toggleLikePost,
  toggleSavePost,
  searchUsers,
  sendTagNotification,
  deletePost,
  reportPost,
  getDeezerTrackUrl,
  createNotification,
  client,
  appwriteConfig,
  getFollowedUserIds,
  getUser,
  createStory,
  toggleCommentLike, 
} from "@/lib/appwrite";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";

import ShareModal from "@/components/ShareModal";
import OptionsModal from "@/components/OptionsModal";
import MoodShareCard from "@/components/MoodShareCard";

const { width, height } = Dimensions.get("window");
const databases = new Databases(client);

// --- COMPONENTE COMMENT ITEM INTELIGENTE ---
const CommentItem = ({
  item,
  currentUserId,
  onReply,
  allComments,
}: {
  item: any;
  currentUserId: string;
  onReply: (item: any) => void;
  allComments: any[];
}) => {
  const { t } = useLanguage();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "#FAFAFA" : "#18181B";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";

  const [isLiked, setIsLiked] = useState(item.likedBy?.includes(currentUserId));
  const [likesCount, setLikesCount] = useState(item.likedBy?.length || 0);
  
  // Estado para guardar la info fresca del usuario (nombre real, verificado, etc.)
  const [userData, setUserData] = useState<any>(item.user || null);

  // EFECTO DE RECUPERACIÓN: Si es un comentario viejo o falta info, buscamos al usuario real
  useEffect(() => {
    let isMounted = true;
    // Si no tenemos objeto usuario (comentario viejo) y tenemos un ID
    if (!userData && item.userId) {
      getUser(item.userId)
        .then((res) => {
          if (isMounted && res) {
            setUserData(res);
          }
        })
        .catch(() => {});
    }
    return () => { isMounted = false; };
  }, [item.userId]);

  // Filtramos respuestas (threading)
  const replies = allComments.filter((c) => c.parentId === item.$id);

  // Lógica Prioritaria:
  // 1. Usamos datos frescos de la BD (userData)
  // 2. Si no, usamos lo que haya en el comentario (item)
  const displayName = userData?.name || item.username || "Usuario";
  const isVerified = userData?.isVerified || item.isVerified;
  const avatarUrl = userData?.pfp || item.avatar;

  const handleLike = async () => {
    const prevLiked = isLiked;
    const prevCount = likesCount;
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

    try {
      await toggleCommentLike(item.$id, currentUserId, item.likedBy || []);
    } catch (error) {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    }
  };

  const timeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = (now.getTime() - date.getTime()) / 1000;
    if (diff < 60) return "Just now";
    const m = Math.floor(diff / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  return (
    <View className="mb-4 pl-4 pr-3">
      <View className="flex-row">
        <TouchableOpacity
          onPress={() => router.push(`/user/${item.userId}` as any)}
        >
          <Image
            source={{
              uri:
                avatarUrl ||
                "https://cloud.appwrite.io/v1/avatars/initials?name=" +
                  displayName,
            }}
            className="w-9 h-9 rounded-full bg-zinc-700 mr-3"
          />
        </TouchableOpacity>

        <View className="flex-1">
          <View className="flex-row items-center mb-0.5">
            <Text
              className="font-bold text-[13px] mr-1"
              style={{ color: textColor }}
            >
              {displayName}
            </Text>
            
            {/* BADGE DE VERIFICACIÓN */}
            {isVerified && (
              <MaterialIcons
                name="verified"
                size={12}
                color="#5E17EB"
                style={{ marginRight: 4 }}
              />
            )}

            <Text className="text-[11px]" style={{ color: subTextColor }}>
              {timeAgo(item.$createdAt)}
            </Text>
          </View>

          <Text
            className="text-[14px] leading-5 mb-1.5"
            style={{ color: textColor }}
          >
            {item.content}
          </Text>

          <TouchableOpacity onPress={() => onReply(item)}>
            <Text className="text-[12px] font-semibold text-zinc-500">
              Responder
            </Text>
          </TouchableOpacity>

          {/* Renderizado Recursivo de Respuestas */}
          {replies.length > 0 && (
            <View className="mt-3 pl-2 border-l border-zinc-700/50">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.$id}
                  item={reply}
                  currentUserId={currentUserId}
                  onReply={onReply}
                  allComments={allComments}
                />
              ))}
            </View>
          )}
        </View>

        <View className="items-center pl-2 pt-1">
          <TouchableOpacity onPress={handleLike} className="p-1">
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={14}
              color={isLiked ? "#EF4444" : subTextColor}
            />
          </TouchableOpacity>
          {likesCount > 0 && (
            <Text className="text-[10px]" style={{ color: subTextColor }}>
              {likesCount}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

// --- SKELETON LOADER ---
const PostDetailSkeleton = ({ isDark }: { isDark: boolean }) => {
  const bg = isDark ? "bg-zinc-900" : "bg-zinc-100";
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  const cardBg = isDark ? "bg-zinc-800" : "bg-zinc-200";

  return (
    <View className="flex-1 animate-pulse">
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center mb-6">
          <View className={`w-12 h-12 rounded-full ${elementBg} mr-3`} />
          <View className="space-y-2">
            <View className={`w-32 h-4 rounded ${elementBg}`} />
            <View className={`w-24 h-3 rounded ${elementBg}`} />
          </View>
        </View>
        <View className={`w-3/4 h-4 rounded ${elementBg} mb-2`} />
        <View className={`w-1/2 h-4 rounded ${elementBg} mb-6`} />
        <View
          className={`w-full h-28 rounded-[24px] ${cardBg} p-4 flex-row items-center mb-6`}
        >
          <View className={`w-20 h-20 rounded-2xl ${elementBg} mr-4`} />
          <View className="flex-1 space-y-3">
            <View className={`w-40 h-5 rounded ${elementBg}`} />
            <View className={`w-24 h-4 rounded ${elementBg}`} />
          </View>
          <View className={`w-12 h-12 rounded-full ${elementBg}`} />
        </View>
        <View className="flex-row justify-between items-center px-2 mb-4">
          <View className="flex-row gap-6">
            <View className={`w-6 h-6 rounded-full ${elementBg}`} />
            <View className={`w-6 h-6 rounded-full ${elementBg}`} />
          </View>
          <View className="flex-row gap-6">
            <View className={`w-6 h-6 rounded-full ${elementBg}`} />
            <View className={`w-6 h-6 rounded-full ${elementBg}`} />
          </View>
        </View>
        <View className={`h-[1px] w-full ${elementBg} mb-6`} />
      </View>
      <View className="px-5">
        {[1, 2, 3].map((i) => (
          <View key={i} className="flex-row mb-6">
            <View className={`w-8 h-8 rounded-full ${elementBg} mr-3`} />
            <View className="flex-1 space-y-2">
              <View className={`w-20 h-3 rounded ${elementBg}`} />
              <View className={`w-full h-10 rounded-xl ${elementBg}`} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// --- HELPERS ---

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

const sendReplyNotification = async (
  post: any,
  currentUser: any,
  replyingToUser: any
) => {
  if (replyingToUser && replyingToUser.$id !== currentUser.$id) {
    try {
      await createNotification({
        userId: replyingToUser.$id,
        type: "comment",
        message: "respondió tu comentario ↩️",
        senderId: currentUser.$id,
        senderName: currentUser.username,
        senderAvatar: currentUser.pfp,
        postId: post.$id,
      });
    } catch (e) {
      console.error("Error notificando respuesta:", e);
    }
  }
};

const formatTimeAgo = (dateString: string, t: (key: string) => string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return t("postDetails.time.seconds");
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}${t("postDetails.time.m")}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${t("postDetails.time.h")}`;
  return `${Math.floor(h / 24)}${t("postDetails.time.d")}`;
};

const parseSongData = (songDataString: string) => {
  try {
    if (!songDataString) return null;
    const song = JSON.parse(songDataString);
    if (song.cover && song.cover.includes("100x100bb"))
      song.cover = song.cover.replace("100x100bb", "600x600bb");
    return song;
  } catch (e) {
    return null;
  }
};

// --- COMPONENTES AUXILIARES ---

const AudioVisualizer = ({
  isPlaying,
  color,
}: {
  isPlaying: boolean;
  color: string;
}) => {
  return (
    <View className="flex-row items-end gap-[3px] h-4 ml-2 opacity-80">
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          className={`w-[3px] rounded-full`}
          style={{
            height: isPlaying ? Math.random() * 14 + 4 : 4,
            backgroundColor: isPlaying ? "#5E17EB" : color,
          }}
        />
      ))}
    </View>
  );
};

// --- COMPONENTE: Hoja de Compartir Directo ---
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch) onSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
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

              {/* Search Bar */}
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

              {/* Suggested Users Horizontal List */}
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

              {/* Action Buttons Row */}
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

// --- COMPONENTE: Modal de Creación de Historias (Igual a Home) ---
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
    } catch (e) {
      console.log("Audio Error:", e);
    }
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

// --- POST DETAILS COMPONENT ---

const PostDetails = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FAFAFA" : "#18181B";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const songCardBg = isDark ? "#18181B" : "#F8FAFC";
  const inputBg = isDark ? "#27272A" : "#F3F4F6";
  const backIconColor = isDark ? "#FFFFFF" : "#000000";
  const suggestionBg = isDark ? "#18181B" : "#FFFFFF";
  const accentColor = "#5E17EB";

  const { id } = useLocalSearchParams();
  const { user } = useGlobalContext();
  const postId = Array.isArray(id) ? id[0] : id;

  const [post, setPost] = useState<any>(null);
  const [allComments, setAllComments] = useState<any[]>([]);
  const [rootComments, setRootComments] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // --- ESTADOS PARA COMPARTIR ACTUALIZADOS ---
  const [isOptionsVisible, setOptionsVisible] = useState(false);
  const [isShareVisible, setShareVisible] = useState(false);
  const [isViralModalVisible, setViralModalVisible] = useState(false);
  const [isShareSelectorVisible, setShareSelectorVisible] = useState(false);
  const [isCreationVisible, setCreationVisible] = useState(false);
  const [storyInitialSongData, setStoryInitialSongData] = useState<any>(null);

  // Estados para compartir (Lista de usuarios)
  const [shareContacts, setShareContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  const [replyingTo, setReplyingTo] = useState<{
    rootId: string;
    username: string;
    userId: string;
  } | null>(null);

  const [commentText, setCommentText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [currentSongUrl, setCurrentSongUrl] = useState<string | null>(null);

  const player = useAudioPlayer(currentSongUrl);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchData();
  }, [postId]);

  useEffect(() => {
    if (allComments.length > 0) {
      const roots = allComments.filter((c) => !c.parentId);
      setRootComments(roots);
    }
  }, [allComments]);

  useEffect(() => {
    if (currentSongUrl && player) {
      if (!player.playing) {
        player.play();
        setIsPlaying(true);
      }

      const statusListener = (status: any) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          player.seekTo(0);
          player.pause();
        }
      };

      if (player.addListener) {
        player.addListener("playbackStatusUpdate", statusListener);
      } else if ((player as any).setOnPlaybackStatusUpdate) {
        (player as any).setOnPlaybackStatusUpdate(statusListener);
      }

      return () => {
        if (player.removeListener) {
          player.removeListener("playbackStatusUpdate", statusListener);
        }
      };
    }
  }, [currentSongUrl, player]);

  const fetchData = async () => {
    try {
      const [postData, commentsData] = await Promise.all([
        getPostById(postId),
        getPostComments(postId),
      ]);
      setPost(postData);
      setAllComments(commentsData);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo cargar el post");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const getViralPostData = () => {
    if (!post) return null;
    const song = parseSongData(post.songData);
    const creator = post.postedBy || post.creator || {};

    return {
      title: song?.title || "Música",
      artist: song?.artist || "Artista",
      cover: song?.cover || null,
      originalPostCreator: creator.username || "usuario",
      creatorPfp: creator.pfp || null,
      comment: post.comment || null,
    };
  };

  const handlePlayPause = async () => {
    if (currentSongUrl && player) {
      if (player.playing) {
        player.pause();
        setIsPlaying(false);
      } else {
        if (player.currentTime >= player.duration) {
          player.seekTo(0);
        }
        player.play();
        setIsPlaying(true);
      }
      return;
    }

    try {
      setIsLoadingAudio(true);
      const songData = parseSongData(post.songData);
      const trackId = songData?.id || songData?.spotifyId;

      if (!trackId) {
        Alert.alert("Error", "ID de canción no disponible.");
        setIsLoadingAudio(false);
        return;
      }

      const previewUrl = await getDeezerTrackUrl(trackId);

      if (!previewUrl) {
        Alert.alert("Error", "No se pudo obtener el audio.");
        setIsLoadingAudio(false);
        return;
      }

      setCurrentSongUrl(previewUrl);
      setIsLoadingAudio(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Ocurrió un error al reproducir.");
      setIsLoadingAudio(false);
    }
  };

  const handleDeleteAction = () => {
    setOptionsVisible(false);
    Alert.alert("¿Eliminar?", "Esta acción es irreversible.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(post.$id);
            router.back();
          } catch (e) {
            Alert.alert("Error", "No se pudo eliminar");
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
    if (!user) return;
    try {
      await reportPost(post.$id, user.$id, reason);
      Alert.alert("Reporte enviado", "Gracias por ayudarnos.");
    } catch (e) {
      Alert.alert("Error", "Inténtalo más tarde.");
    }
  };

  const handleTextChange = async (text: string) => {
    setCommentText(text);
    const words = text.split(" ");
    const lastWord = words[words.length - 1];

    if (lastWord && lastWord.startsWith("@") && lastWord.length > 1) {
      const query = lastWord.substring(1);
      try {
        const results = await searchUsers(query);
        const filtered = results.filter((u) => u.$id !== user?.$id);
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      } catch (error) {
        console.log(error);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectUser = (username: string) => {
    const words = commentText.split(" ");
    words.pop();
    const newText = `${words.join(" ")} @${username} `;
    setCommentText(newText);
    setShowSuggestions(false);
  };

  const processMentions = async (content: string, postId: string) => {
    if (!user) return;
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex);
    if (!matches) return;

    const uniqueMentions = [...new Set(matches)];

    uniqueMentions.forEach(async (mention) => {
      const username = mention.substring(1);
      const users = await searchUsers(username);
      const targetUser = users.find((u) => u.username === username);
      if (targetUser) {
        await sendTagNotification(user.$id, targetUser.$id, postId);
      }
    });
  };

  const handleReply = (targetComment: any) => {
    const rootId = targetComment.parentId
      ? targetComment.parentId
      : targetComment.$id;
    // Preferimos usar el nombre si está disponible, sino el username como fallback para el tag
    const replyName = targetComment.user?.username || targetComment.username;

    setReplyingTo({
      rootId: rootId,
      username: replyName,
      userId: targetComment.userId,
    });

    setCommentText(`@${replyName} `);
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setCommentText("");
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);

    try {
      const parentId = replyingTo ? replyingTo.rootId : null;
      
      // Obtenemos el nombre real
      const displayName = user?.name || user?.username;
      // Verificamos estado de verificado de forma segura
      const isUserVerified = (user as any)?.isVerified;

      const newComment = await createComment(
        postId,
        {
          content: commentText,
          userId: user?.$id,
          // Guardamos el NOMBRE REAL en el campo 'username' para consistencia futura
          username: displayName,
          avatar: user?.pfp,
          isVerified: isUserVerified 
        },
        parentId
      );

      await sendReplyNotification(
        post,
        user,
        replyingTo ? { $id: replyingTo.userId } : null
      );
      await processMentions(commentText, postId);

      setAllComments((prev) => [newComment, ...prev]);
      setCommentText("");
      setReplyingTo(null);
      setShowSuggestions(false);
    } catch (error) {
      console.log("Error enviando:", error);
    } finally {
      setSending(false);
    }
  };

  const handleLike = async () => {
    if (!post || !user) return;
    const originalPost = { ...post };
    const originalLikes = post.likedBy || [];
    const isLiked = originalLikes.includes(user.$id);

    const newLikes = isLiked
      ? originalLikes.filter((id: string) => id !== user.$id)
      : [...originalLikes, user.$id];

    setPost({ ...post, likedBy: newLikes });

    try {
      await toggleLikePost(post.$id, user.$id, originalLikes);
    } catch (error) {
      console.error("Error like:", error);
      setPost(originalPost);
    }
  };

  const handleSave = async () => {
    if (!post || !user) return;
    const originalSaved = post.savedBy || [];
    const isSaved = originalSaved.includes(user.$id);
    const newSaved = isSaved
      ? originalSaved.filter((id: string) => id !== user.$id)
      : [...originalSaved, user.$id];

    setPost({ ...post, savedBy: newSaved });
    try {
      await toggleSavePost(post.$id, user.$id);
    } catch (e) {}
  };

  // --- LOGICA DE COMPARTIR ACTUALIZADA (Igual a Home) ---

  const fetchFollowedUsers = async (userId: string) => {
    try {
      const followedIds = await getFollowedUserIds(userId);
      if (followedIds.length > 0) {
        const promises = followedIds.map((id) => getUser(id));
        const users = await Promise.all(promises);
        return users.filter((u) => u !== null);
      }
    } catch (error) {
      console.log("Error fetching share contacts", error);
    }
    return [];
  };

  const searchUsersInAppwrite = async (query: string) => {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        [
          Query.or([
            Query.search("username", query),
            Query.search("name", query),
          ]),
          Query.limit(10),
        ]
      );
      return response.documents;
    } catch (error) {
      console.log("Search error:", error);
      return [];
    }
  };

  const openShare = async () => {
    setShareSelectorVisible(true);
    if (user?.$id && shareContacts.length === 0) {
      setIsLoadingContacts(true);
      const contacts = await fetchFollowedUsers(user.$id);
      setShareContacts(contacts);
      setIsLoadingContacts(false);
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
    if (!user?.$id || !post) return;

    try {
      const promises = userIds.map((targetId) =>
        databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.messagesCollectionId,
          ID.unique(),
          {
            senderId: user.$id,
            receiverId: targetId,
            content: message || "Compartió una publicación",
            sharedPostId: post.$id,
            createdAt: new Date().toISOString(),
          }
        )
      );

      await Promise.all(promises);
      Alert.alert("Enviado", "El post se ha compartido correctamente.");
    } catch (error) {
      console.error("Error compartiendo post:", error);
      Alert.alert("Error", "No se pudo compartir el post.");
    }
  };

  const handleAddToStoryFromPost = async () => {
    if (!post) return;
    const songData = parseSongData(post.songData);

    if (songData) {
      let freshPreview = songData.preview;
      const trackId = songData.id || songData.spotifyId;

      if (trackId) {
        try {
          const freshUrl = await getDeezerTrackUrl(trackId);
          if (freshUrl) freshPreview = freshUrl;
        } catch (e) {
          console.log("Could not refresh track url for story");
        }
      }

      setStoryInitialSongData({ ...songData, preview: freshPreview });
      setShareSelectorVisible(false);
      setTimeout(() => setCreationVisible(true), 300);
    }
  };

  const handleSystemShare = async () => {
    if (!post) return;
    const link = `https://moodapp.com/post/${post.$id}`;
    try {
      await SystemShare.share({
        message: `¡Mira esta canción en Mood! ${link}`,
        url: link,
        title: "Compartir desde Mood",
      });
    } catch (error) {
      console.log("Error sharing:", error);
    }
    setShareSelectorVisible(false);
  };

  const handleCopyLink = () => {
    if (!post) return;
    const link = `https://moodapp.com/post/${post.$id}`;
    Clipboard.setString(link);
    Alert.alert("Enlace copiado", "Enlace copiado al portapapeles.");
    setShareSelectorVisible(false);
  };

  // --- RENDERIZADO DEL POST ---
  const renderHeader = () => {
    if (!post) return null;
    const songData = parseSongData(post.songData);
    const creator = post.postedBy || {};
    const likedBy = post.likedBy || [];
    const isLiked = user ? likedBy.includes(user.$id) : false;
    const savedBy = post.savedBy || [];
    const isSaved = user ? savedBy.includes(user.$id) : false;

    return (
      <View
        className="px-5 pt-2 pb-2 mb-2"
        style={{ backgroundColor: bgColor }}
      >
        {/* User Info Header */}
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            className="flex-row items-center flex-1"
            onPress={() => {
              if (creator.$id) router.push(`/user/${creator.$id}` as any);
            }}
          >
            <Image
              source={
                creator.pfp
                  ? { uri: creator.pfp }
                  : require("@/assets/noPfp.jpg")
              }
              className="w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-800"
            />
            <View className="ml-3 flex-1">
              <View className="flex-row items-center">
                <Text
                  className="font-bold text-[17px] leading-5"
                  style={{ color: textColor }}
                >
                  {creator.name}
                </Text>

                {/* Badge Verificado en el Post */}
                {creator.isVerified && (
                  <MaterialIcons
                    name="verified"
                    size={14}
                    color="#5E17EB"
                    style={{ marginLeft: 4 }}
                  />
                )}
              </View>
              <Text
                className="text-xs font-medium mt-0.5"
                style={{ color: subTextColor }}
              >
                @{creator.username} · {formatTimeAgo(post.$createdAt, t)}
              </Text>
            </View>
          </TouchableOpacity>

          {post.isPrivate && (
            <View className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full">
              <Ionicons name="lock-closed" size={14} color={subTextColor} />
            </View>
          )}
        </View>

        {/* Caption */}
        {post.comment && (
          <Text
            className="text-[17px] leading-7 font-normal mb-5 px-1"
            style={{ color: textColor }}
          >
            {post.comment}
          </Text>
        )}

        {/* SONG CARD */}
        {songData && (
          <View
            className="rounded-[24px] p-4 flex-row items-center mb-6 border relative overflow-hidden"
            style={{
              backgroundColor: songCardBg,
              borderColor: borderColor,
            }}
          >
            {isPlaying && (
              <View className="absolute inset-0 bg-[#5E17EB] opacity-5" />
            )}

            <Image
              source={{ uri: songData.cover }}
              className="w-20 h-20 rounded-2xl"
              style={{ backgroundColor: isDark ? "#27272A" : "#E4E4E7" }}
            />

            <View className="flex-1 ml-4 mr-2 justify-center">
              <Text
                className="font-black text-[18px] mb-1 tracking-tight"
                numberOfLines={1}
                style={{ color: textColor }}
              >
                {songData.title}
              </Text>
              <Text
                className="text-sm font-medium mb-2 opacity-80"
                numberOfLines={1}
                style={{ color: subTextColor }}
              >
                {songData.artist}
              </Text>

              <View className="flex-row items-center">
                <Ionicons name="musical-notes" size={12} color={accentColor} />
                <Text className="text-[10px] ml-1 font-bold text-[#5E17EB]">
                  MOOD PREVIEW
                </Text>
                {isPlaying && (
                  <AudioVisualizer isPlaying={isPlaying} color={subTextColor} />
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={handlePlayPause}
              className="w-14 h-14 rounded-full items-center justify-center shadow-md"
              style={{ backgroundColor: accentColor }}
              activeOpacity={0.8}
            >
              {isLoadingAudio ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={24}
                  color="white"
                  style={{ marginLeft: isPlaying ? 0 : 3 }}
                />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Actions Row */}
        <View className="flex-row justify-between items-center mt-2 px-4 pb-2">
          <View className="flex-row gap-8">
            <TouchableOpacity
              onPress={handleLike}
              className="flex-row items-center gap-2"
              activeOpacity={0.6}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={26}
                color={isLiked ? "#EF4444" : subTextColor}
              />
              {likedBy.length > 0 && (
                <Text
                  className="font-semibold text-base"
                  style={{ color: isLiked ? "#EF4444" : subTextColor }}
                >
                  {likedBy.length}
                </Text>
              )}
            </TouchableOpacity>

            <View className="flex-row items-center gap-2">
              <Ionicons
                name="chatbubble-outline"
                size={24}
                color={subTextColor}
              />
              {allComments.length > 0 && (
                <Text
                  className="font-semibold text-base"
                  style={{ color: subTextColor }}
                >
                  {allComments.length}
                </Text>
              )}
            </View>
          </View>

          <View className="flex-row gap-6">
            <TouchableOpacity onPress={openShare}>
              <Ionicons
                name="share-social-outline"
                size={24}
                color={subTextColor}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSave}>
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={24}
                color={isSaved ? accentColor : subTextColor}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View
          className="h-[1px] w-full mt-4 opacity-30"
          style={{ backgroundColor: borderColor }}
        />
      </View>
    );
  };

  // --- REEMPLAZO: Skeleton inteligente en lugar de ActivityIndicator ---
  if (loading) {
    return (
      <SafeAreaView
        className="flex-1"
        edges={["top"]}
        style={{ backgroundColor: bgColor }}
      >
        <View
          className="flex-row items-center justify-between px-4 h-[50px] border-b"
          style={{ backgroundColor: bgColor, borderColor: borderColor }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-2 rounded-full"
          >
            <Ionicons name="arrow-back" size={24} color={backIconColor} />
          </TouchableOpacity>
          <Text className="font-bold text-base" style={{ color: textColor }}>
            Vibe
          </Text>
          <View className="w-10" />
        </View>

        <PostDetailSkeleton isDark={isDark} />
      </SafeAreaView>
    );
  }

  const isOwner = user?.$id === (post?.postedBy?.$id || post?.creator?.$id);

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: bgColor }}
    >
      {/* Header Limpio */}
      <View
        className="flex-row items-center justify-between px-4 h-[50px] border-b z-10"
        style={{ backgroundColor: bgColor, borderColor: borderColor }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 rounded-full active:bg-zinc-100 dark:active:bg-zinc-800"
        >
          <Ionicons name="arrow-back" size={24} color={backIconColor} />
        </TouchableOpacity>

        <Text className="font-bold text-base" style={{ color: textColor }}>
          Vibe
        </Text>

        <TouchableOpacity
          onPress={() => setOptionsVisible(true)}
          className="p-2 -mr-2 rounded-full active:bg-zinc-100 dark:active:bg-zinc-800"
        >
          <Ionicons name="ellipsis-horizontal" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={rootComments}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => (
          <CommentItem
            item={item}
            currentUserId={user?.$id || ""}
            onReply={handleReply}
            allComments={allComments}
          />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-10 opacity-60">
            <Text
              className="text-center font-medium"
              style={{ color: subTextColor }}
            >
              {t("postDetails.emptyComments")}
            </Text>
            <Text
              className="text-center text-xs mt-2 opacity-60"
              style={{ color: subTextColor }}
            >
              Sé el primero en opinar sobre este Vibe.
            </Text>
          </View>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="absolute bottom-0 w-full"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {showSuggestions && (
          <View
            className="w-full border-t border-b"
            style={{
              backgroundColor: suggestionBg,
              borderColor: borderColor,
              maxHeight: 180,
            }}
          >
            <FlatList
              data={suggestions}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) => item.$id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectUser(item.username)}
                  className="flex-row items-center px-4 py-3 border-b"
                  style={{ borderColor: borderColor }}
                >
                  <Image
                    source={{ uri: item.pfp }}
                    className="w-8 h-8 rounded-full mr-3 bg-zinc-800"
                  />
                  <Text
                    className="font-bold text-sm"
                    style={{ color: textColor }}
                  >
                    {item.username}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        <View
          className="border-t pb-6 pt-2 px-2"
          style={{ backgroundColor: bgColor, borderColor: borderColor }}
        >
          {replyingTo && (
            <View className="flex-row items-center justify-between px-4 pb-2 mb-1">
              <Text
                className="text-xs font-medium"
                style={{ color: subTextColor }}
              >
                Respondiendo a{" "}
                <Text style={{ color: accentColor }}>
                  @{replyingTo.username}
                </Text>
              </Text>
              <TouchableOpacity onPress={cancelReply} className="p-1">
                <Ionicons name="close" size={16} color={subTextColor} />
              </TouchableOpacity>
            </View>
          )}

          <View className="flex-row items-end gap-3 px-2">
            <Image
              source={{
                uri:
                  user?.pfp ||
                  "https://cloud.appwrite.io/v1/avatars/initials?name=Me",
              }}
              className="w-10 h-10 rounded-full mb-1"
              style={{ backgroundColor: inputBg }}
            />
            <View
              className="flex-1 rounded-3xl flex-row items-center px-5 py-1 border"
              style={{
                backgroundColor: inputBg,
                borderColor: isDark ? "transparent" : borderColor,
              }}
            >
              <TextInput
                ref={inputRef}
                placeholder={
                  replyingTo
                    ? `Responde a ${replyingTo.username}...`
                    : "Escribe un comentario..."
                }
                placeholderTextColor={subTextColor}
                className="flex-1 text-[16px] py-3"
                style={{ color: textColor, maxHeight: 100 }}
                value={commentText}
                onChangeText={handleTextChange}
                multiline
              />
            </View>
            <TouchableOpacity
              onPress={submitComment}
              disabled={!commentText.trim() || sending}
              className={`w-11 h-11 rounded-full items-center justify-center mb-0.5 ${
                commentText.trim()
                  ? "opacity-100 scale-100 shadow-md"
                  : "opacity-60 scale-95"
              }`}
              style={{
                backgroundColor: commentText.trim() ? accentColor : inputBg,
              }}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={24}
                  color={commentText.trim() ? "white" : subTextColor}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

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

      <OptionsModal
        isVisible={isOptionsVisible}
        onClose={() => setOptionsVisible(false)}
        onDelete={handleDeleteAction}
        onReport={handleReportAction}
        isOwner={isOwner}
      />
      <ShareModal
        isVisible={isShareVisible}
        onClose={() => setShareVisible(false)}
        postId={post?.$id || ""}
      />
      <MoodShareCard
        isVisible={isViralModalVisible}
        onClose={() => setViralModalVisible(false)}
        post={getViralPostData()}
      />
    </SafeAreaView>
  );
};

export default PostDetails;