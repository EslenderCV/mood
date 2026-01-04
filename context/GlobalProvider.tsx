import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  Dispatch,
  SetStateAction,
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
});

export const useGlobalContext = () => useContext(GlobalContext);

const GlobalProvider = ({ children }: Props) => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    if (colorScheme !== "dark") {
      console.log("🌑 Forzando Modo Oscuro...");
      setColorScheme("dark");
    }

    checkAuth();
  }, []);

  const checkAuth = async () => {
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
  };

  return (
    <GlobalContext.Provider
      value={{
        loggedIn,
        setLoggedIn,
        user,
        setUser,
        loading,
        isLogged: loggedIn,
        setIsLogged: setLoggedIn,
        checkAuth,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;
