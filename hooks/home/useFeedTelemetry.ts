import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

import { ID } from "react-native-appwrite";

import { appwriteConfig, databases, isServerHomeFeedEnabled, sendFeedEventsBatch } from "@/lib/appwrite";
import { MoodSessionManager } from "@/src/brain/session/MoodSessionManager";
import { InteractionType } from "@/src/brain/signals/InteractionSignals";
import { BrainEmitter } from "@/src/brain/signals/emitters";
import { EnrichedFeedItem, FeedEvent, FeedEventType } from "./homeTypes";
import { SeenStateStore } from "@/src/feed/seen/SeenStateStore";
import { MixBandit, FeedSource } from "@/src/feed/brain/MixBandit";

type Anchor = {
  feedItemId: string;
  postId: string;
  startTs: number;
  anchorIndex: number; // index in sortedFeedRef (incl. modules)
  creatorId: string;
  emotionalTag?: string;
  features: { energy: number; valence: number; emotionalTag?: string };
  feedSource?: FeedSource;
};

const rewardFor = (event: FeedEventType, durationMs?: number): number => {
  if (event === "like") return 0.85;
  if (event === "save") return 0.95;
  if (event === "share") return 1.0;
  if (event === "follow") return 0.9;
  if (event === "open_comments") return 0.35;
  if (event === "open_profile") return 0.25;

  // view-based reward
  const d = Math.max(0, durationMs || 0);
  if (event === "skip_fast") return -0.45;
  if (event === "skip") return -0.25;
  if (event === "dwell") {
    // 1.2s => ~0.10, 8s => ~0.35
    return Math.min(0.35, 0.06 + d / 22000);
  }
  return 0;
};

const toPostIndex = (list: EnrichedFeedItem[], anchorIndex: number): number => {
  if (anchorIndex < 0) return 0;
  let count = -1;
  for (let i = 0; i <= anchorIndex && i < list.length; i++) {
    if (list[i]?.type === "post") count += 1;
  }
  return Math.max(0, count);
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

  const seenStore = SeenStateStore.getInstance();
  const bandit = MixBandit.getInstance();

  // Ensure sessionId and feature flag based on config.
  useEffect(() => {
    if (userId && !sessionIdRef.current) sessionIdRef.current = MoodSessionManager.getInstance().getSessionId();
    if (!appwriteConfig.feedEventsCollectionId) telemetryEnabledRef.current = false;

    if (userId) {
      void Promise.all([seenStore.ensureLoaded(userId), bandit.ensureLoaded(userId)]);
    }
  }, [userId, seenStore, bandit]);

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
      // Phase-3: if backend telemetry function is enabled, batch send there (dedupe + retry server-side).
      if (isServerHomeFeedEnabled() && appwriteConfig.serverHomeFeed?.feedEventsFunctionId) {
        await sendFeedEventsBatch({ events: batch as any });
      } else {
        const promises = batch.map((event) =>
          databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.feedEventsCollectionId!,
            ID.unique(),
            event,
          ),
        );
        await Promise.allSettled(promises);
      }
    } catch {
      // restore batch if any failure
      eventsQueueRef.current = [...batch, ...eventsQueueRef.current];
    } finally {
      isFlushingRef.current = false;
    }
  }, []);

  // periodic flush
  useEffect(() => {
    if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    flushTimerRef.current = setInterval(() => {
      void flushQueue();
    }, 7000);

    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    };
  }, [flushQueue]);

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

      const list = sortedFeedRef.current || [];
      const it = (list.find((x: any) => x && x.id === feedItemId) as any) || null;
      const telemetryFeedItemId = it?.feedItemId || feedItemId;

      const event: FeedEvent = {
        eventId: `evt_${sessionIdRef.current}_${ID.unique()}`,
        userId,
        postId,
        feedItemId: telemetryFeedItemId,
        type,
        durationMs,
        anchorIndex,
        sessionId: sessionIdRef.current,
        createdAt: new Date().toISOString(),
        creatorId,
      };

      eventsQueueRef.current.push(event);

      // lightweight backpressure flush
      if (eventsQueueRef.current.length >= 24) {
        void flushQueue();
      }
    },
    [flushQueue, userId],
  );

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

  const applyBanditReward = useCallback(
    (source: FeedSource | undefined, event: FeedEventType, durationMs?: number) => {
      if (!source) return;
      const r = rewardFor(event, durationMs);
      if (r !== 0) bandit.update(source, r);
    },
    [bandit],
  );

  const closeAnchor = useCallback(
    (now: number, reason?: string) => {
      const prev = currentAnchorRef.current;
      if (!prev) return;

      const duration = now - prev.startTs;

      enqueueEvent("view_end", prev.postId, prev.feedItemId, duration, prev.anchorIndex, prev.creatorId);

      const eventType: FeedEventType =
        duration < 700 ? "skip_fast" : duration < 1200 ? "skip" : "dwell";
      enqueueEvent(eventType, prev.postId, prev.feedItemId, duration, prev.anchorIndex, prev.creatorId);

      // Seen-state (Phase-2: impressions + dwell/skip)
      try {
        seenStore.recordViewEnd(prev.postId, duration, now);
      } catch {}

      // Bandit update (mix adaptation)
      applyBanditReward(prev.feedSource, eventType, duration);

      const interactionType = duration < 1200 ? InteractionType.SKIP : InteractionType.DWELL;
      BrainEmitter.interaction(interactionType, {
        postId: prev.postId,
        creatorId: prev.creatorId,
        emotionalTag: prev.emotionalTag,
        durationMs: duration,
        anchorIndex: prev.anchorIndex,
        postFeatures: prev.features,
      });

      currentAnchorRef.current = null;
    },
    [applyBanditReward, enqueueEvent, currentAnchorRef, seenStore],
  );

  // Close on background / inactive to avoid orphan anchors
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        closeAnchor(Date.now(), state);
        void flushQueue();
      }
    });

    return () => {
      sub.remove?.();
      closeAnchor(Date.now(), "unmount");
      void flushQueue();
    };
  }, [closeAnchor, flushQueue]);

  const updateViewableIndex = useCallback(
    (index: number) => {
      if (index === lastAnchorRef.current) return;
      lastAnchorRef.current = index;

      const list = sortedFeedRef.current || [];
      const now = Date.now();

      // If index points at a module/ad, scan forward for the next post.
      let idx = index;
      while (idx < list.length && list[idx]?.type !== "post") idx += 1;
      if (idx < 0 || idx >= list.length) return;

      const currentItem = list[idx];
      if (!currentItem || currentItem.type !== "post" || !currentItem.data?.$id) return;

      const postId = currentItem.data.$id;
      const feedItemId = currentItem.id;
      const creatorId = currentItem.creatorId;
      const itemFeatures = currentItem.features;
      const emotionalTag = itemFeatures.emotionalTag;
      const feedSource = (currentItem as any).feedSource as FeedSource | undefined;

      // Close previous anchor
      if (currentAnchorRef.current && currentAnchorRef.current.feedItemId !== feedItemId) {
        closeAnchor(now, "scroll");
      }

      // Open new anchor
      if (currentAnchorRef.current?.feedItemId !== feedItemId) {
        currentAnchorRef.current = {
          feedItemId,
          postId,
          startTs: now,
          anchorIndex: idx,
          creatorId,
          emotionalTag,
          features: itemFeatures,
          feedSource,
        };

        // Seen-state impression
        try {
          seenStore.markImpression(postId, now);
        } catch {}

        enqueueEvent("view_start", postId, feedItemId, undefined, idx, creatorId);
      }

      // Brain index must be over POSTS only (modules locked)
      const postIndex = toPostIndex(list, idx);
      MoodSessionManager.getInstance().updateViewableIndex(postIndex);
    },
    [enqueueEvent, lastAnchorRef, sortedFeedRef, currentAnchorRef, closeAnchor, seenStore],
  );

  const updateViewableItem = useCallback(
    (feedItemId: string) => {
      if (!feedItemId) return;
      const list = sortedFeedRef.current || [];
      const idx = list.findIndex((it) => it.id === feedItemId);
      if (idx >= 0) updateViewableIndex(idx);
    },
    [sortedFeedRef, updateViewableIndex],
  );

  const trackLike = useCallback(
    (postId: string, feedItemId: string) => {
      enqueueEvent("like", postId, feedItemId);
      const { item, anchorIndex } = resolveContext(postId, feedItemId);

      try {
        seenStore.recordPositive(postId);
      } catch {}
      applyBanditReward((item as any)?.feedSource as FeedSource | undefined, "like");

      BrainEmitter.interaction(InteractionType.LIKE, {
        postId,
        creatorId: item?.creatorId,
        emotionalTag: item?.features?.emotionalTag,
        anchorIndex,
        postFeatures: item?.features,
      });
    },
    [applyBanditReward, enqueueEvent, seenStore],
  );

  const trackSave = useCallback(
    (postId: string, feedItemId: string) => {
      enqueueEvent("save", postId, feedItemId);
      const { item, anchorIndex } = resolveContext(postId, feedItemId);

      try {
        seenStore.recordPositive(postId);
      } catch {}
      applyBanditReward((item as any)?.feedSource as FeedSource | undefined, "save");

      BrainEmitter.interaction(InteractionType.SAVE, {
        postId,
        creatorId: item?.creatorId,
        emotionalTag: item?.features?.emotionalTag,
        anchorIndex,
        postFeatures: item?.features,
      });
    },
    [applyBanditReward, enqueueEvent, seenStore],
  );

  const trackShare = useCallback(
    (postId: string, feedItemId: string) => {
      enqueueEvent("share", postId, feedItemId);
      const { item, anchorIndex } = resolveContext(postId, feedItemId);

      try {
        seenStore.recordPositive(postId);
      } catch {}
      applyBanditReward((item as any)?.feedSource as FeedSource | undefined, "share");

      BrainEmitter.interaction(InteractionType.SHARE, {
        postId,
        creatorId: item?.creatorId,
        emotionalTag: item?.features?.emotionalTag,
        anchorIndex,
        postFeatures: item?.features,
      });
    },
    [applyBanditReward, enqueueEvent, seenStore],
  );

  const trackOpenComments = useCallback(
    (postId: string, feedItemId: string) => {
      enqueueEvent("open_comments", postId, feedItemId);
      const { item, anchorIndex } = resolveContext(postId, feedItemId);

      applyBanditReward((item as any)?.feedSource as FeedSource | undefined, "open_comments");

      BrainEmitter.interaction(InteractionType.OPEN_COMMENTS, {
        postId,
        creatorId: item?.creatorId,
        emotionalTag: item?.features?.emotionalTag,
        anchorIndex,
        postFeatures: item?.features,
      });
    },
    [applyBanditReward, enqueueEvent],
  );

  const trackOpenProfile = useCallback(
    (postId: string, feedItemId: string, creatorId: string) => {
      enqueueEvent("open_profile", postId, feedItemId, undefined, undefined, creatorId);
      const { item, anchorIndex } = resolveContext(postId, feedItemId);

      applyBanditReward((item as any)?.feedSource as FeedSource | undefined, "open_profile");

      BrainEmitter.interaction(InteractionType.OPEN_PROFILE, {
        postId,
        creatorId: creatorId || item?.creatorId,
        emotionalTag: item?.features?.emotionalTag,
        anchorIndex,
        postFeatures: item?.features,
      });
    },
    [applyBanditReward, enqueueEvent],
  );

  const trackFollow = useCallback(
    (postId: string, feedItemId: string, creatorId: string) => {
      enqueueEvent("follow", postId, feedItemId, undefined, undefined, creatorId);
      const { item, anchorIndex } = resolveContext(postId, feedItemId);

      applyBanditReward((item as any)?.feedSource as FeedSource | undefined, "follow");

      BrainEmitter.interaction(InteractionType.FOLLOW, {
        postId,
        creatorId: creatorId || item?.creatorId,
        emotionalTag: item?.features?.emotionalTag,
        anchorIndex,
        postFeatures: item?.features,
      });
    },
    [applyBanditReward, enqueueEvent],
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
    updateViewableItem,
    flushQueue,
  };
};