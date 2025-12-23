import { ImagePickerAsset } from "expo-image-picker";
import {
  Client,
  Account,
  Avatars,
  Databases,
  Query,
  AppwriteException,
  Storage,
  ID,
} from "react-native-appwrite";

// --- CONFIGURACIÓN ---
export const appwriteConfig = {
  endpoint: "https://cloud.appwrite.io/v1",
  platform: "com.gammes.mood",
  projectId: "6689e59b000acd6caf6f",
  databaseId: "6689e7cc002bf2740136",
  usersCollectionId: "6689e818000ae6ccbdec",
  postsCollectionId: "6689e9a5003e7426666e",
  storageId: "66a51c310032319c09d0",
  followsCollectionId: "6949a7500026f2cf2850",
  commentsCollectionId: "6949afd6002150b37f0f",
  notificationsCollectionId: "6949b7490030640f0fb1",
  // TUS IDs DE CHAT
  chatsCollectionId: "6949bf1f002f7ce268a2",
  messagesCollectionId: "6949c1b6000d070ff309",
};

// --- INICIALIZACIÓN ---
const client = new Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

const account = new Account(client);
const avatars = new Avatars(client);
const databases = new Databases(client);
const storage = new Storage(client);

// ==========================================
//  1. FUNCIONES DE AUTENTICACIÓN
// ==========================================

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

export const signOut = async () => {
  try {
    return await account.deleteSession("current");
  } catch (error) {
    throw new Error((error as AppwriteException).message);
  }
};

export const getCurrentUser = async () => {
  try {
    const currentAccount = await account.get();
    if (!currentAccount) throw new Error("No active session");

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal("accId", currentAccount.$id)]
    );

    if (!currentUser || currentUser.documents.length === 0) return null;
    return currentUser.documents[0];
  } catch (error: any) {
    if (error.code === 401 || error.message?.includes("missing scopes")) {
      return null;
    }
    console.log("Error getCurrentUser:", error);
    return null;
  }
};

export const updateProfile = async (updates: {
  name?: string;
  username?: string;
}) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User not found");
    return await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      currentUser.$id,
      updates
    );
  } catch (err) {
    console.error("Error updating profile:", err);
    throw err;
  }
};

export async function getUser(userId: string) {
  try {
    return await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId
    );
  } catch (error) {
    console.log("Error obteniendo usuario:", error);
    return null;
  }
}

// ==========================================
//  2. IMÁGENES
// ==========================================

export const updateImage = async (asset: ImagePickerAsset) => {
  try {
    const fileUrl = await uploadImageAsync(asset);
    if (!fileUrl) throw new Error("Image upload failed");
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User not found");
    return await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      currentUser.$id,
      { pfp: fileUrl }
    );
  } catch (err) {
    console.error("Error in updateImage:", err);
    throw err;
  }
};

const uploadImageAsync = async (asset: ImagePickerAsset) => {
  try {
    const file = await prepareNativeFile(asset);
    const response = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      file
    );
    return `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storageId}/files/${response.$id}/view?project=${appwriteConfig.projectId}`;
  } catch (err) {
    console.error("Error subiendo imagen:", err);
    throw err;
  }
};

const prepareNativeFile = async (asset: ImagePickerAsset) => {
  try {
    return {
      name: asset.fileName || `image_${Date.now()}.jpg`,
      type: asset.mimeType || "image/jpeg",
      size: asset.fileSize || 0,
      uri: asset.uri,
    };
  } catch (err) {
    console.error("Error preparing file:", err);
    throw err;
  }
};

// ==========================================
//  3. POSTS
// ==========================================

export async function getPostById(postId: string) {
  try {
    const post = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      postId
    );

    // Si postedBy es solo el ID, buscamos los datos del usuario
    if (post.postedBy && typeof post.postedBy === "string") {
      const user = await getUser(post.postedBy);
      return { ...post, postedBy: user };
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
    return await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      ID.unique(),
      {
        comment: comment,
        songData: songData,
        datePosted: new Date().toISOString(),
        postedBy: userId,
        likedBy: [],
      }
    );
  } catch (error) {
    console.error("Error creating post:", error);
    throw new Error((error as AppwriteException).message);
  }
};

export const getUserPosts = async (userId: string) => {
  try {
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

export async function getAllPosts() {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      [Query.orderDesc("$createdAt")]
    );
    const postsWithUserData = await Promise.all(
      posts.documents.map(async (post) => {
        if (post.postedBy && typeof post.postedBy === "string") {
          const creator = await getUser(post.postedBy);
          return { ...post, postedBy: creator || post.postedBy };
        }
        return post;
      })
    );
    return postsWithUserData;
  } catch (error: any) {
    console.log("Error en getAllPosts:", error);
    throw new Error(error.message || String(error));
  }
}

export const getLatestUsers = async () => {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.orderDesc("$createdAt"), Query.limit(20)]
    );
    return result.documents;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error((error as AppwriteException).message);
  }
};

// ==========================================
//  4. LIKES (CON NOTIFICACIÓN)
// ==========================================

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

    // Notificación
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

// ==========================================
//  5. COMENTARIOS (CON NOTIFICACIÓN)
// ==========================================

export async function createComment(postId: string, commentData: any) {
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
      }
    );

    // Notificación
    try {
      const post = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.postsCollectionId,
        postId
      );
      if (post.postedBy) {
        const ownerId =
          typeof post.postedBy === "object" ? post.postedBy.$id : post.postedBy;
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
    } catch (e) {
      console.log("Error noti comment", e);
    }

    return newComment;
  } catch (error: any) {
    console.error("Error creating comment:", error);
    throw new Error(error.message);
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

// ==========================================
//  6. SEGUIDORES (CON NOTIFICACIÓN)
// ==========================================

export async function followUser(followerId: string, followedId: string) {
  try {
    const result = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      ID.unique(),
      {
        followerId: followerId,
        followedId: followedId,
      }
    );

    // --- NOTIFICACIÓN DE FOLLOW ---
    try {
      const followerUser = await getUser(followerId);
      if (followerUser) {
        await createNotification({
          userId: followedId, // A quien siguieron
          type: "follow",
          message: "comenzó a seguirte",
          senderId: followerId, // Quien siguió
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

export async function checkIsFollowing(followerId: string, followedId: string) {
  try {
    const records = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [
        Query.equal("followerId", followerId),
        Query.equal("followedId", followedId),
      ]
    );
    return records.documents.length > 0;
  } catch (error) {
    return false;
  }
}

export async function getFollowCounts(userId: string) {
  try {
    const followers = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [Query.equal("followedId", userId)]
    );
    const following = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [Query.equal("followerId", userId)]
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
      [Query.equal("followedId", userId)]
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
      [Query.equal("followerId", userId)]
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

// ==========================================
//  7. SISTEMA DE NOTIFICACIONES (INTERNAL)
// ==========================================

export async function createNotification(data: {
  userId: string;
  type: "like" | "comment" | "follow";
  message: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  postId?: string;
}) {
  try {
    if (data.userId === data.senderId) return; // No auto-notificar

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
  } catch (error) {
    console.log("Error creando notificación (no crítico):", error);
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
      [
        Query.equal("userId", userId),
        Query.equal("isRead", false), // Solo las que isRead es falso
      ]
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
      {
        isRead: true,
      }
    );
  } catch (error) {
    console.log("Error marking as read:", error);
  }
}

// ==========================================
//  8. SISTEMA DE CHAT (REALTIME) - CORREGIDO
// ==========================================

// A. Buscar Usuarios
export async function searchUsers(query: string) {
  try {
    const users = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.search("username", query)]
    );
    return users.documents;
  } catch (error) {
    console.log(error);
    return [];
  }
}

// B. Obtener o Crear un Chat
export async function getOrCreateChat(
  currentUserId: string,
  otherUserId: string
) {
  try {
    // 1. Buscamos en el campo STRING 'search_params'
    const userChats = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      [Query.search("search_params", currentUserId)]
    );

    // 2. Filtramos manualmente en Javascript para encontrar la coincidencia exacta
    const existingChat = userChats.documents.find((doc) =>
      doc.participants.includes(otherUserId)
    );

    if (existingChat) return existingChat;

    // 3. Si no existe, creamos uno nuevo llenando AMBOS campos
    const newChat = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      ID.unique(),
      {
        participants: [currentUserId, otherUserId], // Array para uso fácil en frontend
        search_params: `${currentUserId} ${otherUserId}`, // String para indexar
        lastMessage: "Nuevo chat iniciado",
        lastMessageAt: new Date().toISOString(),
      }
    );
    return newChat;
  } catch (error: any) {
    console.error("Error getOrCreateChat:", error);
    throw new Error(error.message);
  }
}

// C. Enviar Mensaje (CORREGIDO: Acepta 5 argumentos)
export async function sendMessage(
  chatId: string,
  senderId: string,
  receiverId: string,
  content: string,
  sharedPostId: string | null = null // <--- ¡AQUÍ ESTÁ LA CORRECCIÓN!
) {
  try {
    // A. Crear el mensaje
    const msg = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      ID.unique(),
      {
        chatId: chatId,
        senderId: senderId,
        receiverId: receiverId,
        content: content,
        isRead: false,
        sharedPostId: sharedPostId, // Guardamos el ID del post si existe
      }
    );

    // B. Actualizar el CHAT PADRE
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      chatId,
      {
        lastMessage: sharedPostId ? "🎵 Post compartido" : content,
        lastMessageAt: new Date().toISOString(),
        lastSenderId: senderId, // Quién escribió
        lastMessageIsRead: false, // Se marca como NO leído
      }
    );

    return msg;
  } catch (error) {
    console.log(error);
    throw new Error("No se pudo enviar");
  }
}

// D. Obtener Mensajes
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

// E. Obtener Lista de Chats
export async function getUserChats(userId: string) {
  try {
    // Buscamos usando el campo STRING
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
        return {
          ...chat,
          otherUser: otherUser,
        };
      })
    );

    return chatsWithUserData;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getUnreadMessagesCount(userId: string) {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      [
        Query.equal("receiverId", userId), // Mensajes para mí
        Query.equal("isRead", false), // Que no he leído
      ]
    );
    return result.total;
  } catch (error) {
    return 0;
  }
}

export async function markChatAsRead(chatId: string, userId: string) {
  try {
    // A. Marcar mensajes individuales como leídos
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

    // B. Actualizar el CHAT PADRE (Solo si el último mensaje NO era mío)
    const chatDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      chatId
    );

    if (
      chatDoc.lastSenderId !== userId &&
      chatDoc.lastMessageIsRead === false
    ) {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.chatsCollectionId,
        chatId,
        { lastMessageIsRead: true }
      );
    }
  } catch (error) {
    console.log("Error marking chat as read:", error);
  }
}

// Exportamos el cliente para las suscripciones Realtime
export { client };
