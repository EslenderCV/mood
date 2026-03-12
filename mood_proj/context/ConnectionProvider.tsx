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
import { useBoot } from "@/src/boot/BootContext";

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
  const { bootComplete } = useBoot();
  const [status, setStatus] = useState<ConnectionStatus>("connected");
  const [isOnline, setIsOnline] = useState(true);
  const wasDisconnected = useRef(false); // Flag para saber si venimos de un error
  const initializedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Función para disparar manualmente el banner si falla el Realtime
  const notifyConnectionError = () => {
    if (status !== "disconnected") {
      wasDisconnected.current = true;
      setStatus("disconnected");
      // Intentar reconectar visualmente tras un momento
      const t1 = setTimeout(() => {
        if (isOnline) {
          setStatus("connecting");
          const t2 = setTimeout(() => setStatus("connected"), 2000);
          timersRef.current.push(t2);
        }
      }, 1000);
      timersRef.current.push(t1);
    }
  };

  // 1. Monitorear Internet Real (NetInfo)
  useEffect(() => {
    // Establish a stable initial connectivity state.
    // On iOS, `isInternetReachable` can start as null which would incorrectly mark the app offline.
    NetInfo.fetch().then((state) => {
      const reachable = state.isInternetReachable;
      const online = state.isConnected === true && (reachable == null ? true : reachable);
      setIsOnline(online);
      if (!online) {
        wasDisconnected.current = true;
        setStatus("disconnected");
      } else {
        setStatus("connected");
      }
      initializedRef.current = true;
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!initializedRef.current) return;
      const reachable = state.isInternetReachable;
      const online = state.isConnected === true && (reachable == null ? true : reachable);

      if (online !== isOnline) {
        setIsOnline(online);

        if (!online) {
          wasDisconnected.current = true;
          setStatus("disconnected");
        } else {
          // Only show the "connecting → connected" flow if we were previously disconnected.
          if (wasDisconnected.current) {
            setStatus("connecting");
            const t = setTimeout(() => {
              setStatus("connected");
              wasDisconnected.current = false;
            }, 1500);
            timersRef.current.push(t);
          } else {
            setStatus("connected");
          }
        }
      }
    });

    return () => {
      unsubscribe();
      for (const t of timersRef.current) clearTimeout(t);
      timersRef.current = [];
    };
  }, [isOnline]);

  // 2. Monitorear AppState (Silencioso)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        // Al volver, verificamos internet silenciosamente
        NetInfo.fetch().then((state) => {
          const reachable = state.isInternetReachable;
          const online =
            state.isConnected === true && (reachable == null ? true : reachable);
          setIsOnline(online);

          // Si al volver NO hay internet, marcamos error
          if (!online) {
            wasDisconnected.current = true;
            setStatus("disconnected");
          } else if (wasDisconnected.current) {
            // We were offline before, show the reconnection flow.
            setStatus("connecting");
            const t = setTimeout(() => {
              setStatus("connected");
              wasDisconnected.current = false;
            }, 1500);
            timersRef.current.push(t);
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
      {/* Suppress noisy connectivity UI during boot/splash */}
      <ConnectionBanner status={status} enabled={bootComplete} />
      {children}
    </ConnectionContext.Provider>
  );
};
