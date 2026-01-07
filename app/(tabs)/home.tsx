import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
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
} from "@/lib/appwrite";
import OptionsModal from "@/components/OptionsModal";
import PostItem from "@/components/PostItem"; // <--- ESTE ES EL QUE REDISEÑAREMOS ABAJO
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";
import MoodShareCard from "@/components/MoodShareCard";

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
  // Usamos un fondo un poco más sofisticado (Zinc-950) en dark mode
  const bgColor = isDark ? "#09090B" : "#FFFFFF";
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

  const [isViralModalVisible, setViralModalVisible] = useState(false);
  const [postToShareData, setPostToShareData] = useState<any>(null);
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
        const nCount = await getUnreadNotificationCount(activeId);
        const mCount = await getUnreadMessagesCount(activeId);
        setNotiCount(nCount);
        setMsgCount(mCount);
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

  useEffect(() => {
    if (!loading) fetchData();
  }, [user, loading, loggedIn]);

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

  const openShare = (post: any) => {
    setPostToShareData(post);
    setViralModalVisible(true);
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
      <StatusBar style={isDark ? "light" : "dark"} />
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
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }} // Espacio al final
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

      <MoodShareCard
        isVisible={isViralModalVisible}
        onClose={() => setViralModalVisible(false)}
        post={getViralPostData()}
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
