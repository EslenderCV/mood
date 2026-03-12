import { appwriteConfig } from "./config";

const readEnv = (key: string): string | undefined => {
  try {
    // Expo (and Metro) injects EXPO_PUBLIC_* at build time.
    // In bare RN, process may be undefined, so guard it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p: any = typeof process !== "undefined" ? (process as any) : undefined;
    const v = p?.env?.[key];
    return typeof v === "string" ? v : undefined;
  } catch {
    return undefined;
  }
};

export type ServerHomeFeedSettings = {
  enabled: boolean;
  feedFunctionId: string;
  feedEventsFunctionId: string;
};

export const getServerHomeFeedSettings = (): ServerHomeFeedSettings => {
  const defaults = appwriteConfig.serverHomeFeed || {
    enabled: false,
    feedFunctionId: "",
    feedEventsFunctionId: "",
  };

  const enabledEnv = readEnv("EXPO_PUBLIC_SERVER_HOME_FEED");
  const enabled =
    enabledEnv === undefined
      ? !!defaults.enabled
      : enabledEnv === "1" || enabledEnv.toLowerCase() === "true";

  const feedFunctionId =
    readEnv("EXPO_PUBLIC_APPWRITE_FEED_FUNCTION_ID") || defaults.feedFunctionId || "";
  const feedEventsFunctionId =
    readEnv("EXPO_PUBLIC_APPWRITE_FEED_EVENTS_FUNCTION_ID") ||
    defaults.feedEventsFunctionId ||
    "";

  return { enabled, feedFunctionId, feedEventsFunctionId };
};

export const isServerHomeFeedEnabled = (): boolean => {
  const s = getServerHomeFeedSettings();
  return !!s.enabled && !!s.feedFunctionId;
};
