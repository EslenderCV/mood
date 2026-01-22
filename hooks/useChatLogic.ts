import { useState, useEffect, useRef } from "react";
import { Alert, FlatList, TextInput } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";
// 1. IMPORTACIONES CORREGIDAS
import {
  getCurrentUser,
  getMessages, // ✅ Antes getChatMessages
  sendMessage,
  deleteMessage,
  updateMessage,
  client,
  appwriteConfig,
  markChatAsRead,
  getUser,
  databases,
  sendPushNotification,
} from "@/lib/appwrite";
import { useLanguage } from "@/context/LanguageContext";

export const useChatLogic = () => {
  const { t } = useLanguage();
  const params = useLocalSearchParams();
  const chatId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);

  // Datos del otro usuario
  const [chatUser, setChatUser] = useState({
    name: (params.otherUserName as string) || "Usuario",
    avatar: (params.otherUserAvatar as string) || null,
    id: (params.otherUserId as string) || null,
    expoPushToken: null as string | null,
    isVerified: false as boolean,
  });

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const rowRefs = useRef(new Map()).current;

  // --- LECTURA ---
  const performReadUpdate = async (userId: string, currentMessages: any[]) => {
    if (!chatId || !userId) return;
    try {
      await markChatAsRead(chatId, userId);
    } catch (e) {}
  };

  // --- CARGA DE DATOS ---
  const loadData = async () => {
    try {
      let user = currentUser;
      if (!user) {
        user = await getCurrentUser();
        if (!user) return router.replace("/signIn");
        setCurrentUser(user);
      }

      // Cargar info del otro usuario si falta
      if (!chatUser.id || !chatUser.avatar) {
        try {
          if (chatUser.id) {
            const u = await getUser(chatUser.id);
            if (u)
              setChatUser({
                name: u.name,
                avatar: u.pfp,
                id: u.$id,
                expoPushToken: u.expoPushToken,
                isVerified: u.isVerified,
              });
          } else {
            // Fallback buscando en el documento del chat
            const doc = await databases.getDocument(
              appwriteConfig.databaseId,
              appwriteConfig.chatsCollectionId,
              chatId,
            );
            const otherId = doc.participants.find(
              (p: string) => p !== user.$id,
            );
            if (otherId) {
              const u = await getUser(otherId);
              if (u)
                setChatUser({
                  name: u.name,
                  avatar: u.pfp,
                  id: u.$id,
                  expoPushToken: u.expoPushToken,
                  isVerified: u.isVerified,
                });
            }
          }
        } catch (e) {}
      }

      // 2. USO DE FUNCIÓN CORRECTA
      const msgs = await getMessages(chatId);
      setMessages(msgs);
      if (msgs.length > 0) performReadUpdate(user.$id, msgs);
    } catch (error) {
      console.log("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- REALTIME ---
  useEffect(() => {
    loadData();
    const unsubscribe = client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`,
      (response) => {
        const payload = response.payload as any;
        if (payload.chatId === chatId) {
          if (response.events.includes(".create")) {
            setMessages((prev) => {
              if (prev.find((m) => m.$id === payload.$id)) return prev;
              return [payload, ...prev];
            });
            if (currentUser?.$id && payload.senderId !== currentUser.$id)
              performReadUpdate(currentUser.$id, [payload]);
          }
          if (response.events.includes(".update")) {
            setMessages((prev) =>
              prev.map((msg) => (msg.$id === payload.$id ? payload : msg)),
            );
          }
          if (response.events.includes(".delete")) {
            setMessages((prev) =>
              prev.filter((msg) => msg.$id !== payload.$id),
            );
          }
        }
      },
    );
    return () => unsubscribe();
  }, [chatId]);

  // --- ACCIONES ---
  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser || !chatUser.id) return;

    // EDICIÓN
    if (editingMessage) {
      const tempId = editingMessage.$id;
      let finalBody = newMessage;
      // Mantener metadata si existe
      if (editingMessage.body && editingMessage.body.includes(":::REPLY:::")) {
        const parts = editingMessage.body.split(":::REPLY:::");
        finalBody = `${parts[0]}:::REPLY:::${newMessage}`;
      }

      setNewMessage("");
      setEditingMessage(null);
      setMessages((prev) =>
        prev.map((m) => (m.$id === tempId ? { ...m, body: finalBody } : m)),
      );

      try {
        await updateMessage(tempId, finalBody);
      } catch {
        Alert.alert("Error", t("chat.errorEdit"));
      }
      return;
    }

    // ENVÍO NUEVO
    let bodyToSend = newMessage;
    if (replyingTo) {
      const replyName =
        replyingTo.senderId === currentUser.$id ? t("chat.you") : chatUser.name;
      let rawContent = replyingTo.body.includes(":::REPLY:::")
        ? replyingTo.body.split(":::REPLY:::")[1]
        : replyingTo.body;
      const snippet = rawContent.substring(0, 50).replace(/\n/g, " ");
      bodyToSend = `${replyName}:::${snippet}:::REPLY:::${newMessage}`;
    }

    const tempBody = bodyToSend;
    const msgForPush = newMessage;
    setNewMessage("");
    setReplyingTo(null);

    // 3. ENVÍO COMO OBJETO (FIX ERROR ARGUMENTOS)
    try {
      await sendMessage({
        chatId: chatId,
        senderId: currentUser.$id,
        receiverId: chatUser.id,
        body: tempBody,
        type: "text",
      });

      if (chatUser.expoPushToken) {
        await sendPushNotification(
          chatUser.expoPushToken,
          currentUser.name || "Mood Chat",
          msgForPush,
          { type: "chat", chatId: chatId, url: `/chat/${chatId}` },
          currentUser.pfp,
        );
      }
    } catch (e) {
      setNewMessage(tempBody); // Restaurar si falla
      Alert.alert("Error", "No se pudo enviar");
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      setMessages((prev) => prev.filter((m) => m.$id !== messageId));
      await deleteMessage(messageId);
    } catch {
      loadData();
    }
  };

  const confirmDelete = (messageId: string) => {
    Alert.alert(t("chat.deleteTitle"), t("chat.deleteMsg"), [
      { text: t("chat.cancel"), style: "cancel" },
      {
        text: t("chat.delete"),
        style: "destructive",
        onPress: () => handleDelete(messageId),
      },
    ]);
  };

  const startEditing = (item: any) => {
    setReplyingTo(null);
    let cleanBody = item.body || "";
    if (cleanBody.includes(":::REPLY:::"))
      cleanBody = cleanBody.split(":::REPLY:::")[1];
    setEditingMessage({ ...item, body: cleanBody });
    setNewMessage(cleanBody);
    inputRef.current?.focus();
  };

  const onSwipeToReply = (message: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReplyingTo(message);
    setEditingMessage(null);
    inputRef.current?.focus();
  };

  return {
    isLoading,
    messages,
    newMessage,
    setNewMessage,
    currentUser,
    chatUser,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
    flatListRef,
    inputRef,
    rowRefs,
    handleSend,
    confirmDelete,
    startEditing,
    onSwipeToReply,
    t,
  };
};
