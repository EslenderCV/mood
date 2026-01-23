import { useState, useEffect, useCallback, useRef } from "react";
import { Alert, FlatList, Share as SystemShare } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useGlobalContext } from "@/context/GlobalProvider";
import { useFeed, FeedItem } from "@/context/FeedProvider";
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
import { parseSongData } from "@/lib/postUtils";

// --- BRAIN ---
import { MoodSessionManager } from "@/src/brain/session/MoodSessionManager";
import { RankableItem } from "@/src/brain/ranking/ResonanceEngine";
import { BrainEmitter } from "@/src/brain/signals/emitters";
import { InteractionType } from "@/src/brain/signals/InteractionSignals";

const databases = new Databases(client);
const MOOD_OFFICIAL_ID = "696b571b00112fd5c1e9";
const STORIES_BUCKET_ID = "696bcdd6003277d6eefd";

export type EnrichedFeedItem = FeedItem & RankableItem;

type FeedEventType =
  | "view_start"
  | "view_end"
  | "dwell"
  | "skip"
  | "like"
  | "save"
  | "share"
  | "open_comments"
  | "open_profile"
  | "follow";

interface FeedEvent {
  userId: string;
  postId: string;
  feedItemId: string;
  type: FeedEventType;
  durationMs?: number;
  anchorIndex?: number;
  sessionId: string;
  createdAt: string;
  creatorId?: string;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const toRankableFeedItem = (item: FeedItem, index: number, uniqueSuffix = ""): EnrichedFeedItem => {
  let stableId = item.data?.$id || item._id;

  if (!stableId) {
    if (item.type === "suggested_users") {
      const firstUserId = item.data?.[0]?.$id || "generic";
      stableId = `sys_suggested_${firstUserId}`;
    } else if (item.type === "trending_song") {
      const songId = item.data?.id || item.data?.title?.replace(/\s+/g, "") || "unknown";
      stableId = `sys_trending_${songId}`;
    } else {
      stableId = `sys_${item.type}_${index}`;
    }
  }

  if (uniqueSuffix) stableId = `${stableId}_${uniqueSuffix}`;

  let creatorId = "system";
  if (item.type === "post" && item.data) {
    creatorId =
      item.data.creator?.$id ||
      item.data.postedBy?.$id ||
      item.data.users?.[0]?.$id ||
      item.data.userId ||
      "unknown";
  }

  // Si tu post tiene emotionalTag directo:
  let emotionalTag: string | undefined = undefined;
  if (item.data && typeof item.data === "object" && "emotionalTag" in item.data) {
    emotionalTag = (item.data as any).emotionalTag;
  }

  // Vector por ahora neutro (si luego calculas energy/valence real, cambia aquí)
  return {
    ...item,
    id: stableId,
    creatorId,
    features: {
      energy: 0.5,
      valence: 0.5,
      emotionalTag,
    },
    originalIndex: index,
  };
};

export const useHomeLogic = () => {
  const { user } = useGlobalContext();
  const userId = user?.$id;

  const { feed, isLoading: isFeedLoading, isRefreshing, refreshFeed } = useFeed();
  const navigation = useNavigation<any>();
  const flatListRef = useRef<FlatList>(null);

  const isMounted = useRef(true);

  // --- BRAIN refs ---
  const itemsMapRef = useRef<Map<string, EnrichedFeedItem>>(new Map());
  const lastAnchorRef = useRef<number>(-1);
  const lastOrderHashRef = useRef<string>("");
  const loadMoreCounter = useRef<number>(0);
  const sortedFeedRef = useRef<EnrichedFeedItem[]>([]);

  // --- TELEMETRY refs ---
  const telemetryEnabledRef = useRef<boolean>(true);
  const sessionIdRef = useRef<string>("");

  // ✅ guarda features reales del item para DWELL/SKIP al salir
  const currentAnchorRef = useRef<{
    feedItemId: string;
    postId: string;
    startTs: number;
    anchorIndex: number;
    creatorId?: string;
    emotionalTag?: string;
    features?: { energy: number; valence: number; emotionalTag?: string };
  } | null>(null);

  const eventsQueueRef = useRef<FeedEvent[]>([]);
  const isFlushingRef = useRef(false);
  const flushTimerRef = useRef<any>(null);

  const [sortedFeed, setSortedFeed] = useState<EnrichedFeedItem[]>([]);
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

  const [activeStoryGroup, setActiveStoryGroup] = useState<any>(null);
  const [postToShareData, setPostToShareData] = useState<any>(null);
  const [sharePostId, setSharePostId] = useState("");
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [storyInitialSongData, setStoryInitialSongData] = useState<any>(null);
  const [shareContacts, setShareContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  // Sync
  useEffect(() => {
    sortedFeedRef.current = sortedFeed;
  }, [sortedFeed]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Telemetry setup
  useEffect(() => {
    if (userId && !sessionIdRef.current) sessionIdRef.current = `${userId}_${Date.now()}`;
    if (!appwriteConfig.feedEventsCollectionId) telemetryEnabledRef.current = false;
  }, [userId]);

  // Flush queue
  const flushQueue = useCallback(async () => {
    if (!telemetryEnabledRef.current) return;
    if (isFlushingRef.current || eventsQueueRef.current.length === 0) return;

    isFlushingRef.current = true;

    const batch = [...eventsQueueRef.current];
    eventsQueueRef.current = [];

    try {
      const collectionId = appwriteConfig.feedEventsCollectionId!;
      const promises = batch.map((event) =>
        databases.createDocument(appwriteConfig.databaseId, collectionId, ID.unique(), event)
      );
      const results = await Promise.allSettled(promises);

      const failed: FeedEvent[] = [];
      results.forEach((res, idx) => {
        if (res.status === "rejected") failed.push(batch[idx]);
      });

      if (failed.length > 0) {
        eventsQueueRef.current = [...failed, ...eventsQueueRef.current];
      }
    } catch {
      eventsQueueRef.current = [...batch, ...eventsQueueRef.current];
    } finally {
      isFlushingRef.current = false;
    }
  }, []);

  const enqueueEvent = useCallback(
    (type: FeedEventType, postId: string, feedItemId: string, durationMs?: number, anchorIndex?: number, creatorId?: string) => {
      if (!telemetryEnabledRef.current || !userId || !sessionIdRef.current || !postId) return;

      const event: FeedEvent = {
        userId,
        postId,
        feedItemId,
        type,
        durationMs,
        anchorIndex,
        sessionId: sessionIdRef.current,
        createdAt: new Date().toISOString(),
        creatorId,
      };

      eventsQueueRef.current.push(event);
      if (eventsQueueRef.current.length >= 5) void flushQueue();
    },
    [userId, flushQueue]
  );

  useEffect(() => {
    if (!userId || !telemetryEnabledRef.current) return;
    flushTimerRef.current = setInterval(() => void flushQueue(), 5000);
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      void flushQueue();
    };
  }, [userId, flushQueue]);

  // Helper de contexto (para LIKE/SAVE/SHARE/etc)
  const getContext = useCallback((feedItemId: string) => {
    const item = sortedFeedRef.current.find((i) => i.id === feedItemId);
    return item
      ? { creatorId: item.creatorId, emotionalTag: item.features.emotionalTag, features: item.features }
      : { creatorId: undefined, emotionalTag: undefined, features: { energy: 0.5, valence: 0.5 } };
  }, []);

  // Trackers
  const trackLike = useCallback(
    (postId: string, feedItemId: string) => {
      enqueueEvent("like", postId, feedItemId);
      const ctx = getContext(feedItemId);
      BrainEmitter.interaction(InteractionType.LIKE, {
        postId,
        creatorId: ctx.creatorId,
        emotionalTag: ctx.emotionalTag,
        postFeatures: ctx.features,
      });
    },
    [enqueueEvent, getContext]
  );

  const trackSave = useCallback(
    (postId: string, feedItemId: string) => {
      enqueueEvent("save", postId, feedItemId);
      const ctx = getContext(feedItemId);
      BrainEmitter.interaction(InteractionType.SAVE, {
        postId,
        creatorId: ctx.creatorId,
        emotionalTag: ctx.emotionalTag,
        postFeatures: ctx.features,
      });
    },
    [enqueueEvent, getContext]
  );

  const trackShare = useCallback(
    (postId: string, feedItemId: string) => {
      enqueueEvent("share", postId, feedItemId);
      const ctx = getContext(feedItemId);
      BrainEmitter.interaction(InteractionType.SHARE, {
        postId,
        creatorId: ctx.creatorId,
        emotionalTag: ctx.emotionalTag,
        postFeatures: ctx.features,
      });
    },
    [enqueueEvent, getContext]
  );

  const trackOpenComments = useCallback(
    (postId: string, feedItemId: string) => {
      enqueueEvent("open_comments", postId, feedItemId);
      BrainEmitter.interaction(InteractionType.OPEN_COMMENTS, postId);
    },
    [enqueueEvent]
  );

  const trackOpenProfile = useCallback(
    (postId: string, feedItemId: string, creatorId: string) => {
      enqueueEvent("open_profile", postId, feedItemId, undefined, undefined, creatorId);
      const ctx = getContext(feedItemId);
      BrainEmitter.interaction(InteractionType.OPEN_PROFILE, {
        postId,
        creatorId: creatorId || ctx.creatorId,
        emotionalTag: ctx.emotionalTag,
        postFeatures: ctx.features,
      });
    },
    [enqueueEvent, getContext]
  );

  const trackFollow = useCallback(
    (postId: string, feedItemId: string, creatorId: string) => {
      enqueueEvent("follow", postId, feedItemId, undefined, undefined, creatorId);
      const ctx = getContext(feedItemId);
      BrainEmitter.interaction(InteractionType.FOLLOW, {
        postId,
        creatorId,
        emotionalTag: ctx.emotionalTag,
        postFeatures: ctx.features,
      });
    },
    [enqueueEvent, getContext]
  );

  // --- Feed init (brain order) ---
  useEffect(() => {
    if (!feed || feed.length === 0) {
      if (isMounted.current && sortedFeed.length > 0) setSortedFeed([]);
      return;
    }
    if (!userId) return;

    lastAnchorRef.current = -1;
    lastOrderHashRef.current = "";
    currentAnchorRef.current = null;

    const priorityPosts: FeedItem[] = [];
    const discoveryPosts: FeedItem[] = [];
    const generalPool: FeedItem[] = [];
    const otherItems: FeedItem[] = [];

    const FRESHNESS_THRESHOLD = 48 * 60 * 60 * 1000;
    const now = Date.now();

    feed.forEach((item) => {
      if (item.type !== "post") {
        otherItems.push(item);
        return;
      }
      const post = item.data;
      const creatorId =
        post.creator?.$id || post.postedBy?.$id || post.users?.[0]?.$id || post.userId;
      const isMyPost = creatorId === userId;
      const postDate = new Date(post.$createdAt || 0).getTime();
      const isRecent = now - postDate < FRESHNESS_THRESHOLD;

      const likedBy = post.likedBy || [];
      const savedBy = post.savedBy || [];
      const hasInteracted = likedBy.includes(userId) || savedBy.includes(userId);

      if (isRecent && !hasInteracted) {
        if (myFollowedIds.includes(creatorId) || isMyPost) priorityPosts.push(item);
        else discoveryPosts.push(item);
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
    const initialFeed: FeedItem[] = [...priorityPosts, ...discoveryPosts, ...shuffledGeneralPool];

    if (otherItems.length > 0) {
      const shuffledOthers = shuffleArray(otherItems);
      shuffledOthers.forEach((item) => {
        const currentLength = initialFeed.length;
        const minIndex = 2;
        if (currentLength < 2) initialFeed.push(item);
        else {
          const maxIndex = currentLength;
          const randomIndex = Math.floor(Math.random() * (maxIndex - minIndex + 1)) + minIndex;
          initialFeed.splice(randomIndex, 0, item);
        }
      });
    }

    const enrichedFeed: EnrichedFeedItem[] = initialFeed.map((item, index) =>
      toRankableFeedItem(item, index)
    );

    itemsMapRef.current.clear();
    enrichedFeed.forEach((item) => itemsMapRef.current.set(item.id, item));

    MoodSessionManager.getInstance().initializeFeed(enrichedFeed);

    const brainOrder = MoodSessionManager.getInstance().getFeed();
    const finalSortedFeed: EnrichedFeedItem[] = [];
    brainOrder.forEach((rankedItem) => {
      const original = itemsMapRef.current.get(rankedItem.id);
      if (original) finalSortedFeed.push(original);
    });

    const feedToSet = finalSortedFeed.length > 0 ? finalSortedFeed : enrichedFeed;
    lastOrderHashRef.current = feedToSet.map((i) => i.id).join("|");

    if (isMounted.current) {
      setSortedFeed(feedToSet);
      setPoolOfContent([...discoveryPosts, ...generalPool, ...otherItems]);
    }
  }, [feed, myFollowedIds, userId]);

  // --- Viewability sync: dwell/skip con features reales ---
  const updateViewableIndex = useCallback(
    (index: number) => {
      if (index === lastAnchorRef.current) return;
      lastAnchorRef.current = index;

      const list = sortedFeedRef.current;
      const now = Date.now();

      if (index >= 0 && index < list.length) {
        const currentItem = list[index];

        if (currentItem.type === "post" && currentItem.data?.$id) {
          const postId = currentItem.data.$id;
          const feedItemId = currentItem.id;
          const creatorId = currentItem.creatorId;
          const itemFeatures = currentItem.features;
          const emotionalTag = itemFeatures.emotionalTag;

          // cerrar anchor anterior
          if (currentAnchorRef.current && currentAnchorRef.current.feedItemId !== feedItemId) {
            const prev = currentAnchorRef.current;
            const duration = now - prev.startTs;

            enqueueEvent("view_end", prev.postId, prev.feedItemId, duration, prev.anchorIndex, prev.creatorId);
            const eventType: FeedEventType = duration < 1200 ? "skip" : "dwell";
            enqueueEvent(eventType, prev.postId, prev.feedItemId, duration, prev.anchorIndex, prev.creatorId);

            const interactionType = duration < 1200 ? InteractionType.SKIP : InteractionType.DWELL;

            BrainEmitter.interaction(interactionType, {
              postId: prev.postId,
              creatorId: prev.creatorId,
              emotionalTag: prev.emotionalTag,
              durationMs: duration,
              anchorIndex: prev.anchorIndex,
              postFeatures: prev.features,
            });
          }

          // abrir nuevo anchor
          if (currentAnchorRef.current?.feedItemId !== feedItemId) {
            currentAnchorRef.current = {
              feedItemId,
              postId,
              startTs: now,
              anchorIndex: index,
              creatorId,
              emotionalTag,
              features: itemFeatures,
            };
            enqueueEvent("view_start", postId, feedItemId, undefined, index, creatorId);
          }
        } else {
          // item no-post: cerrar anchor
          if (currentAnchorRef.current) {
            const prev = currentAnchorRef.current;
            const duration = now - prev.startTs;

            enqueueEvent("view_end", prev.postId, prev.feedItemId, duration, prev.anchorIndex, prev.creatorId);
            const eventType: FeedEventType = duration < 1200 ? "skip" : "dwell";
            enqueueEvent(eventType, prev.postId, prev.feedItemId, duration, prev.anchorIndex, prev.creatorId);

            const interactionType = duration < 1200 ? InteractionType.SKIP : InteractionType.DWELL;
            BrainEmitter.interaction(interactionType, {
              postId: prev.postId,
              creatorId: prev.creatorId,
              emotionalTag: prev.emotionalTag,
              durationMs: duration,
              postFeatures: prev.features,
            });

            currentAnchorRef.current = null;
          }
        }
      }

      // brain reorder result
      const manager = MoodSessionManager.getInstance();
      manager.updateViewableIndex(index);
      const brainFeed = manager.getFeed();
      const newOrderHash = brainFeed.map((i) => i.id).join("|");

      if (newOrderHash !== lastOrderHashRef.current) {
        const map = itemsMapRef.current;
        const newSortedFeed: EnrichedFeedItem[] = [];
        brainFeed.forEach((rankedItem) => {
          const original = map.get(rankedItem.id);
          if (original) newSortedFeed.push(original);
        });

        if (newSortedFeed.length > 0) {
          lastOrderHashRef.current = newOrderHash;
          setSortedFeed(newSortedFeed);
        }
      }
    },
    [enqueueEvent]
  );

  const handleLoadMore = () => {
    if (poolOfContent.length === 0) return;

    const recycledBatch = shuffleArray([...poolOfContent]);
    const startIndex = sortedFeed.length;
    loadMoreCounter.current += 1;
    const batchSuffix = `batch_${loadMoreCounter.current}`;

    const newItems = recycledBatch.slice(0, 10);
    const enrichedNewItems = newItems.map((item, idx) =>
      toRankableFeedItem(item, startIndex + idx, batchSuffix)
    );

    enrichedNewItems.forEach((item) => itemsMapRef.current.set(item.id, item));

    const currentBrainFeed = MoodSessionManager.getInstance().getFeed();
    const fullList = [...currentBrainFeed, ...enrichedNewItems];
    MoodSessionManager.getInstance().initializeFeed(fullList as EnrichedFeedItem[]);

    setSortedFeed((prev) => {
      const newList = [...prev, ...enrichedNewItems];
      lastOrderHashRef.current = newList.map((i) => i.id).join("|");
      return newList;
    });
  };

  // --- UI helpers (igual que tu 4.1) ---
  const toggleModal = (modalName: keyof typeof modals, value: boolean) => {
    setModals((prev) => ({ ...prev, [modalName]: value }));
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
      const recentStories = storiesDocs.filter((doc: any) => new Date(doc.$createdAt) > oneDayAgo);

      const uniqueUserIds = new Set<string>();
      const userMap = new Map<string, any>();
      if (user) userMap.set(uId, { ...user });

      recentStories.forEach((doc: any) => {
        if (doc.user) {
          if (typeof doc.user === "object" && doc.user.$id) userMap.set(doc.user.$id, doc.user);
          else if (typeof doc.user === "string" && doc.user !== uId) uniqueUserIds.add(doc.user);
        }
      });

      const idsToFetch = Array.from(uniqueUserIds).filter((id) => !userMap.has(id));
      if (idsToFetch.length > 0) {
        await Promise.all(
          idsToFetch.map(async (id) => {
            try {
              const u = await getUser(id);
              if (u) userMap.set(id, u);
            } catch {}
          })
        );
      }

      const groups: Record<string, any> = {};
      recentStories.forEach((doc: any) => {
        const storyUserId = typeof doc.user === "object" ? doc.user.$id : doc.user;
        const userData =
          userMap.get(storyUserId) ||
          (typeof doc.user === "object"
            ? doc.user
            : { $id: storyUserId, username: "Usuario", name: "Usuario" });

        if (!groups[storyUserId]) groups[storyUserId] = { userId: storyUserId, user: userData, stories: [] };
        groups[storyUserId].stories.push(doc);
      });

      return Object.values(groups);
    } catch {
      return [];
    }
  };

  const fetchAuxiliaryData = useCallback(async () => {
    if (!userId) return;
    try {
      const officialStoriesRes = await databases
        .listDocuments(appwriteConfig.databaseId, appwriteConfig.storiesCollectionId, [
          Query.equal("user", MOOD_OFFICIAL_ID),
        ])
        .catch(() => ({ documents: [] as any[] }));

      if (!isMounted.current) return;

      const myStories: any[] = await fetchStoriesInternal(userId);
      if (!isMounted.current) return;

      const officialDocs = officialStoriesRes.documents;
      const officialGroupIndex = myStories.findIndex((g) => g.userId === MOOD_OFFICIAL_ID);

      if (officialDocs.length > 0) {
        let officialUserData: any = {
          $id: MOOD_OFFICIAL_ID,
          username: "Mood",
          name: "Mood Team",
          avatar: null,
          isVerified: true,
        };

        if (userId === MOOD_OFFICIAL_ID && user) officialUserData = user;
        else {
          try {
            const fetchedMood = await getUser(MOOD_OFFICIAL_ID);
            if (fetchedMood) officialUserData = fetchedMood;
          } catch {}
        }

        const officialGroup = { userId: MOOD_OFFICIAL_ID, user: officialUserData, stories: officialDocs };
        if (officialGroupIndex !== -1) myStories.splice(officialGroupIndex, 1);
        myStories.unshift(officialGroup);
      }

      const myGroupIndex = myStories.findIndex((g) => g.userId === userId);
      if (myGroupIndex > 0) {
        const myGroup = myStories.splice(myGroupIndex, 1)[0];
        const insertIndex =
          myStories.length > 0 && myStories[0].userId === MOOD_OFFICIAL_ID && userId !== MOOD_OFFICIAL_ID ? 1 : 0;
        myStories.splice(insertIndex, 0, myGroup);
      }

      setLocalData((prev) => ({ ...prev, groupedStories: myStories }));
      await fetchCounts(userId);
    } catch {}
  }, [userId, user]);

  const onRefresh = useCallback(() => {
    refreshFeed();
    fetchAuxiliaryData();
  }, [refreshFeed, fetchAuxiliaryData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", (e: any) => {
      if (navigation.isFocused()) {
        e.preventDefault();
        if (flatListRef.current) flatListRef.current.scrollToOffset({ offset: 0, animated: true });
        onRefresh();
      }
    });
    return unsubscribe;
  }, [navigation, onRefresh]);

  useEffect(() => {
    if (userId) fetchAuxiliaryData();
  }, [userId, fetchAuxiliaryData]);

  useEffect(() => {
    let isActive = true;
    const fetchFollows = async () => {
      if (userId) {
        try {
          const ids = await getFollowedUserIds(userId);
          if (isActive && isMounted.current) setMyFollowedIds(ids);
        } catch {}
      }
    };
    fetchFollows();
    return () => {
      isActive = false;
    };
  }, [userId]);

  // Sharing helpers
  const loadShareContacts = async (uId: string) => {
    setIsLoadingContacts(true);
    try {
      const followedIds = await getFollowedUserIds(uId);
      const users = await Promise.all(followedIds.map((id) => getUser(id)));
      setShareContacts(users.filter((u) => u !== null));
    } catch {
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const openShareSelector = async (post: any) => {
    setPostToShareData(post);
    setSelectedPostToShare(post);
    toggleModal("isShareSelector", true);
    if (user?.$id && shareContacts.length === 0) await loadShareContacts(user.$id);
  };

  const openShare = async (post: any) => {
    setSelectedPostToShare(post);
    setPostToShareData(post);
    toggleModal("isShareSelector", true);
    if (user?.$id && shareContacts.length === 0) await loadShareContacts(user.$id);
  };

  const handleShareSearch = async (text: string) => {
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
  };

  const handleSendShare = async (userIds: string[], message: string) => {
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
        })
      );

      await Promise.all(promises);

      const item = sortedFeedRef.current.find((i) => i.type === "post" && i.data?.$id === post.$id);
      if (item) trackShare(post.$id, item.id);

      Alert.alert("Enviado", "Publicación compartida.");
      toggleModal("isShareSelector", false);
    } catch {
      Alert.alert("Error", "No se pudo compartir.");
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

  const handleCopyLink = async () => {
    const post = selectedPostToShare || postToShareData;
    if (!post) return;

    const item = sortedFeedRef.current.find((i) => i.type === "post" && i.data?.$id === post.$id);
    if (item) trackShare(post.$id, item.id);

    const link = `https://moodapp.com/post/${post.$id}`;
    await Clipboard.setStringAsync(link);
    Alert.alert("Copiado", "Enlace en el portapapeles.");
  };

  const handleSystemShare = async () => {
    const post = selectedPostToShare || postToShareData;
    if (!post) return;

    const item = sortedFeedRef.current.find((i) => i.type === "post" && i.data?.$id === post.$id);
    if (item) trackShare(post.$id, item.id);

    const link = `https://moodapp.com/post/${post.$id}`;
    await SystemShare.share({ message: `¡Escucha esto en Mood! ${link}` });
  };

  const handleMoodMediaPick = async () => {
    setModals((prev) => ({ ...prev, isCreator: false }));
    setTimeout(async () => {
      if (!userId) return;
      Alert.alert("Seleccionar", "¿Qué deseas subir?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Foto", onPress: () => processMediaUpload("image") },
        { text: "Video", onPress: () => processMediaUpload("video") },
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
      fetchAuxiliaryData();
      Alert.alert("Éxito", "Historia publicada");
    } catch {
      Alert.alert("Error", "No se pudo subir. Verifica el formato.");
    }
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
    openShare,
    updateViewableIndex,
    trackLike,
    trackSave,
    trackShare,
    trackOpenComments,
    trackOpenProfile,
    trackFollow,
  };
};
