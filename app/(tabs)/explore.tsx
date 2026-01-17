import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  Keyboard,
  useWindowDimensions,
  Pressable,
  Platform,
  Share as SystemShare,
  Clipboard,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  ViewToken,
} from "react-native";
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Ionicons,
  FontAwesome5,
  MaterialIcons,
  Feather,
} from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import { LinearGradient } from "expo-linear-gradient";
import { Databases, Query, ID } from "react-native-appwrite";
import { Audio } from "expo-av";

import {
  GestureHandlerRootView,
  FlingGestureHandler,
  Directions,
  State,
} from "react-native-gesture-handler";

import {
  getFeedCandidates,
  client,
  appwriteConfig,
  getDeezerTrackUrl,
  createStory,
  getFollowedUserIds,
  getUser,
  getOrCreateChat,
  deletePost,
  reportPost,
  getLatestUsers,
  toggleLikePost,
  toggleSavePost,
  getPostComments,
  createComment,
  getAllPosts,
  followUser,
} from "@/lib/appwrite";

import { useGlobalContext } from "@/context/GlobalProvider";
import { useLanguage } from "@/context/LanguageContext";

// Componentes UI
import PostItem from "@/components/PostItem";
import OptionsModal from "@/components/OptionsModal";
import ShareModal from "@/components/ShareModal";
import MoodShareCard from "@/components/MoodShareCard";

const { width, height } = Dimensions.get("window");
const databases = new Databases(client);

// --- CONFIGURACIÓN ---
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

// ============================================
// SKELETONS PERSONALIZADOS (ESTILO EXACTO)
// ============================================

// 1. Grid del fondo (Explore More)
const ExplorePostSkeleton = ({ isDark }: { isDark: boolean }) => {
  const cardBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  return (
    <View className={`flex-1 m-[1px] aspect-square ${cardBg} opacity-50`} />
  );
};

// 2. Fila de Trending Vibes (Sin ranking, imagen + texto + play)
const TrendingVibeSkeleton = ({ isDark }: { isDark: boolean }) => {
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  return (
    <View className="flex-row items-center px-5 py-3 mb-2 mx-2">
      <View className={`w-14 h-14 rounded-xl ${elementBg} mr-4`} />
      <View className="flex-1 justify-center mr-2 space-y-2">
        <View className={`w-32 h-4 rounded ${elementBg}`} />
        <View className={`w-20 h-3 rounded ${elementBg}`} />
      </View>
      <View className={`w-10 h-10 rounded-full ${elementBg}`} />
    </View>
  );
};

// 3. Círculo de Discover Creators
const CreatorSkeleton = ({ isDark }: { isDark: boolean }) => {
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  return (
    <View className="mr-5 items-center w-20">
      <View
        className={`w-[68px] h-[68px] rounded-full ${elementBg} border-2 border-transparent`}
      />
      <View className={`mt-2 w-16 h-3 rounded ${elementBg}`} />
    </View>
  );
};

// Skeletons para otras pestañas (Music, Artist, Profile)
const MusicSkeleton = ({ isDark }: { isDark: boolean }) => {
  const cardBg = isDark ? "bg-zinc-900" : "bg-zinc-100";
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  const borderColor = isDark ? "border-zinc-800" : "border-zinc-200";
  return (
    <View
      className={`flex-row items-center px-4 py-4 border-b ${borderColor} ${cardBg}`}
    >
      <View className={`w-8 h-6 rounded ${elementBg} mr-4`} />
      <View className={`w-12 h-12 rounded-lg ${elementBg} mr-4`} />
      <View className="flex-1 space-y-2">
        <View className={`w-32 h-4 rounded ${elementBg}`} />
        <View className={`w-20 h-3 rounded ${elementBg}`} />
      </View>
      <View className={`w-10 h-10 rounded-full ${elementBg}`} />
    </View>
  );
};

const ArtistSkeleton = ({ isDark }: { isDark: boolean }) => {
  const cardBg = isDark ? "bg-zinc-900" : "bg-zinc-100";
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  const borderColor = isDark ? "border-zinc-800" : "border-zinc-200";
  return (
    <View
      className={`flex-row items-center px-5 py-4 border-b ${borderColor} ${cardBg}`}
    >
      <View className={`w-14 h-14 rounded-full ${elementBg} mr-4`} />
      <View className="flex-1 space-y-2">
        <View className={`w-24 h-4 rounded ${elementBg}`} />
        <View className={`w-16 h-3 rounded ${elementBg}`} />
      </View>
    </View>
  );
};

const ProfileSkeleton = ({ isDark }: { isDark: boolean }) => {
  const cardBg = isDark ? "bg-zinc-900" : "bg-zinc-100";
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  const borderColor = isDark ? "border-zinc-800" : "border-zinc-200";
  return (
    <View
      className={`flex-row items-center px-5 py-4 border-b ${borderColor} ${cardBg}`}
    >
      <View className={`w-14 h-14 rounded-full ${elementBg}`} />
      <View className="ml-4 flex-1 space-y-2">
        <View className={`w-32 h-4 rounded ${elementBg}`} />
        <View className={`w-20 h-3 rounded ${elementBg}`} />
      </View>
      <View className={`w-16 h-8 rounded-full ${elementBg}`} />
    </View>
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

const parseSongData = (songDataString: string) => {
  try {
    if (!songDataString) return null;
    const song = JSON.parse(songDataString);
    if (song.cover && song.cover.includes("100x100bb")) {
      song.cover = song.cover.replace("100x100bb", "600x600bb");
    }
    return song;
  } catch {
    return null;
  }
};

const normalize = (str: string) => (str ? str.trim().toLowerCase() : "");

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

const getDayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff =
    now.getTime() -
    start.getTime() +
    (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

// ============================================
// COMPONENTES AUXILIARES
// ============================================

const CommentsSheet = ({ visible, onClose, postId, currentUser }: any) => {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      loadComments();
    }
  }, [visible, postId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const res = await getPostComments(postId);
      setComments(res);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    try {
      const comment = await createComment(postId, {
        content: newComment,
        userId: currentUser?.$id,
        username: currentUser?.name || currentUser?.username,
        avatar: currentUser?.pfp,
        isVerified: currentUser?.isVerified,
      });
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
      Keyboard.dismiss();
    } catch (error) {
      Alert.alert("Error", "No se pudo enviar el comentario");
    } finally {
      setSending(false);
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
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            height: "70%",
            backgroundColor: "#18181B",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: "hidden",
          }}
        >
          <View className="items-center pt-3 pb-2 border-b border-zinc-800">
            <View className="w-10 h-1 bg-zinc-600 rounded-full mb-2" />
            <Text className="text-white font-bold">
              Comentarios ({comments.length})
            </Text>
          </View>

          {loading ? (
            <View className="flex-1 justify-center">
              <ActivityIndicator color="#5E17EB" />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.$id}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              renderItem={({ item }) => (
                <View className="flex-row mb-4">
                  <Image
                    source={
                      item.avatar
                        ? { uri: item.avatar }
                        : require("@/assets/noPfp.jpg")
                    }
                    className="w-8 h-8 rounded-full mr-3 bg-zinc-700"
                  />
                  <View className="flex-1">
                    <Text className="text-zinc-300 font-bold text-xs mr-2">
                      {item.username}
                    </Text>
                    <Text className="text-white text-sm mt-0.5">
                      {item.content}
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text className="text-zinc-500 text-center mt-10">
                  Sé el primero en comentar.
                </Text>
              }
            />
          )}

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            <View className="px-4 pt-3 pb-8 bg-zinc-900 border-t border-zinc-800 flex-row items-center">
              <TextInput
                placeholder="Añadir comentario..."
                placeholderTextColor="#71717A"
                className="flex-1 bg-black text-white px-4 py-3 rounded-full mr-3"
                value={newComment}
                onChangeText={setNewComment}
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!newComment.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator color="#5E17EB" />
                ) : (
                  <Ionicons
                    name="arrow-up-circle"
                    size={38}
                    color={newComment.trim() ? "#5E17EB" : "#555"}
                  />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const DirectShareSheet = ({
  visible,
  onClose,
  onSend,
  onSystemShare,
  onCopyLink,
  isDark,
  onSearch,
}: any) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const insets = useSafeAreaInsets();
  const bgColor = isDark ? "#18181B" : "#ffffff";
  const textColor = isDark ? "white" : "black";
  useEffect(() => {
    const t = setTimeout(() => onSearch && onSearch(searchQuery), 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

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
              className="rounded-t-[32px]"
              style={{
                backgroundColor: bgColor,
                paddingBottom: insets.bottom + 20,
                height: 400,
              }}
            >
              <Text
                className="text-center py-4 font-bold"
                style={{ color: textColor }}
              >
                Compartir
              </Text>
              <ScrollView horizontal className="px-5">
                <TouchableOpacity
                  onPress={onCopyLink}
                  className="mr-6 items-center"
                >
                  <View className="w-12 h-12 bg-zinc-800 rounded-full items-center justify-center">
                    <Feather name="link" size={20} color="white" />
                  </View>
                  <Text
                    style={{ color: textColor, fontSize: 12, marginTop: 4 }}
                  >
                    Copiar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onSystemShare}
                  className="mr-6 items-center"
                >
                  <View className="w-12 h-12 bg-zinc-800 rounded-full items-center justify-center">
                    <Feather name="share" size={20} color="white" />
                  </View>
                  <Text
                    style={{ color: textColor, fontSize: 12, marginTop: 4 }}
                  >
                    Más
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
  initialSongData,
}: any) => {
  if (!visible) return null;
  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "black" }}>
        <Text style={{ color: "white", marginTop: 100, textAlign: "center" }}>
          Creando Historia...
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ color: "white", textAlign: "center", marginTop: 20 }}>
            Cerrar
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const FullScreenPostItem = React.memo(
  ({ item, isActive, currentUser, onOption, onClose }: any) => {
    const insets = useSafeAreaInsets();
    const song = parseSongData(item.songData);
    const creator = getCreatorFromPost(item);

    const [isLiked, setIsLiked] = useState(
      item.likedBy?.includes(currentUser?.$id) || false,
    );
    const [likesCount, setLikesCount] = useState(item.likedBy?.length || 0);
    const [isSaved, setIsSaved] = useState(
      item.savedBy?.includes(currentUser?.$id) || false,
    );
    const [isFollowing, setIsFollowing] = useState(false);
    const [showComments, setShowComments] = useState(false);

    const soundRef = useRef<Audio.Sound | null>(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);

    useEffect(() => {
      let isMounted = true;
      const checkFollow = async () => {
        if (currentUser && creator.id && creator.id !== "unknown") {
          try {
            const followedIds = await getFollowedUserIds(currentUser.$id);
            if (isMounted && followedIds.includes(creator.id))
              setIsFollowing(true);
          } catch (e) {
            console.log("Error checking follow", e);
          }
        }
      };
      checkFollow();
      return () => {
        isMounted = false;
      };
    }, [currentUser, creator.id]);

    useEffect(() => {
      let isMounted = true;
      const manageAudio = async () => {
        try {
          if (isActive) {
            let previewUrl = song?.preview;
            if (!previewUrl && (song?.id || song?.spotifyId)) {
              previewUrl = await getDeezerTrackUrl(song.id || song.spotifyId);
            }
            if (previewUrl && isMounted) {
              const { sound } = await Audio.Sound.createAsync(
                { uri: previewUrl },
                { shouldPlay: true, isLooping: true },
              );
              soundRef.current = sound;
              setIsAudioPlaying(true);
            }
          } else {
            if (soundRef.current) {
              await soundRef.current.unloadAsync();
              soundRef.current = null;
              setIsAudioPlaying(false);
            }
          }
        } catch (e) {
          console.log("Audio Error:", e);
        }
      };
      manageAudio();
      return () => {
        isMounted = false;
        if (soundRef.current) soundRef.current.unloadAsync();
      };
    }, [isActive, item]);

    const togglePlayback = async () => {
      if (soundRef.current) {
        if (isAudioPlaying) {
          await soundRef.current.pauseAsync();
          setIsAudioPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setIsAudioPlaying(true);
        }
      }
    };

    const handleFollow = async () => {
      if (!currentUser || !creator.id) return;
      setIsFollowing(true);
      try {
        await followUser(currentUser.$id, creator.id);
      } catch (error) {
        setIsFollowing(false);
        Alert.alert("Error", "No se pudo seguir al usuario");
      }
    };

    const handleLike = async () => {
      if (!currentUser) return;
      const prevLiked = isLiked;
      setIsLiked(!prevLiked);
      setLikesCount(prevLiked ? likesCount - 1 : likesCount + 1);
      try {
        await toggleLikePost(item.$id, currentUser.$id, item.likedBy || []);
      } catch (error) {
        setIsLiked(prevLiked);
      }
    };

    const handleSave = async () => {
      if (!currentUser) return;
      setIsSaved(!isSaved);
      try {
        await toggleSavePost(item.$id, currentUser.$id);
      } catch (e) {
        setIsSaved(isSaved);
      }
    };

    return (
      <View style={{ height: height, width: width, backgroundColor: "#000" }}>
        <Image
          source={{ uri: song?.cover }}
          style={StyleSheet.absoluteFillObject}
          blurRadius={50}
          className="opacity-40"
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.8)"]}
          style={StyleSheet.absoluteFillObject}
        />

        <View
          className="absolute top-0 w-full z-50 flex-row justify-between items-center px-4"
          style={{ paddingTop: insets.top + 10 }}
        >
          <TouchableOpacity
            onPress={onClose}
            className="w-10 h-10 bg-black/20 rounded-full items-center justify-center backdrop-blur-md"
          >
            <Ionicons name="chevron-down" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white/80 font-bold text-xs uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full backdrop-blur-md">
            Vibe Check
          </Text>
          <TouchableOpacity
            onPress={() => onOption(item)}
            className="w-10 h-10 bg-black/20 rounded-full items-center justify-center backdrop-blur-md"
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <TouchableWithoutFeedback onPress={togglePlayback}>
          <View className="flex-1 justify-center items-center">
            <View
              className="w-64 h-64 rounded-3xl shadow-2xl bg-zinc-900 border border-white/10"
              style={{ elevation: 10 }}
            >
              <Image
                source={{ uri: song?.cover }}
                className="w-full h-full rounded-3xl"
              />
              {!isAudioPlaying && isActive && (
                <View className="absolute inset-0 items-center justify-center bg-black/40 rounded-3xl">
                  <Ionicons
                    name="play"
                    size={50}
                    color="white"
                    style={{ opacity: 0.9 }}
                  />
                </View>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>

        <View className="absolute right-2 bottom-32 items-center gap-6 z-20">
          <TouchableOpacity
            onPress={() => {
              onClose();
              router.push(`/user/${creator.id}` as any);
            }}
            className="items-center mb-2"
          >
            <View className="w-12 h-12 rounded-full border-2 border-white bg-black p-0.5">
              <Image
                source={
                  creator.avatar
                    ? { uri: creator.avatar }
                    : require("@/assets/noPfp.jpg")
                }
                className="w-full h-full rounded-full"
              />
            </View>
            {!isFollowing && currentUser?.$id !== creator.id && (
              <TouchableOpacity
                onPress={handleFollow}
                className="bg-[#5E17EB] rounded-full w-5 h-5 items-center justify-center absolute -bottom-2 shadow-sm"
              >
                <Ionicons name="add" size={14} color="white" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLike} className="items-center">
            <Ionicons
              name={isLiked ? "heart" : "heart"}
              size={36}
              color={isLiked ? "#EF4444" : "white"}
              style={{ opacity: isLiked ? 1 : 0.9 }}
            />
            <Text className="text-white text-xs font-bold mt-1">
              {likesCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowComments(true)}
            className="items-center"
          >
            <Ionicons name="chatbubble-ellipses" size={34} color="white" />
            <Text className="text-white text-xs font-bold mt-1">Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} className="items-center">
            <Ionicons
              name="bookmark"
              size={34}
              color={isSaved ? "#5E17EB" : "white"}
            />
            <Text className="text-white text-xs font-bold mt-1">Save</Text>
          </TouchableOpacity>
        </View>

        <View className="absolute bottom-0 w-[75%] px-4 pb-8 z-10 pointer-events-none">
          <TouchableOpacity
            onPress={() => router.push(`/user/${creator.id}` as any)}
          >
            <Text className="text-white font-bold text-lg mb-1 shadow-sm">
              @{creator.username}
            </Text>
          </TouchableOpacity>
          <Text
            className="text-white/90 text-sm mb-3 leading-5 shadow-sm"
            numberOfLines={3}
          >
            {item.comment}
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="musical-notes" size={14} color="white" />
            <Text
              className="text-white text-xs ml-2 font-medium"
              numberOfLines={1}
            >
              {song?.title} - {song?.artist}
            </Text>
          </View>
        </View>

        <CommentsSheet
          visible={showComments}
          onClose={() => setShowComments(false)}
          postId={item.$id}
          currentUser={currentUser}
        />
      </View>
    );
  },
);

// ============================================
// MODAL PLAYER CON LISTA VERTICAL
// ============================================
const PlayerPostModal = ({
  visible,
  onClose,
  initialIndex,
  postsList,
  currentUser,
  onOption,
}: any) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  useEffect(() => {
    if (visible) setActiveIndex(initialIndex);
  }, [visible, initialIndex]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <FlatList
          data={postsList}
          keyExtractor={(item) => item.$id}
          renderItem={({ item, index }) => (
            <FullScreenPostItem
              item={item}
              isActive={index === activeIndex}
              currentUser={currentUser}
              onOption={onOption}
              onClose={onClose}
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialScrollIndex={initialIndex}
          getItemLayout={(data, index) => ({
            length: height,
            offset: height * index,
            index,
          })}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
        />
      </View>
    </Modal>
  );
};

// ============================================
// COMPONENTE PRINCIPAL: EXPLORE
// ============================================

const Explore = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user } = useGlobalContext();

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const inputBg = isDark ? "#18181B" : "#F3F4F6";
  const borderColor = isDark ? "#27272A" : "#E5E5E5";
  const accentColor = "#5E17EB";

  const [activeCategory, setActiveCategory] = useState("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [trendingPeople, setTrendingPeople] = useState<any[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [dailyVibes, setDailyVibes] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<{
    users: any[];
    posts: any[];
    isLoading: boolean;
  }>({ users: [], posts: [], isLoading: false });

  const [isPlayerModalVisible, setIsPlayerModalVisible] = useState(false);
  const [playerInitialIndex, setPlayerInitialIndex] = useState(0);
  const [playerPostsList, setPlayerPostsList] = useState<any[]>([]);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);

  const [isOptionsVisible, setOptionsVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [isShareVisible, setShareVisible] = useState(false);
  const [isViralModalVisible, setViralModalVisible] = useState(false);
  const [isShareSelectorVisible, setShareSelectorVisible] = useState(false);
  const [postToShareData, setPostToShareData] = useState<any>(null);
  const [sharePostId, setSharePostId] = useState<string>("");
  const [shareContacts, setShareContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isCreationVisible, setCreationVisible] = useState(false);
  const [storyInitialSongData, setStoryInitialSongData] = useState<any>(null);

  const skeletonData = useMemo(() => Array.from({ length: 6 }), []);
  const renderSearchHeader = () => (
    <View
      className="flex-row items-center justify-between px-5 py-4 border-b border-zinc-800"
      style={{
        backgroundColor: bgColor,
        paddingTop: Platform.OS === "android" ? 20 : 0,
      }}
    >
      <View
        className="flex-1 flex-row items-center h-12 rounded-2xl px-4"
        style={{ backgroundColor: inputBg }}
      >
        <Ionicons name="search" size={20} color={subTextColor} />
        <TextInput
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
      <TouchableOpacity
        onPress={() => {
          setIsSearchActive(false);
          setSearchText("");
        }}
        className="ml-3"
      >
        <Text className="text-[#5E17EB] font-bold text-base">Cancelar</Text>
      </TouchableOpacity>
    </View>
  );

  // --- DEFINICIÓN DE renderSearchResults ANTES DE USARSE ---
  const renderSearchResults = () => {
    if (searchText.trim() === "")
      return (
        <View className="flex-1 items-center justify-center opacity-50 pb-20">
          <Text className="font-medium" style={{ color: subTextColor }}>
            Busca música, artistas o usuarios
          </Text>
        </View>
      );
    if (searchResults.isLoading)
      return (
        <View className="flex-1 pt-20">
          <ActivityIndicator size="large" color="#5E17EB" />
        </View>
      );
    if (searchResults.users.length === 0 && searchResults.posts.length === 0)
      return (
        <View className="flex-1 items-center justify-center opacity-50 pb-20">
          <Text className="font-medium" style={{ color: subTextColor }}>
            {t("explore.search.noResults")}
          </Text>
        </View>
      );
    return (
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {searchResults.users.length > 0 && (
          <View className="mb-6">
            <Text
              className="px-5 py-3 font-bold text-lg opacity-80"
              style={{ color: textColor }}
            >
              {t("explore.search.people")}
            </Text>
            {searchResults.users.map((user) => (
              <View key={user.$id}>{renderProfileRow({ item: user })}</View>
            ))}
          </View>
        )}
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
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rawPosts, latestUsers, myFollowedIds] = await Promise.all([
        getFeedCandidates(),
        getLatestUsers(),
        user ? getFollowedUserIds(user.$id) : Promise.resolve([]),
      ]);
      const songMap = new Map();
      const artistMap = new Map();

      rawPosts.forEach((post: any) => {
        const song = parseSongData(post.songData);
        if (!song) return;
        const key = `${normalize(song.title)}-${normalize(song.artist)}`;
        const likes = post.likedBy ? post.likedBy.length : 0;
        const score = 1 + likes;
        if (songMap.has(key)) {
          songMap.get(key).score += score;
        } else {
          songMap.set(key, {
            ...song,
            id: song.id || song.spotifyId,
            trackId: song.id || song.spotifyId,
            score,
            postId: post.$id,
          });
        }
        const artistKey = normalize(song.artist);
        if (artistMap.has(artistKey)) {
          artistMap.get(artistKey).count += 1;
        } else {
          artistMap.set(artistKey, {
            id: artistKey,
            name: song.artist,
            cover: song.cover,
            count: 1,
          });
        }
      });

      const charts = Array.from(songMap.values()).sort(
        (a: any, b: any) => b.score - a.score,
      );
      const dayOfYear = getDayOfYear();
      const dailySelection = [];
      if (charts.length > 0) {
        for (let i = 0; i < 5; i++) {
          const index = (dayOfYear + i) % charts.length;
          dailySelection.push(charts[index]);
        }
      }

      const topArtists = Array.from(artistMap.values())
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 20);
      const people = latestUsers.filter(
        (u: any) => u.$id !== user?.$id && !myFollowedIds.includes(u.$id),
      );
      const shuffledPeople = shuffleArray(people).slice(0, 20);
      const allProfiles = latestUsers.filter((u: any) => u.$id !== user?.$id);

      setTopSongs(charts.slice(0, 50));
      setDailyVibes(dailySelection);
      setArtists(topArtists);
      setPosts(shuffleArray(rawPosts));
      setTrendingPeople(shuffledPeople);
      setUsers(allProfiles);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const playPreview = async (previewUrl: string, trackId: string) => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setPlayingPreviewId(null);
        if (playingPreviewId === trackId) return;
      }
      let finalUrl = previewUrl;
      if (!finalUrl && trackId) {
        finalUrl = (await getDeezerTrackUrl(trackId)) || "";
      }
      if (!finalUrl) return;
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: finalUrl },
        { shouldPlay: true },
      );
      setSound(newSound);
      setPlayingPreviewId(trackId);
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) setPlayingPreviewId(null);
      });
    } catch (e) {
      console.log(e);
    }
  };

  const handleOpenOptions = (post: any) => {
    setSelectedPost(post);
    setOptionsVisible(true);
  };
  const openShare = async (post: any) => {
    setPostToShareData(post);
    setSharePostId(post.$id);
    setShareSelectorVisible(true);
  };
  const handleShareSearch = async (text: string) => {
    setIsLoadingContacts(true);
    try {
      if (text.length > 0) {
        const results = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.usersCollectionId,
          [
            Query.or([
              Query.search("username", text),
              Query.search("name", text),
            ]),
            Query.limit(10),
          ],
        );
        setShareContacts(results.documents);
      } else if (user?.$id) {
        const followedIds = await getFollowedUserIds(user.$id);
        if (followedIds.length > 0) {
          const promises = followedIds.map((id: any) => getUser(id));
          const users = await Promise.all(promises);
          setShareContacts(users.filter((u) => u !== null));
        }
      }
    } catch (e) {
      console.log(e);
    }
    setIsLoadingContacts(false);
  };
  const handleSendShare = async (userIds: string[], message: string) => {
    setShareSelectorVisible(false);
    Alert.alert("Enviado");
  };
  const handleAddToStoryFromPost = () => {
    /* ... */
  };
  const handleSystemShare = () => {
    /* ... */
  };
  const handleCopyLink = () => {
    Clipboard.setString("link");
    Alert.alert("Copiado");
  };
  const handleDeleteAction = () => {
    setOptionsVisible(false);
  };
  const handleReportAction = () => {
    setOptionsVisible(false);
    Alert.alert("Reportado");
  };
  const getViralPostData = () => null;

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!searchText.trim()) {
        setSearchResults({ users: [], posts: [], isLoading: false });
        return;
      }
      setSearchResults((prev) => ({ ...prev, isLoading: true }));
      try {
        const users = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.usersCollectionId,
          [Query.search("username", searchText), Query.limit(3)],
        );
        const matchedPosts = posts
          .filter((p: any) => {
            const song = parseSongData(p.songData);
            return (
              song?.title?.toLowerCase().includes(searchText.toLowerCase()) ||
              song?.artist?.toLowerCase().includes(searchText.toLowerCase())
            );
          })
          .slice(0, 6);
        setSearchResults({
          users: users.documents.map((d) => ({
            ...d,
            id: d.$id,
            avatar: d.pfp || d.avatar,
          })),
          posts: matchedPosts,
          isLoading: false,
        });
      } catch (e) {
        setSearchResults((prev) => ({ ...prev, isLoading: false }));
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [searchText, posts]);

  const renderHeader = () => {
    return (
      <View className="mb-2" style={{ backgroundColor: bgColor }}>
        <View className="px-5 pt-2 pb-4">
          <Text
            className="text-3xl font-bold mb-4"
            style={{ color: textColor }}
          >
            {t("explore.title")}
          </Text>
          <Pressable
            onPress={() => setIsSearchActive(true)}
            className="flex-row items-center h-12 rounded-2xl px-4 border"
            style={{ backgroundColor: inputBg, borderColor: "transparent" }}
          >
            <Ionicons name="search" size={20} color={subTextColor} />
            <Text
              className="ml-3 font-medium text-base"
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
          contentContainerStyle={{ paddingHorizontal: 20, marginBottom: 20 }}
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
        {activeCategory === "posts" && (
          <View>
            <View className="mb-6">
              <Text
                className="text-lg font-bold mb-3 ml-5"
                style={{ color: textColor }}
              >
                Trending Vibes
              </Text>
              {isLoading ? (
                // SKELETON PARA TRENDING VIBES
                <View>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TrendingVibeSkeleton key={i} isDark={isDark} />
                  ))}
                </View>
              ) : (
                dailyVibes.map((item: any, index: number) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      const fakePost = {
                        $id: item.postId,
                        songData: JSON.stringify(item),
                        likedBy: [],
                        savedBy: [],
                      };
                      setPlayerPostsList([fakePost]);
                      setPlayerInitialIndex(0);
                      setIsPlayerModalVisible(true);
                    }}
                    className="flex-row items-center px-5 py-3 mb-2 mx-2 active:opacity-70"
                  >
                    <Image
                      source={{ uri: item.cover }}
                      className="w-14 h-14 rounded-xl bg-zinc-800 mr-4"
                    />
                    <View className="flex-1 justify-center mr-2">
                      <Text
                        className="font-bold text-[15px] mb-1"
                        numberOfLines={1}
                        style={{ color: textColor }}
                      >
                        {item.title}
                      </Text>
                      <Text
                        className="text-xs font-medium"
                        numberOfLines={1}
                        style={{ color: subTextColor }}
                      >
                        {item.artist}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        playPreview(item.preview, item.trackId || item.id);
                      }}
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{
                        backgroundColor:
                          playingPreviewId === (item.trackId || item.id)
                            ? accentColor
                            : isDark
                              ? "#27272A"
                              : "#F3F4F6",
                      }}
                    >
                      <Ionicons
                        name={
                          playingPreviewId === (item.trackId || item.id)
                            ? "pause"
                            : "play"
                        }
                        size={18}
                        color={
                          playingPreviewId === (item.trackId || item.id)
                            ? "white"
                            : subTextColor
                        }
                        style={{
                          marginLeft:
                            playingPreviewId === (item.trackId || item.id)
                              ? 0
                              : 2,
                        }}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </View>
            <View className="mb-8">
              <Text
                className="text-lg font-bold mb-3 ml-5"
                style={{ color: textColor }}
              >
                Discover Creators
              </Text>
              {isLoading ? (
                // SKELETON PARA DISCOVER CREATORS
                <FlatList
                  horizontal
                  data={[1, 2, 3, 4, 5]}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                  keyExtractor={(i) => i.toString()}
                  renderItem={() => <CreatorSkeleton isDark={isDark} />}
                />
              ) : (
                <FlatList
                  horizontal
                  data={trendingPeople}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                  keyExtractor={(item) => item.$id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => router.push(`/user/${item.$id}` as any)}
                      className="mr-5 items-center w-20"
                    >
                      <View className="relative">
                        <Image
                          source={
                            item.pfp
                              ? { uri: item.pfp }
                              : require("@/assets/noPfp.jpg")
                          }
                          className="w-[68px] h-[68px] rounded-full bg-zinc-800 border-2"
                          style={{ borderColor: borderColor }}
                        />
                      </View>
                      <Text
                        className="text-xs font-medium mt-2 text-center"
                        numberOfLines={1}
                        style={{ color: textColor }}
                      >
                        {item.name || item.username}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
            <Text
              className="font-bold text-xl px-5 mb-2"
              style={{ color: textColor }}
            >
              Explore More
            </Text>
          </View>
        )}
        {activeCategory !== "posts" && (
          <View className="px-5 mt-2 mb-2">
            <Text className="font-bold text-xl" style={{ color: textColor }}>
              {activeCategory === "music"
                ? "Top Global Charts"
                : activeCategory === "artists"
                  ? "Top Artistas"
                  : "Descubrir Perfiles"}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderGridItem = ({ item, index }: { item: any; index: number }) => {
    const song = parseSongData(item.songData);
    if (!song) return null;
    return (
      <TouchableOpacity
        onPress={() => {
          setPlayerPostsList(posts);
          setPlayerInitialIndex(index);
          setIsPlayerModalVisible(true);
        }}
        className="flex-1 m-[1px] aspect-square relative"
        style={{ maxWidth: "33.33%" }}
      >
        <Image
          source={{ uri: song.cover }}
          className="w-full h-full bg-zinc-800"
        />
        <View className="absolute top-1 right-1 bg-black/40 rounded-full p-1">
          <Ionicons name="musical-notes" size={10} color="white" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderMusicRow = ({ item, index }: { item: any; index: number }) => {
    const isPlaying = playingPreviewId === (item.trackId || item.id);
    return (
      <TouchableOpacity
        onPress={() => router.push(`/post/${item.postId}` as any)}
        className="flex-row items-center px-5 py-4 border-b active:opacity-70"
        style={{ borderColor: borderColor }}
      >
        <Text
          className="font-bold text-lg mr-4 w-6 text-center"
          style={{ color: index < 3 ? accentColor : subTextColor }}
        >
          {index + 1}
        </Text>
        <Image
          source={{ uri: item.cover }}
          className="w-12 h-12 rounded-lg bg-zinc-800 mr-4"
        />
        <View className="flex-1">
          <Text
            className="font-bold text-base mb-0.5"
            numberOfLines={1}
            style={{ color: textColor }}
          >
            {item.title}
          </Text>
          <Text className="text-sm" style={{ color: subTextColor }}>
            {item.artist}
          </Text>
          <Text className="text-xs mt-1" style={{ color: accentColor }}>
            {item.score} likes
          </Text>
        </View>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            playPreview(item.preview, item.trackId || item.id);
          }}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{
            backgroundColor: isPlaying
              ? accentColor
              : isDark
                ? "#27272A"
                : "#E5E5E5",
          }}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={20}
            color={isPlaying ? "white" : accentColor}
            style={{ marginLeft: isPlaying ? 0 : 2 }}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderArtistRow = ({ item }: { item: any }) => (
    <View
      className="flex-row items-center px-5 py-4 border-b"
      style={{ borderColor: borderColor }}
    >
      <Image
        source={{ uri: item.cover }}
        className="w-14 h-14 rounded-full bg-zinc-800 mr-4"
      />
      <View className="flex-1">
        <Text className="font-bold text-base" style={{ color: textColor }}>
          {item.name}
        </Text>
        <Text className="text-sm" style={{ color: subTextColor }}>
          {item.count} canciones en Mood
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={subTextColor} />
    </View>
  );

  const renderProfileRow = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => {
        setIsSearchActive(false);
        setSearchText("");
        router.push(`/user/${item.$id}` as any);
      }}
      className="flex-row items-center px-5 py-4 border-b active:opacity-70"
      style={{ borderColor: borderColor }}
    >
      <Image
        source={item.pfp ? { uri: item.pfp } : require("@/assets/noPfp.jpg")}
        className="w-14 h-14 rounded-full bg-zinc-800 mr-4"
      />
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text
            className="font-bold text-base mr-1"
            style={{ color: textColor }}
          >
            {item.name || item.username}
          </Text>
          {item.isVerified && (
            <MaterialIcons name="verified" size={14} color={accentColor} />
          )}
        </View>
        <Text className="text-sm" style={{ color: subTextColor }}>
          @{item.username}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const getDataToRender = () => {
    switch (activeCategory) {
      case "posts":
        return posts;
      case "music":
        return topSongs;
      case "artists":
        return artists;
      case "profiles":
        return users;
      default:
        return [];
    }
  };

  const renderItem = ({ item, index }: any) => {
    if (isLoading) {
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
      case "posts":
        return renderGridItem({ item, index });
      case "music":
        return renderMusicRow({ item, index });
      case "artists":
        return renderArtistRow({ item });
      case "profiles":
        return renderProfileRow({ item });
      default:
        return null;
    }
  };

  const handleFlingRight = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.ACTIVE) router.push("/home");
  };
  const handleFlingLeft = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.ACTIVE) router.push("/library" as any);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bgColor }}>
      <FlingGestureHandler
        direction={Directions.RIGHT}
        onHandlerStateChange={handleFlingRight}
      >
        <FlingGestureHandler
          direction={Directions.LEFT}
          onHandlerStateChange={handleFlingLeft}
        >
          <View style={{ flex: 1 }}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <SafeAreaView className="flex-1" edges={["top"]}>
              <FlatList
                data={isLoading ? skeletonData : getDataToRender()}
                keyExtractor={(item, index) =>
                  item?.$id || item?.id || index.toString()
                }
                key={activeCategory === "posts" ? "grid-3" : "list-1"}
                numColumns={activeCategory === "posts" ? 3 : 1}
                renderItem={renderItem}
                ListHeaderComponent={renderHeader}
                showsVerticalScrollIndicator={false}
                columnWrapperStyle={
                  activeCategory === "posts"
                    ? { paddingHorizontal: 0 }
                    : undefined
                }
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={onRefresh}
                    tintColor="#5E17EB"
                  />
                }
                ListEmptyComponent={
                  !isLoading ? (
                    <View className="py-20 items-center opacity-50">
                      <Text style={{ color: subTextColor }}>
                        Nada por aquí...
                      </Text>
                    </View>
                  ) : null
                }
              />

              <Modal
                visible={isSearchActive}
                animationType="fade"
                transparent={false}
                onRequestClose={() => setIsSearchActive(false)}
              >
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

              <PlayerPostModal
                visible={isPlayerModalVisible}
                onClose={() => setIsPlayerModalVisible(false)}
                initialIndex={playerInitialIndex}
                postsList={playerPostsList}
                currentUser={user}
                onOption={handleOpenOptions}
              />

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
                onSuccess={() => setCreationVisible(false)}
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
                postId={sharePostId}
              />
              <OptionsModal
                isVisible={isOptionsVisible}
                onClose={() => setOptionsVisible(false)}
                onDelete={handleDeleteAction}
                onReport={handleReportAction}
                isOwner={
                  user?.$id && selectedPost
                    ? (selectedPost.postedBy?.$id ||
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
