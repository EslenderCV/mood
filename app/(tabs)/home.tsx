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
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAudioPlayer } from "expo-audio";
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
  getOrCreateChat, // Importado para la lógica de chat
} from "@/lib/appwrite";
import OptionsModal from "@/components/OptionsModal";
import PostItem from "@/components/PostItem";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";
import MoodShareCard from "@/components/MoodShareCard";
import ShareModal from "@/components/ShareModal";

const { height, width } = Dimensions.get("window");
const ADMIN_USERS = [".angel", "whoseslender"];
const databases = new Databases(client);

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
    console.error("Error buscando canciones:", e);
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
        <View className="flex-1 items-end">
          <View className={`w-6 h-1 rounded ${elementBg}`} />
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
          <View className="flex-row gap-1 mt-1">
            <View className={`w-1 h-1 rounded-full ${elementBg}`} />
            <View className={`w-1 h-1 rounded-full ${elementBg}`} />
            <View className={`w-1 h-1 rounded-full ${elementBg}`} />
          </View>
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

// --- COMPONENTE: Modal de Vistos (Viewers) ---
const ViewersModal = ({ visible, onClose, viewerIds }: any) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
                Visto por {users.length} personas
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
                      Aún nadie ha visto tu historia.
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

              {/* AQUI ESTA LA CORRECCION DEL BADGE EN STORIES */}
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
                    color="#5E17EB" // Morado Mood
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

// --- COMPONENTE: Estado Vacío con Sugerencias ---
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

// --- COMPONENTE: Modal de Creación (MODIFICADO) ---
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

  // Efecto para manejar la inicialización rápida si se comparte desde un post
  useEffect(() => {
    if (visible && initialSongData) {
      setSelectedSong(initialSongData);
      setStep("preview");
      setPreviewTrackUrl(null);
    } else if (visible && !initialSongData) {
      resetForm();
    }
  }, [visible, initialSongData]);

  // Audio Playback Effect
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

// --- COMPONENTE: Visor de Historias (CORREGIDO) ---
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

  // Estados para Gestos
  const [isPaused, setIsPaused] = useState(false);
  const [viewersModalVisible, setViewersModalVisible] = useState(false);
  // [NUEVO] Referencia para medir la duración del toque y evitar conflictos
  const pressStartTime = useRef<number>(0);

  // Insets (Safe Area)
  const insets = useSafeAreaInsets();

  // Animaciones
  const translateY = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const currentStory = group?.stories ? group.stories[currentIndex] : null;
  const songData = currentStory ? parseSongData(currentStory.songData) : null;
  const isOwner = group?.userId === currentUserId;
  const viewersList = currentStory?.viewers || [];
  const viewersCount = viewersList.length;

  const isOfficialMood = group?.userId === MOOD_OFFICIAL_ID;
  const isVerified = group?.user?.isVerified || isOfficialMood;

  const player = useAudioPlayer(liveAudioUrl || "");
  const STORY_DURATION = 30000;

  // --- Animaciones Oficiales (Mood Team) ---
  useEffect(() => {
    if (isOfficialMood) {
      fadeAnim.setValue(0);
      slideAnim.setValue(20);

      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(logoScale, {
              toValue: 1.1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(logoScale, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.stagger(300, [
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
        ]),
      ]).start();
    }
  }, [isOfficialMood, currentIndex]);

  // --- GESTO: Swipe Down ---
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = ({ nativeEvent }: any) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      if (nativeEvent.translationY > 100) {
        onClose();
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  // --- AUDIO LOGIC ---
  useEffect(() => {
    const fetchFreshAudio = async () => {
      if (!songData) return;
      setLiveAudioUrl(null);

      try {
        const trackId = songData.id || songData.spotifyId;
        if (trackId) {
          const url = await getDeezerTrackUrl(trackId);
          setLiveAudioUrl(url);
        } else {
          setLiveAudioUrl(songData.preview);
        }
      } catch (e) {
        console.log("Error fetching story audio", e);
      }
    };

    if (visible) {
      fetchFreshAudio();
    }
  }, [currentIndex, visible, group]);

  useEffect(() => {
    if (visible && currentStory && currentUserId && !isOwner) {
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

    if (liveAudioUrl) {
      try {
        if (player && !isPaused && !viewersModalVisible) {
          player.play();
          player.loop = false;
        } else if (player && (isPaused || viewersModalVisible)) {
          player.pause();
        }
      } catch (e) {
        console.log("Error playing story audio:", e);
      }
    }

    if (isPaused || viewersModalVisible) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          handleNext();
          return 0;
        }
        return prev + 100 / (STORY_DURATION / 100);
      });
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [
    currentIndex,
    visible,
    currentStory,
    player,
    liveAudioUrl,
    isPaused,
    viewersModalVisible,
  ]);

  // --- LOGICA DE NAVEGACIÓN Y BORRADO ---
  const handleNext = () => {
    if (currentIndex < (group?.stories.length || 0) - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      setTimeout(() => {
        onClose();
      }, 0);
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

  const handleDeleteStory = async () => {
    setIsPaused(true);
    Alert.alert(
      "Eliminar historia",
      "¿Seguro que quieres eliminar esta historia?",
      [
        {
          text: "Cancelar",
          style: "cancel",
          onPress: () => setIsPaused(false),
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await databases.deleteDocument(
                appwriteConfig.databaseId,
                appwriteConfig.storiesCollectionId,
                currentStory.$id
              );

              // Remover localmente
              const updatedStories = group.stories.filter(
                (s: any) => s.$id !== currentStory.$id
              );
              if (updatedStories.length > 0) {
                group.stories = updatedStories;
                if (currentIndex >= updatedStories.length) {
                  setCurrentIndex(updatedStories.length - 1);
                }
                setIsPaused(false);
              } else {
                onClose();
                if (onRefreshFeed) onRefreshFeed();
              }
            } catch (error) {
              console.log("Error deleting story:", error);
              Alert.alert("Error", "No se pudo eliminar la historia.");
              setIsPaused(false);
            }
          },
        },
      ]
    );
  };

  if (!visible || !currentStory || !songData) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
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
                <LinearGradient
                  colors={["#5E17EB", "#000000"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="absolute w-full h-full"
                />
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
                {/* --- ÁREAS DE TOQUE PARA NAVEGACIÓN [CORREGIDO BUG DE GESTOS] --- */}
                <View
                  className="absolute w-full h-full flex-row z-10"
                  pointerEvents="box-none"
                >
                  <Pressable
                    className="h-full w-[30%]"
                    onPress={() => {
                      // Solo navegar si el toque fue rápido (menos de 200ms)
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
                      // Solo navegar si el toque fue rápido (menos de 200ms)
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

                {/* HEADER: Progress + User Info */}
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

                          {/* CORREGIDO: BADGE EN STORY VIEWER */}
                          {isVerified && (
                            <MaterialIcons
                              name="verified"
                              size={16}
                              color="#5E17EB" // Morado Mood
                              style={{ marginLeft: 4 }}
                            />
                          )}

                          <Text className="text-zinc-400 text-xs ml-2 font-medium">
                            {formatTimeAgo(currentStory.$createdAt)}
                          </Text>
                        </View>
                        <Text className="text-white/70 text-xs font-medium">
                          Mood Story
                        </Text>
                      </View>
                    </View>

                    {/* [MODIFICADO] Botón de eliminar movido al header */}
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
                            onClose();
                            setTimeout(onAddMore, 300);
                          }}
                          className="bg-white/10 p-2 rounded-full backdrop-blur-md border border-white/5"
                        >
                          <Ionicons name="add" size={24} color="white" />
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity onPress={onClose} className="p-1">
                        <Ionicons name="close" size={28} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* CONTENIDO PRINCIPAL */}
                <View className="flex-1 justify-center items-center px-8 pointer-events-none z-0">
                  {isOfficialMood ? (
                    <View className="items-center justify-center w-full">
                      <Animated.Image
                        source={require("@/assets/images/icon.png")}
                        style={{
                          width: 150,
                          height: 150,
                          borderRadius: 30,
                          transform: [{ scale: logoScale }],
                        }}
                        resizeMode="contain"
                      />

                      <Animated.View
                        style={{
                          opacity: fadeAnim,
                          transform: [{ translateY: slideAnim }],
                        }}
                      >
                        <Text className="text-white font-black text-4xl mt-10 text-center tracking-tight leading-10">
                          Welcome to the{"\n"}
                          <Text className="text-[#a882ff]">
                            Future of Sound
                          </Text>
                        </Text>
                      </Animated.View>

                      <Animated.View
                        style={{
                          opacity: fadeAnim,
                          transform: [{ translateY: slideAnim }],
                          marginTop: 30,
                        }}
                      >
                        <View className="bg-white/10 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
                          <Text className="text-zinc-200 text-center text-lg leading-7 font-medium">
                            Share your vibe. Connect through rhythm.{"\n"}
                            Experience music like never before.
                          </Text>
                        </View>
                      </Animated.View>
                    </View>
                  ) : (
                    <>
                      <Image
                        source={{ uri: songData.cover }}
                        style={{ width: width - 60, height: width - 60 }}
                        className="rounded-2xl shadow-2xl mb-8"
                        resizeMode="cover"
                      />

                      <View className="items-center w-full">
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

                {/* FOOTER ACTIONS */}
                <View className="px-4 pb-6 z-20 w-full items-center">
                  {isOwner ? (
                    <TouchableOpacity
                      onPress={() => {
                        setIsPaused(true);
                        setViewersModalVisible(true);
                      }}
                      activeOpacity={0.8}
                      className="flex-row items-center justify-center gap-2 px-6 py-3 bg-black/40 rounded-full backdrop-blur-md border border-white/10"
                    >
                      <Ionicons name="eye" size={20} color="white" />
                      <Text className="text-white font-bold text-base">
                        {viewersCount} Viewers
                      </Text>
                      <Ionicons
                        name="chevron-up"
                        size={16}
                        color="rgba(255,255,255,0.5)"
                      />
                    </TouchableOpacity>
                  ) : (
                    !isOfficialMood && (
                      <View className="flex-row items-center gap-3 w-full">
                        <View className="flex-1 h-12 rounded-full border border-white/20 px-5 justify-center bg-black/30 backdrop-blur-md">
                          <TextInput
                            placeholder="Send Message..."
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
                        <TouchableOpacity className="bg-black/30 p-3 rounded-full border border-white/20 backdrop-blur-md">
                          <Ionicons
                            name="paper-plane-outline"
                            size={24}
                            color="white"
                          />
                        </TouchableOpacity>
                      </View>
                    )
                  )}
                </View>
              </View>

              {/* [ELIMINADO] Se ha quitado el botón flotante rojo de aquí */}
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

  const subTextColor = isDark ? "#A1A1AA" : "#71717A";

  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [groupedStories, setGroupedStories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [shareContacts, setShareContacts] = useState<any[]>([]); // Contactos para compartir directo
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

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
  const [storyInitialSongData, setStoryInitialSongData] = useState<any>(null); // Para compartir post a historia
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

  useEffect(() => {
    if (!user?.$id) return;

    const channels = [
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.notificationsCollectionId}.documents`,
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`,
    ];

    const unsubscribe = client.subscribe(channels, (response) => {
      const event = response.events[0];
      const payload: any = response.payload;

      if (
        event.includes(
          `collections.${appwriteConfig.notificationsCollectionId}`
        )
      ) {
        if (payload.userId === user.$id) {
          updateCounts(user.$id);
        }
      }

      if (
        event.includes(`collections.${appwriteConfig.messagesCollectionId}`)
      ) {
        if (payload.receiverId === user.$id || payload.senderId === user.$id) {
          updateCounts(user.$id);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

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
      // FILTRO 24H: Aseguramos que solo pasen historias de las últimas 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const recentStories = storiesDocs.filter(
        (doc: any) => new Date(doc.$createdAt) > oneDayAgo
      );

      const groups: Record<string, any> = {};

      await Promise.all(
        recentStories.map(async (doc: any) => {
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

  // --- Lógica para obtener usuarios seguidos (Sugeridos) ---
  const fetchFollowedUsers = async (userId: string) => {
    try {
      const followedIds = await getFollowedUserIds(userId);
      if (followedIds.length > 0) {
        // Obtener detalles de usuarios
        const promises = followedIds.map((id) => getUser(id));
        const users = await Promise.all(promises);
        return users.filter((u) => u !== null);
      }
    } catch (error) {
      console.log("Error fetching share contacts", error);
    }
    return [];
  };

  // --- BUSQUEDA REAL EN APPWRITE ---
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

  // --- NUEVA LÓGICA DE COMPARTIR ---
  const openShare = async (post: any) => {
    setPostToShareData(post);
    setSharePostId(post.$id);
    setShareSelectorVisible(true);

    // Cargar contactos iniciales (seguidos)
    if (user?.$id && shareContacts.length === 0) {
      setIsLoadingContacts(true);
      const contacts = await fetchFollowedUsers(user.$id);
      setShareContacts(contacts);
      setIsLoadingContacts(false);
    }
  };

  // Manejador del buscador en el modal
  const handleShareSearch = async (text: string) => {
    setIsLoadingContacts(true);
    if (text.length > 0) {
      const results = await searchUsersInAppwrite(text);
      setShareContacts(results);
    } else if (user?.$id) {
      // Volver a seguidos si borra texto
      const contacts = await fetchFollowedUsers(user.$id);
      setShareContacts(contacts);
    }
    setIsLoadingContacts(false);
  };

  // [MODIFICADO] Solución completa: Texto vacío por defecto y sin createdAt
  const handleSendShare = async (userIds: string[], message: string) => {
    if (!user?.$id || !postToShareData) return;

    try {
      const promises = userIds.map(async (targetId) => {
        // 1. Obtener o crear el chat entre los dos usuarios
        const chatDoc = await getOrCreateChat(user.$id, targetId);

        if (!chatDoc) {
          throw new Error("No se pudo crear el chat para " + targetId);
        }

        // 2. Crear el mensaje dentro de ese CHAT (con chatId)
        return databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.messagesCollectionId,
          ID.unique(),
          {
            chatId: chatDoc.$id,
            senderId: user.$id,
            receiverId: targetId,
            content: message || "", // <--- CAMBIO AQUÍ: Cadena vacía en vez de texto por defecto
            sharedPostId: postToShareData.$id,
            isRead: false,
            // createdAt eliminado para evitar error de Appwrite
          }
        );
      });

      await Promise.all(promises);

      Alert.alert("Enviado", "El post se ha compartido correctamente.");
    } catch (error) {
      console.error("Error compartiendo post:", error);
      Alert.alert("Error", "No se pudo compartir el post.");
    }
  };

  // CORRECCIÓN: FETCH FRESCO PARA HISTORIAS
  const handleAddToStoryFromPost = async () => {
    if (!postToShareData) return;
    const songData = parseSongData(postToShareData.songData);

    if (songData) {
      // Intentar refrescar la URL del audio para que suene
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
    if (!postToShareData) return;
    // Aquí generarías un enlace profundo a tu app
    const link = `https://moodapp.com/post/${postToShareData.$id}`;
    try {
      await SystemShare.share({
        message: `¡Mira esta canción en Mood! ${link}`,
        url: link, // iOS
        title: "Compartir desde Mood", // Android
      });
    } catch (error) {
      console.log("Error sharing:", error);
    }
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
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: isDark ? "#000000" : "#FFFFFF" }}
    >
      <TopBar notificationCount={notiCount} messageCount={msgCount} />
      {/* CAMBIO: Implementación del Skeleton Loader Inteligente */}
      {isLoading ? (
        <FeedSkeleton isDark={isDark} />
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
              onAddStory={() => {
                setStoryInitialSongData(null); // Resetear datos iniciales
                setCreationVisible(true);
              }}
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

      {/* --- NUEVO MODAL SELECTOR DE COMPARTIR (ESTILO INSTAGRAM) --- */}
      <DirectShareSheet
        visible={isShareSelectorVisible}
        onClose={() => setShareSelectorVisible(false)}
        contacts={shareContacts}
        isDark={isDark}
        isLoadingContacts={isLoadingContacts}
        onSearch={handleShareSearch} // Conectado al buscador real
        onSend={handleSendShare} // [MODIFICADO] Conectado a la función real
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
          if (currentUserId) fetchStories(currentUserId);
        }}
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
        onRefreshFeed={() => {
          // Si borramos la ultima historia, refrescamos el feed
          if (currentUserId) fetchStories(currentUserId);
        }}
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
