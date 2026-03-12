/**
 * Wrapper unificado de ShazamKit para iOS y Android.
 *
 * iOS  → expo-shazamkit (sin token, usa entitlement del app)
 * Android → módulo local shazam-android (requiere Developer Token de MusicKit)
 */
import { Platform } from "react-native";
import type { ShazamMatch as AndroidShazamMatch } from "shazam-android";

export type ShazamMatch = {
  title?: string | null;
  artist?: string | null;
  artworkURL?: string | null;
  appleMusicID?: string | number | null;
  shazamID?: string | number | null;
};

export async function isShazamAvailable(): Promise<boolean> {
  if (Platform.OS === "ios") {
    const mod = await import("expo-shazamkit");
    return mod.isAvailable();
  }
  if (Platform.OS === "android") {
    const mod = await import("shazam-android");
    return mod.isAvailable();
  }
  return false;
}

/**
 * Inicia el reconocimiento de música.
 *
 * En Android el token se pasa explícitamente porque el SDK de Apple lo requiere.
 * El caller debe obtenerlo con getMusicKitToken() de lib/appwrite/shazamToken.ts.
 */
export async function startShazamListening(token?: string): Promise<ShazamMatch[]> {
  if (Platform.OS === "ios") {
    const mod = await import("expo-shazamkit");
    return (mod.startListening() as unknown as Promise<ShazamMatch[]>);
  }

  if (Platform.OS === "android") {
    if (!token) throw new Error("Se requiere el Developer Token en Android.");
    const mod = await import("shazam-android");
    const results: AndroidShazamMatch[] = await mod.startListening(token);
    return results as ShazamMatch[];
  }

  return [];
}

export async function stopShazamListening(): Promise<void> {
  if (Platform.OS === "ios") {
    const mod = await import("expo-shazamkit");
    mod.stopListening();
  } else if (Platform.OS === "android") {
    const mod = await import("shazam-android");
    mod.stopListening();
  }
}
