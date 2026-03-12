import NetInfo from "@react-native-community/netinfo";
import { measure } from "@/src/observability/perf";
import { logger } from "@/src/observability/logger";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  if (!timeoutMs || timeoutMs <= 0) return promise;

  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

export type AppwriteCallOptions = {
  name: string;
  retries?: number;
  timeoutMs?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
};

const isRetryable = (e: any) => {
  const code = e?.code;
  const msg = String(e?.message || e || "");
  if (code === 401 || code === 403 || code === 404) return false;
  if (msg.toLowerCase().includes("unauthorized")) return false;

  const m = msg.toLowerCase();
  return (
    m.includes("network") ||
    m.includes("timeout") ||
    m.includes("econn") ||
    m.includes("socket") ||
    code === 0 ||
    code === 500 ||
    code === 503
  );
};

export async function appwriteCall<T>(opts: AppwriteCallOptions, fn: () => Promise<T>): Promise<T> {
  const { name, retries = 2, timeoutMs = 15000, minDelayMs = 250, maxDelayMs = 2000 } = opts;

  try {
    const net = await NetInfo.fetch();
    if (net && net.isConnected === false) {
      logger.warn("Offline: attempting request anyway", name);
    }
  } catch {
    // no-op
  }

  let attempt = 0;
  while (true) {
    try {
      return await measure(
        `appwrite:${name}`,
        () => withTimeout(fn(), timeoutMs),
        { attempt }
      );
    } catch (e: any) {
      const retry = attempt < retries && isRetryable(e);
      if (!retry) {
        logger.warn("Appwrite request failed", { name, attempt, error: e?.message || String(e) });
        throw e;
      }

      attempt += 1;
      const backoff =
        Math.min(maxDelayMs, minDelayMs * Math.pow(2, attempt - 1)) +
        Math.floor(Math.random() * 120);

      logger.debug("Appwrite retry", { name, attempt, backoff });
      await sleep(backoff);
    }
  }
}
