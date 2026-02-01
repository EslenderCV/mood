import { useCallback, useEffect, useRef } from "react";

import { ID } from "react-native-appwrite";

import { appwriteConfig, databases } from "@/lib/appwrite";
import { MoodSessionManager } from "@/src/brain/session/MoodSessionManager";
import { InteractionType } from "@/src/brain/signals/InteractionSignals";
import { BrainEmitter } from "@/src/brain/signals/emitters";
import { EnrichedFeedItem, FeedEvent, FeedEventType } from "./homeTypes";

type Anchor = {
  feedItemId: string;
  postId: string;
  startTs: number;
  anchorIndex: number;
  creatorId: string;
  emotionalTag?: string;
  features: { energy: number; valence: number; emotionalTag?: string };
};

export const useFeedTelemetry = ({
  userId,
  sortedFeedRef,
  lastAnchorRef,
  currentAnchorRef,
}: {
  userId: string | undefined;
  sortedFeedRef: React.MutableRefObject<EnrichedFeedItem[]>;
  lastAnchorRef: React.MutableRefObject<number>;
  currentAnchorRef: React.MutableRefObject<Anchor | null>;
}) => {
  const sessionIdRef = useRef<string>("");
  const eventsQueueRef = useRef<FeedEvent[]>([]);
  const flushTimerRef = useRef<any>(null);
  const isFlushingRef = useRef(false);
  const telemetryEnabledRef = useRef(true);

  // Ensure sessionId and feature flag based on config.
  useEffect(() => {
    if (userId && !sessionIdRef.current) sessionIdRef.current = `${userId}_${Date.now()}`;
    if (!appwriteConfig.feedEventsCollectionId) telemetryEnabledRef.current = false;
  }, [userId]);

  const flushQueue = useCallback(async () => {
    if (!telemetryEnabledRef.current || isFlushingRef.current || eventsQueueRef.current.length === 0) return;

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
      // restore batch if any failure
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

    const resolveContext = (postId: string, feedItemId: string) => {
    const list = sortedFeedRef.current || [];
    const item =
      (list.find((it) => it.id === feedItemId) as any) ||
      (list.find((it: any) => it?.type === "post" && it?.data?.$id === postId) as any);
    const anchorIndex =
      item && typeof item.id === "string"
        ? (list.findIndex((it) => it.id === item.id) as number)
        : -1;

    return {
      item: item as EnrichedFeedItem | undefined,
      anchorIndex: anchorIndex >= 0 ? anchorIndex : undefined,
    };
  };

  const trackLike = useCallback(
    (postId: string, feedItemId: string) => {
      enqueueEvent("like", postId, feedItemId);
      const { item, anchorIndex } = resolveContext(postId, feedItemId);
      BrainEmitter.interaction(InteractionType.LIKE, {
        postId,
        creatorId: item?.creatorId,
        emotionalTag: item?.features?.emotionalTag,
        anchorIndex,
        postFeatures: item?.features,
      });
    },
    [enqueueEvent],
  );

  const trackSave = useCallback(
    (postId: string, feedItemId: string) => {
      enqueueEvent("save", postId, feedItemId);
      const { item, anchorIndex } = resolveContext(postId, feedItemId);
      BrainEmitter.interaction(InteractionType.SAVE, {
        postId,
        creatorId: item?.creatorId,
        emotionalTag: item?.features?.emotionalTag,
        anchorIndex,
        postFeatures: item?.features,
      });
    },
    [enqueueEvent],
  );

  const trackShare = useCallback(
    (postId: string, feedItemId: string) => {
      enqueueEvent("share", postId, feedItemId);
      const { item, anchorIndex } = resolveContext(postId, feedItemId);
      BrainEmitter.interaction(InteractionType.SHARE, {
        postId,
        creatorId: item?.creatorId,
        emotionalTag: item?.features?.emotionalTag,
        anchorIndex,
        postFeatures: item?.features,
      });
    },
    [enqueueEvent],
  );

  const trackOpenComments = useCallback(
    (postId: string, feedItemId: string) => {
      enqueueEvent("open_comments", postId, feedItemId);
      const { item, anchorIndex } = resolveContext(postId, feedItemId);
      BrainEmitter.interaction(InteractionType.OPEN_COMMENTS, {
        postId,
        creatorId: item?.creatorId,
        emotionalTag: item?.features?.emotionalTag,
        anchorIndex,
        postFeatures: item?.features,
      });
    },
    [enqueueEvent],
  );

  const trackOpenProfile = useCallback(
    (postId: string, feedItemId: string, creatorId: string) => {
      enqueueEvent("open_profile", postId, feedItemId, undefined, undefined, creatorId);
      const { item, anchorIndex } = resolveContext(postId, feedItemId);
      BrainEmitter.interaction(InteractionType.OPEN_PROFILE, {
        postId,
        creatorId: creatorId || item?.creatorId,
        emotionalTag: item?.features?.emotionalTag,
        anchorIndex,
        postFeatures: item?.features,
      });
    },
    [enqueueEvent],
  );

  const trackFollow = useCallback(
    (postId: string, feedItemId: string, creatorId: string) => {
      enqueueEvent("follow", postId, feedItemId, undefined, undefined, creatorId);
      const { item, anchorIndex } = resolveContext(postId, feedItemId);
      BrainEmitter.interaction(InteractionType.FOLLOW, {
        postId,
        creatorId: creatorId || item?.creatorId,
        emotionalTag: item?.features?.emotionalTag,
        anchorIndex,
        postFeatures: item?.features,
      });
    },
    [enqueueEvent],
  );

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

          // Close previous anchor
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

          // Open new anchor
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
        }
      }

      MoodSessionManager.getInstance().updateViewableIndex(index);
    },
    [enqueueEvent, lastAnchorRef, sortedFeedRef, currentAnchorRef],
  );

  return {
    enqueueEvent,
    trackLike,
    trackSave,
    trackShare,
    trackOpenComments,
    trackOpenProfile,
    trackFollow,
    updateViewableIndex,
    flushQueue,
  };
};
