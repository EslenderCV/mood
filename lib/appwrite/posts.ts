import { Query, ID, AppwriteException } from "react-native-appwrite";
import { databases, appwriteConfig } from "./config";
import { getUser } from "./users";
import { createNotification } from "./notifications";

// ... (getFeedCandidates se mantiene igual) ...
export async function getFeedCandidates() {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      [Query.orderDesc("$createdAt"), Query.limit(100)],
    );

    const populatedPosts = await Promise.all(
      posts.documents.map(async (post) => {
        let userData = post.postedBy;

        if (post.postedBy && typeof post.postedBy === "string") {
          try {
            userData = await getUser(post.postedBy);
          } catch (e) {
            userData = null;
          }
        }

        if (userData && typeof userData === "object" && userData.isBanned) {
          userData = null;
        }

        if (!userData) return null;

        const commentsData = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.commentsCollectionId,
          [Query.equal("postId", post.$id), Query.limit(1)],
        );

        return {
          ...post,
          postedBy: userData,
          commentsCount: commentsData.total,
        };
      }),
    );

    return populatedPosts.filter((p) => p !== null);
  } catch (error: any) {
    if (error.code === 401 || error.message?.includes("authorized")) {
      return [];
    }
    throw new Error(error.message || String(error));
  }
}

// 🔥 LÓGICA DE STREAKS REALES (CALENDARIO)
export const createPost = async (
  comment: string,
  songData: string,
  userId: string,
  isPrivate: boolean = false,
) => {
  try {
    let cleanSongData = songData;
    try {
      const parsedData = JSON.parse(songData);
      if (parsedData.preview) {
        delete parsedData.preview;
        cleanSongData = JSON.stringify(parsedData);
      }
    } catch (e) {
      console.log("No se pudo limpiar el songData, guardando raw");
    }

    // 1. Obtener datos actuales del usuario para calcular Racha
    const user = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
    );

    const now = new Date();
    // Appwrite devuelve fechas en UTC, new Date() lo maneja correctamente
    const lastStreakDate = user.lastStreakDate
      ? new Date(user.lastStreakDate)
      : null;

    let newStreak = user.streak || 0;
    let hasStreakChanged = false;

    if (lastStreakDate) {
      // Normalizamos a medianoche (00:00:00) para comparar días calendario, no horas exactas
      const todayMidnight = new Date(now);
      todayMidnight.setHours(0, 0, 0, 0);

      const lastMidnight = new Date(lastStreakDate);
      lastMidnight.setHours(0, 0, 0, 0);

      const diffTime = Math.abs(
        todayMidnight.getTime() - lastMidnight.getTime(),
      );
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // ✅ Posteó ayer -> SUBE LA RACHA
        newStreak += 1;
        hasStreakChanged = true;
      } else if (diffDays > 1) {
        // ❌ Pasó más de un día -> REINICIO
        newStreak = 1;
        hasStreakChanged = true;
      }
      // Si diffDays === 0 (mismo día), no hacemos nada, se mantiene la racha actual.
    } else {
      // Primera vez posteando
      newStreak = 1;
      hasStreakChanged = true;
    }

    // 2. Actualizar Usuario si la racha cambió
    if (hasStreakChanged) {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        userId,
        {
          streak: newStreak,
          lastStreakDate: now.toISOString(),
        },
      );
    }

    // 3. Crear el Post
    const newPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      ID.unique(),
      {
        comment: comment,
        songData: cleanSongData,
        datePosted: now.toISOString(),
        postedBy: userId,
        likedBy: [],
        savedBy: [],
        isPrivate: isPrivate,
      },
    );

    // 🔥 Devolvemos la nueva racha y bandera de cambio para que la UI la use
    return { ...newPost, currentStreak: newStreak, hasStreakChanged };
  } catch (error) {
    console.error("Error creating post:", error);
    throw new Error((error as AppwriteException).message);
  }
};

// ... (Resto de funciones: deletePost, getUserPosts, etc. se mantienen igual) ...
export async function deletePost(postId: string) {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      postId,
    );
    return true;
  } catch (error: any) {
    console.error("Error al eliminar post:", error);
    throw new Error(error.message);
  }
}

export const getUserPosts = async (userId: string) => {
  try {
    const user = await getUser(userId);
    if (!user) return [];

    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      [Query.equal("postedBy", userId), Query.orderDesc("$createdAt")],
    );
    return posts.documents;
  } catch (error: any) {
    throw new Error(error.message || String(error));
  }
};

export async function getAllPosts(currentUserId?: string) {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      [Query.orderDesc("$createdAt")],
    );

    const postsWithData = await Promise.all(
      posts.documents.map(async (post) => {
        let creator: any = post.postedBy;
        if (typeof creator === "string") {
          creator = await getUser(creator);
        }

        if (!creator || creator.isBanned) return null;

        const comments = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.commentsCollectionId,
          [Query.equal("postId", post.$id), Query.limit(1)],
        );

        return {
          ...post,
          postedBy: creator,
          commentsCount: comments.total,
        };
      }),
    );

    return postsWithData.filter((p) => p !== null);
  } catch (error: any) {
    if (error.code === 401 || error.message?.includes("authorized")) {
      return [];
    }
    throw new Error(error);
  }
}

export async function getPostById(postId: string) {
  try {
    const post = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      postId,
    );
    if (post.postedBy && typeof post.postedBy === "string") {
      const user = await getUser(post.postedBy);
      if (!user) return null;
      return { ...post, postedBy: user };
    }
    if (
      post.postedBy &&
      typeof post.postedBy === "object" &&
      post.postedBy.isBanned
    ) {
      return null;
    }
    return post;
  } catch (error) {
    return null;
  }
}

export async function toggleLikePost(
  postId: string,
  userId: string,
  currentLikes: string[] = [],
) {
  try {
    let updatedLikes = [...currentLikes];
    const index = updatedLikes.indexOf(userId);
    const isAddingLike = index === -1;

    if (!isAddingLike) {
      updatedLikes.splice(index, 1);
    } else {
      updatedLikes.push(userId);
    }

    const result = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      postId,
      { likedBy: updatedLikes },
    );

    if (isAddingLike) {
      try {
        const post = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.postsCollectionId,
          postId,
        );
        const likerUser = await getUser(userId);
        if (post && post.postedBy && likerUser) {
          const ownerId =
            typeof post.postedBy === "object"
              ? post.postedBy.$id
              : post.postedBy;

          await createNotification({
            userId: ownerId,
            type: "like",
            message: "le gustó tu post",
            senderId: userId,
            senderName: likerUser.username || likerUser.name,
            senderAvatar: likerUser.pfp,
            postId: postId,
          });
        }
      } catch (e) {
        console.log("Error noti like", e);
      }
    }
    return result;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function toggleSavePost(postId: string, userId: string) {
  try {
    const post = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      postId,
    );

    const savedBy = post.savedBy || [];
    let newSavedBy = [...savedBy];

    if (newSavedBy.includes(userId)) {
      newSavedBy = newSavedBy.filter((id: string) => id !== userId);
    } else {
      newSavedBy.push(userId);
    }

    return await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      postId,
      { savedBy: newSavedBy },
    );
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getSavedPosts(userId: string) {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      [Query.search("savedBy", userId), Query.orderDesc("$createdAt")],
    );

    const populatedPosts = await Promise.all(
      posts.documents.map(async (post) => {
        if (post.postedBy) {
          let userData = null;
          if (typeof post.postedBy === "string") {
            try {
              userData = await getUser(post.postedBy);
            } catch (e) {}
          } else {
            userData = post.postedBy;
          }

          if (!userData || userData.isBanned) return null;

          return { ...post, postedBy: userData };
        }
        return post;
      }),
    );

    return populatedPosts.filter((p) => p !== null);
  } catch (error: any) {
    return [];
  }
}

export async function createComment(
  postId: string,
  commentData: any,
  parentId: string | null = null,
) {
  try {
    const newComment = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      ID.unique(),
      {
        postId: postId,
        content: commentData.content,
        userId: commentData.userId,
        username: commentData.username,
        avatar: commentData.avatar,
        parentId: parentId,
        likedBy: [],
      },
    );

    try {
      const post = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.postsCollectionId,
        postId,
      );
      if (post.postedBy) {
        const ownerId =
          typeof post.postedBy === "object" ? post.postedBy.$id : post.postedBy;

        if (ownerId !== commentData.userId) {
          await createNotification({
            userId: ownerId,
            type: "comment",
            message: `comentó: "${commentData.content.substring(0, 20)}..."`,
            senderId: commentData.userId,
            senderName: commentData.username,
            senderAvatar: commentData.avatar,
            postId: postId,
          });
        }
      }
    } catch (e) {
      console.log("Error noti comment", e);
    }
    return newComment;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function toggleCommentLike(
  commentId: string,
  userId: string,
  currentLikes: string[],
) {
  try {
    let updatedLikes = [...currentLikes];
    const index = updatedLikes.indexOf(userId);

    if (index === -1) {
      updatedLikes.push(userId);
    } else {
      updatedLikes.splice(index, 1);
    }

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      commentId,
      { likedBy: updatedLikes },
    );

    return updatedLikes;
  } catch (error) {
    throw error;
  }
}

export async function getPostComments(postId: string) {
  try {
    const comments = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      [Query.equal("postId", postId), Query.orderDesc("$createdAt")],
    );
    return comments.documents;
  } catch (error: any) {
    return [];
  }
}

export async function reportPost(
  postId: string,
  reporterId: string,
  reason: string,
) {
  try {
    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.reportsCollectionId,
      ID.unique(),
      {
        postId: postId,
        reporterId: reporterId,
        reason: reason,
        status: "pending",
        createdAt: new Date().toISOString(),
      },
    );
    return true;
  } catch (error: any) {
    throw new Error("No se pudo enviar el reporte");
  }
}

// 🔥 Nueva función de búsqueda exportada (ya estaba en tu archivo anterior)
export async function searchPosts(
  query: string,
  isMoodSearch: boolean = false,
) {
  // ... (implementación existente de búsqueda) ...
  // Como ya estaba en tu código previo, asumimos que sigue aquí.
  // Para brevedad en esta respuesta, asegúrate de mantenerla.
  try {
    const queries = [];
    if (isMoodSearch) {
      queries.push(
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.postsCollectionId,
          [Query.search("songData", query), Query.limit(20)],
        ),
      );
    } else {
      queries.push(
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.postsCollectionId,
          [Query.search("comment", query), Query.limit(20)],
        ),
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.postsCollectionId,
          [Query.search("songData", query), Query.limit(20)],
        ),
      );
    }
    const results = await Promise.all(queries);
    const combinedDocuments = results.flatMap((res) => res.documents);
    const uniquePostsMap = new Map();
    combinedDocuments.forEach((doc) => {
      if (!uniquePostsMap.has(doc.$id)) uniquePostsMap.set(doc.$id, doc);
    });
    const uniquePosts = Array.from(uniquePostsMap.values());
    const populatedPosts = await Promise.all(
      uniquePosts.map(async (post) => {
        let userData = post.postedBy;
        if (typeof userData === "string") {
          try {
            userData = await getUser(userData);
          } catch (e) {
            userData = null;
          }
        }
        if (!userData || userData.isBanned) return null;
        return { ...post, postedBy: userData };
      }),
    );
    return populatedPosts.filter((p) => p !== null);
  } catch (error) {
    return [];
  }
}
