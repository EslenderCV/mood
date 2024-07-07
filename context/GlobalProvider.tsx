import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import { getCurrentUser } from "@/lib/appwrite";
import { Models } from "react-native-appwrite";

const GlobalContext = createContext({});

export const useGlobalContext = () => useContext(GlobalContext);

interface Props {
  children: ReactNode;
}

const GlobalProvider = ({ children }: Props) => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<Models.Document | null>(null);
  const [loadding, setLoadding] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res) {
          setLoadding(true);
          setUser(res);
        } else {
          setLoggedIn(false);
          setUser(null);
        }
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        setLoadding(false);
      });
  }, []);

  return (
    <GlobalContext.Provider
      value={{ loggedIn, setLoggedIn, user, setUser, loadding }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;
