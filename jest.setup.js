/**
 * Jest setup for native module mocks.
 *
 * This project runs tests with `jest` (preset: jest-expo).
 * Some native modules (like AsyncStorage) are not available in the Jest runtime,
 * so we provide official mocks to prevent "NativeModule: ... is null" crashes.
 */

// Official mock recommended by @react-native-async-storage/async-storage docs.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
