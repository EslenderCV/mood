import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useSyncExternalStore,
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
  let snapshot: AudioProgressSnapshot = { positionMillis: 0, durationMillis: 0 };
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
  prefetchTrack: (_uri: string) => {},
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

  // IMPORTANT: el callback de expo-av queda "capturado" cuando se asigna.
  // Para evitar estados stale (ej. loading que nunca se apaga), usamos un ref.
  const isLoadingRef = useRef<boolean>(false);
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const soundRef = useRef<Audio.Sound | null>(null);

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
    Audio.setAudioModeAsync(PLAYBACK_AUDIO_MODE).catch(() => {});
    return () => {
      // Cleanup hard (evita leaks en hot reload / navegación)
      const cleanup = async () => {
        try {
          if (soundRef.current) {
            await soundRef.current.unloadAsync();
          }
        } catch {}
        try {
          if (preloadedRef.current?.sound) {
            await preloadedRef.current.sound.unloadAsync();
          }
        } catch {}
        soundRef.current = null;
        preloadedRef.current = null;
      };
      cleanup().catch(() => {});
    };
  }, []);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error(`Audio Error: ${status.error}`);
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
    if (lastIsBufferingRef.current !== status.isBuffering) {
      lastIsBufferingRef.current = status.isBuffering;
      setIsBuffering(status.isBuffering);
    }

    // "Loading" = creando/preparando el Sound (primer play o cambio de track).
    // Si ya empezó a reproducir o hay progreso, apagamos loading aunque siga bufferizando.
    if (isLoadingRef.current) {
      const hasStarted =
        status.isPlaying ||
        status.positionMillis > 0 ||
        (status.durationMillis ?? 0) > 0;

      if (hasStarted || !status.isBuffering) {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    }

    if (lastIsPlayingRef.current !== status.isPlaying) {
      lastIsPlayingRef.current = status.isPlaying;
      setIsPlaying(status.isPlaying);
    }

    const duration = status.durationMillis || 0;

    lastKnownPositionRef.current = status.positionMillis;
    lastKnownDurationRef.current = duration;

    // ✅ Progreso fuera del Context: solo re-renderiza quien lo consume
    // Throttle: 200ms (suficiente para UI fluida sin sobrecargar JS thread)
    const now = Date.now();
    const shouldEmit = !status.isPlaying || now - lastProgressEmitMsRef.current >= 200;

    if (shouldEmit) {
      lastProgressEmitMsRef.current = now;
      audioProgressStore.setSnapshot({
        positionMillis: status.positionMillis,
        durationMillis: duration,
      });
    }

    if (status.didJustFinish && currentTrackIdRef.current) {
      if (BrainEmitter) {
        const metaForBrain = activeTrackMetadata
          ? { title: activeTrackMetadata.title, artist: activeTrackMetadata.artist }
          : undefined;
        BrainEmitter.audio(
          AudioEventType.TRACK_COMPLETE,
          currentTrackIdRef.current,
          duration,
          status.positionMillis,
          activeTrackMetadata?.features,
          metaForBrain,
        );
      }
      lastIsPlayingRef.current = false;
      setIsPlaying(false);
      setIsBuffering(false);
      audioProgressStore.reset();
    }
  };

  const stopTrack = async () => {
    const sound = soundRef.current;
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch {}
      soundRef.current = null;
    }

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
  };

  const ensurePlaybackMode = async () => {
    try {
      await Audio.setAudioModeAsync(PLAYBACK_AUDIO_MODE);
    } catch {}
  };

  const prefetchTrackImpl = async (uri: string) => {
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
          await preloadedRef.current.sound.unloadAsync();
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
  };

  const prefetchTrack = (uri: string) => {
    if (!enablePrefetch) return;
    void prefetchTrackImpl(uri);
  };

  // Bind: permite prefetch desde cualquier lugar sin hook (ej. viewability callbacks)
  useEffect(() => {
    AudioActions.prefetchTrack = prefetchTrack;
    return () => {
      AudioActions.prefetchTrack = (_uri: string) => {};
    };
  }, []);

  const playTrack = async (id: string, uri: string, meta?: TrackMetadata) => {
    try {
      // 🔥 Forzar modo Playback siempre que empiece una canción (por si venías del grabador)
      await ensurePlaybackMode();

      // Si es la misma canción, toggle play/pause
      if (currentTrackIdRef.current === id && soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await soundRef.current.pauseAsync();
          } else {
            if (status.positionMillis >= (status.durationMillis || 0)) {
              await soundRef.current.replayAsync();
            } else {
              await soundRef.current.playAsync();
            }
          }
          return;
        }
      }

      // Si hay otra canción sonando, la matamos antes de empezar la nueva
      const prevId = currentTrackIdRef.current;
      if (prevId && prevId !== id && soundRef.current) {
        let playedMs = lastKnownPositionRef.current;
        let durMs = lastKnownDurationRef.current;

        try {
          const st = await soundRef.current.getStatusAsync();
          if (st.isLoaded) {
            playedMs = st.positionMillis;
            durMs = st.durationMillis || durMs;
          }
        } catch {}

        // Only count it as a "skip" if the user actually listened a bit but bailed early.
        if (BrainEmitter && durMs > 0 && playedMs > 1000 && playedMs < durMs * 0.3) {
          const prevMetaForBrain = activeTrackMetadata
            ? { title: activeTrackMetadata.title, artist: activeTrackMetadata.artist }
            : undefined;
          BrainEmitter.audio(
            AudioEventType.TRACK_SKIP,
            prevId,
            durMs,
            playedMs,
            activeTrackMetadata?.features,
            prevMetaForBrain,
          );
        }
      }

      if (soundRef.current) {
        try {
          await soundRef.current.unloadAsync();
        } catch {}
        soundRef.current = null;
      }

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

        soundRef.current = pre;
        const st = await pre.getStatusAsync();
        if (st.isLoaded) {
          await pre.playAsync();
          setIsLoading(false);
          isLoadingRef.current = false;
          setIsBuffering(!!(st as any).isBuffering);
          if (BrainEmitter) {
            const metaForBrain = meta ? { title: meta.title, artist: meta.artist } : undefined;
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
        return;
      }

      const { sound: newSound, status } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 1.0 },
        onPlaybackStatusUpdate,
      );

      soundRef.current = newSound;

      // status inicial (una vez que el Sound existe y está loaded, no seguimos en "loading")
      const loaded = (status as any).isLoaded === true;
      setIsLoading(!loaded);
      isLoadingRef.current = !loaded;
      setIsBuffering(!!(status as any).isBuffering);

      if (status.isLoaded && BrainEmitter) {
        const metaForBrain = meta ? { title: meta.title, artist: meta.artist } : undefined;
        BrainEmitter.audio(
          AudioEventType.TRACK_START,
          id,
          status.durationMillis || 0,
          0,
          meta?.features,
          metaForBrain,
        );
      }
    } catch (error) {
      console.log("AudioContext Error:", error);
      setIsLoading(false);
      isLoadingRef.current = false;
      setIsBuffering(false);
      setCurrentPlayingId(null);
      currentTrackIdRef.current = null;
      currentUriRef.current = null;
    }
  };

  const pauseTrack = async () => {
    if (soundRef.current) await soundRef.current.pauseAsync();
  };

  const resumeTrack = async () => {
    if (soundRef.current) await soundRef.current.playAsync();
  };

  const setPlayingId = (id: string | null) => {
    if (id === null) void stopTrack();
    else setCurrentPlayingId(id);
  };

  return (
    <AudioContext.Provider
      value={{
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
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};