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
import { router, useNavigation } from "expo-router"; // Importamos useNavigation
import { useGlobalContext } from "@/context/GlobalProvider";
import TopBar from "@/components/TopBar";
import {
  getFeedCandidates,
  getFollowedUserIds,
  getCurrentUser,
  deletePost,
  reportPost,
} from "@/lib/appwrite";
import ShareModal from "@/components/ShareModal";
import OptionsModal from "@/components/OptionsModal";
import PostItem from "@/components/PostItem";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";

// Función auxiliar simple para obtener ID del creador
const getCreatorId = (item: any) => {
  let userObj = item.creator || item.postedBy || item.users || item.user;
  if (Array.isArray(userObj) && userObj.length > 0) userObj = userObj[0];
  if (userObj && typeof userObj === "object") {
    return userObj.$id || userObj.accountId;
  }
  return "unknown";
};

const Home = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";

  const { t } = useLanguage();
  const { user, loading, loggedIn } = useGlobalContext();

  // CORRECCIÓN AQUÍ: Usamos <any> para evitar el error de TypeScript con 'tabPress'
  const navigation = useNavigation<any>();

  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // --- ESTADOS PARA MODALES ---
  const [isShareVisible, setShareVisible] = useState(false);
  const [postToShare, setPostToShare] = useState<string>("");
  const [isOptionsVisible, setOptionsVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  const flatListRef = useRef<FlatList>(null);

  // --- DATA FETCHING ---
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

  // --- DETECTAR CLIC EN EL BOTÓN HOME (TabPress) ---
  useEffect(() => {
    // Escuchamos el evento 'tabPress'
    const unsubscribe = navigation.addListener("tabPress", (e: any) => {
      // Si la pantalla ya está enfocada (estamos en Home y tocamos Home de nuevo)
      if (navigation.isFocused()) {
        // e.preventDefault(); // (Opcional) Descomenta si quieres evitar cualquier comportamiento por defecto

        // 1. Scroll suave hacia arriba
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

        // 2. Refrescar los datos
        onRefresh();
      }
    });

    return unsubscribe;
  }, [navigation]);

  // --- LÓGICA MODALES ---

  const openOptions = (post: any) => {
    setSelectedPost(post);
    setOptionsVisible(true);
  };

  const openShare = (postId: string) => {
    setPostToShare(postId);
    setShareVisible(true);
  };

  const handleDeleteAction = () => {
    if (!selectedPost) return;
    const post = selectedPost;
    setOptionsVisible(false);

    Alert.alert(
      "¿Eliminar definitivamente?",
      "Esta acción no se puede deshacer.",
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
              Alert.alert("Error", "No se pudo eliminar el post");
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

    Alert.alert(
      "Reportar Publicación",
      "¿Por qué quieres reportar este contenido?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Contenido Inapropiado",
          onPress: () => submitReport("inappropriate"),
        },
        { text: "Spam", onPress: () => submitReport("spam") },
        { text: "Otro", onPress: () => submitReport("other") },
      ]
    );
  };

  const submitReport = async (reason: string) => {
    if (!user) {
      Alert.alert("Error", "Debes iniciar sesión para reportar.");
      return;
    }
    try {
      await reportPost(selectedPost.$id, user.$id, reason);
      Alert.alert("Gracias", "Hemos recibido tu reporte y lo revisaremos.");
    } catch (error) {
      Alert.alert("Error", "No se pudo enviar el reporte.");
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <PostItem
        post={item}
        currentUserId={user?.$id || currentUserId || ""}
        onProfilePress={(userId) => router.push(`/user/${userId}` as any)}
        onCommentPress={(postId) => router.push(`/post/${postId}` as any)}
        onOptionsPress={() => openOptions(item)}
        onSharePress={() => openShare(item.$id)}
      />
    );
  };

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: bgColor }}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <TopBar />

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
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#5E17EB"
            />
          }
          ListEmptyComponent={() => (
            <View className="flex-1 mt-20 items-center px-6">
              <Ionicons name="people-outline" size={48} color={subTextColor} />
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

      {/* MODALES */}
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
          (selectedPost?.postedBy?.$id || selectedPost?.creator?.$id) ===
          user?.$id
        }
      />
    </SafeAreaView>
  );
};

export default Home;
