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
import { getCurrentUser } from "@/lib/appwrite";
import { Models } from "react-native-appwrite";
import { useColorScheme } from "nativewind";
import { useRouter, useSegments } from "expo-router";

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
  // 🔥 ACTUALIZACIÓN: checkAuth ahora acepta un parámetro opcional 'force'
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
  const router = useRouter();
  const segments = useSegments();

  // 🔥 LÓGICA CORREGIDA
  const checkAuth = useCallback(async (force = false) => {
    // Si estamos cambiando de cuenta (isSwitching) y NO es una llamada forzada,
    // bloqueamos la ejecución para evitar condiciones de carrera o fetches basura.
    // Pero si force === true, permitimos que pase para actualizar el contexto tras el setJWT.
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
  }, [isSwitching]);

  useEffect(() => {
    if (colorScheme !== "dark") {
      setColorScheme("dark");
    }
    checkAuth(); // Llamada normal (sin force) al montar
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    if (!loggedIn && !inAuthGroup) {
      router.replace("/signIn");
    }
  }, [loggedIn, loading, segments]);

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