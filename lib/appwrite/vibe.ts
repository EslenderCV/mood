import { Databases, Query } from "react-native-appwrite";
import { appwriteConfig, client } from "./config";

const databases = new Databases(client);

export interface WeeklyVibe {
  $id: string;
  userId: string;
  weekStart: string;
  topMood: string; // Emoji
  topArtist: string;
  totalPosts: number;
  vibeColor: string; // Hex code
}

// Obtener el último Vibe Check generado para el usuario
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
