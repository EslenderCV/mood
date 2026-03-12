import { Client, Users } from "node-appwrite";

/**
 * Appwrite Function: password-reset
 *
 * Lets an authenticated user set a new password without knowing the old one.
 * Call from the app ONLY after the user has authenticated (e.g., via Email OTP).
 *
 * Expected request body JSON:
 *   { "password": "NewPassword123!" }
 */
export default async ({ req, res, log, error }) => {
  try {
    const vars = req?.variables || {};

    const endpoint =
      vars.APPWRITE_FUNCTION_ENDPOINT ||
      vars.APPWRITE_ENDPOINT ||
      process.env.APPWRITE_FUNCTION_ENDPOINT ||
      process.env.APPWRITE_ENDPOINT;

    const projectId =
      vars.APPWRITE_FUNCTION_PROJECT_ID ||
      process.env.APPWRITE_FUNCTION_PROJECT_ID ||
      process.env.APPWRITE_PROJECT_ID;

    const apiKey =
      vars.APPWRITE_FUNCTION_API_KEY ||
      process.env.APPWRITE_FUNCTION_API_KEY ||
      process.env.APPWRITE_API_KEY;

    if (!endpoint || !projectId || !apiKey) {
      return res.json({
        ok: false,
        message:
          "Missing env vars. Set APPWRITE_FUNCTION_ENDPOINT, APPWRITE_FUNCTION_PROJECT_ID and APPWRITE_FUNCTION_API_KEY on the Function.",
      });
    }

    // Appwrite injects the caller context when the execution is triggered by a client.
    const callerUserId =
      vars.APPWRITE_FUNCTION_USER_ID ||
      req?.headers?.["x-appwrite-user-id"] ||
      req?.headers?.["X-Appwrite-User-Id"];

    if (!callerUserId) {
      return res.json({ ok: false, message: "Unauthorized" });
    }

    let body = {};
    try {
      body = req?.body ? JSON.parse(req.body) : {};
    } catch {
      body = {};
    }

    const password = body?.password;
    if (typeof password !== "string" || password.trim().length < 8) {
      return res.json({
        ok: false,
        message: "Invalid password. Minimum length is 8 characters.",
      });
    }

    const client = new Client();
    client.setEndpoint(endpoint).setProject(projectId).setKey(apiKey);

    const users = new Users(client);
    await users.updatePassword(callerUserId, password.trim());

    log(`Password updated for user ${callerUserId}`);
    return res.json({ ok: true });
  } catch (err) {
    error(err?.message || String(err));
    return res.json({
      ok: false,
      message: err?.message || "Unknown error",
    });
  }
};
