import { Databases, Query } from "react-native-appwrite";
import { appwriteConfig, client } from "./config";

const databases = new Databases(client);

export type WeeklyVibeConsumedAction = "posted" | "discarded";

export interface WeeklyVibe {
  $id: string;
  $createdAt?: string;

  userId: string;
  weekStart: string;

  topMood: string; // Emoji
  topArtist: string;
  totalPosts: number;
  vibeColor: string; // Hex code

  // --- Lifecycle (MVP) ---
  publishedAt?: string; // ISO date-time (preferred)
  expiresAt?: string;   // ISO date-time (preferred)
  seenAt?: string | null;
  consumedAt?: string | null;
  consumedAction?: WeeklyVibeConsumedAction | null;
}

const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_TTL_MS = 24 * HOUR_MS;

export function computeWeeklyVibeWindow(vibe: WeeklyVibe) {
  const publishedIso = vibe.publishedAt || vibe.$createdAt;
  const publishedAtMs = publishedIso ? new Date(publishedIso).getTime() : 0;

  const expiresIso = vibe.expiresAt;
  const expiresAtMs = expiresIso
    ? new Date(expiresIso).getTime()
    : publishedAtMs + DEFAULT_TTL_MS;

  return { publishedAtMs, expiresAtMs };
}

export function isWeeklyVibeActive(vibe: WeeklyVibe | null) {
  if (!vibe) return false;
  if (vibe.consumedAt) return false;

  const { publishedAtMs, expiresAtMs } = computeWeeklyVibeWindow(vibe);
  if (!publishedAtMs || !expiresAtMs) return false;

  const now = Date.now();
  return now >= publishedAtMs && now < expiresAtMs;
}

// Obtener el vibe activo (más reciente que aún no expira y no está consumido)
export async function getActiveWeeklyVibe(
  userId: string,
): Promise<WeeklyVibe | null> {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.weeklyVibesCollectionId,
      [Query.equal("userId", userId), Query.orderDesc("$createdAt"), Query.limit(10)],
    );

    for (const doc of response.documents) {
      const vibe = doc as unknown as WeeklyVibe;
      if (isWeeklyVibeActive(vibe)) return vibe;
    }
    return null;
  } catch (error) {
    console.log("Error fetching active vibe:", error);
    return null;
  }
}

// Mantengo la función anterior por compatibilidad, pero ya no la uses en UI
export async function getLatestWeeklyVibe(
  userId: string,
): Promise<WeeklyVibe | null> {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.weeklyVibesCollectionId,
      [
        Query.equal("userId", userId),
        Query.orderDesc("$createdAt"),
        Query.limit(1),
      ],
    );

    if (response.documents.length > 0) {
      return response.documents[0] as unknown as WeeklyVibe;
    }
    return null;
  } catch (error) {
    console.log("Error fetching vibe check:", error);
    return null;
  }
}

export async function markWeeklyVibeSeen(vibeId: string) {
  try {
    const nowIso = new Date().toISOString();
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.weeklyVibesCollectionId,
      vibeId,
      { seenAt: nowIso },
    );
    return true;
  } catch (error) {
    console.log("Error marking vibe as seen:", error);
    return false;
  }
}

export async function consumeWeeklyVibe(
  vibeId: string,
  action: WeeklyVibeConsumedAction,
) {
  try {
    const nowIso = new Date().toISOString();
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.weeklyVibesCollectionId,
      vibeId,
      { consumedAt: nowIso, consumedAction: action },
    );
    return true;
  } catch (error) {
    console.log("Error consuming weekly vibe:", error);
    return false;
  }
}
