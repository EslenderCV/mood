import { logger } from "./logger";
import { recordCrash } from "./crashLoop";

// Installs lightweight global handlers. Safe to call multiple times.
export const installGlobalHandlers = () => {
  try {
    const ErrorUtilsAny = (globalThis as any).ErrorUtils;
    if (ErrorUtilsAny && typeof ErrorUtilsAny.getGlobalHandler === "function" && typeof ErrorUtilsAny.setGlobalHandler === "function") {
      const prev = ErrorUtilsAny.getGlobalHandler();
      ErrorUtilsAny.setGlobalHandler((err: any, isFatal: boolean) => {
        logger.error("UnhandledError", { isFatal, message: err?.message, stack: err?.stack });
        // Best-effort crash-loop tracking (do not block the handler)
        try {
          void recordCrash({ isFatal, message: err?.message });
        } catch {
          // no-op
        }
        try {
          prev?.(err, isFatal);
        } catch {
          // no-op
        }
      });
    }
  } catch {
    // no-op
  }

  // Unhandled promise rejections (where supported)
  try {
    const g: any = globalThis as any;
    if (typeof g.addEventListener === "function") {
      g.addEventListener("unhandledrejection", (event: any) => {
        logger.error("UnhandledRejection", { reason: event?.reason });
      });
    }
  } catch {
    // no-op
  }
};
