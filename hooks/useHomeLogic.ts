import { useState, useEffect, useCallback, useRef } from "react";
import { Alert, FlatList, Share as SystemShare } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "expo-router";

import { useGlobalContext } from "@/context/GlobalProvider";
import { useFeed, FeedItem } from "@/context/FeedProvider";
import {
  appwriteConfig,
  databases,
  getFollowedUserIds,
  getUnreadNotificationCount,
  getUnreadMessagesCount,
  getUser,
  uploadFile,
  createStory,
  pickMedia,
} from "@/lib/appwrite";

import { Query, ID } from "react-native-appwrite";
import { parseSongData } from "@/lib/postUtils";

import { EnrichedFeedItem } from "./home/homeTypes";
import { useHomeRealtime } from "./home/useHomeRealtime";
import { useHomeAuxData } from "./home/useHomeAuxData";
import { useHomeFeedConstruction } from "./home/useHomeFeedConstruction";
import { useFeedTelemetry } from "./home/useFeedTelemetry";
import { useBrainFeedSync } from "./home/useBrainFeedSync";

const STORIES_BUCKET_ID = "696bcdd6003277d6eefd";

export const useHomeLogic = () => {
  const { user } = useGlobalContext();
  const userId = user?.$id;
  const blockedUserIds: string[] = user?.blockedUsers || [];

  const { feed, isLoading: isFeedLoading, isRefreshing, refreshFeed } = useFeed();
  const flatListRef = useRef<FlatList>(null);
  const isMounted = useRef(true);

  // --- Refs de feed ---
  const itemsMapRef = useRef<Map<string, EnrichedFeedItem>>(new Map());
  const lastAnchorRef = useRef<number>(-1);
  const lastOrderHashRef = useRef<string>("");
  const sortedFeedRef = useRef<EnrichedFeedItem[]>([]);
  const realtimePostsCacheRef = useRef<EnrichedFeedItem[]>([]);

  const postsPoolRef = useRef<FeedItem[]>([]);
  const specialPoolRef = useRef<FeedItem[]>([]);
  const postCursorRef = useRef(0);
  const specialCursorRef = useRef(0);
  const batchCounterRef = useRef(0);

  // --- Estados ---
  const [sortedFeed, setSortedFeed] = useState<EnrichedFeedItem[]>([]);
  const [myFollowedIds, setMyFollowedIds] = useState<string[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<any[]>([]);

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

  const [activeStoryGroup, setActiveStoryGroup] = useState<any>(null);
  const [postToShareData, setPostToShareData] = useState<any>(null);
  const [selectedPostToShare, setSelectedPostToShare] = useState<any>(null);
  const [sharePostId, setSharePostId] = useState("");
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [storyInitialSongData, setStoryInitialSongData] = useState<any>(null);
  const [shareContacts, setShareContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  const lastFetchTimeRef = useRef<number>(0);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    sortedFeedRef.current = sortedFeed;
  }, [sortedFeed]);

  const toggleModal = useCallback((modalName: keyof typeof modals, value: boolean) => {
    setModals((prev) => ({ ...prev, [modalName]: value }));
  }, []);

  // --- Counts ---
  const fetchCounts = useCallback(async (uId: string) => {
    try {
      const [n, m] = await Promise.all([getUnreadNotificationCount(uId), getUnreadMessagesCount(uId)]);
      if (isMounted.current) {
        setNotiCount(n);
        setMsgCount(m);
      }
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) void fetchCounts(userId);
    }, [userId, fetchCounts]),
  );

  // --- Telemetry / viewability (extracted) ---
  const currentAnchorRef = useRef<any>(null);
  const {
    trackLike,
    trackSave,
    trackShare,
    trackOpenComments,
    trackOpenProfile,
    trackFollow,
    updateViewableIndex,
    updateViewableItem,
    closeTelemetryAnchor,
    flushQueue,
  } = useFeedTelemetry({ userId, sortedFeedRef, lastAnchorRef, currentAnchorRef });

  // --- Auxiliar (stories + suggestions + follows) ---
  const { fetchAuxiliaryData, MOOD_OFFICIAL_ID } = useHomeAuxData({
    userId,
    user,
    myFollowedIds,
    setMyFollowedIds,
    setLocalData,
    setSmartSuggestions,
    fetchCounts,
    lastFetchTimeRef,
    isMounted,
  });

  const onRefresh = useCallback(async () => {
    // Close any open dwell anchor so we don't lose durationMs and so a refresh doesn't
    // accidentally keep an old anchor alive.
    try {
      closeTelemetryAnchor?.("refresh");
    } catch {}
    void flushQueue();

    realtimePostsCacheRef.current = [];

    if (serverMode) {
      await refreshServerFeed();
      void fetchAuxiliaryData(true);
      return;
    }

    refreshFeed();
    void fetchAuxiliaryData(true);
  }, [serverMode, refreshServerFeed, refreshFeed, fetchAuxiliaryData, closeTelemetryAnchor, flushQueue]);

  // --- Realtime (counts + my new posts) ---
  useHomeRealtime({ userId, user, fetchCounts, setSortedFeed, realtimePostsCacheRef });

  // --- Feed construction & pagination (extracted) ---
  const { handleLoadMore, refreshServerFeed, serverLoading, serverRefreshing, serverMode } = useHomeFeedConstruction({
    feed,
    userId,
    myFollowedIds,
    blockedUserIds,
    smartSuggestions,
    setSortedFeed,
    sortedFeedRef,
    realtimePostsCacheRef,
    itemsMapRef,
    postsPoolRef,
    specialPoolRef,
    postCursorRef,
    specialCursorRef,
    batchCounterRef,
    lastAnchorRef,
    lastOrderHashRef,
    currentAnchorRef,
    isMounted,
  });

  // --- Brain sync (personalization becomes visible) ---
  useBrainFeedSync({ setSortedFeed, sortedFeedRef, isMounted });

  // --- Share & story creation flows (se mantienen aquí por ahora) ---
  const loadShareContacts = useCallback(async (uId: string) => {
    setIsLoadingContacts(true);
    try {
      const followedIds = await getFollowedUserIds(uId);
      const users = await Promise.all(followedIds.map((id) => getUser(id)));
      setShareContacts(users.filter((u) => u !== null));
    } catch {
      // ignore
    } finally {
      setIsLoadingContacts(false);
    }
  }, []);

  const openShareSelector = useCallback(
    async (post: any) => {
      setPostToShareData(post);
      setSelectedPostToShare(post);
      toggleModal("isShareSelector", true);
      if (user?.$id && shareContacts.length === 0) await loadShareContacts(user.$id);
    },
    [user, shareContacts.length, loadShareContacts, toggleModal],
  );

  const openShare = useCallback(
    async (post: any) => {
      setSelectedPostToShare(post);
      setPostToShareData(post);
      toggleModal("isShareSelector", true);
      if (user?.$id && shareContacts.length === 0) await loadShareContacts(user.$id);
    },
    [user, shareContacts.length, loadShareContacts, toggleModal],
  );

  const handleShareSearch = useCallback(
    async (text: string) => {
      setIsLoadingContacts(true);
      try {
        if (text.length > 0) {
          const response = await databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.usersCollectionId, [
            Query.or([Query.search("username", text), Query.search("name", text)]),
            Query.limit(10),
          ]);
          setShareContacts(response.documents);
        } else if (user?.$id) {
          await loadShareContacts(user.$id);
        }
      } finally {
        setIsLoadingContacts(false);
      }
    },
    [user, loadShareContacts],
  );

  const handleSendShare = useCallback(
    async (userIds: string[], message: string) => {
      const post = selectedPostToShare || postToShareData;
      if (!user?.$id || !post) return;
      try {
        const promises = userIds.map((targetId) =>
          databases.createDocument(appwriteConfig.databaseId, appwriteConfig.messagesCollectionId, ID.unique(), {
            senderId: user.$id,
            receiverId: targetId,
            content: message || "Compartió una publicación",
            sharedPostId: post.$id,
            createdAt: new Date().toISOString(),
          }),
        );
        await Promise.all(promises);

        const item = sortedFeedRef.current.find((i) => i.type === "post" && i.data?.$id === post.$id);
        if (item) trackShare(post.$id, item.id);

        Alert.alert("Enviado", "Publicación compartida.");
        toggleModal("isShareSelector", false);
      } catch {
        Alert.alert("Error", "No se pudo compartir.");
      }
    },
    [user, selectedPostToShare, postToShareData, trackShare, toggleModal],
  );

  const getViralPostData = useCallback(() => {
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
  }, [postToShareData]);

  const handleAddStoryFromPost = useCallback(() => {
    if (!postToShareData) return;
    const songData = parseSongData(postToShareData.songData);
    if (songData) {
      setStoryInitialSongData(songData);
      toggleModal("isShareSelector", false);
      setTimeout(() => toggleModal("isCreation", true), 300);
    }
  }, [postToShareData, toggleModal]);

  const handleCopyLink = useCallback(async () => {
    const post = selectedPostToShare || postToShareData;
    if (!post) return;

    const item = sortedFeedRef.current.find((i) => i.type === "post" && i.data?.$id === post.$id);
    if (item) trackShare(post.$id, item.id);

    const link = `https://moodapp.com/post/${post.$id}`;
    await Clipboard.setStringAsync(link);
    Alert.alert("Copiado", "Enlace en el portapapeles.");
  }, [selectedPostToShare, postToShareData, trackShare]);

  const handleSystemShare = useCallback(async () => {
    const post = selectedPostToShare || postToShareData;
    if (!post) return;

    const item = sortedFeedRef.current.find((i) => i.type === "post" && i.data?.$id === post.$id);
    if (item) trackShare(post.$id, item.id);

    const link = `https://moodapp.com/post/${post.$id}`;
    await SystemShare.share({ message: `¡Escucha esto en Mood! ${link}` });
  }, [selectedPostToShare, postToShareData, trackShare]);

  const handleMoodMediaPick = useCallback(async () => {
    setModals((prev) => ({ ...prev, isCreator: false }));

    setTimeout(async () => {
      if (!userId) return;
      Alert.alert("Seleccionar", "¿Qué deseas subir?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Foto", onPress: () => processMediaUpload("image") },
        { text: "Video", onPress: () => processMediaUpload("video") },
      ]);
    }, 500);
  }, [userId]);

  const processMediaUpload = useCallback(
    async (type: "image" | "video") => {
      if (!userId) {
        Alert.alert("Error", "No estás identificado.");
        return;
      }

      try {
        const asset = await pickMedia(type);
        if (!asset) return;

        Alert.alert("Subiendo", "Tu historia se está subiendo en segundo plano...");

        const cleanExtension = type === "video" ? "mp4" : "jpg";
        const cleanFileName = `story_${Date.now()}.${cleanExtension}`;
        const file = {
          fileName: cleanFileName,
          mimeType: asset.type === "video" ? "video/mp4" : "image/jpeg",
          uri: asset.uri,
          fileSize: asset.fileSize || 0,
        };

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
        void fetchAuxiliaryData(true);
        Alert.alert("Éxito", "Historia publicada");
      } catch {
        Alert.alert("Error", "No se pudo subir. Verifica el formato.");
      }
    },
    [userId, fetchAuxiliaryData],
  );

  // Ensure we flush any queued telemetry on unmount
  useEffect(() => {
    return () => {
      void flushQueue();
    };
  }, [flushQueue]);

  return {
    user,
    isFeedLoading: serverMode ? serverLoading : isFeedLoading,
    isRefreshing: serverMode ? serverRefreshing : isRefreshing,
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
    openShare,
    updateViewableIndex,
    updateViewableItem,
    closeTelemetryAnchor,
    flushQueue,
    trackLike,
    trackSave,
    trackShare,
    trackOpenComments,
    trackOpenProfile,
    trackFollow,
  };
};
