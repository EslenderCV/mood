import { FeedItem } from "@/context/FeedProvider";
import { RankableItem } from "@/src/brain/ranking/ResonanceEngine";

export type FeedSource = "following" | "reco" | "trending" | "explore";

export type EnrichedFeedItem = (FeedItem & RankableItem) & {
  /**
   * Server-side feed item id used for telemetry / debugging.
   * UI keys remain stable via `id` (post_<postId>).
   */
  feedItemId?: string;
  /** Source bucket chosen by mixture (server or local brain). */
  feedSource?: FeedSource;
  /** 0-based position in the ranked list produced by the server. */
  rankPosition?: number;
  /** Optional reason codes for debugging / analysis. */
  reasonCodes?: string[];
  /** Optional ranking score. */
  score?: number;
};

export type FeedEventType =
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

export interface FeedEvent {
  /** Stable id for dedupe (used by feed_events server function). */
  eventId?: string;
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

export const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Generador de IDs estables y únicos por batch
export const toRankableFeedItem = (
  item: FeedItem,
  absoluteIndex: number,
  batchSuffix: string,
): EnrichedFeedItem => {
  let baseId = "";

  if (item.type === "post") {
    baseId = `post_${item.data?.$id || "unknown"}`;
  } else if (item.type === "trending_song") {
    const safeId =
      item.data?.id ||
      item.data?.title?.replace(/\s+/g, "") ||
      item._id ||
      "unknown";
    baseId = `trending_${safeId}`;
  } else if (item.type === "suggested_users") {
    const idsHash = Array.isArray(item.data)
      ? item.data.map((u: any) => u.$id).join("").substring(0, 15)
      : item._id || "generic";
    baseId = `suggested_${idsHash}`;
  } else {
    baseId = `sys_${item.type}_${item._id || "unknown"}`;
  }

  // ✅ Key stability rule:
  // - Posts: stable across rebuilds (critical for perf + brain continuity).
  // - Modules/ads: can repeat; keep uniqueness per insertion.
  const stableId =
    item.type === "post"
      ? baseId
      : `${baseId}__${batchSuffix}__${absoluteIndex}`;

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
  if (item.data && typeof item.data === "object" && "emotionalTag" in item.data) {
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