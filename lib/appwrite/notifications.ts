import { ID, Query } from "react-native-appwrite";
import { databases, appwriteConfig } from "./config";
// Importamos getUser desde users (sin crear ciclo problemático en runtime)
import { getUser } from "./users";

export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data: any = {},
  image?: string, // 📸 Nuevo: Soporte para imágenes
) {
  if (!expoPushToken || !expoPushToken.startsWith("ExponentPushToken")) {
    return;
  }

  // Estructura Premium
  const message = {
    to: expoPushToken,
    sound: "default",
    title: title,
    body: body,
    data: data, // Aquí va el postId o chatId para la navegación
    image: image, // Imagen grande en Android (BigPictureStyle)
    priority: "high",
    channelId: "social-updates", // 🔥 Clave para Android
    badge: 1,
    _displayInForeground: false, // Dejaremos que nuestro Context maneje esto
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
      },
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
  imagePreview?: string; // 📸 Pasamos la imagen del post si existe
}) {
  try {
    if (data.userId === data.senderId) return;

    // 1. Guardar en Base de Datos (Igual que antes)
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
      },
    );

    // 2. Preparar el Push "Premium"
    const targetUser = await getUser(data.userId);

    if (targetUser && targetUser.expoPushToken) {
      let title = "Mood";
      let body = `${data.senderName} ${data.message}`;

      // Personalización por tipo
      if (data.type === "like") title = "❤️ Nuevo Like";
      if (data.type === "comment") title = "💬 Comentario";
      if (data.type === "follow") title = "👤 Nuevo Seguidor";
      if (data.type === "tag") title = "🏷️ Etiqueta";

      // 3. Enviar con datos de navegación y visuales
      await sendPushNotification(
        targetUser.expoPushToken,
        title,
        body,
        {
          // 🧭 DATA PARA DEEP LINKING
          url: data.postId ? `/post/${data.postId}` : `/user/${data.senderId}`,
          type: data.type,
        },
        // Usamos la foto del post (si es like/comment) o el avatar del usuario
        data.imagePreview || data.senderAvatar,
      );
    }
  } catch (error) {
    console.log("Error creando notificación:", error);
  }
}

export async function getUserNotifications(userId: string) {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      [Query.equal("userId", userId), Query.orderDesc("$createdAt")],
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
      [Query.equal("userId", userId), Query.equal("isRead", false)],
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
      { isRead: true },
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
      [Query.equal("userId", userId), Query.equal("isRead", false)],
    );

    if (unreadList.total === 0) return true;

    const promises = unreadList.documents.map((doc) =>
      databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        doc.$id,
        { isRead: true },
      ),
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
      notificationId,
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
      [Query.equal("userId", userId)],
    );
    const promises = list.documents.map((doc) =>
      databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        doc.$id,
      ),
    );
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.log("Error limpiando notificaciones:", error);
    throw error;
  }
}

export const sendTagNotification = async (
  senderId: string,
  receiverId: string,
  postId: string,
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
