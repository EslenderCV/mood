import { client } from "./config";

/**
 * react-native-appwrite exposes Functions in most versions, but TypeScript typings
 * can vary. We load it dynamically to avoid build-time breakage if the symbol
 * isn't present.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _functions: any | null = null;

export const getFunctionsClient = () => {
  if (_functions) return _functions;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("react-native-appwrite");
    const FunctionsCtor = mod?.Functions;
    if (!FunctionsCtor) return null;

    _functions = new FunctionsCtor(client);
    return _functions;
  } catch {
    return null;
  }
};
