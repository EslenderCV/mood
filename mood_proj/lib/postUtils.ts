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

// --- Feed brain helpers ---
// Mood/tag emojis are currently embedded inside `songData` (e.g. `songData.mood`) and
// sometimes inside `songData.text`.
// We keep extraction logic in one place to avoid drift across UI + feed brain + telemetry.
const KNOWN_MOOD_EMOJIS = [
  "😂",
  "🥺",
  "😭",
  "😡",
  "😎",
  "🤍",
  "❤️",
  "💔",
  "🖤",
  "🔥",
  "✨",
  "🥰",
  "😍",
  "😴",
  "🤯",
  "😇",
  "😈",
  "🥵",
  "🥶",
  "🤩",
  "😢",
  "😌",
  "😤",
  "😱",
  "🤔",
  "😮‍💨",
  "🎧",
  "🎶",
  "🎵",
];

const pickFirstEmoji = (s: string): string | null => {
  if (!s) return null;
  let best: { e: string; idx: number } | null = null;
  for (const e of KNOWN_MOOD_EMOJIS) {
    const idx = s.indexOf(e);
    if (idx === -1) continue;
    if (!best || idx < best.idx) best = { e, idx };
  }
  return best ? best.e : null;
};

export const extractMoodEmojiFromSong = (song: any): string | null => {
  if (!song || typeof song !== "object") return null;

  const m = song?.mood;
  if (typeof m === "string" && m.trim().length > 0) return m.trim();

  // Fallbacks: some payloads store the emoji in text/caption-like fields.
  const textCandidates = [song?.text, song?.caption, song?.moodText, song?.moodStyle];
  for (const t of textCandidates) {
    if (typeof t !== "string") continue;
    const e = pickFirstEmoji(t);
    if (e) return e;
  }

  return null;
};

export const extractMoodEmojiFromSongDataString = (
  songDataString: string,
): string | null => {
  const song = parseSongData(songDataString);
  return extractMoodEmojiFromSong(song);
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
