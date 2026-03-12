import React, { createContext, useContext, useMemo, useState } from "react";

type BootContextType = {
  /**
   * True once the app has finished its initial splash/boot transition.
   * Useful to suppress noisy UI (banners, toasts) during launch.
   */
  bootComplete: boolean;
  setBootComplete: (v: boolean) => void;
};

const BootContext = createContext<BootContextType>({
  bootComplete: false,
  setBootComplete: () => {},
});

export const useBoot = () => useContext(BootContext);

export function BootProvider({ children }: { children: React.ReactNode }) {
  const [bootComplete, setBootComplete] = useState(false);

  const value = useMemo(
    () => ({ bootComplete, setBootComplete }),
    [bootComplete],
  );

  return <BootContext.Provider value={value}>{children}</BootContext.Provider>;
}
