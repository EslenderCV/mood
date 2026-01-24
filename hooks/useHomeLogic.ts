import { useState, useEffect, useCallback, useRef } from "react";
import { Alert, FlatList, Share as SystemShare } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useGlobalContext } from "@/context/GlobalProvider";
import { useFeed, FeedItem } from "@/context/FeedProvider";
import {
  getFollowedUserIds,
  getUnreadNotificationCount,
  getUnreadMessagesCount,
  getStories,
  client, // 🔥 NECESARIO PARA REALTIME
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

const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Generador de IDs estables y únicos por batch
const toRankableFeedItem = (
  item: FeedItem,
  absoluteIndex: number,
  batchSuffix: string,
): EnrichedFeedItem => {
  let baseId = "";

  if (item.type === "post") {
    baseId = `post_${item.data?.$id || "unknown"}`;
  } else if (item.type === "trending_song") {
    const safeId =
      item.data?.id || item.data?.title?.replace(/\s+/g, "") || "unknown";
    baseId = `trending_${safeId}`;
  } else if (item.type === "suggested_users") {
    // Hash simple basado en los IDs de los usuarios del chunk
    const idsHash = Array.isArray(item.data)
      ? item.data
          .map((u: any) => u.$id)
          .join("")
          .substring(0, 15)
      : "generic";
    baseId = `suggested_${idsHash}`;
  } else {
    baseId = `sys_${item.type}`;
  }

  // ID Final: Base + Batch + Index Absoluto (Garantiza unicidad en FlatList)
  const stableId = `${baseId}__${batchSuffix}__${absoluteIndex}`;

  let creatorId = "system";
  if (item.type === "post" && item.data) {
    creatorId =
      item.data.creator?.$id ||
      item.data.postedBy?.$id ||
      item.data.users?.[0]?.$id ||
      item.data.userId ||
      "unknown";
  }

  let emotionalTag: string | undefined = undefined;
  if (
    item.data &&
    typeof item.data === "object" &&
    "emotionalTag" in item.data
  ) {
    emotionalTag = (item.data as any).emotionalTag;
  }

  return {
    ...item,
    id: stableId,
    creatorId,
    features: { energy: 0.5, valence: 0.5, emotionalTag },
    originalIndex: absoluteIndex,
  };
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
  const flatListRef = useRef<FlatList>(null);
  const isMounted = useRef(true);

  // --- REFS PARA LÓGICA DE FEED (POOLS & CURSORS) ---
  const itemsMapRef = useRef<Map<string, EnrichedFeedItem>>(new Map());
  const lastAnchorRef = useRef<number>(-1);
  const lastOrderHashRef = useRef<string>("");
  const sortedFeedRef = useRef<EnrichedFeedItem[]>([]);

  // Pools para scroll infinito y reciclaje
  const postsPoolRef = useRef<FeedItem[]>([]);
  const specialPoolRef = useRef<FeedItem[]>([]);
  const postCursorRef = useRef(0);
  const specialCursorRef = useRef(0);
  const batchCounterRef = useRef(0); // Contador incremental para batches (no random)

  // --- TELEMETRY REFS ---
  const telemetryEnabledRef = useRef<boolean>(true);
  const sessionIdRef = useRef<string>("");
  const currentAnchorRef = useRef<any>(null);
  const eventsQueueRef = useRef<FeedEvent[]>([]);
  const isFlushingRef = useRef(false);
  const flushTimerRef = useRef<any>(null);
  const lastFetchTimeRef = useRef<number>(0);

  // --- STATE ---
  const [sortedFeed, setSortedFeed] = useState<EnrichedFeedItem[]>([]);
  const [myFollowedIds, setMyFollowedIds] = useState<string[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<any[]>([]);

  // UI States
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

  // Share & Interaction States
  const [activeStoryGroup, setActiveStoryGroup] = useState<any>(null);
  const [postToShareData, setPostToShareData] = useState<any>(null);
  const [selectedPostToShare, setSelectedPostToShare] = useState<any>(null);
  const [sharePostId, setSharePostId] = useState("");
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [storyInitialSongData, setStoryInitialSongData] = useState<any>(null);
  const [shareContacts, setShareContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  // --- HELPER: TOGGLE MODAL ---
  const toggleModal = useCallback(
    (modalName: keyof typeof modals, value: boolean) => {
      setModals((prev) => ({ ...prev, [modalName]: value }));
    },
    [],
  );

  // --- 🔥 REALTIME SUBSCRIPTIONS (NOTIFICATIONS & MESSAGES) ---
  useEffect(() => {
    if (!userId) return;

    // Canales a escuchar
    const notiChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.notificationsCollectionId}.documents`;
    const msgChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`;

    const unsubscribe = client.subscribe(
      [notiChannel, msgChannel],
      (response) => {
        // Filtramos solo eventos de creación
        if (
          response.events.includes(
            "databases.*.collections.*.documents.*.create",
          )
        ) {
          const payload = response.payload as any;

          // 1. Nueva Notificación para mí
          if (
            response.channels.includes(notiChannel) &&
            payload.userId === userId
          ) {
            // Actualizamos el contador (o incrementamos +1 localmente)
            fetchCounts(userId);
          }

          // 2. Nuevo Mensaje para mí
          if (
            response.channels.includes(msgChannel) &&
            payload.receiverId === userId
          ) {
            // Actualizamos el contador
            fetchCounts(userId);
          }
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, [userId]);

  // --- SYNC REFS & MOUNT ---
  useEffect(() => {
    sortedFeedRef.current = sortedFeed;
  }, [sortedFeed]);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (userId && !sessionIdRef.current)
      sessionIdRef.current = `${userId}_${Date.now()}`;
    if (!appwriteConfig.feedEventsCollectionId)
      telemetryEnabledRef.current = false;
  }, [userId]);

  // --- TELEMETRY ---
  const flushQueue = useCallback(async () => {
    if (
      !telemetryEnabledRef.current ||
      isFlushingRef.current ||
      eventsQueueRef.current.length === 0
    )
      return;
    isFlushingRef.current = true;
    const batch = [...eventsQueueRef.current];
    eventsQueueRef.current = [];
    try {
      const promises = batch.map((event) =>
        databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.feedEventsCollectionId!,
          ID.unique(),
          event,
        ),
      );
      await Promise.allSettled(promises);
    } catch {
      eventsQueueRef.current = [...batch, ...eventsQueueRef.current];
    } finally {
      isFlushingRef.current = false;
    }
  }, []);

  const enqueueEvent = useCallback(
    (
      type: FeedEventType,
      postId: string,
      feedItemId: string,
      durationMs?: number,
      anchorIndex?: number,
      creatorId?: string,
    ) => {
      if (!telemetryEnabledRef.current || !userId || !postId) return;
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
    [userId, flushQueue],
  );

  useEffect(() => {
    if (!userId) return;
    flushTimerRef.current = setInterval(() => void flushQueue(), 5000);
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      void flushQueue();
    };
  }, [userId, flushQueue]);

  // --- TRACKING HELPERS ---
  const getContext = useCallback((feedItemId: string) => {
    const item = sortedFeedRef.current.find((i) => i.id === feedItemId);
    return item
      ? {
          creatorId: item.creatorId,
          emotionalTag: item.features.emotionalTag,
          features: item.features,
        }
      : {
          creatorId: undefined,
          emotionalTag: undefined,
          features: { energy: 0.5, valence: 0.5 },
        };
  }, []);

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
    [enqueueEvent, getContext],
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
    [enqueueEvent, getContext],
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
    [enqueueEvent, getContext],
  );
  const trackOpenComments = useCallback(
    (postId: string, feedItemId: string) => {
      enqueueEvent("open_comments", postId, feedItemId);
      BrainEmitter.interaction(InteractionType.OPEN_COMMENTS, postId);
    },
    [enqueueEvent],
  );
  const trackOpenProfile = useCallback(
    (postId: string, feedItemId: string, creatorId: string) => {
      enqueueEvent(
        "open_profile",
        postId,
        feedItemId,
        undefined,
        undefined,
        creatorId,
      );
      const ctx = getContext(feedItemId);
      BrainEmitter.interaction(InteractionType.OPEN_PROFILE, {
        postId,
        creatorId: creatorId || ctx.creatorId,
        emotionalTag: ctx.emotionalTag,
        postFeatures: ctx.features,
      });
    },
    [enqueueEvent, getContext],
  );
  const trackFollow = useCallback(
    (postId: string, feedItemId: string, creatorId: string) => {
      enqueueEvent(
        "follow",
        postId,
        feedItemId,
        undefined,
        undefined,
        creatorId,
      );
      const ctx = getContext(feedItemId);
      BrainEmitter.interaction(InteractionType.FOLLOW, {
        postId,
        creatorId,
        emotionalTag: ctx.emotionalTag,
        postFeatures: ctx.features,
      });
    },
    [enqueueEvent, getContext],
  );

  // --- FETCHERS ---
  const fetchCounts = useCallback(async (uId: string) => {
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
  }, []);

  const fetchStoriesInternal = useCallback(
    async (uId: string) => {
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
            if (typeof doc.user === "object" && doc.user.$id)
              userMap.set(doc.user.$id, doc.user);
            else if (typeof doc.user === "string" && doc.user !== uId)
              uniqueUserIds.add(doc.user);
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
              } catch {}
            }),
          );
        }
        const groups: Record<string, any> = {};
        recentStories.forEach((doc: any) => {
          const storyUserId =
            typeof doc.user === "object" ? doc.user.$id : doc.user;
          const userData =
            userMap.get(storyUserId) ||
            (typeof doc.user === "object"
              ? doc.user
              : { $id: storyUserId, username: "Usuario", name: "Usuario" });
          if (!groups[storyUserId])
            groups[storyUserId] = {
              userId: storyUserId,
              user: userData,
              stories: [],
            };
          groups[storyUserId].stories.push(doc);
        });
        return Object.values(groups);
      } catch {
        return [];
      }
    },
    [user],
  );

  const fetchAuxiliaryData = useCallback(
    async (force = false) => {
      if (!userId) return;
      const now = Date.now();
      if (!force && now - lastFetchTimeRef.current < 5000) return;
      lastFetchTimeRef.current = now;

      try {
        const officialStoriesRes = await databases
          .listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.storiesCollectionId,
            [Query.equal("user", MOOD_OFFICIAL_ID)],
          )
          .catch(() => ({ documents: [] as any[] }));
        if (!isMounted.current) return;
        const myStories: any[] = await fetchStoriesInternal(userId);
        if (!isMounted.current) return;

        const officialDocs = officialStoriesRes.documents;
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
          const officialGroup = {
            userId: MOOD_OFFICIAL_ID,
            user: officialUserData,
            stories: officialDocs,
          };
          const officialGroupIndex = myStories.findIndex(
            (g) => g.userId === MOOD_OFFICIAL_ID,
          );
          if (officialGroupIndex !== -1)
            myStories.splice(officialGroupIndex, 1);
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
        setLocalData((prev) => ({ ...prev, groupedStories: myStories }));

        // FETCH SMART SUGGESTIONS (Active Discovery)
        try {
          const usersRes = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.usersCollectionId,
            [Query.limit(60), Query.orderDesc("$createdAt")],
          );
          const brain = MoodSessionManager.getInstance();
          const candidates = usersRes.documents.filter((u: any) => {
            if (u.$id === userId) return false;
            if (myFollowedIds.includes(u.$id)) return false;
            const affinity = brain.getCreatorAffinity(u.$id);
            if (affinity < -0.5) return false;
            return true;
          });
          candidates.sort((a, b) => {
            const scoreA = brain.getCreatorAffinity(a.$id);
            const scoreB = brain.getCreatorAffinity(b.$id);
            return scoreB - scoreA;
          });
          if (isMounted.current) setSmartSuggestions(candidates);
        } catch (e) {
          console.log("Error suggestions", e);
        }

        await fetchCounts(userId);
      } catch {}
    },
    [userId, user, myFollowedIds, fetchStoriesInternal, fetchCounts],
  );

  const onRefresh = useCallback(() => {
    refreshFeed();
    fetchAuxiliaryData(true);
  }, [refreshFeed, fetchAuxiliaryData]);

  // --- INIT EFFECT ---
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

  useEffect(() => {
    if (userId) fetchAuxiliaryData();
  }, [userId, fetchAuxiliaryData]);

  // --- FEED CONSTRUCTION (FIXED LOGIC) ---
  useEffect(() => {
    if (!feed || feed.length === 0 || !userId) {
      if (
        isMounted.current &&
        sortedFeed.length > 0 &&
        (!feed || feed.length === 0)
      )
        setSortedFeed([]);
      return;
    }

    lastAnchorRef.current = -1;
    lastOrderHashRef.current = "";
    currentAnchorRef.current = null;
    batchCounterRef.current = 0; // Reset batch counter

    const posts: FeedItem[] = [];
    const specials: FeedItem[] = [];

    const priorityPosts: FeedItem[] = [];
    const discoveryPosts: FeedItem[] = [];
    const generalPool: FeedItem[] = [];

    const FRESHNESS_THRESHOLD = 48 * 60 * 60 * 1000;
    const now = Date.now();

    // 1. Clasificar y Filtrar
    feed.forEach((item) => {
      if (item.type === "suggested_users") return; // Ignoramos sugerencias del backend (usamos smart local)

      if (item.type !== "post") {
        specials.push(item); // Trending songs, etc.
        return;
      }

      // Clasificación de posts
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
        if (myFollowedIds.includes(creatorId) || isMyPost)
          priorityPosts.push(item);
        else discoveryPosts.push(item);
      } else {
        generalPool.push(item);
      }
    });

    // 2. Procesar Smart Suggestions (Chunks de 5)
    if (smartSuggestions.length >= 3) {
      const USERS_PER_CHUNK = 5;
      for (let i = 0; i < smartSuggestions.length; i += USERS_PER_CHUNK) {
        const chunk = smartSuggestions.slice(i, i + USERS_PER_CHUNK);
        if (chunk.length >= 3) {
          specials.push({
            _id: `smart_sugg_${i}`, // Base ID
            type: "suggested_users",
            data: chunk,
          });
        }
      }
    }

    // 3. Ordenar Posts y Specials
    priorityPosts.sort(
      (a, b) =>
        new Date(b.data.$createdAt).getTime() -
        new Date(a.data.$createdAt).getTime(),
    );
    discoveryPosts.sort(
      (a, b) =>
        new Date(b.data.$createdAt).getTime() -
        new Date(a.data.$createdAt).getTime(),
    );

    // Todos los posts disponibles ordenados
    const sortedPosts = [
      ...priorityPosts,
      ...discoveryPosts,
      ...shuffleArray(generalPool),
    ];

    // Todos los specials disponibles barajados
    const shuffledSpecials = shuffleArray(specials);

    // 4. Llenar Pools (Refs)
    postsPoolRef.current = sortedPosts;
    specialPoolRef.current = shuffledSpecials;
    postCursorRef.current = 0;
    specialCursorRef.current = 0;

    // 5. Construir Batch Inicial (Ej. 20 posts + inyecciones)
    const initialBatchSize = 20;
    const initialPosts = postsPoolRef.current.slice(0, initialBatchSize);
    postCursorRef.current = initialPosts.length % postsPoolRef.current.length; // Avanzar cursor

    // Inyección Estricta: Cada 5 posts, 1 special.
    // Insertamos en índices: 4, 10, 16...
    let insertIndex = 4;
    const GAP = 5;

    // Iteramos sobre los posts iniciales e inyectamos si hay espacio y specials
    while (
      insertIndex < initialPosts.length &&
      specialPoolRef.current.length > 0
    ) {
      // Obtenemos special del pool (rotativo o lineal)
      // Para inicial, usamos lineal hasta que se acaben o completemos
      if (specialCursorRef.current < specialPoolRef.current.length) {
        const special = specialPoolRef.current[specialCursorRef.current];
        initialPosts.splice(insertIndex, 0, special);

        specialCursorRef.current =
          (specialCursorRef.current + 1) % specialPoolRef.current.length;
        insertIndex += GAP + 1; // +1 porque acabamos de insertar
      } else {
        break; // No hay más specials por ahora
      }
    }

    // 6. Enriquecer y Setear (Batch "init")
    const enrichedFeed = initialPosts.map((item, index) =>
      toRankableFeedItem(item, index, "init"),
    );

    // Sync Brain
    itemsMapRef.current.clear();
    enrichedFeed.forEach((item) => itemsMapRef.current.set(item.id, item));
    MoodSessionManager.getInstance().initializeFeed(enrichedFeed);

    if (isMounted.current) {
      setSortedFeed(enrichedFeed);
    }
  }, [feed, myFollowedIds, userId, smartSuggestions]);

  // --- HANDLE LOAD MORE (INFINITO & RÍTMICO) ---
  const handleLoadMore = useCallback(() => {
    if (postsPoolRef.current.length === 0) return;

    // Incrementar batch suffix para IDs únicos
    batchCounterRef.current += 1;
    const batchSuffix = `batch_${batchCounterRef.current}`;

    // 1. Obtener 10 Posts del Pool (Reciclaje circular)
    const newBatch: FeedItem[] = [];
    for (let i = 0; i < 10; i++) {
      const item = postsPoolRef.current[postCursorRef.current];
      newBatch.push(item);
      postCursorRef.current =
        (postCursorRef.current + 1) % postsPoolRef.current.length;
    }

    // 2. Inyectar 1 Special del Pool (Reciclaje circular)
    if (specialPoolRef.current.length > 0) {
      const special = specialPoolRef.current[specialCursorRef.current];

      // Insertamos en el medio del batch (índice 4)
      // Esto garantiza ~5 posts de distancia con el último special del batch anterior
      if (newBatch.length >= 5) {
        newBatch.splice(4, 0, special);
      } else {
        newBatch.push(special);
      }

      specialCursorRef.current =
        (specialCursorRef.current + 1) % specialPoolRef.current.length;
    }

    // 3. Enriquecer (Stable IDs)
    const startIndex = sortedFeedRef.current.length; // Para index absoluto
    const enrichedBatch = newBatch.map((item, idx) =>
      toRankableFeedItem(item, startIndex + idx, batchSuffix),
    );

    // 4. Update Brain & State
    enrichedBatch.forEach((item) => itemsMapRef.current.set(item.id, item));
    const currentBrainFeed = MoodSessionManager.getInstance().getFeed();
    const fullList = [...currentBrainFeed, ...enrichedBatch];
    MoodSessionManager.getInstance().initializeFeed(
      fullList as EnrichedFeedItem[],
    );

    setSortedFeed((prev) => [...prev, ...enrichedBatch]);
  }, []); // Dependencias vacías: usamos refs

  // --- ACTIONS (Share, Load Contacts, etc) ---
  const loadShareContacts = useCallback(async (uId: string) => {
    setIsLoadingContacts(true);
    try {
      const followedIds = await getFollowedUserIds(uId);
      const users = await Promise.all(followedIds.map((id) => getUser(id)));
      setShareContacts(users.filter((u) => u !== null));
    } catch {
    } finally {
      setIsLoadingContacts(false);
    }
  }, []);

  const openShareSelector = useCallback(
    async (post: any) => {
      setPostToShareData(post);
      setSelectedPostToShare(post);
      toggleModal("isShareSelector", true);
      if (user?.$id && shareContacts.length === 0)
        await loadShareContacts(user.$id);
    },
    [user, shareContacts.length, loadShareContacts, toggleModal],
  );

  const openShare = useCallback(
    async (post: any) => {
      setSelectedPostToShare(post);
      setPostToShareData(post);
      toggleModal("isShareSelector", true);
      if (user?.$id && shareContacts.length === 0)
        await loadShareContacts(user.$id);
    },
    [user, shareContacts.length, loadShareContacts, toggleModal],
  );

  const handleShareSearch = useCallback(
    async (text: string) => {
      setIsLoadingContacts(true);
      try {
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
          databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.messagesCollectionId,
            ID.unique(),
            {
              senderId: user.$id,
              receiverId: targetId,
              content: message || "Compartió una publicación",
              sharedPostId: post.$id,
              createdAt: new Date().toISOString(),
            },
          ),
        );
        await Promise.all(promises);
        const item = sortedFeedRef.current.find(
          (i) => i.type === "post" && i.data?.$id === post.$id,
        );
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
    const item = sortedFeedRef.current.find(
      (i) => i.type === "post" && i.data?.$id === post.$id,
    );
    if (item) trackShare(post.$id, item.id);
    const link = `https://moodapp.com/post/${post.$id}`;
    await Clipboard.setStringAsync(link);
    Alert.alert("Copiado", "Enlace en el portapapeles.");
  }, [selectedPostToShare, postToShareData, trackShare]);

  const handleSystemShare = useCallback(async () => {
    const post = selectedPostToShare || postToShareData;
    if (!post) return;
    const item = sortedFeedRef.current.find(
      (i) => i.type === "post" && i.data?.$id === post.$id,
    );
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
        fetchAuxiliaryData(true);
        Alert.alert("Éxito", "Historia publicada");
      } catch {
        Alert.alert("Error", "No se pudo subir. Verifica el formato.");
      }
    },
    [userId, fetchAuxiliaryData],
  );

  // --- VIEWABILITY SYNC ---
  const updateViewableIndex = useCallback(
    (index: number) => {
      if (index === lastAnchorRef.current) return;
      lastAnchorRef.current = index;
      const list = sortedFeedRef.current;
      const now = Date.now();

      if (index >= 0 && index < list.length) {
        const currentItem = list[index];
        // ... (Lógica de eventos igual)
        if (currentItem.type === "post" && currentItem.data?.$id) {
          const postId = currentItem.data.$id;
          const feedItemId = currentItem.id;
          const creatorId = currentItem.creatorId;
          const itemFeatures = currentItem.features;
          const emotionalTag = itemFeatures.emotionalTag;

          if (
            currentAnchorRef.current &&
            currentAnchorRef.current.feedItemId !== feedItemId
          ) {
            const prev = currentAnchorRef.current;
            const duration = now - prev.startTs;
            enqueueEvent(
              "view_end",
              prev.postId,
              prev.feedItemId,
              duration,
              prev.anchorIndex,
              prev.creatorId,
            );
            const eventType: FeedEventType = duration < 1200 ? "skip" : "dwell";
            enqueueEvent(
              eventType,
              prev.postId,
              prev.feedItemId,
              duration,
              prev.anchorIndex,
              prev.creatorId,
            );
            const interactionType =
              duration < 1200 ? InteractionType.SKIP : InteractionType.DWELL;
            BrainEmitter.interaction(interactionType, {
              postId: prev.postId,
              creatorId: prev.creatorId,
              emotionalTag: prev.emotionalTag,
              durationMs: duration,
              anchorIndex: prev.anchorIndex,
              postFeatures: prev.features,
            });
          }

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
            enqueueEvent(
              "view_start",
              postId,
              feedItemId,
              undefined,
              index,
              creatorId,
            );
          }
        }
      }

      // Brain Sync
      const manager = MoodSessionManager.getInstance();
      manager.updateViewableIndex(index);
    },
    [enqueueEvent],
  );

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
