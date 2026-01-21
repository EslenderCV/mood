import { useState, useEffect, useCallback, useRef } from "react";
import { Alert, FlatList, Clipboard, Share as SystemShare } from "react-native";
import { useGlobalContext } from "@/context/GlobalProvider";
import { useFeed } from "@/context/FeedProvider";
import { useNavigation } from "expo-router";
import {
  getFollowedUserIds,
  getUnreadNotificationCount,
  getUnreadMessagesCount,
  getStories,
  client,
  appwriteConfig,
  getUser,
  uploadFile,
  createStory,
  pickMedia,
} from "@/lib/appwrite";
import { Databases, Query, ID } from "react-native-appwrite";
import * as ImagePicker from "expo-image-picker";
import { parseSongData } from "@/lib/postUtils";

const databases = new Databases(client);
const MOOD_OFFICIAL_ID = "696b571b00112fd5c1e9";
// 🔥 BUCKET DE HISTORIAS
const STORIES_BUCKET_ID = "696bcdd6003277d6eefd";

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
  const userId = user?.$id;

  const {
    feed,
    isLoading: isFeedLoading,
    isRefreshing,
    refreshFeed,
  } = useFeed();
  const navigation = useNavigation<any>();
  const flatListRef = useRef<FlatList>(null);

  const isMounted = useRef(true);

  const [sortedFeed, setSortedFeed] = useState<any[]>([]);
  const [myFollowedIds, setMyFollowedIds] = useState<string[]>([]);
  const [poolOfContent, setPoolOfContent] = useState<any[]>([]);
  const [selectedPostToShare, setSelectedPostToShare] = useState<any>(null);
  const [notiCount, setNotiCount] = useState(0);
  const [msgCount, setMsgCount] = useState(0);

  const [localData, setLocalData] = useState({
    groupedStories: [] as any[],
    suggestedUsers: [],
  });

  const [modals, setModals] = useState({
    isShareSelector: false,
    isViral: false,
    isShare: false,
    isStoryViewer: false,
    isCreation: false,
    isOptions: false,
    isCreator: false,
  });

  const [activeStoryGroup, setActiveStoryGroup] = useState(null);
  const [postToShareData, setPostToShareData] = useState<any>(null);
  const [sharePostId, setSharePostId] = useState("");
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [storyInitialSongData, setStoryInitialSongData] = useState<any>(null);
  const [shareContacts, setShareContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const openShare = async (post: any) => {
    setSelectedPostToShare(post);
    toggleModal("isShareSelector", true);

    if (user?.$id && shareContacts.length === 0) {
      setIsLoadingContacts(true);
      const followedIds = await getFollowedUserIds(user.$id);
      const users = await Promise.all(followedIds.map((id) => getUser(id)));
      setShareContacts(users.filter((u) => u !== null));
      setIsLoadingContacts(false);
    }
  };

  const handleShareSearch = async (text: string) => {
    setIsLoadingContacts(true);
    if (text.length > 0) {
      const response = await databases.listDocuments(
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
      setShareContacts(response.documents);
    } else if (user?.$id) {
      const followedIds = await getFollowedUserIds(user.$id);
      const users = await Promise.all(followedIds.map((id) => getUser(id)));
      setShareContacts(users.filter((u) => u !== null));
    }
    setIsLoadingContacts(false);
  };

  const handleSendShare = async (userIds: string[], message: string) => {
    if (!user?.$id || !selectedPostToShare) return;
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
            sharedPostId: selectedPostToShare.$id,
            createdAt: new Date().toISOString(),
          },
        ),
      );
      await Promise.all(promises);
      Alert.alert("Enviado", "Publicación compartida.");
      toggleModal("isShareSelector", false);
    } catch (error) {
      Alert.alert("Error", "No se pudo compartir.");
    }
  };

  const loadShareContacts = async (userId: string) => {
    setIsLoadingContacts(true);
    try {
      const followedIds = await getFollowedUserIds(userId);
      const users = await Promise.all(followedIds.map((id) => getUser(id)));
      setShareContacts(users.filter((u) => u !== null));
    } catch (error) {
      console.error("Error loading contacts:", error);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const openShareSelector = async (post: any) => {
    setPostToShareData(post);
    toggleModal("isShareSelector", true);

    if (user?.$id && shareContacts.length === 0) {
      await loadShareContacts(user.$id);
    }
  };

  const getViralPostData = () => {
    if (!postToShareData) return null;

    const song = parseSongData(postToShareData.songData);
    const creator = postToShareData.postedBy || postToShareData.creator || {};

    return {
      title: song?.title || "Música",
      artist: song?.artist || "Artista",
      cover: song?.cover || null,
      originalPostCreator: creator.username || "usuario",
      creatorPfp: creator.pfp || null,
      comment: postToShareData.comment || null,
    };
  };

  const handleAddStoryFromPost = () => {
    if (!postToShareData) return;
    const songData = parseSongData(postToShareData.songData);
    if (songData) {
      setStoryInitialSongData(songData);
      toggleModal("isShareSelector", false);
      setTimeout(() => toggleModal("isCreation", true), 300);
    }
  };

  const handleCopyLink = () => {
    if (!selectedPostToShare) return;
    const link = `https://moodapp.com/post/${selectedPostToShare.$id}`;
    Clipboard.setString(link);
    Alert.alert("Copiado", "Enlace en el portapapeles.");
  };

  const handleSystemShare = async () => {
    if (!selectedPostToShare) return;
    const link = `https://moodapp.com/post/${selectedPostToShare.$id}`;
    await SystemShare.share({ message: `¡Escucha esto en Mood! ${link}` });
  };

  const handleMoodMediaPick = async () => {
    setModals((prev) => ({ ...prev, isCreator: false }));

    setTimeout(async () => {
      if (!userId) return;

      Alert.alert("Seleccionar", "¿Qué deseas subir?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Foto",
          onPress: () => processMediaUpload("image"),
        },
        {
          text: "Video",
          onPress: () => processMediaUpload("video"),
        },
      ]);
    }, 500);
  };

  const processMediaUpload = async (type: "image" | "video") => {
    if (!userId) {
      Alert.alert("Error", "No estás identificado.");
      return;
    }

    try {
      const asset = await pickMedia(type);
      if (!asset) return;

      Alert.alert(
        "Subiendo",
        "Tu historia se está subiendo en segundo plano...",
      );

      const cleanExtension = type === "video" ? "mp4" : "jpg";
      const cleanFileName = `story_${Date.now()}.${cleanExtension}`;

      const file = {
        fileName: cleanFileName,
        mimeType: asset.type === "video" ? "video/mp4" : "image/jpeg",
        uri: asset.uri,
        fileSize: asset.fileSize || 0,
      };

      // 🔥 FIX: USAMOS EL ID DEL BUCKET DE HISTORIAS
      const uploadedFile = await uploadFile(file, type, STORIES_BUCKET_ID);

      if (!uploadedFile) throw new Error("Fallo la subida");

      const songData = JSON.stringify({
        mediaUrl: uploadedFile,
        mediaType: asset.type,
        isMediaStory: true,
        duration: asset.type === "video" ? 15000 : 5000,

        title: "Mood Update",
        artist: "Mood Team",
        cover: uploadedFile,
        preview: "",
        spotifyId: "mood_custom_" + Date.now(),
        caption: "",
      });

      await createStory(songData, userId);
      fetchAuxiliaryData();
      Alert.alert("Éxito", "Historia publicada");
    } catch (e: any) {
      console.log("Error media:", e);
      Alert.alert("Error", "No se pudo subir. Verifica el formato.");
    }
  };

  const fetchCounts = async (uId: string) => {
    try {
      const [n, m] = await Promise.all([
        getUnreadNotificationCount(uId),
        getUnreadMessagesCount(uId),
      ]);
      if (isMounted.current) {
        setNotiCount(n);
        setMsgCount(m);
      }
      return { noti: n, msg: m };
    } catch {
      return { noti: 0, msg: 0 };
    }
  };

  const fetchStoriesInternal = async (uId: string) => {
    try {
      const storiesDocs = await getStories(uId);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentStories = storiesDocs.filter(
        (doc: any) => new Date(doc.$createdAt) > oneDayAgo,
      );

      const uniqueUserIds = new Set<string>();
      const userMap = new Map<string, any>();

      if (user) userMap.set(uId, { ...user });

      recentStories.forEach((doc: any) => {
        if (doc.user) {
          if (typeof doc.user === "object" && doc.user.$id) {
            userMap.set(doc.user.$id, doc.user);
          } else if (typeof doc.user === "string" && doc.user !== uId) {
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
        let storyUserId =
          typeof doc.user === "object" ? doc.user.$id : doc.user;
        const userData =
          userMap.get(storyUserId) ||
          (typeof doc.user === "object"
            ? doc.user
            : { $id: storyUserId, username: "Usuario", name: "Usuario" });

        if (!groups[storyUserId]) {
          groups[storyUserId] = {
            userId: storyUserId,
            user: userData,
            stories: [],
          };
        }
        groups[storyUserId].stories.push(doc);
      });

      return Object.values(groups);
    } catch (e) {
      return [];
    }
  };

  const fetchAuxiliaryData = useCallback(async () => {
    if (!userId) return;

    try {
      const officialStoriesRes = await databases
        .listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.storiesCollectionId,
          [Query.equal("user", MOOD_OFFICIAL_ID)],
        )
        .catch(() => ({ documents: [] }));

      if (!isMounted.current) return;

      const myStories: any[] = await fetchStoriesInternal(userId);
      if (!isMounted.current) return;

      const officialDocs = officialStoriesRes.documents;
      const officialGroupIndex = myStories.findIndex(
        (g) => g.userId === MOOD_OFFICIAL_ID,
      );

      if (officialDocs.length > 0) {
        let officialUserData: any = {
          $id: MOOD_OFFICIAL_ID,
          username: "Mood",
          name: "Mood Team",
          avatar: null,
          isVerified: true,
        };

        if (userId === MOOD_OFFICIAL_ID && user) {
          officialUserData = user;
        } else {
          try {
            const fetchedMood = await getUser(MOOD_OFFICIAL_ID);
            if (fetchedMood) officialUserData = fetchedMood;
          } catch (e) {
            console.log("No se pudo cargar el perfil de Mood Team");
          }
        }

        const officialGroup = {
          userId: MOOD_OFFICIAL_ID,
          user: officialUserData,
          stories: officialDocs,
        };

        if (officialGroupIndex !== -1) myStories.splice(officialGroupIndex, 1);
        myStories.unshift(officialGroup);
      }

      const myGroupIndex = myStories.findIndex((g) => g.userId === userId);
      if (myGroupIndex > 0) {
        const myGroup = myStories.splice(myGroupIndex, 1)[0];
        const insertIndex =
          myStories.length > 0 &&
          myStories[0].userId === MOOD_OFFICIAL_ID &&
          userId !== MOOD_OFFICIAL_ID
            ? 1
            : 0;
        myStories.splice(insertIndex, 0, myGroup);
      }

      setLocalData((prev) => ({
        ...prev,
        groupedStories: myStories,
      }));

      await fetchCounts(userId);
    } catch (e) {
      console.log("Fetch Auxiliary Data Error:", e);
    }
  }, [userId]);

  const onRefresh = useCallback(() => {
    refreshFeed();
    fetchAuxiliaryData();
  }, [refreshFeed, fetchAuxiliaryData]);

  const handleLoadMore = () => {
    if (poolOfContent.length === 0) return;
    const recycledBatch = shuffleArray([...poolOfContent]);
    const newItems = recycledBatch.slice(0, 10).map((item) => ({
      ...item,
      _id: item._id + Math.random().toString(),
    }));
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
    if (userId) {
      fetchAuxiliaryData();
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

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
          fetchCounts(userId);
        }
      },
    );
    return () => {
      unsubscribe();
    };
  }, [userId]);

  useEffect(() => {
    let isActive = true;
    const fetchFollows = async () => {
      if (userId) {
        try {
          const ids = await getFollowedUserIds(userId);
          if (isActive && isMounted.current) {
            setMyFollowedIds(ids);
          }
        } catch (e) {
          console.log("Error fetching follows", e);
        }
      }
    };
    fetchFollows();
    return () => {
      isActive = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!feed || feed.length === 0) {
      if (isMounted.current && sortedFeed.length > 0) setSortedFeed([]);
      return;
    }

    if (!userId) return;

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
      const isMyPost = creatorId === userId;
      const postDate = new Date(post.$createdAt || 0).getTime();
      const isRecent = now - postDate < FRESHNESS_THRESHOLD;
      const likedBy = post.likedBy || [];
      const savedBy = post.savedBy || [];
      const hasInteracted =
        likedBy.includes(userId) || savedBy.includes(userId);

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

    if (isMounted.current) {
      setSortedFeed(initialFeed);
      setPoolOfContent([...discoveryPosts, ...generalPool, ...otherItems]);
    }
  }, [feed, myFollowedIds, userId]);

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
    handleLoadMore,
    flatListRef,
    handleShareSearch,
    handleSendShare,
    handleSystemShare,
    handleCopyLink,
    handleAddStoryFromPost,
    getViralPostData,
    openShareSelector,
  };
};
