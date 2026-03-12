import { logger } from "./logger";
import { isDevPerfLogsEnabled } from "./runtime";

export const now = (): number => {
  const p = (globalThis as any)?.performance;
  if (p && typeof p.now === "function") return p.now();
  return Date.now();
};

export type Span = {
  name: string;
  startMs: number;
  end: (extra?: Record<string, unknown>) => void;
};

export const startSpan = (
  name: string,
  meta?: Record<string, unknown>,
): Span => {
  const startMs = now();
  return {
    name,
    startMs,
    end: (extra) => {
      const dur = now() - startMs;
      if (!isDevPerfLogsEnabled()) return;
      logger.debug("[Perf]", name, `${Math.round(dur)}ms`, {
        ...(meta || {}),
        ...(extra || {}),
      });
    },
  };
};

export const measure = async <T>(
  name: string,
  fn: () => Promise<T>,
  meta?: Record<string, unknown>,
): Promise<T> => {
  const span = startSpan(name, meta);
  try {
    const res = await fn();
    span.end({ ok: true });
    return res;
  } catch (e: any) {
    span.end({ ok: false, error: e?.message || String(e) });
    throw e;
  }
};
