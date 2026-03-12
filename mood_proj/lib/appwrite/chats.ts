import { ID, Query } from "react-native-appwrite";
import { databases, appwriteConfig } from "./config";
import { getUser } from "./users";

// 1. GESTIÓN DE CONVERSACIONES
export async function getOrCreateConversation(
  currentUserId: string,
  otherUserId: string,
) {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      [Query.equal("participants", currentUserId)],
    );

    const existingChat = result.documents.find((doc) =>
      doc.participants.includes(otherUserId),
    );

    if (existingChat) return existingChat;

    const initialUnread = JSON.stringify({
      [currentUserId]: 0,
      [otherUserId]: 0,
    });

    return await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      ID.unique(),
      {
        participants: [currentUserId, otherUserId],
        lastMessage: "👋 Chat iniciado",
        lastMessageTime: new Date().toISOString(),
        unreadCounts: initialUnread,
        isTyping: [], // Array vacío inicial
      },
    );
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getUserConversations(userId: string) {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      [Query.equal("participants", userId), Query.orderDesc("lastMessageTime")],
    );

    return await Promise.all(
      result.documents.map(async (chat) => {
        const otherId = chat.participants.find((p: string) => p !== userId);
        const otherUser = await getUser(otherId);

        let unreadCount = 0;
        try {
          const counts = JSON.parse(chat.unreadCounts || "{}");
          unreadCount = counts[userId] || 0;
        } catch (e) {}

        return { ...chat, otherUser, unreadCount };
      }),
    );
  } catch (error) {
    return [];
  }
}

// 2. MENSAJERÍA PREMIUM

export async function sendMessage(payload: {
  chatId: string;
  senderId: string;
  receiverId: string;
  body: string;
  type: "text" | "image" | "audio" | "post";
  attachments?: string[];
  replyToId?: string;
}) {
  try {
    const message = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      ID.unique(),
      {
        chatId: payload.chatId,
        senderId: payload.senderId,
        body: payload.body,
        type: payload.type,
        attachments: payload.attachments || [],
        readBy: [payload.senderId],
        replyToId: payload.replyToId,
      },
    );

    // Actualizar Chat
    const chatDoc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      payload.chatId,
    );
    let unreadMap: any = {};
    try {
      unreadMap = JSON.parse(chatDoc.unreadCounts || "{}");
    } catch (e) {}
    unreadMap[payload.receiverId] = (unreadMap[payload.receiverId] || 0) + 1;

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      payload.chatId,
      {
        lastMessage:
          payload.type === "text" ? payload.body : `📎 ${payload.type}`,
        lastMessageTime: new Date().toISOString(),
        unreadCounts: JSON.stringify(unreadMap),
      },
    );
    return message;
  } catch (error) {
    console.error("Error sendMessage:", error);
    throw error;
  }
}

export async function getMessages(chatId: string) {
  try {
    const res = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      [
        Query.equal("chatId", chatId),
        Query.orderDesc("$createdAt"),
        Query.limit(50),
      ],
    );
    return res.documents;
  } catch {
    return [];
  }
}

export async function deleteMessage(messageId: string) {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      messageId,
    );
    return true;
  } catch (error) {
    console.log("Error deleteMessage:", error);
    throw error;
  }
}

export async function updateMessage(messageId: string, newBody: string) {
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      messageId,
      { body: newBody },
    );
    return true;
  } catch (error) {
    console.log("Error updateMessage:", error);
    throw error;
  }
}

export async function markChatAsRead(chatId: string, userId: string) {
  try {
    const doc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      chatId,
    );
    let map: any = {};
    try {
      map = JSON.parse(doc.unreadCounts || "{}");
    } catch (e) {}

    if (map[userId] > 0) {
      map[userId] = 0;
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.chatsCollectionId,
        chatId,
        { unreadCounts: JSON.stringify(map) },
      );
    }
  } catch (e) {}
}

// 🔥 FUNCIÓN CORREGIDA Y ROBUSTA
export async function setTypingStatus(
  chatId: string,
  userId: string,
  isTyping: boolean,
) {
  try {
    const doc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      chatId,
    );

    // Aseguramos que sea un array
    let list: string[] = doc.isTyping || [];

    // Verificamos si ya estaba en la lista para no hacer llamadas innecesarias
    const wasTyping = list.includes(userId);

    if (isTyping && !wasTyping) {
      list.push(userId); // Agregamos al usuario
    } else if (!isTyping && wasTyping) {
      list = list.filter((id) => id !== userId); // Lo sacamos
    } else {
      return; // Si el estado es el mismo, no tocamos la base de datos
    }

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      chatId,
      { isTyping: list },
    );
  } catch (e: any) {
    console.error("❌ Error en setTypingStatus:", e.message);
  }
}

export async function getUnreadMessagesCount(userId: string): Promise<number> {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      [Query.equal("participants", userId)],
    );

    let total = 0;

    for (const chat of result.documents) {
      try {
        const counts = JSON.parse(chat.unreadCounts || "{}") as Record<
          string,
          number
        >;
        total += counts[userId] || 0;
      } catch {
        // si unreadCounts está corrupto o no es JSON válido, lo ignoramos
      }
    }

    return total;
  } catch {
    return 0;
  }
}

// -----------------------------------------------------------------------------
// COMPAT: legacy chat API used by older screens/components
// -----------------------------------------------------------------------------

/** @deprecated Use getOrCreateConversation */
export const getOrCreateChat = getOrCreateConversation;

/** @deprecated Use getUserConversations */
export const getUserChats = getUserConversations;

/** @deprecated Use getOrCreateConversation */
export async function createChat(currentUserId: string, otherUserId: string) {
  return getOrCreateConversation(currentUserId, otherUserId);
}

/** @deprecated Prefer leaving chat history; deletes the chat doc only (messages remain unless cleaned separately). */
export async function deleteChat(chatId: string) {
  try {
    await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.chatsCollectionId, chatId);
    return true;
  } catch (error: any) {
    throw new Error(error?.message ?? "Failed to delete chat");
  }
}
