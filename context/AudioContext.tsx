import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useSyncExternalStore,
  useCallback,
  useMemo,
} from "react";
import { Audio, AVPlaybackStatus } from "expo-av";
import { useFlag } from "@/src/config/flags";
// Asegúrate de que estas rutas de importación existan en tu proyecto, si no, coméntalas
import { BrainEmitter } from "@/src/brain/signals/emitters";
import { AudioEventType } from "@/src/brain/signals/AudioSignals";

export interface TrackMetadata {
  title?: string;
  artist?: string;
  cover?: string;
  features?: { energy: number; valence: number; bpm: number };
}

type AudioProgressSnapshot = {
  positionMillis: number;
  durationMillis: number;
};

const createAudioProgressStore = () => {
  let snapshot: AudioProgressSnapshot = {
    positionMillis: 0,
    durationMillis: 0,
  };
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => snapshot,
    setSnapshot: (next: AudioProgressSnapshot) => {
      snapshot = next;
      listeners.forEach((l) => l());
    },
    reset: () => {
      snapshot = { positionMillis: 0, durationMillis: 0 };
      listeners.forEach((l) => l());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

const audioProgressStore = createAudioProgressStore();

/**
 * Hook ultra-ligero: solo re-renderiza el componente que lo usa
 * (NO vuelve a renderizar toda la app como un Context con positionMillis).
 */
export const useAudioProgress = () =>
  useSyncExternalStore(
    audioProgressStore.subscribe,
    audioProgressStore.getSnapshot,
    audioProgressStore.getSnapshot,
  );

// Exponemos acciones globales sin suscribirse al Context (evita re-renders en pantallas pesadas).
export const AudioActions = {
  playTrack: async (_id: string, _uri: string, _meta?: TrackMetadata) => {},
  pauseTrack: async () => {},
  resumeTrack: async () => {},
  stopTrack: async () => {},
  prefetchTrack: (_uri: string) => {},
  /** Snapshot ultra-ligero (sin subscribirse al Context). */
  getState: () => ({
    currentPlayingId: null as string | null,
    activeTrackMetadata: null as TrackMetadata | null,
    isPlaying: false,
    isLoading: false,
    isBuffering: false,
  }),
};

/**
 * expo-av ha cambiado varias veces la API/typing de interruption modes.
 * En algunos SDKs existen constantes (Audio.INTERRUPTION_MODE_*),
 * en otros existen enums (Audio.InterruptionModeIOS/Android).
 *
 * Para evitar errores de TypeScript y mantener compatibilidad, resolvemos
 * dinámicamente con fallbacks seguros.
 */
const getInterruptionModeIOS = (): number => {
  const anyAudio = Audio as any;
  return (
    anyAudio?.InterruptionModeIOS?.DoNotMix ??
    anyAudio?.INTERRUPTION_MODE_IOS_DO_NOT_MIX ??
    1
  );
};

const getInterruptionModeAndroid = (): number => {
  const anyAudio = Audio as any;
  return (
    anyAudio?.InterruptionModeAndroid?.DoNotMix ??
    anyAudio?.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX ??
    1
  );
};

const PLAYBACK_AUDIO_MODE = {
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,
  staysActiveInBackground: false,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
  interruptionModeIOS: getInterruptionModeIOS(),
  interruptionModeAndroid: getInterruptionModeAndroid(),
} as const;

interface AudioContextType {
  currentPlayingId: string | null;
  activeTrackMetadata: TrackMetadata | null;
  isPlaying: boolean;

  /**
   * isLoading: preparando / creando el sound (primer play o cambio de track)
   * isBuffering: ya está cargado, pero la red está bufferizando
   */
  isLoading: boolean;
  isBuffering: boolean;

  playTrack: (id: string, uri: string, meta?: TrackMetadata) => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
  stopTrack: () => Promise<void>;
  setPlayingId: (id: string | null) => void;

  /** Prefetch ultraligero del siguiente preview (para "tap-to-play" instantáneo). */
  prefetchTrack: (uri: string) => void;
}

const AudioContext = createContext<AudioContextType>({
  currentPlayingId: null,
  activeTrackMetadata: null,
  isPlaying: false,
  isLoading: false,
  isBuffering: false,
  playTrack: async () => {},
  pauseTrack: async () => {},
  resumeTrack: async () => {},
  stopTrack: async () => {},
  setPlayingId: () => {},
  prefetchTrack: () => {},
});

export const useAudioContext = () => useContext(AudioContext);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [activeTrackMetadata, setActiveTrackMetadata] =
    useState<TrackMetadata | null>(null);
  const enablePrefetch = useFlag("audioPrefetch");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  const enablePrefetchRef = useRef<boolean>(enablePrefetch);
  useEffect(() => {
    enablePrefetchRef.current = enablePrefetch;
  }, [enablePrefetch]);

  // Mantener metadatos actuales en un ref para callbacks estables (evita loops con exhaustive-deps).
  const activeTrackMetadataRef = useRef<TrackMetadata | null>(null);
  useEffect(() => {
    activeTrackMetadataRef.current = activeTrackMetadata;
  }, [activeTrackMetadata]);

  // IMPORTANT: el callback de expo-av queda "capturado" cuando se asigna.
  // Para evitar estados stale (ej. loading que nunca se apaga), usamos un ref.
  const isLoadingRef = useRef<boolean>(false);
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const soundRef = useRef<Audio.Sound | null>(null);

  // 🔒 Serializador + cancelación de operaciones (evita race conditions al navegar/tapar rápido)
  const opIdRef = useRef<number>(0);
  const lockRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef<boolean>(true);

  const withLock = useCallback(async (fn: () => Promise<any>) => {
    const run = lockRef.current.then(fn, fn);
    lockRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, []);

  const safeStopAndUnload = useCallback(async (s: Audio.Sound | null) => {
    if (!s) return;
    try {
      const st: any = await s.getStatusAsync();
      if (st?.isLoaded) {
        try {
          if (st.isPlaying) await s.stopAsync();
        } catch {}
      }
    } catch {}
    try {
      await s.unloadAsync();
    } catch {}
  }, []);

  // Prefetch de 1 track (suficiente para UX tipo Instagram sin saturar RAM/red)
  const preloadedRef = useRef<{ uri: string; sound: Audio.Sound } | null>(null);
  const prefetchInFlightRef = useRef<string | null>(null);
  const prefetchedAtRef = useRef<Map<string, number>>(new Map());

  const currentTrackIdRef = useRef<string | null>(null);
  const currentUriRef = useRef<string | null>(null);

  const lastIsPlayingRef = useRef<boolean>(false);
  const lastIsBufferingRef = useRef<boolean>(false);
  const lastProgressEmitMsRef = useRef<number>(0);
  const lastKnownPositionRef = useRef<number>(0);
  const lastKnownDurationRef = useRef<number>(0);

  // Configuración inicial (audio focus / session)
  useEffect(() => {
    mountedRef.current = true;
    Audio.setAudioModeAsync(PLAYBACK_AUDIO_MODE).catch(() => {});
    return () => {
      mountedRef.current = false;
      opIdRef.current++;

      // Cleanup hard (evita leaks en hot reload / navegación)
      const cleanup = async () => {
        try {
          if (soundRef.current) {
            await safeStopAndUnload(soundRef.current);
          }
        } catch {}
        try {
          if (preloadedRef.current?.sound) {
            await safeStopAndUnload(preloadedRef.current.sound);
          }
        } catch {}
        soundRef.current = null;
        preloadedRef.current = null;
      };
      cleanup().catch(() => {});
    };
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if ((status as any).error) {
        console.error(`Audio Error: ${(status as any).error}`);
      }
      // Reset flags en error
      if (lastIsBufferingRef.current !== false) {
        lastIsBufferingRef.current = false;
        setIsBuffering(false);
      }
      setIsLoading(false);
      isLoadingRef.current = false;
      return;
    }

    // Buffering (no confundir con "loading")
    if (lastIsBufferingRef.current !== (status as any).isBuffering) {
      lastIsBufferingRef.current = (status as any).isBuffering;
      setIsBuffering((status as any).isBuffering);
    }

    // "Loading" = creando/preparando el Sound (primer play o cambio de track).
    // Si ya empezó a reproducir o hay progreso, apagamos loading aunque siga bufferizando.
    if (isLoadingRef.current) {
      const hasStarted =
        (status as any).isPlaying ||
        (status as any).positionMillis > 0 ||
        ((status as any).durationMillis ?? 0) > 0;

      if (hasStarted || !(status as any).isBuffering) {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    }

    if (lastIsPlayingRef.current !== (status as any).isPlaying) {
      lastIsPlayingRef.current = (status as any).isPlaying;
      setIsPlaying((status as any).isPlaying);
    }

    const duration = (status as any).durationMillis || 0;

    lastKnownPositionRef.current = (status as any).positionMillis;
    lastKnownDurationRef.current = duration;

    // ✅ Progreso fuera del Context: solo re-renderiza quien lo consume
    // Throttle: 200ms (suficiente para UI fluida sin sobrecargar JS thread)
    const now = Date.now();
    const shouldEmit =
      !(status as any).isPlaying || now - lastProgressEmitMsRef.current >= 200;

    if (shouldEmit) {
      lastProgressEmitMsRef.current = now;
      audioProgressStore.setSnapshot({
        positionMillis: (status as any).positionMillis,
        durationMillis: duration,
      });
    }

    if ((status as any).didJustFinish && currentTrackIdRef.current) {
      if (BrainEmitter) {
        const activeMeta = activeTrackMetadataRef.current;
        const metaForBrain = activeMeta
          ? {
              title: activeMeta.title,
              artist: activeMeta.artist,
            }
          : undefined;
        BrainEmitter.audio(
          AudioEventType.TRACK_COMPLETE,
          currentTrackIdRef.current,
          duration,
          (status as any).positionMillis,
          activeMeta?.features,
          metaForBrain,
        );
      }
      lastIsPlayingRef.current = false;
      setIsPlaying(false);
      setIsBuffering(false);
      audioProgressStore.reset();
    }
  }, []);

  const stopTrack = useCallback(async () => {
    const myOp = ++opIdRef.current;

    await withLock(async () => {
      if (!mountedRef.current) return;
      if (myOp !== opIdRef.current) return;

      const current = soundRef.current;
      soundRef.current = null;
      await safeStopAndUnload(current);

      setCurrentPlayingId(null);
      setActiveTrackMetadata(null);
      currentTrackIdRef.current = null;
      currentUriRef.current = null;
      lastIsPlayingRef.current = false;
      lastIsBufferingRef.current = false;
      setIsLoading(false);
      isLoadingRef.current = false;
      setIsBuffering(false);
      setIsPlaying(false);
      audioProgressStore.reset();
    });
  }, [safeStopAndUnload, withLock]);

  const ensurePlaybackMode = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync(PLAYBACK_AUDIO_MODE);
    } catch {}
  }, []);

  const prefetchTrackImpl = useCallback(
    async (uri: string) => {
      if (!uri || typeof uri !== "string") return;
      if (!uri.startsWith("http")) return;

      // Evitar prefetch del mismo uri actual
      if (currentUriRef.current === uri) return;

      // TTL: si ya lo prefetché hace poco, no repito
      const now = Date.now();
      const lastAt = prefetchedAtRef.current.get(uri);
      if (lastAt && now - lastAt < 2 * 60 * 1000) return;

      // Si ya está preloaded ese mismo, listo
      if (preloadedRef.current?.uri === uri) return;

      // Evitar duplicados en vuelo
      if (prefetchInFlightRef.current === uri) return;
      prefetchInFlightRef.current = uri;

      try {
        // Limpia preloaded anterior
        if (preloadedRef.current?.sound) {
          try {
            await safeStopAndUnload(preloadedRef.current.sound);
          } catch {}
        }
        preloadedRef.current = null;

        // downloadFirst=true => mejor "tap-to-play"
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false, volume: 1.0 },
          undefined,
          true,
        );

        preloadedRef.current = { uri, sound };
        prefetchedAtRef.current.set(uri, now);

        if (__DEV__) {
          console.log("[Audio] prefetched:", uri);
        }
      } catch (e) {
        // Silencioso: prefetch es best-effort
        if (__DEV__) console.log("[Audio] prefetch failed", e);
      } finally {
        prefetchInFlightRef.current = null;
      }
    },
    [safeStopAndUnload],
  );

  const prefetchTrack = useCallback(
    (uri: string) => {
      if (!enablePrefetchRef.current) return;
      void prefetchTrackImpl(uri);
    },
    [prefetchTrackImpl],
  );

  // Bind: permite prefetch desde cualquier lugar sin hook (ej. viewability callbacks)
  useEffect(() => {
    AudioActions.prefetchTrack = prefetchTrack;
    return () => {
      AudioActions.prefetchTrack = (_uri: string) => {};
    };
  }, [prefetchTrack]);

  const playTrack = useCallback(
    async (id: string, uri: string, meta?: TrackMetadata) => {
      const myOp = ++opIdRef.current;

      await withLock(async () => {
        try {
          if (!mountedRef.current) return;
          if (myOp !== opIdRef.current) return;

          // 🔥 Forzar modo Playback siempre que empiece una canción (por si venías del grabador)
          await ensurePlaybackMode();

          // Si es la misma canción, toggle play/pause (solo si está loaded)
          if (currentTrackIdRef.current === id && soundRef.current) {
            try {
              const st: any = await soundRef.current.getStatusAsync();
              if (st?.isLoaded) {
                if (st.isPlaying) {
                  await soundRef.current.pauseAsync();
                } else {
                  const dur = st.durationMillis || 0;
                  if (dur > 0 && st.positionMillis >= dur) {
                    await soundRef.current.replayAsync();
                  } else {
                    await soundRef.current.playAsync();
                  }
                }
              }
            } catch {}
            return;
          }

          // Emit "skip" del track anterior si aplica
          const prevId = currentTrackIdRef.current;
          if (prevId && prevId !== id && soundRef.current) {
            let playedMs = lastKnownPositionRef.current;
            let durMs = lastKnownDurationRef.current;

            try {
              const st: any = await soundRef.current.getStatusAsync();
              if (st?.isLoaded) {
                playedMs = st.positionMillis;
                durMs = st.durationMillis || durMs;
              }
            } catch {}

            if (
              BrainEmitter &&
              durMs > 0 &&
              playedMs > 1000 &&
              playedMs < durMs * 0.3
            ) {
              const activeMeta = activeTrackMetadataRef.current;
              const prevMetaForBrain = activeMeta
                ? {
                    title: activeMeta.title,
                    artist: activeMeta.artist,
                  }
                : undefined;
              BrainEmitter.audio(
                AudioEventType.TRACK_SKIP,
                prevId,
                durMs,
                playedMs,
                activeMeta?.features,
                prevMetaForBrain,
              );
            }
          }

          // Detener/unload sound actual
          const current = soundRef.current;
          soundRef.current = null;
          await safeStopAndUnload(current);

          // Si quedó stale, sal
          if (!mountedRef.current || myOp !== opIdRef.current) return;

          setIsLoading(true);
          isLoadingRef.current = true;
          setIsBuffering(false);
          setCurrentPlayingId(id);
          setActiveTrackMetadata(meta || null);
          currentTrackIdRef.current = id;
          currentUriRef.current = uri;
          lastProgressEmitMsRef.current = 0;
          audioProgressStore.reset();

          // ✅ Camino rápido: si ya está preloaded, lo usamos
          if (preloadedRef.current?.uri === uri && preloadedRef.current.sound) {
            const pre = preloadedRef.current.sound;
            preloadedRef.current = null;

            pre.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);

            // Si quedó stale, no lo uses
            if (!mountedRef.current || myOp !== opIdRef.current) {
              await safeStopAndUnload(pre);
              return;
            }

            soundRef.current = pre;

            try {
              const st: any = await pre.getStatusAsync();
              if (st?.isLoaded) {
                await pre.playAsync();
                setIsLoading(false);
                isLoadingRef.current = false;
                setIsBuffering(!!st?.isBuffering);

                if (BrainEmitter) {
                  const metaForBrain = meta
                    ? { title: meta.title, artist: meta.artist }
                    : undefined;
                  BrainEmitter.audio(
                    AudioEventType.TRACK_START,
                    id,
                    st.durationMillis || 0,
                    0,
                    meta?.features,
                    metaForBrain,
                  );
                }
              }
            } catch {
              await safeStopAndUnload(pre);
              if (soundRef.current === pre) soundRef.current = null;
              setIsLoading(false);
              isLoadingRef.current = false;
              setIsBuffering(false);
              setCurrentPlayingId(null);
              currentTrackIdRef.current = null;
              currentUriRef.current = null;
            }
            return;
          }

          // createAsync puede tardar: si el user navega, opId cambia => no aplicamos el resultado
          const { sound: newSound, status } = await Audio.Sound.createAsync(
            { uri },
            { shouldPlay: true, volume: 1.0 },
            onPlaybackStatusUpdate,
          );

          // Si quedó stale, unload y sal
          if (!mountedRef.current || myOp !== opIdRef.current) {
            await safeStopAndUnload(newSound);
            return;
          }

          soundRef.current = newSound;

          const loaded = (status as any)?.isLoaded === true;
          setIsLoading(!loaded);
          isLoadingRef.current = !loaded;
          setIsBuffering(!!(status as any)?.isBuffering);

          if ((status as any)?.isLoaded && BrainEmitter) {
            const metaForBrain = meta
              ? { title: meta.title, artist: meta.artist }
              : undefined;
            BrainEmitter.audio(
              AudioEventType.TRACK_START,
              id,
              (status as any).durationMillis || 0,
              0,
              meta?.features,
              metaForBrain,
            );
          }
        } catch (error) {
          if (__DEV__) console.log("AudioContext Error:", error);

          const current = soundRef.current;
          soundRef.current = null;
          await safeStopAndUnload(current);

          setIsLoading(false);
          isLoadingRef.current = false;
          setIsBuffering(false);
          setCurrentPlayingId(null);
          currentTrackIdRef.current = null;
          currentUriRef.current = null;
        }
      });
    },
    [ensurePlaybackMode, onPlaybackStatusUpdate, safeStopAndUnload, withLock],
  );

  const pauseTrack = useCallback(async () => {
    await withLock(async () => {
      const s = soundRef.current;
      if (!s) return;
      try {
        const st: any = await s.getStatusAsync();
        if (!st?.isLoaded) return;
        if (st.isPlaying) {
          await s.pauseAsync();
        }
      } catch {
        // Nunca propagamos error (evita Uncaught Promise)
      }
    });
  }, [withLock]);

  const resumeTrack = useCallback(async () => {
    await ensurePlaybackMode();
    await withLock(async () => {
      const s = soundRef.current;
      if (!s) return;
      try {
        const st: any = await s.getStatusAsync();
        if (!st?.isLoaded) return;
        if (!st.isPlaying) {
          const dur = st.durationMillis || 0;
          if (dur > 0 && st.positionMillis >= dur) {
            await s.replayAsync();
          } else {
            await s.playAsync();
          }
        }
      } catch {
        // Nunca propagamos error
      }
    });
  }, [ensurePlaybackMode, withLock]);

  const setPlayingId = useCallback(
    (id: string | null) => {
      if (id === null) void stopTrack();
      else setCurrentPlayingId(id);
    },
    [stopTrack],
  );

  // 🔥 Cableamos AudioActions para uso "global" sin hook (evita overlap por multi-sources).
  useEffect(() => {
    AudioActions.playTrack = playTrack;
    AudioActions.pauseTrack = pauseTrack;
    AudioActions.resumeTrack = resumeTrack;
    AudioActions.stopTrack = stopTrack;
    AudioActions.prefetchTrack = prefetchTrack;

    AudioActions.getState = () => ({
      currentPlayingId: currentTrackIdRef.current,
      activeTrackMetadata: activeTrackMetadataRef.current,
      isPlaying: lastIsPlayingRef.current,
      isLoading: isLoadingRef.current,
      isBuffering: lastIsBufferingRef.current,
    });

    return () => {
      // Reset a no-op en unmount (hot-reload safe)
      AudioActions.playTrack = async () => {};
      AudioActions.pauseTrack = async () => {};
      AudioActions.resumeTrack = async () => {};
      AudioActions.stopTrack = async () => {};
      AudioActions.prefetchTrack = () => {};
      AudioActions.getState = () => ({
        currentPlayingId: null,
        activeTrackMetadata: null,
        isPlaying: false,
        isLoading: false,
        isBuffering: false,
      });
    };
  }, [playTrack, pauseTrack, resumeTrack, stopTrack, prefetchTrack]);

  const contextValue = useMemo(
    () => ({
      currentPlayingId,
      activeTrackMetadata,
      isPlaying,
      isLoading,
      isBuffering,
      playTrack,
      pauseTrack,
      resumeTrack,
      stopTrack,
      setPlayingId,
      prefetchTrack,
    }),
    [
      currentPlayingId,
      activeTrackMetadata,
      isPlaying,
      isLoading,
      isBuffering,
      playTrack,
      pauseTrack,
      resumeTrack,
      stopTrack,
      setPlayingId,
      prefetchTrack,
    ],
  );

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
    </AudioContext.Provider>
  );
};
