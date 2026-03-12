import { importPKCS8, SignJWT } from "jose";

// Variables de entorno que debes configurar en Appwrite:
//   MUSICKIT_PRIVATE_KEY  → contenido del archivo .p8 de Apple (incluyendo -----BEGIN PRIVATE KEY-----)
//   MUSICKIT_KEY_ID       → Key ID de tu MusicKit key (e.g. "ABC1234567")
//   MUSICKIT_TEAM_ID      → Team ID de tu Apple Developer account (e.g. "TEAM123456")
//   TOKEN_TTL_DAYS        → (opcional) validez en días, máximo 180. Default: 180

const TOKEN_MAX_DAYS = 180;
const SECONDS_PER_DAY = 86400;

interface Context {
  req: {
    headers: Record<string, string>;
  };
  res: {
    json: (data: any, statusCode?: number) => object;
  };
  log: (message: any) => void;
  error: (message: any) => void;
}

export default async ({ req, res, log, error }: Context) => {
  // --- 1. Verificar que el llamador está autenticado ---
  // Appwrite inyecta este header cuando el usuario llama con su JWT.
  const userId = req.headers["x-appwrite-user-id"];
  if (!userId) {
    error("Llamada sin usuario autenticado.");
    return res.json({ error: "Unauthorized" }, 401);
  }

  // --- 2. Leer variables de entorno ---
  const privateKeyPem = process.env["MUSICKIT_PRIVATE_KEY"];
  const keyId = process.env["MUSICKIT_KEY_ID"];
  const teamId = process.env["MUSICKIT_TEAM_ID"];
  const ttlDaysRaw = process.env["TOKEN_TTL_DAYS"];

  if (!privateKeyPem || !keyId || !teamId) {
    error("Faltan variables de entorno: MUSICKIT_PRIVATE_KEY, MUSICKIT_KEY_ID o MUSICKIT_TEAM_ID.");
    return res.json({ error: "Server misconfiguration" }, 500);
  }

  const ttlDays = Math.min(
    TOKEN_MAX_DAYS,
    ttlDaysRaw ? parseInt(ttlDaysRaw, 10) : TOKEN_MAX_DAYS,
  );

  if (isNaN(ttlDays) || ttlDays <= 0) {
    error(`TOKEN_TTL_DAYS inválido: ${ttlDaysRaw}`);
    return res.json({ error: "Server misconfiguration" }, 500);
  }

  // --- 3. Firmar el JWT ---
  try {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + ttlDays * SECONDS_PER_DAY;

    const privateKey = await importPKCS8(privateKeyPem, "ES256");

    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: keyId })
      .setIssuedAt(now)
      .setIssuer(teamId)
      .setExpirationTime(exp)
      .sign(privateKey);

    log(`Token MusicKit generado para usuario ${userId}. Expira en ${ttlDays} días.`);

    return res.json({
      token,
      expiresAt: exp * 1000, // milisegundos, para Date.now() en el cliente
    });
  } catch (err: any) {
    error("Error firmando el JWT: " + err.message);
    return res.json({ error: "Token generation failed" }, 500);
  }
};
