import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { AppState, LogBox } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import ConnectionBanner from "@/components/ui/ConnectionBanner";

// Ocultar el error específico de Socket en desarrollo
LogBox.ignoreLogs(["Realtime got disconnected"]);

type ConnectionStatus = "connected" | "disconnected" | "connecting";

interface ConnectionContextType {
  status: ConnectionStatus;
  isOnline: boolean;
  notifyConnectionError: () => void; // Nueva función para forzar reconexión visual
}

const ConnectionContext = createContext<ConnectionContextType>({
  status: "connected",
  isOnline: true,
  notifyConnectionError: () => {},
});

export const useConnection = () => useContext(ConnectionContext);

export const ConnectionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [status, setStatus] = useState<ConnectionStatus>("connected");
  const [isOnline, setIsOnline] = useState(true);
  const wasDisconnected = useRef(false); // Flag para saber si venimos de un error

  // Función para disparar manualmente el banner si falla el Realtime
  const notifyConnectionError = () => {
    if (status !== "disconnected") {
      wasDisconnected.current = true;
      setStatus("disconnected");
      // Intentar reconectar visualmente tras un momento
      setTimeout(() => {
        if (isOnline) {
          setStatus("connecting");
          setTimeout(() => setStatus("connected"), 2000);
        }
      }, 1000);
    }
  };

  // 1. Monitorear Internet Real (NetInfo)
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable);

      // Solo actuar si hay un cambio real de estado
      if (online !== isOnline) {
        setIsOnline(online);

        if (!online) {
          wasDisconnected.current = true;
          setStatus("disconnected");
        } else {
          // SOLO si veníamos de estar desconectados, mostramos el proceso de restauración
          if (wasDisconnected.current) {
            setStatus("connecting");
            setTimeout(() => {
              setStatus("connected");
              wasDisconnected.current = false;
            }, 2000);
          } else {
            setStatus("connected");
          }
        }
      }
    });

    return () => unsubscribe();
  }, [isOnline]);

  // 2. Monitorear AppState (Silencioso)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        // Al volver, verificamos internet silenciosamente
        NetInfo.fetch().then((state) => {
          const online = !!(state.isConnected && state.isInternetReachable);
          setIsOnline(online);

          // Si al volver NO hay internet, marcamos error
          if (!online) {
            wasDisconnected.current = true;
            setStatus("disconnected");
          }
          // Si volvimos y TODO ESTÁ BIEN, no hacemos nada (mantenemos "connected")
          // evitando el banner molesto.
        });
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <ConnectionContext.Provider
      value={{ status, isOnline, notifyConnectionError }}
    >
      <ConnectionBanner status={status} />
      {children}
    </ConnectionContext.Provider>
  );
};
