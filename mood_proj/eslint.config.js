// ESLint Flat Config (ESLint v9+)
// Expo recommends eslint-config-expo's flat config for React Native / Expo projects.
const { defineConfig } = require("eslint/config");
const expoFlatConfig = require("eslint-config-expo/flat");

const configs = Array.isArray(expoFlatConfig) ? expoFlatConfig : [expoFlatConfig];

module.exports = defineConfig([
  ...configs,
  {
    ignores: ["node_modules/**", "dist/**", "build/**", ".expo/**"],
  },
]);
