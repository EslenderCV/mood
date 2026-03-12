import { ID, Query } from "react-native-appwrite";
import { databases, appwriteConfig } from "./config";
// ✅ CORRECCIÓN: Importamos desde el nuevo archivo neutral
import { getUser } from "./userUtils";
import { tStatic } from "@/context/LanguageContext";

export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data: any = {},
  image?: string,
) {
  if (!expoPushToken || !expoPushToken.startsWith("ExponentPushToken")) {
    return;
  }

  const message = {
    to: expoPushToken,
    sound: "default",
    title: title,
    body: body,
    data: data,
    image: image,
    priority: "high",
    channelId: "social-updates",
    badge: 1,
    _displayInForeground: false,
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


type NotifType = "like" | "comment" | "follow" | "follow_request" | "follow_accepted" | "tag";

const normalizeLang = (lang?: string): "en" | "es" | "fr" | "pt" | "it" => {
  const v = (lang || "").toLowerCase();
  if (v.startsWith("es")) return "es";
  if (v.startsWith("fr")) return "fr";
  if (v.startsWith("pt")) return "pt";
  if (v.startsWith("it")) return "it";
  return "en";
};

const interpolateTemplate = (template: string, params: Record<string, string>) => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => params[key] ?? "");
};

const buildNotificationMessage = (type: NotifType, lang: "en" | "es" | "fr" | "pt" | "it", snippet?: string) => {
  const base = tStatic(`notifications.activityText.${type}`, lang);
  if (type === "comment") {
    const clean = (snippet || "").replace(/\s+/g, " ").trim();
    const short = clean.length > 60 ? clean.slice(0, 57) + "…" : clean;
    return interpolateTemplate(base, { snippet: short });
  }
  return base;
};

const buildNotificationTitle = (type: NotifType, lang: "en" | "es" | "fr" | "pt" | "it") => {
  return tStatic(`notifications.pushTitles.${type}`, lang) || "Mood";
};

export async function createNotification(data: {
  userId: string;
  type: NotifType;
  /**
   * Optional extra text (only used for comment notifications).
   * Pass the raw comment content; it will be trimmed and localized per recipient language.
   */
  message?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  postId?: string;
  imagePreview?: string;
}) {
  try {
    if (data.userId === data.senderId) return;

    const targetUser: any = await getUser(data.userId).catch(() => null);
    const lang = normalizeLang(targetUser?.language);
    const activity = buildNotificationMessage(data.type, lang, data.message);

    // Always create DB record (in-app bell). Stored in recipient language.
    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      ID.unique(),
      {
        userId: data.userId,
        type: data.type,
        message: activity,
        senderId: data.senderId,
        senderName: data.senderName,
        senderAvatar: data.senderAvatar,
        postId: data.postId,
        isRead: false,
      },
    );

    // Push notification (respects user setting)
    if (
      targetUser &&
      targetUser.expoPushToken &&
      targetUser.notificationsEnabled !== false
    ) {
      const title = buildNotificationTitle(data.type, lang);
      const body = `${data.senderName} ${activity}`;
      await sendPushNotification(
        targetUser.expoPushToken,
        title,
        body,
        {
          url: data.postId ? `/post/${data.postId}` : `/user/${data.senderId}`,
          type: data.type,
        },
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