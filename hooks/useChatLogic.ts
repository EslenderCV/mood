import { useState, useEffect, useRef } from "react";
import { Alert, FlatList, TextInput } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  getCurrentUser,
  getMessages,
  sendMessage,
  deleteMessage,
  updateMessage,
  client,
  appwriteConfig,
  markChatAsRead,
  getUser,
  databases,
  sendPushNotification,
  setTypingStatus,
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

  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);

  const [chatUser, setChatUser] = useState({
    name: (params.otherUserName as string) || "Usuario",
    avatar: (params.otherUserAvatar as string) || null,
    id: (params.otherUserId as string) || null,
    expoPushToken: null as string | null,
    isVerified: false as boolean,
    isOnline: false,
    lastSeen: null as string | null,
  });

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const performReadUpdate = async (userId: string) => {
    if (!chatId || !userId) return;
    try {
      await markChatAsRead(chatId, userId);
    } catch (e) {}
  };

  const loadData = async () => {
    try {
      let user = currentUser;
      if (!user) {
        user = await getCurrentUser();
        if (!user) return router.replace("/signIn");
        setCurrentUser(user);
      }

      if (chatUser.id) {
        try {
          const u = await getUser(chatUser.id);
          if (u) {
            setChatUser((prev) => ({
              ...prev,
              name: u.name,
              avatar: u.pfp,
              id: u.$id,
              expoPushToken: u.expoPushToken,
              isVerified: u.isVerified,
              isOnline: u.isOnline || false,
              lastSeen: u.lastSeen || null,
            }));
          }
        } catch (e) {}
      } else {
        const doc = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.chatsCollectionId,
          chatId,
        );
        const otherId = doc.participants.find((p: string) => p !== user.$id);
        if (otherId) {
          const u = await getUser(otherId);
          if (u) {
            setChatUser({
              name: u.name,
              avatar: u.pfp,
              id: u.$id,
              expoPushToken: u.expoPushToken,
              isVerified: u.isVerified,
              isOnline: u.isOnline || false,
              lastSeen: u.lastSeen || null,
            });
          }
        }
      }

      const msgs = await getMessages(chatId);
      setMessages(msgs);
      if (msgs.length > 0) performReadUpdate(user.$id);
    } catch (error) {
      console.log("Error loading chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const messagesChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`;
    const chatsCollectionChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.chatsCollectionId}.documents`;

    let userChannel = null;
    if (chatUser.id) {
      userChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.usersCollectionId}.documents.${chatUser.id}`;
    }

    const channelsToSubscribe = [messagesChannel, chatsCollectionChannel];
    if (userChannel) channelsToSubscribe.push(userChannel);

    const unsubscribe = client.subscribe(channelsToSubscribe, (response) => {
      if (response.channels.includes(messagesChannel)) {
        const payload = response.payload as any;
        if (payload.chatId === chatId) {
          if (response.events.some((e) => e.includes(".create"))) {
            // 🔥 REALTIME: Aquí es donde llega el mensaje real
            setMessages((prev) => {
              if (prev.find((m) => m.$id === payload.$id)) return prev;
              return [payload, ...prev];
            });
            setIsOtherUserTyping(false);
            if (currentUser?.$id && payload.senderId !== currentUser.$id)
              performReadUpdate(currentUser.$id);
          }
          if (response.events.some((e) => e.includes(".update"))) {
            setMessages((prev) =>
              prev.map((msg) => (msg.$id === payload.$id ? payload : msg)),
            );
          }
          if (response.events.some((e) => e.includes(".delete"))) {
            setMessages((prev) =>
              prev.filter((msg) => msg.$id !== payload.$id),
            );
          }
        }
      }

      if (response.channels.includes(chatsCollectionChannel)) {
        const payload = response.payload as any;
        if (
          payload.$id === chatId &&
          response.events.some((e) => e.includes(".update"))
        ) {
          const typingList = payload.isTyping || [];
          if (currentUser) {
            const isSomeoneElseTyping = typingList.some(
              (id: string) => id !== currentUser.$id,
            );
            setIsOtherUserTyping(isSomeoneElseTyping);
          }
        }
      }

      if (userChannel && response.channels.includes(userChannel)) {
        if (response.events.some((e) => e.includes(".update"))) {
          const payload = response.payload as any;
          setChatUser((prev) => ({
            ...prev,
            isOnline: payload.isOnline,
            lastSeen: payload.lastSeen,
          }));
        }
      }
    });
    return () => unsubscribe();
  }, [chatId, currentUser?.$id, chatUser.id]);

  const handleTyping = async (text: string) => {
    setNewMessage(text);
    if (!currentUser || !chatId) return;

    if (text.length > 0 && !typingTimeoutRef.current) {
      try {
        await setTypingStatus(chatId, currentUser.$id, true);
      } catch (e) {}
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => {
      try {
        await setTypingStatus(chatId, currentUser.$id, false);
      } catch (e) {}
      typingTimeoutRef.current = null;
    }, 2000);
  };

  // 🔥 FIX DUPLICADOS: Quitamos la actualización optimista manual
  const sendSong = async (song: any) => {
    if (!currentUser || !chatUser.id) return;

    const songPayload = JSON.stringify({
      id: song.id,
      title: song.title,
      artist: song.artist,
      cover: song.cover,
      preview: song.preview,
    });

    // ❌ BLOQUE ELIMINADO: No añadimos manualmenta al estado.
    // Esperamos a que el Realtime (listener arriba) lo añada.

    try {
      await sendMessage({
        chatId: chatId,
        senderId: currentUser.$id,
        receiverId: chatUser.id,
        body: songPayload,
        type: "audio",
      });

      if (chatUser.expoPushToken) {
        await sendPushNotification(
          chatUser.expoPushToken,
          currentUser.name || "Mood Chat",
          "🎵 Te envió una canción: " + song.title,
          { type: "chat", chatId: chatId, url: `/chat/${chatId}` },
          currentUser.pfp,
        );
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo enviar la canción");
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser || !chatUser.id) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTypingStatus(chatId, currentUser.$id, false).catch(() => {});
    typingTimeoutRef.current = null;

    if (editingMessage) {
      const tempId = editingMessage.$id;
      let finalBody = newMessage;
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

    // Mantenemos Optimistic UI para TEXTO porque es lo que el usuario espera instantáneamente
    // Pero podríamos quitarlo si también da problemas, aunque suele ser más tolerado en texto.
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
      setNewMessage(tempBody);
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
    handleTyping,
    isOtherUserTyping,
    currentUser,
    chatUser,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
    flatListRef,
    inputRef,
    handleSend,
    confirmDelete,
    startEditing,
    onSwipeToReply,
    t,
    sendSong,
  };
};
