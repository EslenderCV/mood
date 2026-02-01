import {
  ID,
  OAuthProvider,
  AppwriteException,
  Query,
} from "react-native-appwrite";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { account, databases, appwriteConfig } from "./config";

// Almacén temporal
export const authStore = { secret: "" };

export const signInWithOAuth = async (provider: "google" | "apple") => {
  try {
    try {
      await account.deleteSession("current");
    } catch (e) {}

    const providerEnum =
      provider === "google" ? OAuthProvider.Google : OAuthProvider.Apple;

    const redirectUri = "appwrite-callback-697d0db30009f4ca4dd6://";

    const authUrl = await account.createOAuth2Token(
      providerEnum,
      redirectUri,
      redirectUri,
    );

    if (!authUrl) throw new Error("Error al generar token OAuth2");

    const result = await WebBrowser.openAuthSessionAsync(
      authUrl.toString(),
      redirectUri,
    );

    if (result.type === "success" && result.url) {
      const parsed = Linking.parse(result.url);

      const secret = Array.isArray(parsed.queryParams?.secret)
        ? parsed.queryParams?.secret[0]
        : parsed.queryParams?.secret;

      const userId = Array.isArray(parsed.queryParams?.userId)
        ? parsed.queryParams?.userId[0]
        : parsed.queryParams?.userId;

      if (secret && userId) {
        authStore.secret = secret;

        try {
          await account.createSession(userId, secret);
        } catch (sessionError: any) {
          if (
            sessionError.message?.includes("active") ||
            sessionError.code === 409
          ) {
            console.log("Sesión ya activa, continuando...");
            return secret;
          }
          throw sessionError;
        }
        return secret;
      }
    }

    if (result.type === "cancel" || result.type === "dismiss") {
      throw new Error("Cancelado por el usuario");
    }

    return null;
  } catch (error: any) {
    console.error("OAuth failed:", error);
    throw new Error(error.message);
  }
};

export const signOut = async () => {
  try {
    await account.deleteSession("current");
    return true;
  } catch (error: any) {
    return true;
  }
};

export const signInn = async (email: string, password: string) => {
  try {
    const session = await account.createEmailPasswordSession(email, password);
    if (session.secret) authStore.secret = session.secret;
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
        const newSession = await account.createEmailPasswordSession(
          email,
          password,
        );
        if (newSession.secret) authStore.secret = newSession.secret;
        return newSession;
      } catch (retryError) {
        throw new Error((retryError as AppwriteException).message);
      }
    }
    throw new Error(error.message);
  }
};

export const createUser = async (
  email: string,
  password: string,
  name: string,
  username: string,
) => {
  try {
    const newAccount = await account.create(ID.unique(), email, password, name);
    if (!newAccount) throw new Error("Error creating account");

    const avatarUrl = `${
      appwriteConfig.endpoint
    }/avatars/initials?name=${encodeURIComponent(name)}&project=${
      appwriteConfig.projectId
    }`;

    const session = await signInn(email, password);

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
        preferredPlatform: "spotify",
        allowTags: true,
        blockedUsers: [],
        isBanned: false,
        isPrivate: false,
      },
    );

    return { user: newUser, session: session };
  } catch (err) {
    throw new Error((err as AppwriteException).message);
  }
};

export const getCurrentUser = async () => {
  try {
    const currentAccount = await account.get();

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal("accId", currentAccount.$id)],
    );

    if (!currentUser || currentUser.documents.length === 0) return null;

    const userData = currentUser.documents[0];

    if (userData.isBanned) {
      try {
        await signOut();
      } catch (e) {}
      throw new Error("Cuenta suspendida por administración.");
    }

    return userData;
  } catch (error: any) {
    if (error.code === 401 || error.message?.includes("missing scopes")) {
      return null;
    }
    console.log("Error getCurrentUser:", error);
    return null;
  }
};

export async function getUserSessions() {
  try {
    const sessions = await account.listSessions();
    return sessions.sessions;
  } catch (error: any) {
    return [];
  }
}
export async function deleteSession(sessionId: string) {
  try {
    await account.deleteSession(sessionId);
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
}
export async function deleteAllSessions() {
  try {
    const sessions = await account.listSessions();
    await Promise.all(
      sessions.sessions.map((s) => account.deleteSession(s.$id)),
    );
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
}
