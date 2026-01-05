import React, { createContext, useContext, useState } from "react";

interface AudioContextType {
  currentPlayingId: string | null;
  setPlayingId: (id: string | null) => void;
}

const AudioContext = createContext<AudioContextType>({
  currentPlayingId: null,
  setPlayingId: () => {},
});

export const useAudioContext = () => useContext(AudioContext);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);

  const setPlayingId = (id: string | null) => {
    setCurrentPlayingId(id);
  };

  return (
    <AudioContext.Provider value={{ currentPlayingId, setPlayingId }}>
      {children}
    </AudioContext.Provider>
  );
};
