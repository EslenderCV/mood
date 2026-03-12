import { Query, ID } from "react-native-appwrite";
import { databases, appwriteConfig } from "./config";
import { getFollowedUserIds, getUser } from "./users";

function getErrMessage(error: unknown) {
  return String((error as any)?.message ?? error ?? "");
}

function extractStoryUserId(story: any): string | null {
  // Preferimos el atributo consultable
  if (typeof story?.userId === "string" && story.userId.trim().length > 0) {
    return story.userId.trim();
  }

  // Compatibilidad: si antes guardabas user como string
  if (typeof story?.user === "string" && story.user.trim().length > 0) {
    return story.user.trim();
  }

  // Compatibilidad: si user es relationship y viene como documento
  if (
    typeof story?.user?.$id === "string" &&
    story.user.$id.trim().length > 0
  ) {
    return story.user.$id.trim();
  }

  return null;
}

export async function createStory(songData: string, userId: string) {
  // ✅ Evita enviar undefined/"" y que Appwrite diga “Missing required attribute userId”
  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    throw new Error("createStory: userId inválido o vacío");
  }

  const payloadBase = {
    userId: userId.trim(), // ✅ required
    songData,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  try {
    // Intento #1: si existe `user` relationship single
    return await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.storiesCollectionId,
      ID.unique(),
      {
        ...payloadBase,
        user: payloadBase.userId,
      },
    );
  } catch (error1) {
    const msg1 = getErrMessage(error1);

    try {
      // Intento #2: si `user` relationship es array/multiple
      if (
        msg1.includes("Invalid relationship value") &&
        msg1.includes("array")
      ) {
        return await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.storiesCollectionId,
          ID.unique(),
          {
            ...payloadBase,
            user: [payloadBase.userId],
          },
        );
      }

      // Intento #3: si NO existe el atributo `user` (o no quieres guardarlo), crea solo con userId
      if (
        msg1.toLowerCase().includes("unknown attribute") ||
        msg1.toLowerCase().includes("attribute") ||
        msg1.toLowerCase().includes("not found")
      ) {
        return await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.storiesCollectionId,
          ID.unique(),
          payloadBase,
        );
      }

      // Si el error fue otro, re-lánzalo
      throw error1;
    } catch (error2) {
      console.log("Error creando historia:", error2);
      throw error2;
    }
  }
}

// 🔥 Eliminar Historia
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

    // ✅ Consulta por userId (string normal), NO por relationship
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.storiesCollectionId,
      [
        Query.orderDesc("$createdAt"),
        Query.greaterThan("expiresAt", new Date().toISOString()),
        Query.equal("userId", allowedUsers),
      ],
    );

    const storiesWithUserData = await Promise.all(
      posts.documents.map(async (story: any) => {
        try {
          const uid = extractStoryUserId(story);
          if (!uid) return null;

          const userData = await getUser(uid);

          // Mantengo `user` como userData porque tu UI probablemente lo usa así
          return { ...story, user: userData, userId: uid };
        } catch {
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
    if (!userId) return;
    if (currentViewers.includes(userId)) return;

    const updatedViewers = [...currentViewers, userId];

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.storiesCollectionId,
      storyId,
      { viewers: updatedViewers },
    );
  } catch (error) {
    console.log("Error marcando vista:", error);
  }
}
