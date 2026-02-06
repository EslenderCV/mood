import { useEffect, useRef } from "react";
import { useFlag } from "@/src/config/flags";
import type { MutableRefObject } from "react";
import { MoodSessionManager } from "@/src/brain/session/MoodSessionManager";
import { EnrichedFeedItem } from "./homeTypes";

type Args = {
  setSortedFeed: (items: EnrichedFeedItem[]) => void;
  sortedFeedRef: MutableRefObject<EnrichedFeedItem[]>;
  isMounted: MutableRefObject<boolean>;
};

/**
 * Sync Brain reorders into the Home FlatList state.
 *
 * Phase-2 rule:
 * - Brain only owns POSTS order.
 * - Modules (suggested_users / trending_song / ads) must stay locked in their slots
 *   to avoid jumping UX and to keep insertion cadence stable.
 */
export const useBrainFeedSync = ({
  setSortedFeed,
  sortedFeedRef,
  isMounted,
}: Args) => {
  const enableBrainRanking = useFlag("brainRankingHome");
  const lastAppliedHashRef = useRef<string>("");

  useEffect(() => {
    if (!enableBrainRanking) return;
    const mgr = MoodSessionManager.getInstance();

    const unsub = mgr.subscribeFeed(() => {
      const brain = mgr.getFeed();
      if (!brain || brain.length === 0) return;

      const brainIds = brain.map((it) => it.id);
      const hash = brainIds.join("|");
      if (hash === lastAppliedHashRef.current) return;
      lastAppliedHashRef.current = hash;

      const current = sortedFeedRef.current || [];
      if (current.length === 0) return;

      const map = new Map(current.map((it) => [it.id, it]));
      const brainSet = new Set(brainIds);

      // Reordered POSTS list from brain
      const reorderedPosts = brainIds
        .map((id) => map.get(id))
        .filter((it) => it && it.type === "post") as EnrichedFeedItem[];

      // Any post not present in brain (eg. optimistic/realtime) keeps relative position at the end of posts
      const remainingPosts = current.filter(
        (it) => it.type === "post" && !brainSet.has(it.id),
      );

      const nextPosts = [...reorderedPosts, ...remainingPosts];

      // Reconstruct full list with modules locked at their original indices
      let postIdx = 0;
      const next: EnrichedFeedItem[] = current.map((it) => {
        if (it.type !== "post") return it;
        const repl = nextPosts[postIdx];
        postIdx += 1;
        return repl || it;
      });

      // Avoid state updates when order is identical.
      const same =
        next.length === current.length &&
        next.every((it, idx) => it.id === current[idx]?.id);

      if (same) return;
      if (!isMounted.current) return;

      setSortedFeed(next);
    });

    return () => {
      unsub?.();
    };
  }, [enableBrainRanking, setSortedFeed, sortedFeedRef, isMounted]);
};
