import React, { createContext, useContext, useEffect, useState } from "react";
import { useGlobalContext } from "./GlobalProvider";
// Asegúrate que esta ruta es correcta
import { client, appwriteConfig, getUserConversations } from "@/lib/appwrite";

interface ChatContextType {
  conversations: any[];
  unreadTotal: number;
  loadingChats: boolean;
  // 🔥 FIX: Definimos que acepta un booleano opcional
  refreshConversations: (showLoading?: boolean) => void;
  setConversations: (chats: any[]) => void;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useGlobalContext();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const unreadTotal = conversations.reduce(
    (acc, chat) => acc + (chat.unreadCount || 0),
    0,
  );

  const refreshConversations = async (showLoading: boolean = false) => {
    if (!user) return;
    if (showLoading) setLoadingChats(true);
    try {
      const res = await getUserConversations(user.$id);
      setConversations(res);
    } catch (error) {
      console.log("Error loading chats:", error);
    } finally {
      if (showLoading) setLoadingChats(false);
    }
  };

  useEffect(() => {
    if (user) refreshConversations(true);
    else setConversations([]);
  }, [user]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.chatsCollectionId}.documents`;
    const unsubscribe = client.subscribe(channel, (response) => {
      const event = response.events[0];
      const payload: any = response.payload;

      if (event.includes(".update") || event.includes(".create")) {
        // Si llega algo nuevo, refrescamos para simplificar sincronización
        // (Podemos optimizar luego, pero esto asegura consistencia)
        if (payload.participants?.includes(user.$id)) {
          refreshConversations(false);
        }
      }
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        unreadTotal,
        loadingChats,
        refreshConversations,
        setConversations,
        activeChatId,
        setActiveChatId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatGlobal = () => {
  const context = useContext(ChatContext);
  if (!context)
    throw new Error("useChatGlobal must be used within ChatProvider");
  return context;
};
