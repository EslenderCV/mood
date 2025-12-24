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

// 1. Interfaz de Usuario
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

// 2. Definición del Contexto (Usando 'loggedIn' como pediste)
interface GlobalContextType {
  loggedIn: boolean;
  setLoggedIn: Dispatch<SetStateAction<boolean>>;
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  loading: boolean;
}

const GlobalContext = createContext<GlobalContextType>({
  loggedIn: false,
  setLoggedIn: () => {},
  user: null,
  setUser: () => {},
  loading: true,
});

export const useGlobalContext = () => useContext(GlobalContext);

const GlobalProvider = ({ children }: Props) => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res) {
          setLoggedIn(true);
          setUser(res as unknown as User);
        } else {
          setLoggedIn(false);
          setUser(null);
        }
      })
      .catch((error) => {
        console.log("Error en GlobalProvider:", error);
        // EN CASO DE ERROR, FORZAMOS EL ESTADO A 'NO LOGUEADO'
        // Esto evita que la app se quede en un estado limbo
        setLoggedIn(false);
        setUser(null);
      })
      .finally(() => {
        // Solo aquí terminamos la carga
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