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
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAudioPlayer } from "expo-audio";
import { Audio } from "expo-av";
import * as Linking from "expo-linking";

import {
  PanGestureHandler,
  State,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { Databases, Query, ID } from "react-native-appwrite";

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
  client,
  appwriteConfig,
  getDeezerTrackUrl,
  getOrCreateChat,
  toggleSavePost,
} from "@/lib/appwrite";
import OptionsModal from "@/components/OptionsModal";
import PostItem from "@/components/PostItem";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";
import MoodShareCard from "@/components/MoodShareCard";
import ShareModal from "@/components/ShareModal";

import ChatsList from "../chats";

const { height, width } = Dimensions.get("window");
const ADMIN_USERS = [".angel", "whoseslender"];
const databases = new Databases(client);

// --- MOCK DATA TRENDING ---
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
        title: "Welcome to Mood",
        artist: "The Official Guide",
        cover: null,
        preview: "",
        caption: "Experience music differently.",
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

// --- SKELETON LOADERS ---
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
                        source={{ uri: item.avatar || item.pfp }}
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
        {t("story.yourStory")}
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
        {t("story.yourStory")}
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

const EmptyStateWithSuggestions = ({ suggestions, onGoToExplore }: any) => {
  return (
    <View className="px-4 py-12 items-center justify-center">
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

// ==========================================
// STORY CREATION MODAL (REDDISEÑADO & TRENDING REAL)
// ==========================================
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

  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  // NEW STATE FOR TRENDING
  const [trendingSongs, setTrendingSongs] = useState<any[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

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
    const songs = await searchSongs(randomTerm);
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
      Alert.alert(t("common.posted"), t("story.postedMsg"));
      onSuccess();
      onClose();
    } catch (error) {
      Alert.alert(t("common.error"), t("story.errorPosting"));
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
      <View className="flex-1 bg-black">
        {step === "search" ? (
          // --- SEARCH SCREEN ---
          // FIX LAYOUT: Usamos View con padding manual en vez de SafeAreaView
          <View className="flex-1 bg-black" style={{ paddingTop: insets.top }}>
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-zinc-900">
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
                    <Ionicons name="close-circle" size={20} color="#71717A" />
                  </TouchableOpacity>
                )}
              </View>

              {searching ? (
                <View className="mt-20">
                  <ActivityIndicator size="large" color="#5E17EB" />
                </View>
              ) : query.length === 0 ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* CLEAN TITLE: Sin emoji */}
                  <Text className="text-white font-bold text-xl mb-4 ml-1">
                    {t("story.trending")}
                  </Text>
                  {loadingTrending ? (
                    <ActivityIndicator color="#5E17EB" className="mt-10" />
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
                              name={isPlaying ? "pause-circle" : "play-circle"}
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
          </View>
        ) : (
          // --- PREVIEW SCREEN (REDESIGNED MINIMALIST) ---
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="flex-1 relative">
              <Image
                source={{ uri: selectedSong.cover }}
                className="absolute w-full h-full"
                blurRadius={90}
                style={{ opacity: 0.6 }}
              />
              <LinearGradient
                colors={["transparent", "#000000"]}
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
                  <Ionicons name="chevron-down" size={28} color="white" />
                </TouchableOpacity>
              </View>

              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                    colors={["transparent", "rgba(0,0,0,0.8)"]}
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
                    placeholder={t("story.captionPlaceholder")} // Traducción
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
                    <Ionicons name="arrow-forward" size={32} color="white" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        )}
      </View>
    </Modal>
  );
};

// ==========================================
// STORY VIEWER (REDDISEÑADO & FIX MUTE)
// ==========================================
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
  const [isAudioReady, setIsAudioReady] = useState(false); // NUEVO ESTADO PARA BUG AUDIO

  const pressStartTime = useRef<number>(0);
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;

  const { t } = useLanguage(); // TRADUCCIONES

  const currentStory = group?.stories ? group.stories[currentIndex] : null;
  const songData = currentStory ? parseSongData(currentStory.songData) : null;
  const isOwner = group?.userId === currentUserId;
  const viewersList = currentStory?.viewers || [];
  const viewersCount = viewersList.length;

  const isOfficialMood = group?.userId === MOOD_OFFICIAL_ID;
  const isVerified = group?.user?.isVerified || isOfficialMood;

  // FIX: Solo pasamos la URL al reproductor SI el audio está configurado
  const player = useAudioPlayer(
    isAudioReady && liveAudioUrl ? liveAudioUrl : ""
  );

  // --- AUDIO FIX (GATEKEEPER) ---
  useEffect(() => {
    if (visible) {
      setIsAudioReady(false); // 1. Bloqueamos audio
      const enableAudio = async () => {
        try {
          // 2. Configuramos sesión (PlayAndRecord es la clave en iOS para ignorar mute)
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });
          setIsAudioReady(true); // 3. Liberamos audio
        } catch (e) {
          console.log("Audio mode error", e);
          setIsAudioReady(true); // Fallback: liberar de todos modos
        }
      };
      enableAudio();
    } else {
      setIsAudioReady(false); // Reset al cerrar
    }
  }, [visible]);

  useEffect(() => {
    const fetchPreviewViewers = async () => {
      if (isOwner && viewersList.length > 0) {
        const idsToFetch = viewersList.slice(-3).reverse();
        try {
          const fetchedUsers = await Promise.all(
            idsToFetch.map((id: string) => getUser(id))
          );
          setPreviewViewers(fetchedUsers.filter((u) => u !== null));
        } catch (e) {
          console.log("Error fetching preview viewers", e);
        }
      } else {
        setPreviewViewers([]);
      }
    };
    if (visible && currentStory) {
      fetchPreviewViewers();
    }
  }, [currentIndex, visible, isOwner]);

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
        ])
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
        ])
      ).start();
    }
  }, [isOfficialMood, currentIndex]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
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
    if (visible) {
      setCurrentIndex(0);
      setProgress(0);
      translateY.setValue(0);
      setIsPaused(false);
      setViewersModalVisible(false);
      setDetailsVisible(false);
      if (currentStory && currentUserId) {
        setIsSaved(currentStory.savedBy?.includes(currentUserId) || false);
      }
    }
  }, [visible, group, currentStory, currentUserId]);

  useEffect(() => {
    // 4. CHECK DE SEGURIDAD: Si no está listo el audio, NO HACER NADA
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
      } catch (e) {
        console.log("Player control error", e);
      }
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
    isAudioReady, // Dependencia clave
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
        {
          savedBy: newSavedBy,
        }
      );

      currentStory.savedBy = newSavedBy;
    } catch (error) {
      console.log("Error saving story:", error);
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
              currentStory.$id
            );
            const updatedStories = group.stories.filter(
              (s: any) => s.$id !== currentStory.$id
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
        <View className="flex-1 bg-black">
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
              {isOfficialMood ? (
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
                    colors={["#4F089A", "transparent", "#000000"]}
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
                    colors={[
                      "rgba(0,0,0,0.6)",
                      "transparent",
                      "transparent",
                      "rgba(0,0,0,0.9)",
                    ]}
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

                {/* --- CONTENIDO DE LA HISTORIA --- */}
                <View className="flex-1 justify-center items-center px-8 z-15">
                  {isOfficialMood ? (
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
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => {
                          setIsPaused(true);
                          setDetailsVisible(true);
                        }}
                        style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 10 },
                          shadowOpacity: 0.5,
                          shadowRadius: 20,
                          elevation: 10,
                          zIndex: 20,
                        }}
                      >
                        <Image
                          source={{ uri: songData.cover }}
                          style={{ width: width - 60, height: width - 60 }}
                          className="rounded-2xl"
                          resizeMode="cover"
                        />
                      </TouchableOpacity>

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
                      className="flex-row items-center bg-black/40 px-4 py-2.5 rounded-full border border-white/10 backdrop-blur-md"
                    >
                      <View className="flex-row mr-2 items-center">
                        {previewViewers.length > 0 ? (
                          previewViewers.slice(0, 3).map((v, i) => (
                            <Image
                              key={i}
                              source={{ uri: v.pfp || v.avatar }}
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
                        {viewersCount} {t("story.views")}
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
          viewerIds={viewersList}
        />

        {/* --- MOOD CARD (DETALLES) --- */}
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

// --- PANTALLA PRINCIPAL ---
const Home = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();
  const { user, loading, loggedIn } = useGlobalContext();

  const [data, setData] = useState({
    feedPosts: [] as any[],
    groupedStories: [] as any[],
    isLoading: true,
    refreshing: false,
    suggestedUsers: [] as any[],
    notiCount: 0,
    msgCount: 0,
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [shareContacts, setShareContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

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
  const [storyInitialSongData, setStoryInitialSongData] = useState<any>(null);

  const flatListRef = useRef<FlatList>(null);

  const translateX = useRef(new Animated.Value(0)).current;
  const onPanGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onPanHandlerStateChange = ({ nativeEvent }: any) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      if (nativeEvent.translationX < -120 || nativeEvent.velocityX < -700) {
        Animated.timing(translateX, {
          toValue: -width,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          router.push("/chats" as any);
          setTimeout(() => translateX.setValue(0), 500);
        });
      } else {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
      }
    }
  };

  const fetchData = async () => {
    try {
      let activeId = user?.$id;
      if (!activeId) {
        const u = await getCurrentUser();
        if (u) {
          activeId = u.$id;
          setCurrentUserId(u.$id);
        }
      } else if (!currentUserId) {
        setCurrentUserId(activeId);
      }

      const [counts, storiesData, feedData] = await Promise.all([
        activeId ? fetchCounts(activeId) : Promise.resolve({ noti: 0, msg: 0 }),
        activeId ? fetchStoriesInternal(activeId) : Promise.resolve([]),
        getFeedCandidates().catch(() => []),
      ]);

      let followedIds = activeId
        ? await getFollowedUserIds(activeId).catch(() => [])
        : [];

      const timelinePosts = feedData.filter((post: any) => {
        const creatorId = getCreatorId(post);
        if (!creatorId || creatorId === "unknown") return false;
        return creatorId === activeId || followedIds.includes(creatorId);
      });

      let suggestions: any[] = [];
      if (timelinePosts.length === 0 && activeId) {
        const uniqueCreators = new Map();
        feedData.forEach((post: any) => {
          const creatorId = getCreatorId(post);
          if (
            creatorId &&
            creatorId !== activeId &&
            !followedIds.includes(creatorId)
          ) {
            let creatorObj = post.creator || post.postedBy || post.users?.[0];
            if (creatorObj && !uniqueCreators.has(creatorId))
              uniqueCreators.set(creatorId, creatorObj);
          }
        });
        suggestions = Array.from(uniqueCreators.values()).slice(0, 5);
      }

      setData((prev) => ({
        ...prev,
        feedPosts: timelinePosts.sort(
          (a: any, b: any) =>
            new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
        ),
        groupedStories: storiesData,
        suggestedUsers: suggestions,
        notiCount: counts.noti,
        msgCount: counts.msg,
        isLoading: false,
        refreshing: false,
      }));
    } catch (error) {
      console.log("Error en fetchData", error);
      setData((prev) => ({ ...prev, isLoading: false, refreshing: false }));
    }
  };

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
      const storiesDocs = await getStories(userId);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentStories = storiesDocs.filter(
        (doc: any) => new Date(doc.$createdAt) > oneDayAgo
      );

      const uniqueUserIds = new Set<string>();
      const userMap = new Map<string, any>();

      if (user) userMap.set(userId, user);

      recentStories.forEach((doc: any) => {
        if (doc.user && typeof doc.user === "string" && doc.user !== userId) {
          uniqueUserIds.add(doc.user);
        }
      });

      const idsToFetch = Array.from(uniqueUserIds).filter(
        (id) => !userMap.has(id)
      );

      if (idsToFetch.length > 0) {
        await Promise.all(
          idsToFetch.map(async (id) => {
            try {
              const u = await getUser(id);
              if (u) userMap.set(id, u);
            } catch (e) {}
          })
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

      return Object.values(groups);
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const isFetchingRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      await fetchData();
      isFetchingRef.current = false;
    };
    init();
  }, [user, loggedIn]);

  const onRefresh = async () => {
    if (isFetchingRef.current) return;
    setData((prev) => ({ ...prev, refreshing: true }));
    isFetchingRef.current = true;
    await fetchData();
    isFetchingRef.current = false;
  };

  useEffect(() => {
    if (!user?.$id) return;
    const channels = [
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.notificationsCollectionId}.documents`,
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`,
    ];

    const unsubscribe = client.subscribe(channels, async (response) => {
      const event = response.events[0];
      const payload: any = response.payload;
      const isNoti =
        event.includes(
          `collections.${appwriteConfig.notificationsCollectionId}`
        ) && payload.userId === user.$id;
      const isMsg =
        event.includes(`collections.${appwriteConfig.messagesCollectionId}`) &&
        (payload.receiverId === user.$id || payload.senderId === user.$id);

      if (isNoti || isMsg) {
        const counts = await fetchCounts(user.$id);
        setData((prev) => ({
          ...prev,
          notiCount: counts.noti,
          msgCount: counts.msg,
        }));
      }
    });
    return () => {
      unsubscribe();
    };
  }, [user]);

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
            setData((prev) => ({
              ...prev,
              feedPosts: prev.feedPosts.filter((p) => p.$id !== post.$id),
            }));
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
      const followedIds = await getFollowedUserIds(userId);
      if (followedIds.length > 0) {
        const promises = followedIds.map((id) => getUser(id));
        const users = await Promise.all(promises);
        return users.filter((u) => u !== null);
      }
    } catch (error) {
      console.log("Error", error);
    }
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
      console.log("Search error:", error);
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
      "El enlace al post ha sido copiado al portapapeles."
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ position: "absolute", width, height, zIndex: 0 }}>
        <ChatsList />
      </View>

      <PanGestureHandler
        onGestureEvent={onPanGestureEvent}
        onHandlerStateChange={onPanHandlerStateChange}
        activeOffsetX={[-20, 20]}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: isDark ? "#000" : "#fff",
            transform: [
              {
                translateX: translateX.interpolate({
                  inputRange: [-width, 0],
                  outputRange: [-width, 0],
                  extrapolate: "clamp",
                }),
              },
            ],
            shadowColor: "#000",
            shadowOffset: { width: 10, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 15,
            elevation: 20,
          }}
        >
          <SafeAreaView
            className="flex-1"
            edges={["top"]}
            style={{ backgroundColor: isDark ? "#000000" : "#FFFFFF" }}
          >
            <TopBar
              notificationCount={data.notiCount}
              messageCount={data.msgCount}
            />

            {data.isLoading ? (
              <FeedSkeleton isDark={isDark} />
            ) : (
              <FlatList
                data={data.feedPosts}
                keyExtractor={(item) => item.$id}
                ListHeaderComponent={
                  <StoriesRail
                    currentUser={user}
                    groupedStories={data.groupedStories}
                    onPressStoryGroup={(g: any) => {
                      setActiveStoryGroup(g);
                      setStoryViewerVisible(true);
                    }}
                    onAddStory={() => {
                      setStoryInitialSongData(null);
                      setCreationVisible(true);
                    }}
                  />
                }
                renderItem={renderItem}
                refreshControl={
                  <RefreshControl
                    refreshing={data.refreshing}
                    onRefresh={onRefresh}
                    tintColor="#5E17EB"
                  />
                }
                ListEmptyComponent={
                  <EmptyStateWithSuggestions
                    suggestions={data.suggestedUsers}
                    onGoToExplore={() => router.push("/explore" as any)}
                  />
                }
              />
            )}

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
              onSuccess={() => fetchData()}
              initialSongData={storyInitialSongData}
            />
            <StoryViewer
              visible={isStoryViewerVisible}
              onClose={() => setStoryViewerVisible(false)}
              group={activeStoryGroup}
              currentUserId={currentUserId}
              onAddMore={() => {
                setStoryInitialSongData(null);
                setCreationVisible(true);
              }}
              onRefreshFeed={() => fetchData()}
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
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
};

export default Home;
