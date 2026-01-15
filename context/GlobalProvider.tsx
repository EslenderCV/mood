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
  checkAuth: () => Promise<void>;
  // 🔥 NUEVO: Estado global de chats
  chats: any[];
  setChats: Dispatch<SetStateAction<any[]>>;
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
});

export const useGlobalContext = () => useContext(GlobalContext);

const GlobalProvider = ({ children }: Props) => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 Estado compartido para evitar recargas visuales
  const [chats, setChats] = useState<any[]>([]);

  const { colorScheme, setColorScheme } = useColorScheme();

  const checkAuth = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (colorScheme !== "dark") {
      setColorScheme("dark");
    }
    checkAuth();
  }, []);

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
    }),
    [loggedIn, user, loading, checkAuth, chats]
  );

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;
