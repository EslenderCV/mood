import { NativeModulesProxy } from "expo-modules-core";

// Módulo nativo Android registrado como "ShazamAndroid"
const ShazamAndroidNative = NativeModulesProxy.ShazamAndroid;

export type ShazamMatch = {
  title?: string | null;
  artist?: string | null;
  artworkURL?: string | null;
  appleMusicID?: string | null;
  shazamID?: string | null;
};

export function isAvailable(): boolean {
  return ShazamAndroidNative?.isAvailable?.() ?? false;
}

/**
 * Inicia el reconocimiento de música en Android.
 * @param token Developer Token de MusicKit (JWT firmado por el servidor).
 * @returns Array de coincidencias encontradas.
 */
export function startListening(token: string): Promise<ShazamMatch[]> {
  return ShazamAndroidNative.startListening(token);
}

export function stopListening(): void {
  ShazamAndroidNative?.stopListening?.();
}
