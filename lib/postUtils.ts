import { createNotification } from "@/lib/appwrite";

export const parseSongData = (songDataString: string) => {
  try {
    if (!songDataString) return null;
    const song = JSON.parse(songDataString);
    if (song.cover && song.cover.includes("100x100bb"))
      song.cover = song.cover.replace("100x100bb", "600x600bb");
    return song;
  } catch (e) {
    return null;
  }
};

export const formatTimeAgo = (
  dateString: string,
  t: (key: string) => string,
) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return t("postDetails.time.seconds") || "Ahora";
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

export const sendReplyNotification = async (
  post: any,
  currentUser: any,
  replyingToUser: any,
) => {
  if (replyingToUser && replyingToUser.$id !== currentUser.$id) {
    try {
      await createNotification({
        userId: replyingToUser.$id,
        type: "comment",
        message: "respondió tu comentario ↩️",
        senderId: currentUser.$id,
        senderName: currentUser.username,
        senderAvatar: currentUser.pfp,
        postId: post.$id,
      });
    } catch (e) {
      console.error("Error notificando respuesta:", e);
    }
  }
};
