import React, { createContext, useContext, useState } from "react";

// Definimos qué datos manejará el reproductor
interface AudioContextType {
  currentSong: { title: string; artist: string; cover: string } | null;
  isPlaying: boolean;
  playSong: (song: { title: string; artist: string; cover: string }) => void;
  togglePlay: () => void;
  closePlayer: () => void;
}

const AudioContext = createContext<AudioContextType>({} as any);

export const AudioProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentSong, setCurrentSong] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Función para iniciar una canción (la usaremos desde los posts)
  const playSong = (song: any) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  // Pausar o Reanudar
  const togglePlay = () => setIsPlaying(!isPlaying);

  // Cerrar el reproductor (El botón X)
  const closePlayer = () => {
    setCurrentSong(null);
    setIsPlaying(false);
  };

  return (
    <AudioContext.Provider
      value={{ currentSong, isPlaying, playSong, togglePlay, closePlayer }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => useContext(AudioContext);
