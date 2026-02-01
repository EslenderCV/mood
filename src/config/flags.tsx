import AsyncStorage from "@react-native-async-storage/async-storage";
import { setDevPerfLogsEnabled } from "@/src/observability/runtime";
import { getSafeModeUntilMs, isSafeModeActive } from "@/src/observability/crashLoop";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type FlagKey =
  | "brainRankingHome"
  | "brainRankingExplore"
  | "audioPrefetch"
  | "shimmerSkeleton"
  | "fadeTransitions"
  | "devPerfLogs";

export type Flags = Record<FlagKey, boolean>;

export const FLAGS_STORAGE_KEY = "@mood/flags_v1" as const;

export const FLAG_DEFAULTS: Flags = {
  brainRankingHome: true,
  brainRankingExplore: true,
  audioPrefetch: true,
  shimmerSkeleton: true,
  fadeTransitions: true,
  devPerfLogs: false,
};

export type FlagsOverrides = Partial<Flags>;

export const coerceOverrides = (raw: unknown): FlagsOverrides => {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const out: FlagsOverrides = {};

  (Object.keys(FLAG_DEFAULTS) as FlagKey[]).forEach((k) => {
    const v = obj[k];
    if (typeof v === "boolean") out[k] = v;
  });

  return out;
};

const mergeFlags = (overrides: FlagsOverrides | null | undefined): Flags => {
  return {
    ...FLAG_DEFAULTS,
    ...(overrides || {}),
  };
};

type FlagsContextValue = {
  flags: Flags;
  loaded: boolean;
  safeModeActive: boolean;
  safeModeUntilMs: number | null;
  setFlag: (key: FlagKey, value: boolean) => void;
  resetFlags: () => void;
};

const FlagsContext = createContext<FlagsContextValue | null>(null);

export const FlagsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [flags, setFlags] = useState<Flags>(FLAG_DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [safeModeActive, setSafeModeActive] = useState(false);
  const [safeModeUntilMs, setSafeModeUntilMs] = useState<number | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(FLAGS_STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as unknown) : null;
        let overrides = coerceOverrides(parsed);

        // Crash-loop safe mode: temporarily disable heavier features so the app can boot.
        const isSafe = await isSafeModeActive();
        const until = await getSafeModeUntilMs();
        if (isMounted.current) {
          setSafeModeActive(isSafe);
          setSafeModeUntilMs(until);
        }

        if (isSafe) {
          overrides = {
            ...overrides,
            // Prioritize bootability & responsiveness.
            shimmerSkeleton: false,
            fadeTransitions: false,
            audioPrefetch: false,
            brainRankingHome: false,
            brainRankingExplore: false,
          };
        }

        if (isMounted.current) setFlags(mergeFlags(overrides));
      } catch {
        if (isMounted.current) setFlags(FLAG_DEFAULTS);
      } finally {
        if (isMounted.current) setLoaded(true);
      }
    };
    load();
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Runtime toggles (dev-only): allows enabling perf spans without code changes.
    setDevPerfLogsEnabled(!!flags.devPerfLogs);
  }, [flags.devPerfLogs]);

  const persist = useCallback(async (next: Flags) => {
    try {
      // Only store deltas from defaults.
      const overrides: FlagsOverrides = {};
      (Object.keys(FLAG_DEFAULTS) as FlagKey[]).forEach((k) => {
        if (next[k] !== FLAG_DEFAULTS[k]) overrides[k] = next[k];
      });
      if (Object.keys(overrides).length === 0) {
        await AsyncStorage.removeItem(FLAGS_STORAGE_KEY);
      } else {
        await AsyncStorage.setItem(FLAGS_STORAGE_KEY, JSON.stringify(overrides));
      }
    } catch {
      // no-op
    }
  }, []);

  const setFlag = useCallback(
    (key: FlagKey, value: boolean) => {
      setFlags((prev) => {
        const next = { ...prev, [key]: value };
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const resetFlags = useCallback(() => {
    setFlags(() => {
      void AsyncStorage.removeItem(FLAGS_STORAGE_KEY);
      return FLAG_DEFAULTS;
    });
  }, []);

  const value = useMemo(
    () => ({ flags, loaded, safeModeActive, safeModeUntilMs, setFlag, resetFlags }),
    [flags, loaded, safeModeActive, safeModeUntilMs, setFlag, resetFlags],
  );

  return <FlagsContext.Provider value={value}>{children}</FlagsContext.Provider>;
};

export const useFlags = (): FlagsContextValue => {
  const ctx = useContext(FlagsContext);
  if (!ctx) {
    // Fail soft: app still runs even if provider wasn't mounted.
    return {
      flags: FLAG_DEFAULTS,
      loaded: true,
      safeModeActive: false,
      safeModeUntilMs: null,
      setFlag: () => {},
      resetFlags: () => {},
    };
  }
  return ctx;
};

export const useFlag = (key: FlagKey): boolean => {
  const { flags } = useFlags();
  return flags[key];
};
