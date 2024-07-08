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

interface Props {
  children: ReactNode;
}

interface contextProps {
  loggedIn: boolean;
  setLoggedIn: Dispatch<SetStateAction<boolean>>;
  user: Models.Document | null;
  setUser: Dispatch<SetStateAction<Models.Document | null>> | null;
  loading: boolean;
}

const GlobalContext = createContext<contextProps>({
  loggedIn: false,
  setLoggedIn: () => {},
  user: null,
  setUser: null,
  loading: true,
});

export const useGlobalContext: () => contextProps = () =>
  useContext(GlobalContext);

const GlobalProvider = ({ children }: Props) => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<Models.Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res) {
          setLoggedIn(true);
          setUser(res);
        } else {
          setLoggedIn(false);
          setUser(null);
        }
      })
      .catch((err) => {
        err;
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <GlobalContext.Provider
      value={{ loggedIn, setLoggedIn, user, setUser, loading }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;
