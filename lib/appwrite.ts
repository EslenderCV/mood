import {
  Client,
  Account,
  Databases,
  Query,
  AppwriteException,
  Storage,
  ID,
  OAuthProvider,
} from "react-native-appwrite";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

export const appwriteConfig = {
  endpoint: "https://fra.cloud.appwrite.io/v1",
  platform: "com.Gammes.Mood",
  projectId: "6689e59b000acd6caf6f",
  databaseId: "6689e7cc002bf2740136",
  usersCollectionId: "6962f488000f10f39b70",
  postsCollectionId: "6689e9a5003e7426666e",
  storageId: "66a51c310032319c09d0",
  followsCollectionId: "6949a7500026f2cf2850",
  commentsCollectionId: "6949afd6002150b37f0f",
  notificationsCollectionId: "6949b7490030640f0fb1",
  chatsCollectionId: "6949bf1f002f7ce268a2",
  messagesCollectionId: "6949c1b6000d070ff309",
  reportsCollectionId: "6959a194002105f44c03",
  playlistsCollectionId: "6959a8460009615dfbcb",
  storiesCollectionId: "69631b240013f47f559f",
};

const client = new Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

export const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data = {}
) {
  if (!expoPushToken || !expoPushToken.startsWith("ExponentPushToken")) {
    console.log("⚠️ Token inválido o inexistente para push:", expoPushToken);
    return;
  }

  const message = {
    to: expoPushToken,
    sound: "default",
    title: title,
    body: body,
    data: data,
  };

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.log("Error enviando notificación push:", error);
  }
}

export async function updateUserPushToken(userId: string, token: string) {
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
      {
        expoPushToken: token,
      }
    );
    console.log("✅ Expo Push Token actualizado en DB");
  } catch (error: any) {
    console.log("Error actualizando push token:", error.message);
  }
}

export async function createNotification(data: {
  userId: string;
  type: "like" | "comment" | "follow" | "follow_request" | "tag";
  message: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  postId?: string;
}) {
  try {
    if (data.userId === data.senderId) return;

    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      ID.unique(),
      {
        userId: data.userId,
        type: data.type,
        message: data.message,
        senderId: data.senderId,
        senderName: data.senderName,
        senderAvatar: data.senderAvatar,
        postId: data.postId,
        isRead: false,
      }
    );

    const targetUser = await getUser(data.userId);

    if (targetUser && targetUser.expoPushToken) {
      let title = "Mood";
      if (data.type === "like") title = "❤️ Nuevo Like";
      if (data.type === "comment") title = "💬 Nuevo Comentario";
      if (data.type === "follow") title = "👤 Nuevo Seguidor";
      if (data.type === "tag") title = "🏷️ Te etiquetaron";

      const body = `${data.senderName} ${data.message}`;

      await sendPushNotification(targetUser.expoPushToken, title, body, {
        postId: data.postId,
      });
    }
  } catch (error) {
    console.log("Error creando notificación:", error);
  }
}

export const signInWithOAuth = async (provider: "google" | "apple") => {
  try {
    try {
      await account.deleteSession("current");
    } catch (e) {}

    const providerEnum =
      provider === "google" ? OAuthProvider.Google : OAuthProvider.Apple;

    const redirectUri = "appwrite-callback-6689e59b000acd6caf6f://";

    const authUrl = await account.createOAuth2Token(
      providerEnum,
      redirectUri,
      redirectUri
    );

    if (!authUrl) throw new Error("Error al generar token OAuth2");

    const result = await WebBrowser.openAuthSessionAsync(
      authUrl.toString(),
      redirectUri
    );

    if (result.type === "success" && result.url) {
      const parsed = Linking.parse(result.url);

      const secret = Array.isArray(parsed.queryParams?.secret)
        ? parsed.queryParams?.secret[0]
        : parsed.queryParams?.secret;

      const userId = Array.isArray(parsed.queryParams?.userId)
        ? parsed.queryParams?.userId[0]
        : parsed.queryParams?.userId;

      if (secret && userId) {
        try {
          await account.createSession(userId, secret);
        } catch (sessionError: any) {
          if (
            sessionError.message?.includes("active") ||
            sessionError.code === 409
          ) {
            console.log("Sesión ya activa, continuando...");
            return true;
          }
          throw sessionError;
        }
        return true;
      }
    }

    if (result.type === "cancel" || result.type === "dismiss") {
      throw new Error("Cancelado por el usuario");
    }

    return false;
  } catch (error: any) {
    console.error("OAuth failed:", error);
    throw new Error(error.message);
  }
};

export const signOut = async () => {
  try {
    await account.deleteSession("current");
    return true;
  } catch (error: any) {
    return true;
  }
};

export const createUser = async (
  email: string,
  password: string,
  name: string,
  username: string
) => {
  try {
    const newAccount = await account.create(ID.unique(), email, password, name);
    if (!newAccount) throw new Error("Error creating account");

    const avatarUrl = `${
      appwriteConfig.endpoint
    }/avatars/initials?name=${encodeURIComponent(name)}&project=${
      appwriteConfig.projectId
    }`;

    await signInn(email, password);

    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(),
      {
        accId: newAccount.$id,
        email,
        name,
        pfp: avatarUrl,
        username,
        preferredPlatform: "spotify",
        allowTags: true,
        blockedUsers: [],
        isBanned: false,
        isPrivate: false,
      }
    );
    return newUser;
  } catch (err) {
    throw new Error((err as AppwriteException).message);
  }
};

export const signInn = async (email: string, password: string) => {
  try {
    const session = await account.createEmailPasswordSession(email, password);
    return session;
  } catch (err) {
    const error = err as AppwriteException;
    if (
      error.message?.includes("session is active") ||
      error.message?.includes("prohibited") ||
      error.code === 409
    ) {
      console.log("⚠️ Sesión activa detectada. Limpiando...");
      try {
        await account.deleteSession("current");
        return await account.createEmailPasswordSession(email, password);
      } catch (retryError) {
        throw new Error((retryError as AppwriteException).message);
      }
    }
    throw new Error(error.message);
  }
};

export const getCurrentUser = async () => {
  try {
    const currentAccount = await account.get();

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal("accId", currentAccount.$id)]
    );

    if (!currentUser || currentUser.documents.length === 0) return null;

    const userData = currentUser.documents[0];

    if (userData.isBanned) {
      try {
        await signOut();
      } catch (e) {}
      throw new Error("Cuenta suspendida por administración.");
    }

    return userData;
  } catch (error: any) {
    if (error.code === 401 || error.message?.includes("missing scopes")) {
      return null;
    }
    console.log("Error getCurrentUser:", error);
    return null;
  }
};

export async function getUser(userId: string) {
  try {
    const user = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId
    );

    if (user.isBanned) {
      return null;
    }
    return user;
  } catch (error) {
    return null;
  }
}

export const syncOrCreateUserDocument = async () => {
  try {
    const currentAccount = await account.get();
    if (!currentAccount) throw new Error("No hay cuenta activa");

    const userContext = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal("accId", currentAccount.$id)]
    );

    if (userContext.documents.length > 0) {
      return userContext.documents[0];
    }

    const avatarUrl = `https://fra.cloud.appwrite.io/v1/avatars/initials?name=${encodeURIComponent(
      currentAccount.name
    )}&project=${appwriteConfig.projectId}`;

    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(),
      {
        accId: currentAccount.$id,
        email: currentAccount.email,
        name: currentAccount.name,
        pfp: avatarUrl,
        username:
          currentAccount.name.replace(/\s+/g, "").toLowerCase() +
          Math.floor(Math.random() * 1000),
        preferredPlatform: "spotify",
        allowTags: true,
        blockedUsers: [],
        isBanned: false,
        isPrivate: false,
      }
    );

    return newUser;
  } catch (error) {
    console.log("Error sincronizando usuario:", error);
    return null;
  }
};

export async function deleteUserAccount(userId: string) {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId
    );
    await account.deleteSession("current");
    return true;
  } catch (error: any) {
    console.error("Error deleting account:", error);
    throw new Error(error.message);
  }
}

export async function updateProfile(userId: string, form: any) {
  try {
    const hasFile = form.pfp && typeof form.pfp !== "string";
    let imageUrl = form.pfp;
    if (hasFile) imageUrl = await uploadFile(form.pfp);

    if (form.name) {
      try {
        await account.updateName(form.name);
      } catch (e) {}
    }

    const updates: any = {};
    if (form.name) updates.name = form.name;
    if (form.username) updates.username = form.username;
    if (form.email) updates.email = form.email;
    if (form.preferredPlatform)
      updates.preferredPlatform = form.preferredPlatform;
    if (imageUrl) updates.pfp = imageUrl;
    if (form.isPrivate !== undefined) updates.isPrivate = form.isPrivate;
    if (form.allowTags !== undefined) updates.allowTags = form.allowTags;

    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
      updates
    );
    return updatedUser;
  } catch (error) {
    throw new Error(String(error));
  }
}

export async function updatePrivacy(userId: string, isPrivate: boolean) {
  try {
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
      { isPrivate: isPrivate }
    );
    return updatedUser;
  } catch (error) {
    throw new Error("No se pudo actualizar la privacidad");
  }
}

export async function updateUserPassword(newPass: string, oldPass: string) {
  try {
    await account.updatePassword(newPass, oldPass);
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function uploadFile(file: any) {
  if (!file) return;

  const asset = {
    name: file.fileName || `image_${Date.now()}.jpg`,
    type: file.mimeType || "image/jpeg",
    size: file.fileSize || 0,
    uri: file.uri,
  };

  try {
    const uploadedFile = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      asset
    );

    const fileUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storageId}/files/${uploadedFile.$id}/view?project=${appwriteConfig.projectId}&mode=admin`;

    return fileUrl;
  } catch (error) {
    console.error("Error uploadFile:", error);
    throw new Error(String(error));
  }
}

export async function updateImage(file: any) {
  return await uploadFile(file);
}

export const getDeezerTrackUrl = async (trackId: string | number) => {
  if (!trackId) return null;
  try {
    const response = await fetch(`https://api.deezer.com/track/${trackId}`);
    const data = await response.json();

    if (data && data.preview) {
      return data.preview;
    }
    return null;
  } catch (error) {
    console.error("Error fetching Deezer url", error);
    return null;
  }
};

export async function saveSpotifyTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiration: string
) {
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
      {
        spotifyAccessToken: accessToken,
        spotifyRefreshToken: refreshToken,
        spotifyTokenExpiration: expiration,
        preferredPlatform: "spotify",
      }
    );
    return true;
  } catch (error: any) {
    console.error("Error guardando tokens:", error);
    throw new Error("No se pudo conectar con Spotify");
  }
}

export async function setPreferredPlatform(
  userId: string,
  platform: "spotify" | "apple" | "mood"
) {
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
      { preferredPlatform: platform }
    );
    return true;
  } catch (error) {
    throw new Error("No se pudo cambiar la preferencia");
  }
}

export async function getPostById(postId: string) {
  try {
    const post = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      postId
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
    console.log("Error getting post by ID:", error);
    return null;
  }
}

export const createPost = async (
  comment: string,
  songData: string,
  userId: string
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

    return await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      ID.unique(),
      {
        comment: comment,
        songData: cleanSongData,
        datePosted: new Date().toISOString(),
        postedBy: userId,
        likedBy: [],
        savedBy: [],
      }
    );
  } catch (error) {
    console.error("Error creating post:", error);
    throw new Error((error as AppwriteException).message);
  }
};

export async function deletePost(postId: string) {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      postId
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
      [Query.equal("postedBy", userId), Query.orderDesc("$createdAt")]
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
      [Query.orderDesc("$createdAt")]
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
          [Query.equal("postId", post.$id), Query.limit(1)]
        );

        return {
          ...post,
          postedBy: creator,
          commentsCount: comments.total,
        };
      })
    );

    return postsWithData.filter((p) => p !== null);
  } catch (error: any) {
    if (error.code === 401 || error.message?.includes("authorized")) {
      return [];
    }
    console.log("Error en getAllPosts:", error);
    throw new Error(error);
  }
}

export const getLatestUsers = async () => {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [
        Query.orderDesc("$createdAt"),
        Query.limit(20),
        Query.notEqual("isBanned", true),
      ]
    );
    return result.documents;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error((error as AppwriteException).message);
  }
};

export async function getFeedCandidates() {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      [Query.orderDesc("$createdAt"), Query.limit(100)]
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
          [Query.equal("postId", post.$id), Query.limit(1)]
        );

        return {
          ...post,
          postedBy: userData,
          commentsCount: commentsData.total,
        };
      })
    );

    return populatedPosts.filter((p) => p !== null);
  } catch (error: any) {
    throw new Error(error.message || String(error));
  }
}

export async function toggleLikePost(
  postId: string,
  userId: string,
  currentLikes: string[] = []
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
      { likedBy: updatedLikes }
    );

    if (isAddingLike) {
      try {
        const post = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.postsCollectionId,
          postId
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
    console.error("Error toggling like:", error);
    throw new Error(error.message);
  }
}

export async function toggleSavePost(postId: string, userId: string) {
  try {
    const post = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      postId
    );

    const savedBy = post.savedBy || [];
    let newSavedBy = [...savedBy];

    if (newSavedBy.includes(userId)) {
      newSavedBy = newSavedBy.filter((id: string) => id !== userId);
    } else {
      newSavedBy.push(userId);
    }

    const updatedPost = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      postId,
      { savedBy: newSavedBy }
    );

    return updatedPost;
  } catch (error: any) {
    console.error("Error toggleSavePost:", error);
    throw new Error(error.message);
  }
}

export async function getSavedPosts(userId: string) {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      [Query.search("savedBy", userId), Query.orderDesc("$createdAt")]
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
      })
    );

    return populatedPosts.filter((p) => p !== null);
  } catch (error: any) {
    console.error("Error getSavedPosts:", error);
    return [];
  }
}

export async function createComment(
  postId: string,
  commentData: any,
  parentId: string | null = null
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
      }
    );

    try {
      const post = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.postsCollectionId,
        postId
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
    console.error("Error creating comment:", error);
    throw new Error(error.message);
  }
}

export async function toggleCommentLike(
  commentId: string,
  userId: string,
  currentLikes: string[]
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
      { likedBy: updatedLikes }
    );

    return updatedLikes;
  } catch (error) {
    console.log("Error like comentario", error);
    throw error;
  }
}

export async function getPostComments(postId: string) {
  try {
    const comments = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      [Query.equal("postId", postId), Query.orderDesc("$createdAt")]
    );
    return comments.documents;
  } catch (error: any) {
    console.error("Error fetching comments:", error);
    return [];
  }
}

export async function checkFollowStatus(
  followerId: string,
  followingId: string
) {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [
        Query.equal("followerId", followerId),
        Query.equal("followedId", followingId),
      ]
    );

    if (response.documents.length > 0) {
      return response.documents[0].status;
    } else {
      return null;
    }
  } catch (error) {
    console.log("Error checkFollowStatus:", error);
    return null;
  }
}

export async function checkIsFollowing(followerId: string, followedId: string) {
  try {
    const status = await checkFollowStatus(followerId, followedId);
    return status === "accepted";
  } catch (error) {
    return false;
  }
}

export async function getFollowedUserIds(currentUserId: string) {
  try {
    const follows = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [
        Query.equal("followerId", currentUserId),
        Query.equal("status", "accepted"),
      ]
    );
    return follows.documents.map((doc) => doc.followedId);
  } catch (error) {
    console.log("Error fetching followed users", error);
    return [];
  }
}

export async function followUser(followerId: string, followedId: string) {
  try {
    const targetUser = await getUser(followedId);
    if (!targetUser) throw new Error("Usuario no disponible");

    const isPrivate = targetUser?.isPrivate || false;
    const status = isPrivate ? "pending" : "accepted";

    const result = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      ID.unique(),
      {
        followerId: followerId,
        followedId: followedId,
        status: status,
      }
    );

    try {
      const followerUser = await getUser(followerId);
      if (followerUser) {
        const notiType = isPrivate ? "follow_request" : "follow";
        const notiMsg = isPrivate ? "quiere seguirte" : "comenzó a seguirte";

        await createNotification({
          userId: followedId,
          type: notiType as any,
          message: notiMsg,
          senderId: followerId,
          senderName: followerUser.username || followerUser.name,
          senderAvatar: followerUser.pfp,
        });
      }
    } catch (e) {
      console.log("Error noti follow", e);
    }
    return result;
  } catch (error: any) {
    console.log("Error following user:", error);
    throw new Error(error.message);
  }
}

export async function unfollowUser(followerId: string, followedId: string) {
  try {
    const records = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [
        Query.equal("followerId", followerId),
        Query.equal("followedId", followedId),
      ]
    );
    if (records.documents.length > 0) {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.followsCollectionId,
        records.documents[0].$id
      );
      return true;
    }
    return false;
  } catch (error: any) {
    console.log("Error unfollowing user:", error);
    throw new Error(error.message);
  }
}

export async function getFollowCounts(userId: string) {
  try {
    const followers = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [Query.equal("followedId", userId), Query.equal("status", "accepted")]
    );
    const following = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [Query.equal("followerId", userId), Query.equal("status", "accepted")]
    );
    return { followersCount: followers.total, followingCount: following.total };
  } catch (error) {
    return { followersCount: 0, followingCount: 0 };
  }
}

export async function getUserFollowers(userId: string) {
  if (!userId) return [];
  try {
    const follows = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [Query.equal("followedId", userId), Query.equal("status", "accepted")]
    );
    if (follows.documents.length === 0) return [];

    const followersDetails = await Promise.all(
      follows.documents.map(async (doc) => {
        if (!doc.followerId) return null;
        return await getUser(doc.followerId);
      })
    );
    return followersDetails.filter((u) => u !== null);
  } catch (error) {
    return [];
  }
}

export async function getUserFollowing(userId: string) {
  if (!userId) return [];
  try {
    const follows = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [Query.equal("followerId", userId), Query.equal("status", "accepted")]
    );
    if (follows.documents.length === 0) return [];

    const followingDetails = await Promise.all(
      follows.documents.map(async (doc) => {
        if (!doc.followedId) return null;
        return await getUser(doc.followedId);
      })
    );
    return followingDetails.filter((u) => u !== null);
  } catch (error) {
    return [];
  }
}

export async function acceptFollowRequest(
  followerId: string,
  myUserId: string,
  notificationId: string
) {
  try {
    const records = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [
        Query.equal("followerId", followerId),
        Query.equal("followedId", myUserId),
        Query.equal("status", "pending"),
      ]
    );
    if (records.documents.length === 0) {
      try {
        await databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.notificationsCollectionId,
          notificationId
        );
      } catch (e) {}
      return true;
    }
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      records.documents[0].$id,
      { status: "accepted" }
    );
    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        notificationId
      );
    } catch (e) {}
    const followerUser = await getUser(followerId);
    if (followerUser) {
      await createNotification({
        userId: myUserId,
        type: "follow",
        message: "comenzó a seguirte",
        senderId: followerId,
        senderName: followerUser.username || followerUser.name,
        senderAvatar: followerUser.pfp,
      });
    }
    const myUser = await getUser(myUserId);
    if (myUser) {
      await createNotification({
        userId: followerId,
        type: "follow",
        message: "aceptó tu solicitud de seguimiento",
        senderId: myUserId,
        senderName: myUser.username || myUser.name,
        senderAvatar: myUser.pfp,
      });
    }
    return true;
  } catch (error) {
    throw error;
  }
}

export async function deleteFollowRequest(
  followerId: string,
  myUserId: string
) {
  try {
    const records = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [
        Query.equal("followerId", followerId),
        Query.equal("followedId", myUserId),
        Query.equal("status", "pending"),
      ]
    );
    if (records.documents.length > 0) {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.followsCollectionId,
        records.documents[0].$id
      );
    }
    return true;
  } catch (error) {
    throw new Error();
  }
}

export async function getUserNotifications(userId: string) {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      [Query.equal("userId", userId), Query.orderDesc("$createdAt")]
    );
    return result.documents;
  } catch (error) {
    console.log("Error fetching notifications:", error);
    return [];
  }
}

export async function getUnreadNotificationCount(userId: string) {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      [Query.equal("userId", userId), Query.equal("isRead", false)]
    );
    return result.total;
  } catch (error) {
    console.log("Error counting notifications:", error);
    return 0;
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      notificationId,
      { isRead: true }
    );
  } catch (error) {
    console.log("Error marking as read:", error);
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    const unreadList = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      [Query.equal("userId", userId), Query.equal("isRead", false)]
    );

    if (unreadList.total === 0) return true;

    const promises = unreadList.documents.map((doc) =>
      databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        doc.$id,
        { isRead: true }
      )
    );

    await Promise.all(promises);
    return true;
  } catch (error) {
    console.log("Error marking all as read:", error);
    throw error;
  }
}

export async function deleteNotification(notificationId: string) {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      notificationId
    );
    return true;
  } catch (error) {
    console.log("Error borrando notificación:", error);
    throw error;
  }
}

export async function clearAllNotifications(userId: string) {
  try {
    const list = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      [Query.equal("userId", userId)]
    );
    const promises = list.documents.map((doc) =>
      databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        doc.$id
      )
    );
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.log("Error limpiando notificaciones:", error);
    throw error;
  }
}

export async function searchUsers(query: string) {
  try {
    const users = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [
        Query.or([
          Query.search("username", query),
          Query.search("name", query),
        ]),
        Query.limit(10),
        Query.notEqual("isBanned", true),
      ]
    );

    const filteredUsers = users.documents.filter((doc) => {
      return doc.allowTags !== false;
    });

    return filteredUsers;
  } catch (error) {
    console.log("Error en searchUsers:", error);
    return [];
  }
}

export const sendTagNotification = async (
  senderId: string,
  receiverId: string,
  postId: string
) => {
  try {
    const receiver = await getUser(receiverId);
    if (!receiver || receiver.allowTags === false) return;

    const sender = await getUser(senderId);
    if (!sender) return;

    await createNotification({
      userId: receiverId,
      senderId: senderId,
      type: "tag",
      message: "te ha etiquetado en una publicación.",
      senderName: sender.username || sender.name,
      senderAvatar: sender.pfp,
      postId: postId,
    });
  } catch (error) {
    console.log("Error enviando notificación de etiqueta:", error);
  }
};

export async function getOrCreateChat(
  currentUserId: string,
  otherUserId: string
) {
  try {
    const userChats = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      [Query.search("search_params", currentUserId)]
    );
    const existingChat = userChats.documents.find((doc) =>
      doc.participants.includes(otherUserId)
    );
    if (existingChat) return existingChat;

    const newChat = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      ID.unique(),
      {
        participants: [currentUserId, otherUserId],
        search_params: `${currentUserId} ${otherUserId}`,
        lastMessage: "Nuevo chat iniciado",
        lastMessageAt: new Date().toISOString(),
      }
    );
    return newChat;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export const createChat = getOrCreateChat;

export async function deleteChat(chatId: string) {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      chatId
    );
    return true;
  } catch (error) {
    console.log("Error borrando chat:", error);
    throw error;
  }
}

export async function sendMessage(
  chatId: string,
  senderId: string,
  receiverId: string,
  content: string,
  sharedPostId: string | null = null,
  sharedPlaylistId: string | null = null
) {
  try {
    const msg = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      ID.unique(),
      {
        chatId,
        senderId,
        receiverId,
        content,
        isRead: false,
        sharedPostId,
        sharedPlaylistId,
      }
    );

    let lastMsgContent = content;
    if (sharedPostId) lastMsgContent = "🎵 Post compartido";
    if (sharedPlaylistId) lastMsgContent = "💿 Playlist compartida";

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      chatId,
      {
        lastMessage: lastMsgContent,
        lastMessageAt: new Date().toISOString(),
        lastSenderId: senderId,
        lastMessageIsRead: false,
      }
    );
    return msg;
  } catch (error) {
    throw new Error("No se pudo enviar");
  }
}

export async function getChatMessages(chatId: string) {
  try {
    const msgs = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      [Query.equal("chatId", chatId), Query.orderDesc("$createdAt")]
    );
    return msgs.documents;
  } catch (error) {
    return [];
  }
}

export async function getUserChats(userId: string) {
  try {
    const chats = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      [Query.search("search_params", userId), Query.orderDesc("lastMessageAt")]
    );
    const chatsWithUserData = await Promise.all(
      chats.documents.map(async (chat) => {
        const otherUserId = chat.participants.find(
          (id: string) => id !== userId
        );
        const otherUser = await getUser(otherUserId);

        if (!otherUser) return null;

        return { ...chat, otherUser: otherUser };
      })
    );

    return chatsWithUserData.filter((c) => c !== null);
  } catch (error) {
    return [];
  }
}

export async function getUnreadMessagesCount(userId: string) {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      [Query.equal("receiverId", userId), Query.equal("isRead", false)]
    );
    return result.total;
  } catch (error) {
    return 0;
  }
}

export async function markChatAsRead(chatId: string, userId: string) {
  try {
    const unreadMsgs = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      [
        Query.equal("chatId", chatId),
        Query.equal("receiverId", userId),
        Query.equal("isRead", false),
      ]
    );
    const promises = unreadMsgs.documents.map((msg) =>
      databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.messagesCollectionId,
        msg.$id,
        { isRead: true }
      )
    );
    await Promise.all(promises);
  } catch (error) {
    console.log("Error marking chat as read:", error);
  }
}

export async function deleteMessage(messageId: string) {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      messageId
    );
    return true;
  } catch (error) {
    console.log("Error deleting message:", error);
    throw error;
  }
}

export async function updateMessage(messageId: string, newContent: string) {
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      messageId,
      { content: newContent }
    );
    return true;
  } catch (error) {
    console.log("Error updating message:", error);
    throw error;
  }
}

export async function blockUser(currentUserId: string, userToBlockId: string) {
  try {
    const currentUser = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      currentUserId
    );
    const currentBlocked = currentUser.blockedUsers || [];
    if (currentBlocked.includes(userToBlockId)) return;
    const updatedBlockedList = [...currentBlocked, userToBlockId];
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      currentUserId,
      { blockedUsers: updatedBlockedList }
    );
    await unfollowUser(currentUserId, userToBlockId);
    await unfollowUser(userToBlockId, currentUserId);
    return true;
  } catch (error) {
    throw new Error("Error al bloquear usuario");
  }
}

export async function unblockUser(
  currentUserId: string,
  userToUnblockId: string
) {
  try {
    const currentUser = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      currentUserId
    );
    const currentBlocked = currentUser.blockedUsers || [];
    const updatedBlockedList = currentBlocked.filter(
      (id: string) => id !== userToUnblockId
    );
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      currentUserId,
      { blockedUsers: updatedBlockedList }
    );
    return true;
  } catch (error) {
    throw new Error("Error al desbloquear usuario");
  }
}

export async function getBlockedUsersList(currentUserId: string) {
  try {
    const currentUser = await getUser(currentUserId);
    if (
      !currentUser ||
      !currentUser.blockedUsers ||
      currentUser.blockedUsers.length === 0
    ) {
      return [];
    }

    const blockedIds = currentUser.blockedUsers;
    const promises = blockedIds.map((id: string) => getUser(id));
    const users = await Promise.all(promises);

    return users.filter((u) => u !== null);
  } catch (error) {
    console.log("Error fetching blocked users:", error);
    return [];
  }
}

export async function reportPost(
  postId: string,
  reporterId: string,
  reason: string
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
      }
    );
    return true;
  } catch (error: any) {
    console.error("Error al reportar:", error);
    throw new Error("No se pudo enviar el reporte");
  }
}

export async function getUserSessions() {
  try {
    const sessions = await account.listSessions();
    return sessions.sessions;
  } catch (error: any) {
    return [];
  }
}
export async function deleteSession(sessionId: string) {
  try {
    await account.deleteSession(sessionId);
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
}
export async function deleteAllSessions() {
  try {
    const sessions = await account.listSessions();
    await Promise.all(
      sessions.sessions.map((s) => account.deleteSession(s.$id))
    );
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function createPlaylist(
  name: string,
  userId: string,
  platform: string = "mood"
) {
  try {
    const coverUrl = `${
      appwriteConfig.endpoint
    }/avatars/initials?name=${encodeURIComponent(name)}&project=${
      appwriteConfig.projectId
    }`;

    const newPlaylist = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.playlistsCollectionId,
      ID.unique(),
      {
        name: name,
        ownerId: userId,
        songs: [],
        cover: coverUrl,
        platform: platform,
        externalId: null,
      }
    );
    return newPlaylist;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getUserPlaylists(userId: string) {
  try {
    const playlists = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.playlistsCollectionId,
      [Query.equal("ownerId", userId), Query.orderDesc("$createdAt")]
    );
    return playlists.documents;
  } catch (error) {
    console.log("Error getting playlists:", error);
    return [];
  }
}

export async function addSongToPlaylist(playlistId: string, songData: any) {
  try {
    const playlist = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.playlistsCollectionId,
      playlistId
    );

    const songString = JSON.stringify(songData);

    if (playlist.songs.includes(songString)) return playlist;

    const updatedSongs = [...playlist.songs, songString];

    const updated = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.playlistsCollectionId,
      playlistId,
      { songs: updatedSongs }
    );

    return updated;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function removeSongFromPlaylist(
  playlistId: string,
  songStringToRemove: string
) {
  try {
    const playlist = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.playlistsCollectionId,
      playlistId
    );

    const updatedSongs = playlist.songs.filter(
      (s: string) => s !== songStringToRemove
    );

    const updated = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.playlistsCollectionId,
      playlistId,
      { songs: updatedSongs }
    );

    return updated;
  } catch (error: any) {
    throw new Error("No se pudo eliminar la canción");
  }
}

export async function deletePlaylist(playlistId: string) {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.playlistsCollectionId,
      playlistId
    );
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function renamePlaylist(playlistId: string, newName: string) {
  try {
    const updated = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.playlistsCollectionId,
      playlistId,
      { name: newName }
    );
    return updated;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getPlaylistById(playlistId: string) {
  try {
    const playlist = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.playlistsCollectionId,
      playlistId
    );
    return playlist;
  } catch (error) {
    console.log("Error getPlaylistById", error);
    return null;
  }
}

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
      }
    );
    return newStory;
  } catch (error) {
    console.log("Error creando historia:", error);
    throw error;
  }
}

export async function getStories(currentUserId: string) {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.storiesCollectionId,
      [
        Query.orderDesc("$createdAt"),
        Query.greaterThan("expiresAt", new Date().toISOString()),
      ]
    );

    return posts.documents;
  } catch (error) {
    console.log("Error obteniendo historias:", error);
    return [];
  }
}

export async function viewStory(
  storyId: string,
  userId: string,
  currentViewers: string[] = []
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
      }
    );
  } catch (error) {
    console.log("Error marcando vista:", error);
  }
}

export { client, databases };
