import { FeedItem } from "@/context/FeedProvider";
import { RankableItem } from "@/src/brain/ranking/ResonanceEngine";

export type EnrichedFeedItem = FeedItem & RankableItem;

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
    const safeId = item.data?.id || item.data?.title?.replace(/\s+/g, "") || "unknown";
    baseId = `trending_${safeId}`;
  } else if (item.type === "suggested_users") {
    const idsHash = Array.isArray(item.data)
      ? item.data.map((u: any) => u.$id).join("").substring(0, 15)
      : "generic";
    baseId = `suggested_${idsHash}`;
  } else {
    baseId = `sys_${item.type}`;
  }

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
