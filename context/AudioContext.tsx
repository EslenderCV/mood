import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { Audio, AVPlaybackStatus } from "expo-av";
import { BrainEmitter } from "@/src/brain/signals/emitters";
import { AudioEventType } from "@/src/brain/signals/AudioSignals";

export interface TrackMetadata {
  title?: string;
  artist?: string;
  cover?: string;
  features?: { energy: number; valence: number; bpm: number };
}

interface AudioContextType {
  currentPlayingId: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  durationMillis: number;
  positionMillis: number;
  playTrack: (
    id: string,
    uri: string,
    meta?: TrackMetadata
  ) => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
  stopTrack: () => Promise<void>;
  // Helper legado para compatibilidad con componentes no migrados
  setPlayingId: (id: string | null) => void;
}

const AudioContext = createContext<AudioContextType>({
  currentPlayingId: null,
  isPlaying: false,
  isLoading: false,
  durationMillis: 0,
  positionMillis: 0,
  playTrack: async () => {},
  pauseTrack: async () => {},
  resumeTrack: async () => {},
  stopTrack: async () => {},
  setPlayingId: () => {},
});

export const useAudioContext = () => useContext(AudioContext);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [durationMillis, setDurationMillis] = useState(0);
  const [positionMillis, setPositionMillis] = useState(0);

  // Refs para acceso síncrono en callbacks y limpieza
  const soundRef = useRef<Audio.Sound | null>(null);
  const currentTrackIdRef = useRef<string | null>(null);
  const currentMetaRef = useRef<TrackMetadata | undefined>(undefined);
  
  // Refs de estado para lógica de SKIP sin stale closures
  const playbackStateRef = useRef({ position: 0, duration: 0 });

  // Configuración inicial de Audio
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  }, []);

  // Cleanup al desmontar el Provider
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error(`Audio Error: ${status.error}`);
        setIsLoading(false);
      }
      return;
    }

    // Actualizar estado UI
    setIsLoading(status.isBuffering);
    setIsPlaying(status.isPlaying);
    setPositionMillis(status.positionMillis);
    setDurationMillis(status.durationMillis || 0);

    // Actualizar Refs para lógica interna
    playbackStateRef.current = {
      position: status.positionMillis,
      duration: status.durationMillis || 0
    };

    // Brain Signal: TRACK_COMPLETE
    if (status.didJustFinish && currentTrackIdRef.current) {
      BrainEmitter.audio(
        AudioEventType.TRACK_COMPLETE,
        currentTrackIdRef.current,
        status.durationMillis || 0,
        status.positionMillis,
        currentMetaRef.current?.features
      );
      // Reset visual al terminar (mantenemos ID por si el usuario quiere replay)
      setIsPlaying(false);
      setPositionMillis(0);
    }
  };

  const stopTrack = async () => {
    const sound = soundRef.current;
    if (sound) {
      // Brain Signal: TRACK_SKIP
      // Si paramos manualmente y no estaba terminando (played > 1s && played < 95% aprox)
      const { position, duration } = playbackStateRef.current;
      
      if (
        currentTrackIdRef.current &&
        position > 1000 && 
        position < duration - 500
      ) {
        BrainEmitter.audio(
          AudioEventType.TRACK_SKIP,
          currentTrackIdRef.current,
          duration,
          position,
          currentMetaRef.current?.features
        );
      }

      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (error) {
        // Ignorar errores de unload si ya estaba descargado
      }
      soundRef.current = null;
    }

    setCurrentPlayingId(null);
    currentTrackIdRef.current = null;
    setIsPlaying(false);
    setPositionMillis(0);
    setDurationMillis(0);
    playbackStateRef.current = { position: 0, duration: 0 };
  };

  const playTrack = async (id: string, uri: string, meta?: TrackMetadata) => {
    try {
      // 1. Si es el mismo track, hacemos toggle pause/play
      if (currentTrackIdRef.current === id && soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await soundRef.current.pauseAsync();
          } else {
            // Si terminó, replay
            if (status.positionMillis >= (status.durationMillis || 0)) {
               await soundRef.current.replayAsync();
            } else {
               await soundRef.current.playAsync();
            }
          }
          return;
        }
      }

      // 2. Si es otro track, detener el anterior limpiamente
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // 3. Iniciar nuevo track
      setIsLoading(true);
      setCurrentPlayingId(id);
      currentTrackIdRef.current = id;
      currentMetaRef.current = meta;

      const { sound: newSound, status } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      soundRef.current = newSound;

      // Brain Signal: TRACK_START
      if (status.isLoaded) {
        BrainEmitter.audio(
          AudioEventType.TRACK_START,
          id,
          status.durationMillis || 0,
          0,
          meta?.features
        );
      }

    } catch (error) {
      console.log("AudioContext Error:", error);
      setIsLoading(false);
      // Reset en caso de error crítico
      setCurrentPlayingId(null);
      currentTrackIdRef.current = null;
    }
  };

  const pauseTrack = async () => {
    if (soundRef.current) {
      await soundRef.current.pauseAsync();
    }
  };

  const resumeTrack = async () => {
    if (soundRef.current) {
      await soundRef.current.playAsync();
    }
  };

  // Helper legacy para compatibilidad
  const setPlayingId = (id: string | null) => {
    if (id === null) {
      void stopTrack();
    } else {
      // Solo actualiza estado visual, playTrack maneja la lógica real
      setCurrentPlayingId(id);
    }
  };

  return (
    <AudioContext.Provider
      value={{
        currentPlayingId,
        isPlaying,
        isLoading,
        durationMillis,
        positionMillis,
        playTrack,
        pauseTrack,
        resumeTrack,
        stopTrack,
        setPlayingId,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};