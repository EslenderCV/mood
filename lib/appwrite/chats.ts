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
        isTyping: [],
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

// 🔥 Función de envío con Objeto Payload (para corregir el error de argumentos)
export async function sendMessage(payload: {
  chatId: string;
  senderId: string;
  receiverId: string;
  body: string; // Usamos 'body' consistentemente
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
        body: payload.body, // Guardamos en 'body'
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

// 🔥 Renombrado correctamente a getMessages (para coincidir con el hook)
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

// 🔥 Agregamos deleteMessage (Faltaba)
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

// 🔥 Agregamos updateMessage (Faltaba)
export async function updateMessage(messageId: string, newBody: string) {
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      messageId,
      { body: newBody }, // Actualizamos 'body'
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
    let list: string[] = doc.isTyping || [];
    if (isTyping && !list.includes(userId)) list.push(userId);
    else if (!isTyping) list = list.filter((id) => id !== userId);

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      chatId,
      { isTyping: list },
    );
  } catch (e) {}
}

export async function getUnreadMessagesCount(userId: string): Promise<number> {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.chatsCollectionId,
      [Query.equal("participants", userId)]
    );

    let total = 0;

    for (const chat of result.documents) {
      try {
        const counts = JSON.parse(chat.unreadCounts || "{}") as Record<string, number>;
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