import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ServerFeedResponse } from "./serverFeed";

const KEY = (userId: string) => `mood.home.server.snapshot.${userId}`;

export type ServerHomeSnapshotCache = {
  userId: string;
  snapshot_id: string;
  next_cursor: string | null;
  items: ServerFeedResponse["items"];
  snapshot_expires_at?: string;
  cached_at_ms: number;
};

export const loadServerHomeSnapshot = async (
  userId: string,
): Promise<ServerHomeSnapshotCache | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEY(userId));
    if (!raw) return null;
    const obj = JSON.parse(raw) as ServerHomeSnapshotCache;
    if (!obj?.snapshot_id) return null;
    return obj;
  } catch {
    return null;
  }
};

export const saveServerHomeSnapshot = async (
  userId: string,
  resp: Pick<ServerFeedResponse, "items" | "next_cursor" | "snapshot_id"> & {
    snapshot_expires_at?: string;
  },
): Promise<void> => {
  try {
    if (!resp?.snapshot_id) return;
    const payload: ServerHomeSnapshotCache = {
      userId,
      snapshot_id: resp.snapshot_id,
      next_cursor: resp.next_cursor ?? null,
      items: resp.items || [],
      snapshot_expires_at: resp.snapshot_expires_at,
      cached_at_ms: Date.now(),
    };
    await AsyncStorage.setItem(KEY(userId), JSON.stringify(payload));
  } catch {
    // ignore
  }
};

export const clearServerHomeSnapshot = async (userId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(KEY(userId));
  } catch {
    // ignore
  }
};
