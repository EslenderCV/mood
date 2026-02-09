import { Client, Account, Databases, Storage } from "react-native-appwrite";

export const appwriteConfig = {
  endpoint: "https://nyc.cloud.appwrite.io/v1",
  platform: "com.Gammes.Mood",
  projectId: "697d0db30009f4ca4dd6",
  databaseId: "6689e7cc002bf2740136",
  usersCollectionId: "6962f488000f10f39b70",
  postsCollectionId: "6689e9a5003e7426666e",
  storageId: "66a51c310032319c09d0",
  followsCollectionId: "6949a7500026f2cf2850",
  commentsCollectionId: "6949afd6002150b37f0f",
  notificationsCollectionId: "6949b7490030640f0fb1",
  weeklyVibesCollectionId: "weekly_vibes",

  // 🔥 NUEVAS COLECCIONES DE CHAT (PREMIUM)
  chatsCollectionId: "6971493e000481d5a067", // Antes: conversations
  messagesCollectionId: "69714a20003e2a516041", // Antes: direct_messages

  reportsCollectionId: "6959a194002105f44c03",
  playlistsCollectionId: "6959a8460009615dfbcb",
  storiesCollectionId: "69631b240013f47f559f",
  feedEventsCollectionId: "69728245001c3be9cfe9",

  // ---- Server feed functions (Phase-3: backend source of truth) ----
  // These default IDs are your deployed Appwrite Functions.
  // You can override at build time using Expo public env vars:
  // - EXPO_PUBLIC_SERVER_HOME_FEED=1
  // - EXPO_PUBLIC_APPWRITE_FEED_FUNCTION_ID=...
  // - EXPO_PUBLIC_APPWRITE_FEED_EVENTS_FUNCTION_ID=...
  serverHomeFeed: {
    enabled: true,
    feedFunctionId: "69851d10000d231b66b3",
    feedEventsFunctionId: "6985241c000f43efd797",
  },

  // ---- Password reset (in-app) ----
  // By default, the app will try to reset using the migration default password
  // (Mood.2026!) after verifying the Email OTP code.
  // If you want password reset to work even after the user has already changed
  // their password (i.e., you don't know the old password), create an Appwrite
  // Function and put its ID here (or set EXPO_PUBLIC_APPWRITE_PASSWORD_RESET_FUNCTION_ID).
  passwordReset: {
    functionId: process.env.EXPO_PUBLIC_APPWRITE_PASSWORD_RESET_FUNCTION_ID || "",
  },
};

export const client = new Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
