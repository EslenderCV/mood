import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
} from "react";
// 🔥 IMPORTAMOS AppState y la función nueva
import { AppState } from "react-native";
import { getCurrentUser, updateUserPresence } from "@/lib/appwrite";
import { Models } from "react-native-appwrite";
import { useColorScheme } from "nativewind";
// NOTE: Navigation should be handled by app/_layout.tsx.
// Keeping GlobalProvider free of router side-effects reduces startup flicker.

export interface User extends Models.Document {
  name: string;
  username: string;
  email: string;
  pfp: string | null;
  avatar: string;
  accountId: string;
  followers: number;
  following: number;
  bio?: string;
  preferredPlatform?: string;
  isPrivate?: boolean;
  blockedUsers?: string[];
  // Campos de presencia opcionales
  isOnline?: boolean;
  lastSeen?: string;
}

interface Props {
  children: ReactNode;
}

interface GlobalContextType {
  loggedIn: boolean;
  setLoggedIn: Dispatch<SetStateAction<boolean>>;
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  loading: boolean;
  isLogged: boolean;
  setIsLogged: Dispatch<SetStateAction<boolean>>;
  checkAuth: (force?: boolean) => Promise<void>;
  chats: any[];
  setChats: Dispatch<SetStateAction<any[]>>;
  isSwitching: boolean;
  setIsSwitching: Dispatch<SetStateAction<boolean>>;
}

const GlobalContext = createContext<GlobalContextType>({
  loggedIn: false,
  setLoggedIn: () => {},
  user: null,
  setUser: () => {},
  loading: true,
  isLogged: false,
  setIsLogged: () => {},
  checkAuth: async () => {},
  chats: [],
  setChats: () => {},
  isSwitching: false,
  setIsSwitching: () => {},
});

export const useGlobalContext = () => useContext(GlobalContext);

const GlobalProvider = ({ children }: Props) => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<any[]>([]);
  const [isSwitching, setIsSwitching] = useState(false);

  const { colorScheme, setColorScheme } = useColorScheme();

  const checkAuth = useCallback(
    async (force = false) => {
      if (isSwitching && !force) return;

      try {
        const res = await getCurrentUser();
        if (res) {
          setLoggedIn(true);
          setUser(res as unknown as User);
        } else {
          setLoggedIn(false);
          setUser(null);
        }
      } catch (error: any) {
        console.log("Error verificando sesión:", error);
        setLoggedIn(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    },
    [isSwitching],
  );

  useEffect(() => {
    if (colorScheme !== "dark") {
      setColorScheme("dark");
    }
    checkAuth();
  }, []);

  // 🔥🔥 DETECCIÓN AUTOMÁTICA DE ESTADO (ONLINE / OFFLINE) 🔥🔥
  useEffect(() => {
    if (!user?.$id) return;

    // 1. Al montar el componente (App abierta), marcamos online
    updateUserPresence(user.$id, true);

    // 2. Escuchar cambios de estado (Background / Active)
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        // App vuelve a primer plano -> ONLINE
        updateUserPresence(user.$id, true);
      } else if (nextAppState.match(/inactive|background/)) {
        // App se minimiza o cierra -> OFFLINE
        updateUserPresence(user.$id, false);
      }
    });

    return () => {
      // 3. Al desmontar (Logout o cerrar app), marcamos offline
      updateUserPresence(user.$id, false);
      subscription.remove();
    };
  }, [user?.$id]);

  const contextValue = useMemo(
    () => ({
      loggedIn,
      setLoggedIn,
      user,
      setUser,
      loading,
      isLogged: loggedIn,
      setIsLogged: setLoggedIn,
      checkAuth,
      chats,
      setChats,
      isSwitching,
      setIsSwitching,
    }),
    [loggedIn, user, loading, chats, checkAuth, isSwitching],
  );

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;
