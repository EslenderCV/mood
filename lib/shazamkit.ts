/**
 * Wrapper unificado de ShazamKit para iOS y Android.
 *
 * iOS     → expo-shazamkit  (nativo Apple, sin token explícito)
 * Android → shazam-android  (SDK de Apple para Android, requiere Developer Token)
 */
import { Platform } from "react-native";
import { getMusicKitToken } from "@/lib/appwrite/shazamToken";

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
    const { default: ShazamAndroid } = await import("shazam-android");
    return ShazamAndroid.isAvailable();
  }
  return false;
}

export async function startShazamListening(): Promise<ShazamMatch[]> {
  if (Platform.OS === "ios") {
    const mod = await import("expo-shazamkit");
    return mod.startListening() as unknown as Promise<ShazamMatch[]>;
  }

  if (Platform.OS === "android") {
    const { default: ShazamAndroid } = await import("shazam-android");
    const token = await getMusicKitToken();
    ShazamAndroid.setDeveloperToken(token);
    return ShazamAndroid.startListening() as Promise<ShazamMatch[]>;
  }

  return [];
}

export function stopShazamListening(): void {
  if (Platform.OS === "ios") {
    import("expo-shazamkit").then((mod) => mod.stopListening()).catch(() => {});
  } else if (Platform.OS === "android") {
    import("shazam-android").then(({ default: ShazamAndroid }) => ShazamAndroid.stopListening()).catch(() => {});
  }
}
