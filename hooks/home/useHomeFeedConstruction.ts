import { useCallback, useEffect } from "react";

import { MoodSessionManager } from "@/src/brain/session/MoodSessionManager";
import { FeedItem } from "@/context/FeedProvider";
import {
  EnrichedFeedItem,
  shuffleArray,
  toRankableFeedItem,
} from "./homeTypes";

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
  useEffect(() => {
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

    const specials: FeedItem[] = [];
    const priorityPosts: FeedItem[] = [];
    const discoveryPosts: FeedItem[] = [];
    const generalPool: FeedItem[] = [];

    const FRESHNESS_THRESHOLD = 48 * 60 * 60 * 1000;
    const now = Date.now();

    const blocked = new Set(blockedUserIds || []);

    feed.forEach((item) => {
      if (item.type === "suggested_users") return;
      if (item.type !== "post") {
        specials.push(item);
        return;
      }

      const post = item.data;
      const creatorId =
        post.creator?.$id ||
        post.postedBy?.$id ||
        post.users?.[0]?.$id ||
        post.userId;

      const isMyPost = creatorId === userId;

      // ✅ Trust & safety baseline: if I blocked this user, I should never see their content.
      if (creatorId && blocked.has(creatorId)) return;
      const postDate = new Date(
        post.originalTime || post.$createdAt || 0,
      ).getTime();
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

    // Inject smart suggestions as separate modules
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

    const sortedPosts = [
      ...priorityPosts,
      ...discoveryPosts,
      ...shuffleArray(generalPool),
    ];
    const shuffledSpecials = shuffleArray(specials);

    postsPoolRef.current = sortedPosts;
    specialPoolRef.current = shuffledSpecials;
    postCursorRef.current = 0;
    specialCursorRef.current = 0;

    const initialBatchSize = 20;
    const initialPosts = postsPoolRef.current.slice(0, initialBatchSize);
    postCursorRef.current = initialPosts.length % postsPoolRef.current.length;

    let insertIndex = 4;
    const GAP = 5;

    while (
      insertIndex < initialPosts.length &&
      specialPoolRef.current.length > 0
    ) {
      const special = specialPoolRef.current[specialCursorRef.current];
      initialPosts.splice(insertIndex, 0, special);
      specialCursorRef.current =
        (specialCursorRef.current + 1) % specialPoolRef.current.length;
      insertIndex += GAP + 1;
    }

    const enrichedFeed = initialPosts.map((item, index) =>
      toRankableFeedItem(item, index, "init"),
    );

    itemsMapRef.current.clear();
    enrichedFeed.forEach((item) => itemsMapRef.current.set(item.id, item));
    MoodSessionManager.getInstance().initializeFeed(enrichedFeed as any);

    if (isMounted.current) {
      const realtimePosts = realtimePostsCacheRef.current;
      const feedIds = new Set(enrichedFeed.map((i) => (i as any).data?.$id));
      const uniqueRealtime = realtimePosts.filter(
        (rp) => !feedIds.has((rp as any).data?.$id),
      );
      const finalFeed = [...uniqueRealtime, ...enrichedFeed];
      setSortedFeed(finalFeed);
    }
  }, [feed, myFollowedIds, userId, smartSuggestions, blockedUserIds]);

  const handleLoadMore = useCallback(() => {
    if (postsPoolRef.current.length === 0) return;

    batchCounterRef.current += 1;
    const batchSuffix = `batch_${batchCounterRef.current}`;

    const newBatch: FeedItem[] = [];
    for (let i = 0; i < 10; i++) {
      const item = postsPoolRef.current[postCursorRef.current];
      newBatch.push(item);
      postCursorRef.current =
        (postCursorRef.current + 1) % postsPoolRef.current.length;
    }

    if (specialPoolRef.current.length > 0) {
      const special = specialPoolRef.current[specialCursorRef.current];
      if (newBatch.length >= 5) newBatch.splice(4, 0, special);
      else newBatch.push(special);

      specialCursorRef.current =
        (specialCursorRef.current + 1) % specialPoolRef.current.length;
    }

    const startIndex = sortedFeedRef.current.length;
    const enrichedBatch = newBatch.map((item, idx) =>
      toRankableFeedItem(item, startIndex + idx, batchSuffix),
    );

    enrichedBatch.forEach((item) => itemsMapRef.current.set(item.id, item));

    const currentBrainFeed = MoodSessionManager.getInstance().getFeed();
    const fullList = [...currentBrainFeed, ...enrichedBatch];
    MoodSessionManager.getInstance().initializeFeed(fullList as any);

    setSortedFeed((prev) => [...prev, ...enrichedBatch]);
  }, []);

  return { handleLoadMore };
};
