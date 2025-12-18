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

// 1. Definimos exactamente qué campos tiene TU usuario en Appwrite
export interface User extends Models.Document {
  name: string;
  username: string;
  email: string;
  pfp: string | null;
  followers: number;
  following: number;
}

interface Props {
  children: ReactNode;
}

// 2. Definimos el tipo del Contexto con la nueva interfaz User
interface GlobalContextType {
  loggedIn: boolean;
  setLoggedIn: Dispatch<SetStateAction<boolean>>;
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  loading: boolean;
}

// 3. Inicializamos con valores por defecto para evitar errores de "undefined"
const GlobalContext = createContext<GlobalContextType>({
  loggedIn: false,
  setLoggedIn: () => {},
  user: null,
  setUser: () => {}, // Función vacía en lugar de null
  loading: true,
});

export const useGlobalContext = () => useContext(GlobalContext);

const GlobalProvider = ({ children }: Props) => {
  const [loggedIn, setLoggedIn] = useState(false);
  // Aplicamos el tipo User al estado
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res) {
          setLoggedIn(true);
          // Hacemos un cast seguro a nuestra interfaz User
          setUser(res as unknown as User);
        } else {
          setLoggedIn(false);
          setUser(null);
        }
      })
      .catch((err) => {
        console.error("Error fetching user:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <GlobalContext.Provider
      value={{
        loggedIn,
        setLoggedIn,
        user,
        setUser,
        loading,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;
