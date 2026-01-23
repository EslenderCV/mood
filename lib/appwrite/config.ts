import { Client, Account, Databases, Storage } from "react-native-appwrite";

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

  // 🔥 NUEVAS COLECCIONES DE CHAT (PREMIUM)
  chatsCollectionId: "6971493e000481d5a067", // Antes: conversations
  messagesCollectionId: "69714a20003e2a516041", // Antes: direct_messages

  reportsCollectionId: "6959a194002105f44c03",
  playlistsCollectionId: "6959a8460009615dfbcb",
  storiesCollectionId: "69631b240013f47f559f",
  feedEventsCollectionId: "69728245001c3be9cfe9",

};

export const client = new Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
