import { Query, ID } from "react-native-appwrite";
import { databases, appwriteConfig } from "./config";
import { getUser } from "./users";

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