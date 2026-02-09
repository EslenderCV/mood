import {
  ID,
  OAuthProvider,
  AppwriteException,
  Query,
  Functions,
} from "react-native-appwrite";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { account, databases, appwriteConfig, client } from "./config";
import { appwriteCall } from "./request";

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
    // Fast, boot-safe auth lookup. Never block startup on long network stalls.
    const currentAccount = await appwriteCall(
      { name: "auth.account.get", retries: 1, timeoutMs: 6500 },
      () => account.get(),
    );

    const currentUser = await appwriteCall(
      { name: "auth.users.byAccId", retries: 1, timeoutMs: 6500 },
      () =>
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.usersCollectionId,
          [Query.equal("accId", currentAccount.$id)],
        ),
    );

    if (!currentUser || currentUser.documents.length === 0) return null;

    const userData = currentUser.documents[0];

    if (userData.isBanned) {
      try {
        await signOut();
      } catch (e) {}
      throw new Error("Account suspended by admin.");
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
// -----------------------------
// Password reset (no deep-link)
// -----------------------------

/**
 * We avoid Appwrite's `createRecovery(url)` because it requires a valid, whitelisted
 * URL (domain/hostname) in Appwrite platforms. Since we don't have a domain and we
 * want the reset fully in-app, we use Email OTP:
 *  1) Send OTP code to the user's email
 *  2) User enters the code in-app
 *  3) Create a token session
 *  4) Update password
 */

// NOTE: Temporary migration password used after DB migration.
// Keep this only for the migration window and rotate/remove ASAP.
export const MIGRATION_DEFAULT_PASSWORD = "Mood.2026!";

export async function requestPasswordResetCode(email: string) {
  const a: any = account as any;
  const userId = ID.unique();
  // Support both SDK styles (positional vs object) depending on version.
  // We enable the security phrase for better user safety.
  try {
    return await a.createEmailToken(userId, email, true);
  } catch (e) {
    return await a.createEmailToken({ userId, email, phrase: true });
  }
}

export async function resetPasswordWithEmailCode(
  userId: string,
  secret: string,
  newPassword: string,
) {
  const a: any = account as any;

  // Ensure a clean auth state before creating a token session.
  try {
    await account.deleteSession("current");
  } catch (e) {}

  // 1) Create token session using OTP code (secret)
  try {
    await a.createSession(userId, secret);
  } catch (e) {
    await a.createSession({ userId, secret });
  }

  // 2) Update password
  // IMPORTANT:
  // When the user is authenticated via Email OTP / Magic URL, Appwrite allows
  // updating the password *without* providing oldPassword.
  // This is exactly what we need for an in-app reset flow.
  let updated = false;

  // 2.1) Preferred: try without oldPassword (works for OTP/Magic URL sessions)
  try {
    await a.updatePassword(newPassword);
    updated = true;
  } catch (e) {
    // Some SDKs use object-style or require explicit undefined
    try {
      await a.updatePassword({ password: newPassword });
      updated = true;
    } catch (e2) {
      updated = false;
    }
  }

  // 2.2) Migration-only fallback: if the account is still using the default
  // migration password, try validating with it.
  if (!updated) {
    try {
      await a.updatePassword(newPassword, MIGRATION_DEFAULT_PASSWORD);
      updated = true;
    } catch (e) {
      try {
        await a.updatePassword({
          password: newPassword,
          oldPassword: MIGRATION_DEFAULT_PASSWORD,
        });
        updated = true;
      } catch (e2) {
        updated = false;
      }
    }
  }

  // 2.3) Optional: Appwrite Function fallback (admin Users API)
  // Only needed if your server enforces oldPassword in your setup.
  if (!updated) {
    const fnId = (appwriteConfig.passwordReset?.functionId || "").trim();
    if (fnId) {
      try {
        const functions = new Functions(client);
        const execution: any = await functions.createExecution(
          fnId,
          JSON.stringify({ password: newPassword }),
          false,
        );

        let parsed: any = null;
        try {
          parsed =
            typeof execution?.responseBody === "string"
              ? JSON.parse(execution.responseBody)
              : execution?.responseBody;
        } catch (_) {
          parsed = null;
        }

        if (parsed?.ok === true) {
          updated = true;
        } else {
          throw new Error(
            parsed?.message ||
              parsed?.error ||
              "No se pudo actualizar la contraseña (Function).",
          );
        }
      } catch (e) {
        updated = false;
      }
    }
  }

  if (!updated) {
    throw new Error(
      "No se pudo actualizar la contraseña. Intenta de nuevo o revisa la configuración de autenticación en Appwrite (Email OTP/Magic URL).",
    );
  }

  // 3) Log out token session to force login with the new password
  try {
    await account.deleteSession("current");
  } catch (e) {}

  return true;
}
