import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { Audio, AVPlaybackStatus } from "expo-av";
// Asegúrate de que estas rutas de importación existan en tu proyecto, si no, coméntalas
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
  activeTrackMetadata: TrackMetadata | null;
  isPlaying: boolean;
  isLoading: boolean;
  durationMillis: number;
  positionMillis: number;
  playTrack: (id: string, uri: string, meta?: TrackMetadata) => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
  stopTrack: () => Promise<void>;
  setPlayingId: (id: string | null) => void;
}

const AudioContext = createContext<AudioContextType>({
  currentPlayingId: null,
  activeTrackMetadata: null,
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
  const [activeTrackMetadata, setActiveTrackMetadata] =
    useState<TrackMetadata | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [durationMillis, setDurationMillis] = useState(0);
  const [positionMillis, setPositionMillis] = useState(0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const currentTrackIdRef = useRef<string | null>(null);
  const playbackStateRef = useRef({ position: 0, duration: 0 });

  // Configuración inicial
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  }, []);

  // Limpieza al desmontar
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

    setIsLoading(status.isBuffering);
    setIsPlaying(status.isPlaying);
    setPositionMillis(status.positionMillis);
    setDurationMillis(status.durationMillis || 0);

    playbackStateRef.current = {
      position: status.positionMillis,
      duration: status.durationMillis || 0,
    };

    if (status.didJustFinish && currentTrackIdRef.current) {
      // Señal opcional al cerebro de la app
      if (BrainEmitter) {
        BrainEmitter.audio(
          AudioEventType.TRACK_COMPLETE,
          currentTrackIdRef.current,
          status.durationMillis || 0,
          status.positionMillis,
          activeTrackMetadata?.features,
        );
      }
      setIsPlaying(false);
      setPositionMillis(0);
    }
  };

  const stopTrack = async () => {
    const sound = soundRef.current;
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (error) {}
      soundRef.current = null;
    }

    setCurrentPlayingId(null);
    setActiveTrackMetadata(null);
    currentTrackIdRef.current = null;
    setIsPlaying(false);
    setPositionMillis(0);
    setDurationMillis(0);
  };

  const playTrack = async (id: string, uri: string, meta?: TrackMetadata) => {
    try {
      // 1. 🔥 IMPORTANTE: Forzar modo Altavoz (Playback) siempre que empiece una canción.
      // Esto arregla el volumen bajo si venías del grabador de voz.
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

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
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      setIsLoading(true);
      setCurrentPlayingId(id);
      setActiveTrackMetadata(meta || null);
      currentTrackIdRef.current = id;

      const { sound: newSound, status } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate,
      );

      soundRef.current = newSound;

      if (status.isLoaded && BrainEmitter) {
        BrainEmitter.audio(
          AudioEventType.TRACK_START,
          id,
          status.durationMillis || 0,
          0,
          meta?.features,
        );
      }
    } catch (error) {
      console.log("AudioContext Error:", error);
      setIsLoading(false);
      setCurrentPlayingId(null);
      currentTrackIdRef.current = null;
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
