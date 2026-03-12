export type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = typeof __DEV__ !== "undefined" && __DEV__;

const prefix = (level: LogLevel) => {
  const tag = level.toUpperCase();
  return `[Mood:${tag}]`;
};

const baseLog = (level: LogLevel, ...args: any[]) => {
  if (level === "debug" && !isDev) return;
  const p = prefix(level);
   
  const fn =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : level === "info"
          ? console.log
          : console.log;
  fn(p, ...args);
};

export const logger = {
  debug: (...args: any[]) => baseLog("debug", ...args),
  info: (...args: any[]) => baseLog("info", ...args),
  warn: (...args: any[]) => baseLog("warn", ...args),
  error: (...args: any[]) => baseLog("error", ...args),
};
