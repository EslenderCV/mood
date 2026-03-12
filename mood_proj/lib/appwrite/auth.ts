import {
  ID,
  OAuthProvider,
  AppwriteException,
  Query,
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

export async function requestPasswordResetCode(email: string): Promise<{
  userId: string;
  phrase?: string;
}> {
  const clean = email.trim().toLowerCase();
  if (!clean || !clean.includes("@")) throw new Error("Email inválido");

  // Appwrite requires a userId param. For existing users, the server ignores it and returns the real userId.
  const tmpUserId = ID.unique();

  const a: any = account as any;

let token: any;
// SDK signatures differ by version: try positional first, then object.
try {
  token = await a.createEmailToken(tmpUserId, clean, true);
} catch {
  try {
    token = await a.createEmailToken({
      userId: tmpUserId,
      email: clean,
      phrase: true,
    });
  } catch {
    token = await a.createEmailToken(tmpUserId, clean);
  }
}


  const userId = token?.userId ? String(token.userId) : "";
  if (!userId) throw new Error("No se pudo generar el código. Intenta de nuevo.");

  const phrase =
    typeof token?.phrase === "string" && token.phrase.trim().length
      ? token.phrase
      : undefined;

  return { userId, phrase };
}



async function resetPasswordViaFunction(params: {
  userId: string;
  secret: string;
  newPassword: string;
}): Promise<void> {
  const functionId = appwriteConfig.passwordReset?.functionId;

  if (!functionId || /^REPLACE/i.test(functionId)) {
    throw new Error(
      "La Function de reset no está configurada. Coloca tu Function ID en lib/appwrite/config.ts",
    );
  }

  // This Function expects: { userId, secret, newPassword }
  const payload = JSON.stringify({
    userId: params.userId,
    secret: params.secret,
    newPassword: params.newPassword,
  });

  // Raw REST call instead of SDK createExecution(): avoids SDK signature differences
  // and gives consistent error details.
  const endpoint = String(appwriteConfig.endpoint || "").replace(/\/+$/g, "");
  const url = `${endpoint}/functions/${functionId}/executions`;

  let res: any;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": appwriteConfig.projectId,
      },
      body: JSON.stringify({
        // Appwrite REST API expects this field to be named `body`.
        // We also keep `data` for compatibility with older SDK-style naming.
        body: payload,
        data: payload,
        async: false,
      }),
    });
  } catch (networkErr: any) {
    throw new Error(
      `No se pudo conectar con Appwrite para ejecutar la Function. Revisa tu conexión y el endpoint. (${String(
        networkErr?.message || networkErr,
      )})`,
    );
  }

  const text = await res.text();
  let execution: any = null;

  try {
    execution = text ? JSON.parse(text) : null;
  } catch {
    execution = null;
  }

  if (!res.ok) {
    const msg =
      execution?.message ||
      execution?.error ||
      execution?.details ||
      (typeof text === "string" && text.trim().length ? text : "");
    throw new Error(
      `No se pudo ejecutar la Function (${res.status}). ${
        msg || "Verifica Execute Access (Any) y que haya un deployment activo."
      }`,
    );
  }

  // Helpful logs to locate the execution in Appwrite Console → Functions → Executions
  // and to debug when the response body is not returned as expected by the API.
  if (execution?.$id) {
    const previewSource =
      execution?.responseBody ?? execution?.response ?? execution?.stdout ?? execution?.body ?? execution?.result;
    const preview =
      typeof previewSource === "string"
        ? previewSource.slice(0, 400)
        : previewSource
          ? JSON.stringify(previewSource).slice(0, 400)
          : "";

    // eslint-disable-next-line no-console
    console.log("[PasswordReset] Function execution:", {
      id: execution.$id,
      status: execution.status,
      responseStatusCode: execution?.responseStatusCode,
      preview,
      hasStderr: Boolean(execution?.stderr),
      hasErrors: Boolean(execution?.errors),
    });
  }

  const raw =
    execution?.responseBody ??
    execution?.response ??
    execution?.stdout ??
    execution?.body ??
    execution?.result ??
    "";

  let parsed: any = null;

  if (typeof raw === "string" && raw.trim().length) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  } else if (typeof raw === "object" && raw !== null) {
    parsed = raw;
  }

  if (parsed?.ok === true) return;

  const debugHint =
    parsed?.debug && typeof parsed.debug === "object"
      ? ` Debug: ${JSON.stringify(parsed.debug)}`
      : "";

  const fallbackDetails =
    (parsed?.message ? `${parsed.message}${debugHint}` : null) ||
    parsed?.error ||
    parsed?.details ||
    (typeof raw === "string" && raw.trim().length
      ? raw
      : execution?.stderr || execution?.errors || execution?.logs || execution?.status);

  const extraHint =
    "Verifica en Appwrite: Functions → tu Function → Deployments (uno ACTIVO/verde) y Settings → Execute Access = Any. " +
    "Además, asegúrate de que la Function tenga un API Key con scope users.write (Project → API Keys).";

  const message =
    typeof fallbackDetails === "string" && fallbackDetails.trim().length
      ? `No pudimos actualizar la contraseña. Detalles: ${fallbackDetails}. ${extraHint}`
      : `No pudimos actualizar la contraseña. ${extraHint}`;

  throw new Error(message);
}

export async function resetPasswordWithEmailCode(params: {
  userId: string;
  secret: string;
  newPassword: string;
  oldPassword?: string;
}): Promise<boolean> {
  const userId = params.userId?.trim();
  const secret = params.secret?.trim().replace(/[\s-]/g, "");
  const newPassword = params.newPassword;

  if (!userId) throw new Error("Falta userId");
  if (!secret) throw new Error("Falta el código");
  if (!newPassword || newPassword.length < 8)
    throw new Error("La contraseña debe tener al menos 8 caracteres.");

  const a: any = account as any;

const safeUpdatePassword = async (password: string, oldPassword?: string) => {
    // SDKs have slightly different signatures across versions.
    try {
      // Most SDKs: updatePassword(password, oldPassword?)
      return await a.updatePassword(password, oldPassword);
    } catch {
      // Newer SDKs (object-style)
      const payload: any = { password };
      if (oldPassword) payload.oldPassword = oldPassword;
      return await a.updatePassword(payload);
    }
  };

  // 2) Update password
  try {
    const functionId = appwriteConfig.passwordReset?.functionId;

    // Best option: use the server-side Function (it validates OTP and force-updates password).
    if (functionId && !/^REPLACE/i.test(functionId)) {
      await resetPasswordViaFunction({ userId, secret, newPassword });
      return true;
    }

    // Fallback A: try without oldPassword (works for accounts created via OAuth/Magic URL/invites).
    try {
      await safeUpdatePassword(newPassword);
      return true;
    } catch (eNoOld: any) {
      // Fallback B: migrated accounts where we know the temporary password.
      const old =
        (params.oldPassword && params.oldPassword.trim()) ||
        appwriteConfig.passwordReset?.migrationDefaultPassword ||
        "Mood.2026!";

      try {
        await safeUpdatePassword(newPassword, old);
        return true;
      } catch (eOld: any) {
        const msgOld = String(eOld?.message || "");
        if (/oldpassword|required|missing/i.test(msgOld) || /invalid/i.test(msgOld)) {
          throw new Error(
            "No pudimos actualizar la contraseña. Si tu cuenta no tiene la contraseña temporal, habilita la Function de reset en Appwrite para forzar el cambio."
          );
        }
        throw eOld;
      }
    }
  } finally {
    // no-op
  }
}
