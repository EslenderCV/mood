import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFunctionsClient } from "./functionsClient";

// Configura el Function ID en appwriteConfig o usa la variable de entorno.
// Appwrite Console → Functions → get_shazam_token → Overview → Function ID
const FUNCTION_ID =
  process.env["EXPO_PUBLIC_APPWRITE_SHAZAM_TOKEN_FUNCTION_ID"] ?? "";

const CACHE_KEY = "shazam_token_cache";

// Renovar el token si expira en menos de 24 horas.
const RENEW_THRESHOLD_MS = 24 * 60 * 60 * 1000;

interface TokenCache {
  token: string;
  expiresAt: number; // ms (Date.now())
}

// Cache en memoria para evitar lecturas a AsyncStorage en cada reconocimiento.
let memCache: TokenCache | null = null;

function isValid(cache: TokenCache): boolean {
  return cache.expiresAt - Date.now() > RENEW_THRESHOLD_MS;
}

async function fetchFromServer(): Promise<TokenCache> {
  const functions = getFunctionsClient();
  if (!functions) throw new Error("Appwrite Functions no disponible.");
  if (!FUNCTION_ID) throw new Error("EXPO_PUBLIC_APPWRITE_SHAZAM_TOKEN_FUNCTION_ID no configurado.");

  const result = await functions.createExecution(FUNCTION_ID, "", false);

  if (result.responseStatusCode !== 200) {
    throw new Error(`Error del servidor: ${result.responseStatusCode}`);
  }

  const body = JSON.parse(result.responseBody) as { token?: string; expiresAt?: number; error?: string };

  if (!body.token || !body.expiresAt) {
    throw new Error(body.error ?? "Respuesta inválida del servidor.");
  }

  return { token: body.token, expiresAt: body.expiresAt };
}

/**
 * Devuelve un token MusicKit válido para ShazamKit.
 * Usa caché en memoria y AsyncStorage para evitar llamadas innecesarias al servidor.
 * El token dura hasta 180 días; solo se renueva cuando está a menos de 24h de expirar.
 */
export async function getMusicKitToken(): Promise<string> {
  // 1. Caché en memoria (mismo ciclo de vida de la app)
  if (memCache && isValid(memCache)) {
    return memCache.token;
  }

  // 2. Caché persistente (sobrevive reinicios de la app)
  try {
    const stored = await AsyncStorage.getItem(CACHE_KEY);
    if (stored) {
      const parsed: TokenCache = JSON.parse(stored);
      if (isValid(parsed)) {
        memCache = parsed;
        return parsed.token;
      }
    }
  } catch {
    // Si AsyncStorage falla no bloqueamos, simplemente pedimos uno nuevo.
  }

  // 3. Pedir al servidor
  const fresh = await fetchFromServer();
  memCache = fresh;

  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
  } catch {
    // No crítico: el token de memoria se usará durante esta sesión.
  }

  return fresh.token;
}

/** Limpia el caché (útil al cerrar sesión). */
export async function clearMusicKitTokenCache(): Promise<void> {
  memCache = null;
  await AsyncStorage.removeItem(CACHE_KEY);
}
