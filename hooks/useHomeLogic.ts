import { useState, useEffect, useCallback, useRef } from "react";
import { Alert, FlatList } from "react-native";
import { useGlobalContext } from "@/context/GlobalProvider";
import { useFeed } from "@/context/FeedProvider";
import { useNavigation } from "expo-router";
import {
  getCurrentUser,
  getFollowedUserIds,
  getUnreadNotificationCount,
  getUnreadMessagesCount,
  getStories,
  client,
  appwriteConfig,
  getUser,
  uploadFile,
  createStory,
} from "@/lib/appwrite";
import { Databases, Query, ID, Storage } from "react-native-appwrite";
import * as ImagePicker from "expo-image-picker";

const databases = new Databases(client);
const MOOD_OFFICIAL_ID = "696b571b00112fd5c1e9";

// --- HELPER PARA MEZCLAR ARRAY ---
const shuffleArray = (array: any[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const useHomeLogic = () => {
  const { user } = useGlobalContext();
  const {
    feed,
    isLoading: isFeedLoading,
    isRefreshing,
    refreshFeed,
  } = useFeed();
  const navigation = useNavigation<any>();
  const flatListRef = useRef<FlatList>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Estados de Datos
  const [sortedFeed, setSortedFeed] = useState<any[]>([]);
  const [myFollowedIds, setMyFollowedIds] = useState<string[]>([]);
  const [poolOfContent, setPoolOfContent] = useState<any[]>([]);

  const [notiCount, setNotiCount] = useState(0);
  const [msgCount, setMsgCount] = useState(0);

  const [localData, setLocalData] = useState({
    groupedStories: [] as any[],
    suggestedUsers: [],
  });

  // Estados de Modales
  const [modals, setModals] = useState({
    isShareSelector: false,
    isViral: false,
    isShare: false,
    isStoryViewer: false,
    isCreation: false,
    isOptions: false,
    isCreator: false,
  });

  // Estados Auxiliares
  const [activeStoryGroup, setActiveStoryGroup] = useState(null);
  const [postToShareData, setPostToShareData] = useState<any>(null);
  const [sharePostId, setSharePostId] = useState("");
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [storyInitialSongData, setStoryInitialSongData] = useState<any>(null);
  const [shareContacts, setShareContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  // --- LÓGICA DE GALERÍA ---
  const handleMoodMediaPick = async () => {
    setModals((prev) => ({ ...prev, isCreator: false }));

    setTimeout(async () => {
      if (!user) return;

      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso denegado", "Necesitamos acceso a la galería.");
        return;
      }

      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsEditing: false,
          quality: 1,
        });

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          Alert.alert(
            "Subiendo",
            "Tu historia se está subiendo en segundo plano...",
          );

          const file = {
            fileName: asset.fileName || `story_${Date.now()}.jpg`,
            mimeType: asset.type === "video" ? "video/mp4" : "image/jpeg",
            uri: asset.uri,
            fileSize: asset.fileSize || 0,
          };

          const uploadedFile = await uploadFile(file);
          if (!uploadedFile) throw new Error("Fallo la subida");

          const songData = JSON.stringify({
            title: "Mood Update",
            artist: "Mood Team",
            cover: uploadedFile,
            preview: "",
            spotifyId: "mood_custom_" + Date.now(),
            caption: "",
            mediaType: asset.type,
          });

          await createStory(songData, user.$id);
          fetchAuxiliaryData();
          Alert.alert("Éxito", "Historia publicada");
        }
      } catch (e: any) {
        console.log("Error media:", e);
        Alert.alert("Error", "No se pudo subir.");
      }
    }, 500);
  };

  const fetchCounts = async (userId: string) => {
    try {
      const [n, m] = await Promise.all([
        getUnreadNotificationCount(userId),
        getUnreadMessagesCount(userId),
      ]);
      setNotiCount(n);
      setMsgCount(m);
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
        (doc: any) => new Date(doc.$createdAt) > oneDayAgo,
      );

      const uniqueUserIds = new Set<string>();
      const userMap = new Map<string, any>();
      if (user) userMap.set(userId, user);

      recentStories.forEach((doc: any) => {
        if (doc.user) {
          if (typeof doc.user === "object" && doc.user.$id) {
            userMap.set(doc.user.$id, doc.user);
          } else if (typeof doc.user === "string" && doc.user !== userId) {
            uniqueUserIds.add(doc.user);
          }
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
        let uId = typeof doc.user === "object" ? doc.user.$id : doc.user;
        const userData =
          userMap.get(uId) ||
          (typeof doc.user === "object"
            ? doc.user
            : { $id: uId, username: "Usuario", name: "Usuario" });

        if (!groups[uId]) {
          groups[uId] = {
            userId: uId,
            user: userData,
            stories: [],
          };
        }
        groups[uId].stories.push(doc);
      });

      return Object.values(groups);
    } catch (e) {
      return [];
    }
  };

  const fetchAuxiliaryData = useCallback(async () => {
    try {
      let activeId = user?.$id || currentUserId;
      if (!activeId) {
        const u = await getCurrentUser();
        if (u) {
          activeId = u.$id;
          setCurrentUserId(u.$id);
        } else {
          return;
        }
      }

      if (activeId) {
        const officialStoriesRes = await databases
          .listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.storiesCollectionId,
            [Query.equal("user", MOOD_OFFICIAL_ID)],
          )
          .catch(() => ({ documents: [] }));

        const myStories: any[] = await fetchStoriesInternal(activeId);

        const officialDocs = officialStoriesRes.documents;
        const officialGroupIndex = myStories.findIndex(
          (g) => g.userId === MOOD_OFFICIAL_ID,
        );

        if (officialDocs.length > 0) {
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
          if (officialGroupIndex !== -1)
            myStories.splice(officialGroupIndex, 1);
          myStories.unshift(officialGroup);
        }

        const myGroupIndex = myStories.findIndex((g) => g.userId === activeId);
        if (myGroupIndex > 0) {
          const myGroup = myStories.splice(myGroupIndex, 1)[0];
          const insertIndex =
            myStories.length > 0 &&
            myStories[0].userId === MOOD_OFFICIAL_ID &&
            activeId !== MOOD_OFFICIAL_ID
              ? 1
              : 0;
          myStories.splice(insertIndex, 0, myGroup);
        }

        setLocalData((prev) => ({
          ...prev,
          groupedStories: myStories,
        }));

        await fetchCounts(activeId);
      }
    } catch (e) {
      console.log(e);
    }
  }, [user, currentUserId]);

  const onRefresh = useCallback(() => {
    refreshFeed();
    fetchAuxiliaryData();
  }, [refreshFeed, fetchAuxiliaryData]);

  // --- LÓGICA INFINITA RESTAURADA ---
  const handleLoadMore = () => {
    // Si no hay contenido base, no hacemos nada
    if (poolOfContent.length === 0) return;

    // Tomamos una copia de todo el contenido mezclable y lo reordenamos aleatoriamente
    const recycledBatch = shuffleArray([...poolOfContent]);

    // Tomamos los primeros 10 elementos y les cambiamos el _id para que la lista no se queje de duplicados
    const newItems = recycledBatch.slice(0, 10).map((item) => ({
      ...item,
      _id: item._id + Math.random().toString(), // ID único temporal
    }));

    // Agregamos al final de la lista actual
    setSortedFeed((prev) => [...prev, ...newItems]);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", (e: any) => {
      if (navigation.isFocused()) {
        e.preventDefault();
        if (flatListRef.current) {
          flatListRef.current.scrollToOffset({ offset: 0, animated: true });
        }
        onRefresh();
      }
    });
    return unsubscribe;
  }, [navigation, onRefresh]);

  useEffect(() => {
    if (user) {
      fetchAuxiliaryData();
    }
  }, [user]);

  useEffect(() => {
    if (!user?.$id) return;
    const unsubscribe = client.subscribe(
      [
        `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.notificationsCollectionId}.documents`,
        `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`,
        `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.chatsCollectionId}.documents`,
      ],
      (response) => {
        if (
          response.events.some(
            (e) => e.includes("create") || e.includes("update"),
          )
        ) {
          fetchCounts(user.$id);
        }
      },
    );
    return () => {
      unsubscribe();
    };
  }, [user?.$id]);

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

  useEffect(() => {
    if (!feed || feed.length === 0) {
      setSortedFeed([]);
      return;
    }
    const priorityPosts: any[] = [];
    const discoveryPosts: any[] = [];
    const generalPool: any[] = [];
    const otherItems: any[] = [];
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
      const likedBy = post.likedBy || [];
      const savedBy = post.savedBy || [];
      const hasInteracted =
        likedBy.includes(user?.$id) || savedBy.includes(user?.$id);

      if (isRecent && !hasInteracted) {
        if (myFollowedIds.includes(creatorId) || isMyPost) {
          priorityPosts.push(item);
        } else {
          discoveryPosts.push(item);
        }
      } else {
        generalPool.push(item);
      }
    });

    const sortByDate = (a: any, b: any) => {
      const dateA = new Date(a.data.$createdAt || 0).getTime();
      const dateB = new Date(b.data.$createdAt || 0).getTime();
      return dateB - dateA;
    };

    priorityPosts.sort(sortByDate);
    discoveryPosts.sort(sortByDate);

    const shuffledGeneralPool = shuffleArray(generalPool);
    let initialFeed = [
      ...priorityPosts,
      ...discoveryPosts,
      ...shuffledGeneralPool,
    ];

    if (otherItems.length > 0) {
      const shuffledOthers = shuffleArray(otherItems);
      shuffledOthers.forEach((item) => {
        const currentLength = initialFeed.length;
        const minIndex = 2;
        if (currentLength < 2) initialFeed.push(item);
        else {
          const maxIndex = currentLength;
          const randomIndex =
            Math.floor(Math.random() * (maxIndex - minIndex + 1)) + minIndex;
          initialFeed.splice(randomIndex, 0, item);
        }
      });
    }
    setSortedFeed(initialFeed);
    // Guardamos TODO lo que no es prioritario en el pool para reciclar
    setPoolOfContent([...discoveryPosts, ...generalPool, ...otherItems]);
  }, [feed, myFollowedIds, user]);

  const toggleModal = (modalName: keyof typeof modals, value: boolean) => {
    setModals((prev) => ({ ...prev, [modalName]: value }));
  };

  return {
    user,
    isFeedLoading,
    isRefreshing,
    onRefresh,
    sortedFeed,
    setSortedFeed,
    localData,
    notiCount,
    msgCount,
    modals,
    toggleModal,
    activeStoryGroup,
    setActiveStoryGroup,
    postToShareData,
    setPostToShareData,
    sharePostId,
    setSharePostId,
    selectedPost,
    setSelectedPost,
    storyInitialSongData,
    setStoryInitialSongData,
    shareContacts,
    setShareContacts,
    isLoadingContacts,
    setIsLoadingContacts,
    fetchAuxiliaryData,
    MOOD_OFFICIAL_ID,
    handleMoodMediaPick,
    handleLoadMore, // <--- ¡AHORA SÍ LA EXPORTAMOS!
    flatListRef,
  };
};
