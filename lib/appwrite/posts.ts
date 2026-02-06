import { Query, ID, AppwriteException } from "react-native-appwrite";
import { databases, appwriteConfig } from "./config";
import { getUser } from "./users";
import { createNotification } from "./notifications";

import { getUsersByIds } from "./userUtils";
import { appwriteCall } from "./request";

export type FeedPageArgs = {
  limit?: number;
  cursorAfter?: string;
};

const COMMENTS_COUNT_TTL_MS = 2 * 60 * 1000; // 2 minutes
type CommentsCountEntry = { count: number; expiresAt: number };
const commentsCountCache = new Map<string, CommentsCountEntry>();

const nowMs = () => Date.now();

const getCachedCommentsCount = (postId: string) => {
  const entry = commentsCountCache.get(postId);
  if (!entry) return undefined;
  if (entry.expiresAt <= nowMs()) {
    commentsCountCache.delete(postId);
    return undefined;
  }
  return entry.count;
};

const setCachedCommentsCount = (postId: string, count: number) => {
  commentsCountCache.set(postId, {
    count,
    expiresAt: nowMs() + COMMENTS_COUNT_TTL_MS,
  });
};

async function populatePostsWithUsersAndCounts(posts: any[]) {
  const safePosts = Array.isArray(posts) ? posts : [];
  if (safePosts.length === 0) return [];

  // 1) Batch fetch creators (avoid N+1 getUser calls)
  const creatorIds: string[] = [];
  for (const post of safePosts) {
    let postedBy = post?.postedBy;
    if (Array.isArray(postedBy) && postedBy.length > 0) postedBy = postedBy[0];
    if (typeof postedBy === "string" && postedBy) creatorIds.push(postedBy);
  }

  const usersMap = await getUsersByIds(creatorIds);

  // 2) Batch fetch comments for these posts to compute per-post counts (avoid N+1)
  const postIds = safePosts.map((p) => p?.$id).filter(Boolean);

  const commentsCountMap = new Map<string, number>();

  const missingPostIds: string[] = [];
  for (const pid of postIds) {
    const cached = getCachedCommentsCount(pid);
    if (typeof cached === "number") commentsCountMap.set(pid, cached);
    else missingPostIds.push(pid);
  }

  if (missingPostIds.length > 0) {
    try {
      // NOTE: We can't get per-post totals in Appwrite without either:
      // - denormalized counts on the post document (backend migration), OR
      // - fetching the comment docs and counting client-side.
      // This is still 1 request per page (not per post), and is a huge win vs N+1.
      const commentsRes = await appwriteCall({ name: `comments.listForPage:${missingPostIds.length}`, retries: 1 }, () => databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.commentsCollectionId,
        [Query.equal("postId", missingPostIds), Query.limit(5000)],
      ));

      for (const c of commentsRes.documents) {
        const pid = (c as any)?.postId;
        if (!pid) continue;
        commentsCountMap.set(pid, (commentsCountMap.get(pid) || 0) + 1);
      }
    } catch (e) {
      // If comments are not readable (permissions), keep counts at 0.
    }

    // Cache computed counts (including zeros) to avoid repeated work across screens.
    for (const pid of missingPostIds) {
      setCachedCommentsCount(pid, commentsCountMap.get(pid) ?? 0);
    }
  }

  // 3) Attach populated creator + commentsCount
  const populated = safePosts
    .map((post) => {
      let userData: any = post?.postedBy;

      if (Array.isArray(userData) && userData.length > 0) userData = userData[0];

      if (typeof userData === "string") {
        userData = usersMap[userData] ?? null;
      }

      if (userData && typeof userData === "object" && userData.isBanned) {
        userData = null;
      }

      if (!userData) return null;

      const commentsCount = commentsCountMap.get(post.$id) ?? 0;

      return {
        ...post,
        postedBy: userData,
        commentsCount,
      };
    })
    .filter((p) => p !== null);

  return populated;
}

/**
 * Server-feed helper: hydrate only creator user objects.
 *
 * Why:
 * - Appwrite relationship attributes often return only the related document ID.
 * - UI components (e.g. PostItem) expect post.postedBy to be a user object.
 *
 * This keeps parity with the local feed behavior without adding extra work
 * (like comments counting) to server-driven Home.
 */
export async function hydratePostsWithUsers(posts: any[]) {
  const safePosts = Array.isArray(posts) ? posts : [];
  if (safePosts.length === 0) return [];

  const creatorIds: string[] = [];
  for (const post of safePosts) {
    let postedBy: any = post?.postedBy;
    if (Array.isArray(postedBy) && postedBy.length > 0) postedBy = postedBy[0];
    if (typeof postedBy === "string" && postedBy) creatorIds.push(postedBy);
  }

  const usersMap = await getUsersByIds(creatorIds);

  return safePosts.map((post) => {
    let userData: any = post?.postedBy;
    if (Array.isArray(userData) && userData.length > 0) userData = userData[0];

    if (typeof userData === "string") {
      userData = usersMap[userData] ?? null;
    }

    // If we can't hydrate (missing/banned user), keep original value so UI falls back safely.
    if (!userData) return post;

    return {
      ...post,
      postedBy: userData,
    };
  });
}

/**
 * Paginated feed: 1 request for posts + 1 batched users fetch + 1 batched comments fetch
 * (still a massive reduction vs N+1).
 */
export async function getFeedPage(args: FeedPageArgs = {}) {
  const limit = Math.max(1, Math.min(args.limit ?? 60, 100));

  try {
    const queries: any[] = [Query.orderDesc("$createdAt"), Query.limit(limit)];
    if (args.cursorAfter) {
      const cursorAfterFn = (Query as any)?.cursorAfter;
      if (typeof cursorAfterFn === "function") {
        queries.push(cursorAfterFn(args.cursorAfter));
      }
    }

    const res = await appwriteCall({ name: `posts.listFeed:${limit}`, retries: 2 }, () => databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      queries,
    ));

    const populated = await populatePostsWithUsersAndCounts(res.documents);

    const nextCursor =
      res.documents.length === limit
        ? res.documents[res.documents.length - 1].$id
        : null;
    return { posts: populated, nextCursor };
  } catch (error: any) {
    if (error.code === 401 || error.message?.includes("authorized")) {
      return { posts: [], nextCursor: null };
    }
    throw new Error(error.message || String(error));
  }
}

// Backwards-compatible API used across the app
export async function getFeedCandidates(args: FeedPageArgs = {}) {
  const { posts } = await getFeedPage(args);
  return posts;
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
    const user = await appwriteCall({ name: "users.getForStreak", retries: 2 }, () => databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
    ));

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
      await appwriteCall({ name: "users.updateStreak", retries: 2 }, () => databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        userId,
        {
          streak: newStreak,
          lastStreakDate: now.toISOString(),
        },
      ));
    }

    // 3. Crear el Post
    const newPost = await appwriteCall({ name: "posts.create", retries: 2 }, () => databases.createDocument(
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
    ));

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
      [Query.orderDesc("$createdAt"), Query.limit(100)],
    );

    const populated = await populatePostsWithUsersAndCounts(posts.documents);
    return populated;
  } catch (error: any) {
    if (error.code === 401 || error.message?.includes("authorized")) {
      return [];
    }
    throw new Error(error.message || String(error));
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

    const populated = await populatePostsWithUsersAndCounts(posts.documents);
    return populated;
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
