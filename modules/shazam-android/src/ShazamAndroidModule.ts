import { requireOptionalNativeModule } from 'expo-modules-core';
import type { MatchedItem } from './ShazamAndroid.types';

// El módulo se registra como 'ExpoShazamKit' en Android,
// igual que el módulo iOS de expo-shazamkit. En plataformas sin
// soporte nativo se usa el stub de abajo.
const ExpoShazamKit = requireOptionalNativeModule('ExpoShazamKit');

export default ExpoShazamKit ?? {
  isAvailable(): boolean { return false; },
  setDeveloperToken(_token: string): void {},
  startListening(): Promise<MatchedItem[]> { return Promise.resolve([]); },
  stopListening(): void {},
};
