import { appwriteCall } from "./request";
import { getFunctionsClient } from "./functionsClient";
import { getServerHomeFeedSettings } from "./serverConfig";
import { logger } from "@/src/observability/logger";

export type ServerFeedResponse = {
  ok: boolean;
  items: Array<{
    feed_item_id: string;
    post: any;
    source?: "following" | "reco" | "trending" | "explore";
    rank_position?: number;
    score?: number;
    reason_codes?: string[];
  }>;
  next_cursor: string | null;
  cursor_id?: string;
  snapshot_id?: string;
};

const parseExecutionJson = (exec: any): any => {
  const raw =
    exec?.responseBody ??
    exec?.response ??
    exec?.stdout ??
    exec?.body ??
    exec?.data ??
    exec?.result ??
    null;

  if (!raw) return null;
  if (typeof raw === "object") return raw;

  const s = String(raw);
  try {
    return JSON.parse(s);
  } catch {
    // Some runtimes wrap json in logs; attempt to extract.
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(s.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

export const getServerHomeFeedPage = async ({
  limit,
  cursor,
  sessionId,
  userIdForConsole,
}: {
  limit: number;
  cursor: string | null;
  sessionId: string;
  userIdForConsole?: string;
}): Promise<ServerFeedResponse> => {
  const { feedFunctionId } = getServerHomeFeedSettings();

  const functions = getFunctionsClient();
  if (!functions) {
    throw new Error("Functions client unavailable (react-native-appwrite Functions missing)");
  }

  const payload: any = { limit, cursor, sessionId };
  // This is only for Appwrite Console executions / debugging. In the real app,
  // the user id comes from x-appwrite-user-id header.
  if (userIdForConsole) payload.userId = userIdForConsole;

  const exec = await appwriteCall(
    { name: "server_feed:createExecution", retries: 1, timeoutMs: 20000 },
    () => functions.createExecution(feedFunctionId, JSON.stringify(payload)),
  );

  const json = parseExecutionJson(exec);
  if (!json) {
    logger.warn("server feed: execution returned non-json", { exec });
    throw new Error("Server feed execution returned non-json");
  }

  return json as ServerFeedResponse;
};

export type FeedEventInput = {
  eventId: string;
  userId: string;
  postId: string;
  feedItemId: string;
  type:
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
  durationMs?: number;
  anchorIndex?: number;
  sessionId: string;
  createdAt: string; // ISO
};

export const sendFeedEventsBatch = async ({
  events,
}: {
  events: FeedEventInput[];
}): Promise<{ ok: boolean; written?: number; deduped?: number }> => {
  const { feedEventsFunctionId } = getServerHomeFeedSettings();

  const functions = getFunctionsClient();
  if (!functions) {
    throw new Error("Functions client unavailable (react-native-appwrite Functions missing)");
  }

  const payload = { events };

  const exec = await appwriteCall(
    { name: "server_feed_events:createExecution", retries: 1, timeoutMs: 20000 },
    () => functions.createExecution(feedEventsFunctionId, JSON.stringify(payload)),
  );

  const json = parseExecutionJson(exec);
  if (!json) return { ok: true };
  return json as any;
};
