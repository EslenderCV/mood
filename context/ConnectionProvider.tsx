import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { AppState, AppStateStatus, LogBox } from "react-native";
import NetInfo from "@react-native-community/netinfo"; // Necesitarás instalar esto
import ConnectionBanner from "@/components/ui/ConnectionBanner";

// Ocultar el error específico de Socket en desarrollo si es molesto
LogBox.ignoreLogs(["Realtime got disconnected"]);

type ConnectionStatus = "connected" | "disconnected" | "connecting";

interface ConnectionContextType {
  status: ConnectionStatus;
  isOnline: boolean;
}

const ConnectionContext = createContext<ConnectionContextType>({
  status: "connected",
  isOnline: true,
});

export const useConnection = () => useContext(ConnectionContext);

export const ConnectionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [status, setStatus] = useState<ConnectionStatus>("connected");
  const [isOnline, setIsOnline] = useState(true);
  const appState = useRef(AppState.currentState);

  // 1. Monitorear Conexión a Internet Real
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(!!online);

      if (!online) {
        setStatus("disconnected");
      } else {
        // Si vuelve la conexión, pasamos por "connecting" brevemente para dar feedback
        setStatus("connecting");
        setTimeout(() => setStatus("connected"), 1500);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Monitorear si la App se minimiza (Background/Foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      // Si la app viene del fondo hacia el frente
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log("📱 App regresó al primer plano. Verificando conexión...");

        // Simulamos un estado de "Reconectando" para que el usuario vea la ruedita/banner
        // Esto le da tiempo al Socket de Appwrite para recuperarse
        if (isOnline) {
          setStatus("connecting");
          setTimeout(() => {
            setStatus("connected");
            // Aquí podrías disparar un refresh global si quisieras:
            // refreshAllFeeds();
          }, 1500);
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isOnline]);

  return (
    <ConnectionContext.Provider value={{ status, isOnline }}>
      {/* El Banner vive aquí, global para toda la app */}
      <ConnectionBanner status={status} />
      {children}
    </ConnectionContext.Provider>
  );
};
