import { Query, ID } from "react-native-appwrite";
import { databases, appwriteConfig } from "./config";
import { getFollowedUserIds, getUser } from "./users";

export async function createStory(songData: string, userId: string) {
  try {
    const newStory = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.storiesCollectionId,
      ID.unique(),
      {
        user: userId,
        songData: songData,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    );
    return newStory;
  } catch (error) {
    console.log("Error creando historia:", error);
    throw error;
  }
}

// 🔥 NUEVA FUNCIÓN: Eliminar Historia
export async function deleteStory(storyId: string) {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.storiesCollectionId,
      storyId,
    );
    return true;
  } catch (error) {
    console.error("Error eliminando historia:", error);
    throw error;
  }
}

export async function getStories(currentUserId: string) {
  if (!currentUserId) return [];

  try {
    const followedUserIds = await getFollowedUserIds(currentUserId);
    const allowedUsers = [...followedUserIds, currentUserId];

    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.storiesCollectionId,
      [
        Query.orderDesc("$createdAt"),
        Query.greaterThan("expiresAt", new Date().toISOString()),
        Query.equal("user", allowedUsers),
      ],
    );

    const storiesWithUserData = await Promise.all(
      posts.documents.map(async (story: any) => {
        try {
          if (typeof story.user === "string") {
            const userData = await getUser(story.user);
            return { ...story, user: userData };
          }
          return story;
        } catch (e) {
          return null;
        }
      }),
    );

    return storiesWithUserData.filter((s: any) => s !== null && s.user);
  } catch (error: any) {
    if (error?.code === 401) {
      console.log("Sesión no activa durante la carga de historias.");
      return [];
    }
    console.error("Error en getStories:", error);
    return [];
  }
}

export async function viewStory(
  storyId: string,
  userId: string,
  currentViewers: string[] = [],
) {
  try {
    if (currentViewers.includes(userId)) return;

    const updatedViewers = [...currentViewers, userId];

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.storiesCollectionId,
      storyId,
      {
        viewers: updatedViewers,
      },
    );
  } catch (error) {
    console.log("Error marcando vista:", error);
  }
}
