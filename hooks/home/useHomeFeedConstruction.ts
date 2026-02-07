import { useCallback, useEffect, useRef, useState } from "react";

import { FeedItem } from "@/context/FeedProvider";
import {
  getFeedPage,
  getServerHomeFeedPage,
  hydratePostsWithUsers,
  isServerHomeFeedEnabled,
  ServerFeedResponse,
} from "@/lib/appwrite";
import { extractMoodEmojiFromSongDataString } from "@/lib/postUtils";
import { MoodSessionManager } from "@/src/brain/session/MoodSessionManager";

import { SeenStateStore } from "@/src/feed/seen/SeenStateStore";
import { MixBandit } from "@/src/feed/brain/MixBandit";
import { HomeFeedBrain } from "@/src/feed/brain/HomeFeedBrain";

import {
  EnrichedFeedItem,
  toRankableFeedItem,
  shuffleArray,
} from "./homeTypes";

const getCreatorId = (post: any): string => {
  const pb = post?.postedBy;
  // Relationship attributes may be: string id | user object | [user] | [id]
  if (typeof pb === "string" && pb) return pb;
  if (Array.isArray(pb) && pb.length > 0) {
    const first = pb[0];
    if (typeof first === "string" && first) return first;
    if (first && typeof first === "object" && first.$id) return first.$id;
  }
  return (
    post?.creator?.$id ||
    pb?.$id ||
    post?.users?.[0]?.$id ||
    post?.userId ||
    "unknown"
  );
};

const decoratePostForBrain = (post: any): any => {
  try {
    if (!post || typeof post !== "object") return post;
    if (post.emotionalTag) return post;
    const raw = post.songData;
    if (typeof raw === "string") {
      const e = extractMoodEmojiFromSongDataString(raw);
      if (e) post.emotionalTag = e;
    }
  } catch {
    // best-effort
  }
  return post;
};

const getPostDateMs = (post: any): number => {
  const t = post?.originalTime || post?.$createdAt || 0;
  const d = new Date(t).getTime();
  return Number.isFinite(d) ? d : 0;
};

export const useHomeFeedConstruction = ({
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
}: {
  feed: FeedItem[] | null | undefined;
  userId: string | undefined;
  myFollowedIds: string[];
  blockedUserIds: string[];
  smartSuggestions: any[];
  setSortedFeed: React.Dispatch<React.SetStateAction<EnrichedFeedItem[]>>;
  sortedFeedRef: React.MutableRefObject<EnrichedFeedItem[]>;
  realtimePostsCacheRef: React.MutableRefObject<EnrichedFeedItem[]>;
  itemsMapRef: React.MutableRefObject<Map<string, EnrichedFeedItem>>;
  // legacy refs (kept for minimal surface change)
  postsPoolRef: React.MutableRefObject<FeedItem[]>;
  specialPoolRef: React.MutableRefObject<FeedItem[]>;
  postCursorRef: React.MutableRefObject<number>;
  specialCursorRef: React.MutableRefObject<number>;
  batchCounterRef: React.MutableRefObject<number>;
  lastAnchorRef: React.MutableRefObject<number>;
  lastOrderHashRef: React.MutableRefObject<string>;
  currentAnchorRef: React.MutableRefObject<any>;
  isMounted: React.MutableRefObject<boolean>;
}) => {
  const servedPostIdsRef = useRef<Set<string>>(new Set());
  const poolIdsRef = useRef<Set<string>>(new Set());
  const candidatePoolRef = useRef<FeedItem[]>([]);
  const nextCursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef<boolean>(true);
  const isLoadingMoreRef = useRef<boolean>(false);

  // Server feed is the preferred path, but we auto-degrade to local mode if
  // the server function fails (so Expo Go / dev builds never hard-crash).
  const [serverDegraded, setServerDegraded] = useState<boolean>(false);
  const serverMode = isServerHomeFeedEnabled() && !serverDegraded;
  const [serverLoading, setServerLoading] = useState<boolean>(false);
  const [serverRefreshing, setServerRefreshing] = useState<boolean>(false);
  const serverNextCursorRef = useRef<string | null>(null);
  const serverHasMoreRef = useRef<boolean>(true);
  const serverIsLoadingMoreRef = useRef<boolean>(false);
  const serverSnapshotIdRef = useRef<string | null>(null);
  const serverCursorIdRef = useRef<string | null>(null);
  const serverPrefetchRef = useRef<{ cursor: string | null; resp: ServerFeedResponse | null } | null>(null);
  const serverPrefetchInFlightRef = useRef<boolean>(false);

  const prefetchServerNextPage = useCallback(async () => {
    if (!serverMode) return;
    const nextCursor = serverNextCursorRef.current;
    if (!nextCursor) return;

    if (serverPrefetchInFlightRef.current) return;
    if (serverPrefetchRef.current?.cursor === nextCursor && serverPrefetchRef.current?.resp?.ok) return;

    serverPrefetchInFlightRef.current = true;
    try {
      const sessionId = MoodSessionManager.getInstance().getSessionId();
      const resp = await getServerHomeFeedPage({ limit: 20, cursor: nextCursor, sessionId });
      if (resp?.ok) serverPrefetchRef.current = { cursor: nextCursor, resp };
    } catch {
      // best-effort
    } finally {
      serverPrefetchInFlightRef.current = false;
    }
  }, [serverMode]);


  const seenStore = SeenStateStore.getInstance();
  const bandit = MixBandit.getInstance();

  const addCandidatesToPool = useCallback(
    (posts: any[]) => {
      if (!posts || posts.length === 0) return;
      const blocked = new Set(blockedUserIds || []);

      const toAdd: FeedItem[] = [];
      for (const post of posts) {
        if (!post?.$id) continue;
        decoratePostForBrain(post);
        const creatorId = getCreatorId(post);
        if (creatorId && blocked.has(creatorId)) continue;
        if (servedPostIdsRef.current.has(post.$id)) continue;
        if (poolIdsRef.current.has(post.$id)) continue;

        const item: FeedItem = {
          _id: post.$id,
          type: "post",
          data: post,
          status: "published",
        };
        toAdd.push(item);
        poolIdsRef.current.add(post.$id);
      }

      // Keep pool roughly in recency order for stability (brain still scores)
      toAdd.sort((a, b) => getPostDateMs(b.data) - getPostDateMs(a.data));

      candidatePoolRef.current = [...candidatePoolRef.current, ...toAdd];
      postsPoolRef.current = candidatePoolRef.current; // legacy alias
    },
    [blockedUserIds, postsPoolRef],
  );

  const buildEnrichedPage = useCallback(
    (pageItems: FeedItem[], metaByPostId: Map<string, any>, batchSuffix: string) => {
      const startIndex = sortedFeedRef.current.length;
      const enriched = pageItems.map((it, idx) => {
        const e = toRankableFeedItem(it, startIndex + idx, batchSuffix) as any;

        if (it.type === "post") {
          const postId = it.data?.$id;
          const meta = postId ? metaByPostId.get(postId) : undefined;
          if (meta) {
            e.feedSource = meta.source;
            e.reasonCodes = meta.reasonCodes;
            e.rankScore = meta.score;
          }
        }

        return e as EnrichedFeedItem;
      });

      enriched.forEach((it) => itemsMapRef.current.set(it.id, it));
      return enriched;
    },
    [itemsMapRef, sortedFeedRef],
  );

  const injectSpecials = useCallback((posts: FeedItem[], specials: FeedItem[]) => {
    if (!specials || specials.length === 0) return posts;

    // stable-ish insertion cadence; no cycling wrap-around
    const out = [...posts];
    let insertIndex = 4;
    const GAP = 5;

    while (insertIndex < out.length && specials.length > 0) {
      const special = specials[specialCursorRef.current % specials.length];
      out.splice(insertIndex, 0, special);
      specialCursorRef.current += 1;
      insertIndex += GAP + 1;
    }

    return out;
  }, [specialCursorRef]);

  useEffect(() => {
    void (async () => {
      if (!feed || feed.length === 0 || !userId) {
        if (
          isMounted.current &&
          sortedFeedRef.current.length > 0 &&
          (!feed || feed.length === 0)
        ) {
          setSortedFeed([]);
        }
        return;
      }

      // Reset session state for a brand-new feed build
      lastAnchorRef.current = -1;
      lastOrderHashRef.current = "";
      currentAnchorRef.current = null;
      batchCounterRef.current = 0;

      // Reset pools
      servedPostIdsRef.current = new Set();
      poolIdsRef.current = new Set();
      candidatePoolRef.current = [];
      nextCursorRef.current = null;
      hasMoreRef.current = true;
      isLoadingMoreRef.current = false;

      await Promise.all([seenStore.ensureLoaded(userId), bandit.ensureLoaded(userId)]);

      const blocked = new Set(blockedUserIds || []);

      // 1) Separate specials and raw posts from provided feed (provider may have injected modules)
      const specials: FeedItem[] = [];
      const rawPosts: any[] = [];

      for (const item of feed) {
        if (!item) continue;
        if (item.type !== "post") {
          // Keep discovery modules, but don't let them influence ranking.
          specials.push(item);
          continue;
        }

        const post = item.data;
        const creatorId = getCreatorId(post);

        if (creatorId && blocked.has(creatorId)) continue;
        rawPosts.push(post);
      }

      // 2) Inject smart suggestions as separate modules (existing behavior)
      if (smartSuggestions.length >= 3) {
        const USERS_PER_CHUNK = 5;
        for (let i = 0; i < smartSuggestions.length; i += USERS_PER_CHUNK) {
          const chunk = smartSuggestions.slice(i, i + USERS_PER_CHUNK);
          if (chunk.length >= 3) {
            specials.push({
              _id: `smart_sugg_${i}`,
              type: "suggested_users",
              data: chunk,
            });
          }
        }
      }

      // Shuffle specials lightly (same as before)
      const shuffledSpecials = shuffleArray(specials);
      specialPoolRef.current = shuffledSpecials;
      specialCursorRef.current = 0;

      // --- Server mode: backend source of truth for Home feed ---
      if (serverMode) {
        setServerLoading(true);
        let serverOk = false;
        try {
          const sessionId = MoodSessionManager.getInstance().getSessionId();

          // Reset server paging
          serverNextCursorRef.current = null;
          serverHasMoreRef.current = true;
          serverSnapshotIdRef.current = null;
          serverCursorIdRef.current = null;
          serverPrefetchRef.current = null;

          // Reset local pools / dedupe for a clean top-of-feed
          servedPostIdsRef.current = new Set();
          itemsMapRef.current.clear();

          const resp = await getServerHomeFeedPage({ limit: 20, cursor: null, sessionId });

          if (!resp?.ok) {
            console.warn("[Mood] server feed init failed; degrading to local feed", resp);
            setServerDegraded(true);
            serverOk = false;
          } else {
            serverNextCursorRef.current = resp?.next_cursor ?? null;
            void prefetchServerNextPage();
            serverHasMoreRef.current = !!serverNextCursorRef.current;
            serverSnapshotIdRef.current = (resp as any)?.snapshot_id ?? null;
            serverCursorIdRef.current = (resp as any)?.cursor_id ?? null;

            const metaByPostId = new Map<string, any>();
            const rawPostsById = new Map<string, any>();
            const orderedPostIds: string[] = [];

            for (const it of resp?.items || []) {
              const post = (it as any)?.post;
              const postId = post?.$id;
              if (!postId) continue;

              const creatorId = getCreatorId(post);
              if (creatorId && blocked.has(creatorId)) continue;

              if (servedPostIdsRef.current.has(postId)) continue;
              servedPostIdsRef.current.add(postId);

              metaByPostId.set(postId, {
                feedItemId: (it as any)?.feed_item_id,
                source: (it as any)?.source,
                rankPosition: (it as any)?.rank_position,
                score: (it as any)?.score,
                reasonCodes: (it as any)?.reason_codes,
              });

              rawPostsById.set(postId, post);
              orderedPostIds.push(postId);
            }

            // Hydrate creators so PostItem can render usernames/avatars.
            const hydratedPosts = await hydratePostsWithUsers(
              Array.from(rawPostsById.values()),
            );
            hydratedPosts.forEach((p: any) => decoratePostForBrain(p));
            const hydratedById = new Map(
              hydratedPosts.map((p: any) => [p?.$id, p]),
            );

            const serverPosts: FeedItem[] = orderedPostIds
              .map((postId) => {
                const post = hydratedById.get(postId) || rawPostsById.get(postId);
                if (!post) return null;
                decoratePostForBrain(post);
                return {
                  _id: postId,
                  type: "post",
                  data: post,
                } as any;
              })
              .filter(Boolean) as any;

            // Inject specials with the same cadence as before
            const pageMixed = injectSpecials(serverPosts, specialPoolRef.current);

            const enrichedFeed = pageMixed.map((item, index) => {
            const e = toRankableFeedItem(item, index, "srv_init") as any;
            if (item.type === "post") {
              const postId = item.data?.$id;
              const meta = postId ? metaByPostId.get(postId) : undefined;
              if (meta) {
                e.feedItemId = meta.feedItemId;
                e.feedSource = meta.source;
                e.rankPosition = meta.rankPosition;
                e.reasonCodes = meta.reasonCodes;
                e.score = meta.score;
              }
            }
            itemsMapRef.current.set(e.id, e);
            return e as EnrichedFeedItem;
          });

            // Keep Brain updated for session learning (but do NOT reorder Home in server mode).
            const brainPostsOnly = enrichedFeed.filter((it) => it.type === "post");
            MoodSessionManager.getInstance().initializeFeed(brainPostsOnly as any);

            if (isMounted.current) {
              setSortedFeed(enrichedFeed);
            }

            serverOk = true;
          }
        } catch (e) {
          console.warn("[Mood] server feed init crashed; degrading to local feed", e);
          setServerDegraded(true);
        } finally {
          if (isMounted.current) setServerLoading(false);
        }
        if (serverOk) return;
      }

      // 3) Build candidate pool (posts only)
      addCandidatesToPool(rawPosts);

      // Compute nextCursor from the oldest post in this initial candidate set
      const sortedByCreated = [...rawPosts].sort(
        (a, b) => getPostDateMs(b) - getPostDateMs(a),
      );
      nextCursorRef.current =
        sortedByCreated.length >= 60 ? sortedByCreated[sortedByCreated.length - 1]?.$id : null;

      // 4) Rank top-of-feed (Phase-2 IG-like behavior)
      const ranked = HomeFeedBrain.buildPage({
        candidates: candidatePoolRef.current,
        userId,
        myFollowedIds,
        servedPostIds: servedPostIdsRef.current,
        pageSize: 20,
        isTopOfFeed: true,
        seen: seenStore,
        bandit,
        session: MoodSessionManager.getInstance(),
      });

      const metaByPostId = new Map<string, any>();
      const selectedPosts: FeedItem[] = [];
      for (const r of ranked) {
        metaByPostId.set(r.postId, r);
        selectedPosts.push(r.item);
        servedPostIdsRef.current.add(r.postId);
      }

      // Remove selected from pool for future paging
      const selectedSet = new Set(ranked.map((r) => r.postId));
      candidatePoolRef.current = candidatePoolRef.current.filter((it) => {
        if (it.type !== "post") return false;
        const pid = it.data?.$id;
        return pid && !selectedSet.has(pid);
      });
      postsPoolRef.current = candidatePoolRef.current;

      // 5) Inject specials into the page (modules locked later by Brain sync)
      const pageMixed = injectSpecials(selectedPosts, specialPoolRef.current);

      // 6) Enrich + initialize Brain with POSTS only
      itemsMapRef.current.clear();
      const enrichedFeed = pageMixed.map((item, index) => {
        const e = toRankableFeedItem(item, index, "init") as any;
        if (item.type === "post") {
          const postId = item.data?.$id;
          const meta = postId ? metaByPostId.get(postId) : undefined;
          if (meta) {
            e.feedSource = meta.source;
            e.reasonCodes = meta.reasonCodes;
            e.rankScore = meta.score;
          }
        }
        itemsMapRef.current.set(e.id, e);
        return e as EnrichedFeedItem;
      });

      const brainPostsOnly = enrichedFeed.filter((it) => it.type === "post");
      MoodSessionManager.getInstance().initializeFeed(brainPostsOnly as any);

      // 7) Merge realtime posts at top (dedupe by postId)
      if (isMounted.current) {
        const realtimePosts = realtimePostsCacheRef.current || [];
        const feedPostIds = new Set(
          enrichedFeed.filter((i) => i.type === "post").map((i: any) => i.data?.$id),
        );

        const uniqueRealtime = realtimePosts.filter((rp: any) => {
          const pid = rp?.data?.$id;
          return pid && !feedPostIds.has(pid);
        });

        const finalFeed = [...uniqueRealtime, ...enrichedFeed];
        setSortedFeed(finalFeed);
      }
    })();
  }, [
    feed,
    myFollowedIds,
    userId,
    smartSuggestions,
    blockedUserIds,
    addCandidatesToPool,
    injectSpecials,
    setSortedFeed,
    sortedFeedRef,
    realtimePostsCacheRef,
    itemsMapRef,
    specialPoolRef,
    specialCursorRef,
    batchCounterRef,
    lastAnchorRef,
    lastOrderHashRef,
    currentAnchorRef,
    isMounted,
    seenStore,
    bandit,
  ]);

  const fetchMoreIfNeeded = useCallback(async () => {
    if (!userId) return;
    if (!hasMoreRef.current) return;
    if (!nextCursorRef.current) {
      hasMoreRef.current = false;
      return;
    }

    const res = await getFeedPage({ limit: 60, cursorAfter: nextCursorRef.current });
    const posts = res?.posts || [];
    addCandidatesToPool(posts);

    nextCursorRef.current = res?.nextCursor || null;
    if (!nextCursorRef.current) hasMoreRef.current = false;
  }, [addCandidatesToPool, userId]);

  const refreshServerFeed = useCallback(async () => {
    if (!serverMode || !userId) return;

    setServerRefreshing(true);
    try {
      const sessionId = MoodSessionManager.getInstance().getSessionId();

      const blocked = new Set(blockedUserIds || []);
      servedPostIdsRef.current = new Set();
      itemsMapRef.current.clear();
      serverPrefetchRef.current = null;

      const resp = await getServerHomeFeedPage({
        limit: 20,
        cursor: null,
        sessionId,
      });

      if (!resp?.ok) {
        console.warn("[Mood] server feed refresh failed; degrading to local feed", resp);
        setServerDegraded(true);
        return;
      }

      serverNextCursorRef.current = resp?.next_cursor ?? null;
      void prefetchServerNextPage();
      serverHasMoreRef.current = !!serverNextCursorRef.current;
      serverSnapshotIdRef.current = (resp as any)?.snapshot_id ?? null;
      serverCursorIdRef.current = (resp as any)?.cursor_id ?? null;

      const metaByPostId = new Map<string, any>();
      const rawPostsById = new Map<string, any>();
      const orderedPostIds: string[] = [];

      for (const it of resp?.items || []) {
        const post = (it as any)?.post;
        const postId = post?.$id;
        if (!postId) continue;

        const creatorId = getCreatorId(post);
        if (creatorId && blocked.has(creatorId)) continue;

        if (servedPostIdsRef.current.has(postId)) continue;
        servedPostIdsRef.current.add(postId);

        metaByPostId.set(postId, {
          feedItemId: (it as any)?.feed_item_id,
          source: (it as any)?.source,
          rankPosition: (it as any)?.rank_position,
          score: (it as any)?.score,
          reasonCodes: (it as any)?.reason_codes,
        });

        rawPostsById.set(postId, post);
        orderedPostIds.push(postId);
      }

      const hydratedPosts = await hydratePostsWithUsers(Array.from(rawPostsById.values()));
      const hydratedById = new Map(hydratedPosts.map((p: any) => [p?.$id, p]));

      const serverPosts: FeedItem[] = orderedPostIds
        .map((postId) => {
          const post = hydratedById.get(postId) || rawPostsById.get(postId);
          if (!post) return null;
          return {
            _id: postId,
            type: "post",
            data: post,
          } as any;
        })
        .filter(Boolean) as any;

      const pageMixed = injectSpecials(serverPosts, specialPoolRef.current);

      const enrichedFeed = pageMixed.map((item, index) => {
        const e = toRankableFeedItem(item, index, "srv_init") as any;
        if (item.type === "post") {
          const postId = item.data?.$id;
          const meta = postId ? metaByPostId.get(postId) : undefined;
          if (meta) {
            e.feedItemId = meta.feedItemId;
            e.feedSource = meta.source;
            e.rankPosition = meta.rankPosition;
            e.reasonCodes = meta.reasonCodes;
            e.score = meta.score;
          }
        }
        itemsMapRef.current.set(e.id, e);
        return e as EnrichedFeedItem;
      });

      const brainPostsOnly = enrichedFeed.filter((it) => it.type === "post");
      MoodSessionManager.getInstance().initializeFeed(brainPostsOnly as any);

      setSortedFeed(enrichedFeed);
    } finally {
      setServerRefreshing(false);
    }
  }, [serverMode, userId, blockedUserIds, setSortedFeed]);

  const handleLoadMore = useCallback(async () => {
    if (!userId) return;

    // Server mode pagination (backend ranked pages)
    if (serverMode) {
      if (serverIsLoadingMoreRef.current) return;
      if (!serverHasMoreRef.current) return;

      serverIsLoadingMoreRef.current = true;
      try {
        const sessionId = MoodSessionManager.getInstance().getSessionId();
        const cursor = serverNextCursorRef.current;

        let resp: any = null;
        const pref = serverPrefetchRef.current;
        if (pref && pref.cursor === cursor && pref.resp?.ok) {
          resp = pref.resp;
          serverPrefetchRef.current = null;
        } else {
          resp = await getServerHomeFeedPage({
            limit: 20,
            cursor,
            sessionId,
          });
        }

        if (!resp?.ok) {
          console.warn("[Mood] server feed loadMore failed; degrading to local feed", resp);
          setServerDegraded(true);
          serverHasMoreRef.current = false;
          serverNextCursorRef.current = null;
          return;
        }

        serverNextCursorRef.current = resp?.next_cursor ?? null;
        void prefetchServerNextPage();
        serverHasMoreRef.current = !!serverNextCursorRef.current;

        const blocked = new Set(blockedUserIds || []);
        const metaByPostId = new Map<string, any>();
        const rawPostsById = new Map<string, any>();
        const orderedPostIds: string[] = [];

        for (const it of resp?.items || []) {
          const post = (it as any)?.post;
          const postId = post?.$id;
          if (!postId) continue;

          const creatorId = getCreatorId(post);
          if (creatorId && blocked.has(creatorId)) continue;

          if (servedPostIdsRef.current.has(postId)) continue;
          servedPostIdsRef.current.add(postId);

          metaByPostId.set(postId, {
            feedItemId: (it as any)?.feed_item_id,
            source: (it as any)?.source,
            rankPosition: (it as any)?.rank_position,
            score: (it as any)?.score,
            reasonCodes: (it as any)?.reason_codes,
          });

          rawPostsById.set(postId, post);
          orderedPostIds.push(postId);
        }

        const hydratedPosts = await hydratePostsWithUsers(Array.from(rawPostsById.values()));
        const hydratedById = new Map(hydratedPosts.map((p: any) => [p?.$id, p]));

        const newPosts: FeedItem[] = orderedPostIds
          .map((postId) => {
            const post = hydratedById.get(postId) || rawPostsById.get(postId);
            if (!post) return null;
            return {
              _id: postId,
              type: "post",
              data: post,
            } as any;
          })
          .filter(Boolean) as any;

        if (newPosts.length === 0) return;

        batchCounterRef.current += 1;
        const batchSuffix = `srv_batch_${batchCounterRef.current}`;

        // Keep same cadence: optionally insert 1 special at position 4 of this batch
        const batchMixed: FeedItem[] = [...newPosts];
        if (specialPoolRef.current.length > 0) {
          const special =
            specialPoolRef.current[specialCursorRef.current % specialPoolRef.current.length];
          if (batchMixed.length >= 5) batchMixed.splice(4, 0, special);
          else batchMixed.push(special);
          specialCursorRef.current += 1;
        }

        const currentLen = sortedFeedRef.current.length;
        const enrichedBatch: EnrichedFeedItem[] = [];
        for (let idx = 0; idx < batchMixed.length; idx++) {
          const it = batchMixed[idx];
          const e = toRankableFeedItem(it, currentLen + idx, batchSuffix) as any;
          if (it.type === "post") {
            const postId = it.data?.$id;
            const meta = postId ? metaByPostId.get(postId) : undefined;
            if (meta) {
              e.feedItemId = meta.feedItemId;
              e.feedSource = meta.source;
              e.rankPosition = meta.rankPosition;
              e.reasonCodes = meta.reasonCodes;
              e.score = meta.score;
            }
          }
          itemsMapRef.current.set(e.id, e);
          enrichedBatch.push(e as EnrichedFeedItem);
        }

        // Keep Brain updated for learning (posts only)
        const mgr = MoodSessionManager.getInstance();
        const currentBrain = mgr.getFeed() || [];
        const newBrainPosts = enrichedBatch.filter((it) => it.type === "post");
        mgr.initializeFeed([...currentBrain, ...newBrainPosts] as any);

        setSortedFeed((prev) => [...prev, ...enrichedBatch]);
      } finally {
        serverIsLoadingMoreRef.current = false;
      }
      return;
    }
    if (isLoadingMoreRef.current) return;
    isLoadingMoreRef.current = true;

    try {
      await Promise.all([seenStore.ensureLoaded(userId), bandit.ensureLoaded(userId)]);

      // Ensure enough candidates
      if (candidatePoolRef.current.length < 18 && hasMoreRef.current) {
        await fetchMoreIfNeeded();
      }

      if (candidatePoolRef.current.length === 0) return;

      batchCounterRef.current += 1;
      const batchSuffix = `batch_${batchCounterRef.current}`;

      const ranked = HomeFeedBrain.buildPage({
        candidates: candidatePoolRef.current,
        userId,
        myFollowedIds,
        servedPostIds: servedPostIdsRef.current,
        pageSize: 10,
        isTopOfFeed: false,
        seen: seenStore,
        bandit,
        session: MoodSessionManager.getInstance(),
      });

      if (ranked.length === 0) {
        // If everything was suppressed, try fetching more once
        if (hasMoreRef.current) {
          await fetchMoreIfNeeded();
          const retry = HomeFeedBrain.buildPage({
            candidates: candidatePoolRef.current,
            userId,
            myFollowedIds,
            servedPostIds: servedPostIdsRef.current,
            pageSize: 10,
            isTopOfFeed: false,
            seen: seenStore,
            bandit,
            session: MoodSessionManager.getInstance(),
          });
          if (retry.length === 0) return;
          ranked.splice(0, ranked.length, ...retry);
        } else {
          return;
        }
      }

      const metaByPostId = new Map<string, any>();
      const newPosts: FeedItem[] = [];
      for (const r of ranked) {
        metaByPostId.set(r.postId, r);
        newPosts.push(r.item);
        servedPostIdsRef.current.add(r.postId);
      }

      const selectedSet = new Set(ranked.map((r) => r.postId));
      candidatePoolRef.current = candidatePoolRef.current.filter((it) => {
        const pid = it.data?.$id;
        return pid && !selectedSet.has(pid);
      });
      postsPoolRef.current = candidatePoolRef.current;

      // Insert 1 special around position 4 (same cadence as before)
      const batchMixed: FeedItem[] = [...newPosts];
      if (specialPoolRef.current.length > 0) {
        const special = specialPoolRef.current[specialCursorRef.current % specialPoolRef.current.length];
        if (batchMixed.length >= 5) batchMixed.splice(4, 0, special);
        else batchMixed.push(special);
        specialCursorRef.current += 1;
      }

      // Enrich
      const enrichedBatch: EnrichedFeedItem[] = [];
      const currentLen = sortedFeedRef.current.length;
      for (let idx = 0; idx < batchMixed.length; idx++) {
        const it = batchMixed[idx];
        const e = toRankableFeedItem(it, currentLen + idx, batchSuffix) as any;
        if (it.type === "post") {
          const postId = it.data?.$id;
          const meta = postId ? metaByPostId.get(postId) : undefined;
          if (meta) {
            e.feedSource = meta.source;
            e.reasonCodes = meta.reasonCodes;
            e.rankScore = meta.score;
          }
        }
        itemsMapRef.current.set(e.id, e);
        enrichedBatch.push(e as EnrichedFeedItem);
      }

      // Update Brain with POSTS only
      const mgr = MoodSessionManager.getInstance();
      const currentBrain = mgr.getFeed() || [];
      const newBrainPosts = enrichedBatch.filter((it) => it.type === "post");
      mgr.initializeFeed([...currentBrain, ...newBrainPosts] as any);

      setSortedFeed((prev) => [...prev, ...enrichedBatch]);
    } finally {
      isLoadingMoreRef.current = false;
    }
  }, [
    serverMode,
    blockedUserIds,
    userId,
    myFollowedIds,
    seenStore,
    bandit,
    fetchMoreIfNeeded,
    batchCounterRef,
    sortedFeedRef,
    itemsMapRef,
    specialPoolRef,
    specialCursorRef,
    postsPoolRef,
    setSortedFeed,
  ]);

  return { handleLoadMore, refreshServerFeed, serverLoading, serverRefreshing, serverMode };
};