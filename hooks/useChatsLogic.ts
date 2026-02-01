import { useState, useEffect, useMemo, useRef } from "react";
import { Alert, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import Swipeable from "react-native-gesture-handler/Swipeable";

import { useGlobalContext } from "@/context/GlobalProvider";
import {
  getUserChats,
  deleteChat,
  client,
  appwriteConfig,
} from "@/lib/appwrite";
import { useLanguage } from "@/context/LanguageContext";

export const useChatsLogic = () => {
  const { t } = useLanguage();
  const { height } = useWindowDimensions();
  const { user, chats, setChats } = useGlobalContext();

  const [loading, setLoading] = useState(chats.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [isNewChatVisible, setIsNewChatVisible] = useState(false);

  // Refs para manejo de UI
  const rowRefs = useRef<(Swipeable | null)[]>([]);
  const prevOpenedRow = useRef<Swipeable | null>(null);

  // Skeletons dinámicos
  const skeletonItems = useMemo(() => {
    const ESTIMATED_ITEM_HEIGHT = 80;
    const HEADER_HEIGHT = 140;
    const itemsToFillScreen = Math.ceil(
      (height - HEADER_HEIGHT) / ESTIMATED_ITEM_HEIGHT,
    );
    const count = Math.max(itemsToFillScreen, 8);
    return Array.from({ length: count }, (_, i) => i);
  }, [height]);

  // --- CARGA DE DATOS ---
  const loadChats = async (showLoading = true) => {
    try {
      if (user) {
        if (showLoading && chats.length === 0) setLoading(true);
        const res = await getUserChats(user.$id);
        // Filtramos chats vacíos si quieres, o los muestras todos
        const activeChats = res.filter(
          (c: any) => c.lastMessage && c.lastMessage.trim() !== "",
        );
        setChats(activeChats);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadChats(true);
  };

  // --- REALTIME SUBSCRIPTION (EL CEREBRO) ---
  useEffect(() => {
    if (!user || !client) return;

    const channels = [
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.chatsCollectionId}.documents`,
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`,
    ];

    const unsubscribe = client.subscribe(channels, (response) => {
      const payload: any = response.payload;
      const event = response.events[0];

      // 1. EVENTOS DE CHATS (Ej: Se crea un chat nuevo)
      if (event.includes(`collections.${appwriteConfig.chatsCollectionId}`)) {
        if (event.includes(".update")) {
          setChats((prevChats) =>
            prevChats.map((chat) =>
              chat.$id === payload.$id
                ? { ...chat, ...payload, otherUser: chat.otherUser }
                : chat,
            ),
          );
        }
        if (event.includes(".create")) {
          // Si me incluyen en un chat nuevo, recargo la lista
          if (payload.users && payload.users.includes(user.$id))
            loadChats(false);
        }
      }

      // 2. EVENTOS DE MENSAJES (Ej: Llega un mensaje nuevo)
      if (
        event.includes(`collections.${appwriteConfig.messagesCollectionId}`)
      ) {
        if (event.includes(".create")) {
          const chatId = payload.chatId;
          const isMyMsg = payload.senderId === user.$id;

          setChats((prevChats) => {
            const chatIndex = prevChats.findIndex((c) => c.$id === chatId);

            // Si el chat no está en la lista (ej: primer mensaje), recargar
            if (chatIndex === -1) {
              loadChats(false);
              return prevChats;
            }

            // Actualizar el chat existente y moverlo al principio
            const updatedChat = {
              ...prevChats[chatIndex],
              lastMessage: payload.content,
              lastMessageAt: payload.$createdAt,
              lastSenderId: payload.senderId,
              lastMessageIsRead: isMyMsg, // Si lo envié yo, ya está leído
            };

            const newChats = [...prevChats];
            newChats.splice(chatIndex, 1); // Quitar de la posición actual
            return [updatedChat, ...newChats]; // Poner al inicio
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // --- FILTRADO LOCAL ---
  const filteredChats = useMemo(() => {
    if (!localSearchQuery) return chats;
    const lowerQuery = localSearchQuery.toLowerCase();
    return chats.filter((chat) => {
      const name = (chat.otherUser?.name || "").toLowerCase();
      const username = (chat.otherUser?.username || "").toLowerCase();
      const lastMsg = (chat.lastMessage || "").toLowerCase();
      return (
        name.includes(lowerQuery) ||
        username.includes(lowerQuery) ||
        lastMsg.includes(lowerQuery)
      );
    });
  }, [chats, localSearchQuery]);

  // --- ACCIONES UI ---
  const closeRow = (index: number) => {
    if (
      prevOpenedRow.current &&
      prevOpenedRow.current !== rowRefs.current[index]
    ) {
      prevOpenedRow.current.close();
    }
    prevOpenedRow.current = rowRefs.current[index];
  };

  const handleDeleteChat = async (chatId: string, index: number) => {
    Alert.alert(t("chatsList.deleteTitle"), t("chatsList.deleteMsg"), [
      {
        text: t("chatsList.cancel"),
        style: "cancel",
        onPress: () => closeRow(index),
      },
      {
        text: t("chatsList.deleteOption"),
        style: "destructive",
        onPress: async () => {
          // Optimistic Update
          const newChats = [...chats];
          newChats.splice(index, 1);
          setChats(newChats);
          closeRow(index);
          try {
            await deleteChat(chatId);
          } catch (error) {
            loadChats();
          }
        },
      },
    ]);
  };

  const handleOpenChat = async (
    otherUserId: string,
    otherUserFixedData?: any,
  ) => {
    if (!user) return;
    setIsNewChatVisible(false);

    // Optimistic Read Update: Marcar como leído visualmente al entrar
    setChats((prev) =>
      prev.map((c) =>
        c.otherUser?.$id === otherUserId
          ? { ...c, lastMessageIsRead: true }
          : c,
      ),
    );

    const existingChat = chats.find((c) => c.otherUser?.$id === otherUserId);
    let targetChatId = existingChat ? existingChat.$id : "new";

    router.push({
      pathname: "/chat/[id]",
      params: {
        id: targetChatId,
        otherUserId: otherUserId,
        otherUserName:
          otherUserFixedData?.name || otherUserFixedData?.username || "Usuario",
        otherUserAvatar: otherUserFixedData?.pfp || "",
      },
    } as any);
    setLocalSearchQuery("");
  };

  return {
    user,
    loading,
    refreshing,
    localSearchQuery,
    setLocalSearchQuery,
    isNewChatVisible,
    setIsNewChatVisible,
    filteredChats,
    skeletonItems,
    loadChats,
    onRefresh,
    handleDeleteChat,
    handleOpenChat,
    closeRow,
    rowRefs,
    t,
  };
};
