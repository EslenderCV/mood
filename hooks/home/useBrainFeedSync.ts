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
 * Sync Brain reorders (tail-only) into the Home FlatList state.
 * This is what makes personalization visible to the user without jumpiness.
 *
 * Important: We keep *extras* (items unknown to the Brain, eg. realtime uploads) locked at the top.
 */
export const useBrainFeedSync = ({ setSortedFeed, sortedFeedRef, isMounted }: Args) => {
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

      // Items not known to the Brain stay pinned at the top (stable UX).
      const extras = current.filter((it) => !brainSet.has(it.id));

      const reordered = brainIds
        .map((id) => map.get(id))
        .filter(Boolean) as EnrichedFeedItem[];

      // If something wasn't found (should be rare), keep it at the end.
      const accounted = new Set([...extras.map((x) => x.id), ...reordered.map((x) => x.id)]);
      const leftovers = current.filter((it) => !accounted.has(it.id));

      const next = [...extras, ...reordered, ...leftovers];

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
