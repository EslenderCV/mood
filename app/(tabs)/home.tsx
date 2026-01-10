import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
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
  client,
  appwriteConfig,
} from "@/lib/appwrite";
import OptionsModal from "@/components/OptionsModal";
import PostItem from "@/components/PostItem";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";
import MoodShareCard from "@/components/MoodShareCard";
import ShareModal from "@/components/ShareModal"; // <--- IMPORTADO

const ADMIN_USERS = [".angel", "whoseslender"];

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

const Home = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";

  const { t } = useLanguage();
  const { user, loading, loggedIn } = useGlobalContext();
  const navigation = useNavigation<any>();

  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [notiCount, setNotiCount] = useState(0);
  const [msgCount, setMsgCount] = useState(0);

  // --- ESTADOS PARA COMPARTIR ---
  const [isViralModalVisible, setViralModalVisible] = useState(false); // Externo
  const [isShareVisible, setShareVisible] = useState(false); // Interno
  const [isShareSelectorVisible, setShareSelectorVisible] = useState(false); // Selector

  const [postToShareData, setPostToShareData] = useState<any>(null); // Objeto
  const [sharePostId, setSharePostId] = useState<string>(""); // ID String

  const [isOptionsVisible, setOptionsVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);

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
      }

      let followedIds: string[] = [];
      if (activeId) {
        try {
          followedIds = await getFollowedUserIds(activeId);
        } catch (e) {
          console.log("Error fetching follows:", e);
        }
      }

      let rawPosts: any[] = [];
      try {
        rawPosts = await getFeedCandidates();
      } catch (e) {
        console.log("Error fetching posts:", e);
      }

      const timelinePosts = rawPosts.filter((post: any) => {
        const creatorId = getCreatorId(post);
        if (!creatorId || creatorId === "unknown") return false;
        const isMine = creatorId === activeId;
        const isFollowed = followedIds.includes(creatorId);
        return isMine || isFollowed;
      });

      timelinePosts.sort((a: any, b: any) => {
        return (
          new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
        );
      });

      setFeedPosts(timelinePosts);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
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
    } catch (error) {
      console.log("Error updating counts:", error);
    }
  };

  useEffect(() => {
    if (!loading) fetchData();
  }, [user, loading, loggedIn]);

  useEffect(() => {
    if (!currentUserId || !client) return;

    const channels = [
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.notificationsCollectionId}.documents`,
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`,
    ];

    const unsubscribe = client.subscribe(channels, (response) => {
      if (
        response.events.includes(
          "databases.*.collections.*.documents.*.create"
        ) ||
        response.events.includes(
          "databases.*.collections.*.documents.*.update"
        ) ||
        response.events.includes("databases.*.collections.*.documents.*.delete")
      ) {
        const payload: any = response.payload;
        const isForMe =
          payload.userId === currentUserId ||
          payload.to === currentUserId ||
          payload.receiverId === currentUserId ||
          (payload.users && payload.users.includes(currentUserId));

        if (isForMe) {
          updateCounts(currentUserId);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUserId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", (e: any) => {
      if (navigation.isFocused()) {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        onRefresh();
      }
    });
    return unsubscribe;
  }, [navigation]);

  const openOptions = (post: any) => {
    setSelectedPost(post);
    setOptionsVisible(true);
  };

  // --- LÓGICA DE COMPARTIR ACTUALIZADA ---
  const openShare = (post: any) => {
    setPostToShareData(post);
    setSharePostId(post.$id);
    setShareSelectorVisible(true); // Abre el selector
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

  const handleDeleteAction = () => {
    if (!selectedPost) return;
    const post = selectedPost;
    setOptionsVisible(false);

    Alert.alert(
      "¿Eliminar Publicación?",
      ADMIN_USERS.includes(user?.username || "")
        ? "Modo Admin"
        : "Esta acción no se puede deshacer.",
      [
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
      ]
    );
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

  const borderColor = isDark ? "#27272A" : "#E5E5E5";

  const renderItem = ({ item }: { item: any }) => {
    return (
      <View
        className="py-4 border-1 border-b"
        style={{ borderColor: borderColor }}
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
    (selectedPost?.postedBy?.$id || selectedPost?.creator?.$id) === user?.$id;
  const isAdmin = ADMIN_USERS.includes(user?.username || "");

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: bgColor }}
    >
      <TopBar notificationCount={notiCount} messageCount={msgCount} />

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#5E17EB" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={feedPosts}
          keyExtractor={(item) => item.$id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#5E17EB"
            />
          }
          ListEmptyComponent={() => (
            <View className="flex-1 mt-20 items-center px-6">
              <Ionicons
                name="musical-notes-outline"
                size={48}
                color={subTextColor}
              />
              <Text
                className="mt-4 text-center text-lg font-medium"
                style={{ color: subTextColor }}
              >
                {t("feed.emptyTitle")}
              </Text>
              <Text
                className="mt-2 text-center text-sm"
                style={{ color: subTextColor }}
              >
                {t("feed.emptySubtitle")}
              </Text>
            </View>
          )}
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
                style={{ backgroundColor: isDark ? "#18181B" : "white" }}
              >
                <View className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full self-center mb-6" />

                <Text
                  className="text-xl font-bold text-center mb-8"
                  style={{ color: isDark ? "white" : "black" }}
                >
                  Compartir Publicación
                </Text>

                <View className="flex-row gap-4">
                  {/* OPCIÓN INTERNA (MOOD) */}
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

                  {/* OPCIÓN EXTERNA (VIRAL) */}
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

      {/* --- MODAL VIRAL (EXTERNO) --- */}
      <MoodShareCard
        isVisible={isViralModalVisible}
        onClose={() => setViralModalVisible(false)}
        post={getViralPostData()}
      />

      {/* --- MODAL SHARE (INTERNO) --- */}
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
        isOwner={isPostOwner || isAdmin}
      />
    </SafeAreaView>
  );
};

export default Home;
