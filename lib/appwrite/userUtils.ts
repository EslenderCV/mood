import { Query } from "react-native-appwrite";
import { databases, appwriteConfig } from "./config";

/**
 * Simple in-memory cache to avoid repeated Appwrite round-trips.
 * - Keeps UI snappy (especially on Android low-end)
 * - Avoids N+1 user fetches in feed-like surfaces
 */
const USER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const userCache = new Map<string, CacheEntry<any | null>>();

const now = () => Date.now();

const getCached = (userId: string) => {
  const entry = userCache.get(userId);
  if (!entry) return undefined;
  if (entry.expiresAt <= now()) {
    userCache.delete(userId);
    return undefined;
  }
  return entry.value;
};

const setCached = (userId: string, value: any | null) => {
  userCache.set(userId, { value, expiresAt: now() + USER_CACHE_TTL_MS });
};

// ✅ Función extraída para romper el ciclo de dependencias
export async function getUser(userId: string) {
  if (!userId) return null;

  const cached = getCached(userId);
  if (cached !== undefined) return cached;

  try {
    const user = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
    );
    if (user?.isBanned) {
      setCached(userId, null);
      return null;
    }
    setCached(userId, user);
    return user;
  } catch (error) {
    setCached(userId, null);
    return null;
  }
}

/**
 * Batch-fetch users by IDs in as few network calls as possible.
 * Returns a map: userId -> userDoc | null
 */
export async function getUsersByIds(userIds: string[]) {
  const ids = Array.from(
    new Set((userIds || []).filter((id) => typeof id === "string" && id)),
  );

  const resultMap: Record<string, any | null> = {};
  if (ids.length === 0) return resultMap;

  const missing: string[] = [];

  for (const id of ids) {
    const cached = getCached(id);
    if (cached !== undefined) resultMap[id] = cached;
    else missing.push(id);
  }

  // Appwrite limits + practical query sizes; chunk to stay safe.
  const CHUNK_SIZE = 100;

  for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
    const chunk = missing.slice(i, i + CHUNK_SIZE);
    try {
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        [Query.equal("$id", chunk), Query.limit(chunk.length)],
      );

      const byId = new Map<string, any>();
      for (const doc of res.documents) {
        byId.set(doc.$id, doc);
      }

      for (const id of chunk) {
        const user = byId.get(id) || null;
        const finalUser = user?.isBanned ? null : user;
        setCached(id, finalUser);
        resultMap[id] = finalUser;
      }
    } catch (e) {
      // If batch fetch fails, gracefully fall back to nulls (do not crash feed).
      for (const id of chunk) {
        setCached(id, null);
        resultMap[id] = null;
      }
    }
  }

  return resultMap;
}

/**
 * Optional helper if you ever need to clear cache (e.g., logout).
 */
export function __clearUserCache() {
  userCache.clear();
}
