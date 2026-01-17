import { useState, useEffect, useRef, useCallback } from "react";
import { Alert, FlatList, TextInput } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  getCurrentUser,
  getChatMessages,
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

  // --- 1. LECTURA DE MENSAJES ---
  const performReadUpdate = async (userId: string, currentMessages: any[]) => {
    if (!chatId || !userId) return;
    try {
      await markChatAsRead(chatId, userId);
    } catch (e) {}

    const unreadMessages = currentMessages.filter(
      (m) => !m.isRead && m.senderId !== userId,
    );
    if (unreadMessages.length > 0) {
      setMessages((prev) =>
        prev.map((m) =>
          !m.isRead && m.senderId !== userId ? { ...m, isRead: true } : m,
        ),
      );
      try {
        await Promise.all(
          unreadMessages.map((msg) =>
            databases.updateDocument(
              appwriteConfig.databaseId,
              appwriteConfig.messagesCollectionId,
              msg.$id,
              { isRead: true },
            ),
          ),
        );
      } catch (e) {}
    }
  };

  // --- 2. CARGA DE DATOS ---
  const loadData = async () => {
    try {
      let user = currentUser;
      if (!user) {
        user = await getCurrentUser();
        if (!user) return router.replace("/signIn");
        setCurrentUser(user);
      }

      if (!chatUser.id || !chatUser.avatar || !chatUser.expoPushToken) {
        try {
          if (chatUser.id) {
            const otherUserData = await getUser(chatUser.id);
            if (otherUserData) {
              setChatUser({
                name: otherUserData.name || otherUserData.username,
                avatar: otherUserData.pfp,
                id: otherUserData.$id,
                expoPushToken: otherUserData.expoPushToken,
                isVerified: otherUserData.isVerified,
              });
            }
          } else {
            const chatDoc = await databases.getDocument(
              appwriteConfig.databaseId,
              appwriteConfig.chatsCollectionId,
              chatId,
            );
            if (chatDoc && chatDoc.participants) {
              const otherId = chatDoc.participants.find(
                (p: string) => p !== user.$id,
              );
              if (otherId) {
                const otherUserData = await getUser(otherId);
                if (otherUserData) {
                  setChatUser({
                    name: otherUserData.name || otherUserData.username,
                    avatar: otherUserData.pfp,
                    id: otherUserData.$id,
                    expoPushToken: otherUserData.expoPushToken,
                    isVerified: otherUserData.isVerified,
                  });
                }
              }
            }
          }
        } catch (err) {}
      }

      const msgs = await getChatMessages(chatId);
      setMessages(msgs);
      if (msgs.length > 0) performReadUpdate(user.$id, msgs);
    } catch (error) {
      console.log("Error loading chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. REALTIME SUBSCRIPTION ---
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

  // --- 4. ACCIONES (Enviar, Editar, Borrar, Swipe) ---
  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser || !chatUser.id) return;

    if (editingMessage) {
      const tempId = editingMessage.$id;
      let finalContent = newMessage;
      if (editingMessage.content.includes(":::REPLY:::")) {
        const parts = editingMessage.content.split(":::REPLY:::");
        finalContent = `${parts[0]}:::REPLY:::${newMessage}`;
      }
      setNewMessage("");
      setEditingMessage(null);
      try {
        setMessages((prev) =>
          prev.map((m) =>
            m.$id === tempId ? { ...m, content: finalContent } : m,
          ),
        );
        await updateMessage(tempId, finalContent);
      } catch {
        Alert.alert("Error", t("chat.errorEdit"));
      }
      return;
    }

    let contentToSend = newMessage;
    if (replyingTo) {
      const replyName =
        replyingTo.senderId === currentUser.$id ? t("chat.you") : chatUser.name;
      let rawContent = replyingTo.content.includes(":::REPLY:::")
        ? replyingTo.content.split(":::REPLY:::")[1]
        : replyingTo.content;
      if (rawContent.startsWith("Replying to:"))
        rawContent = rawContent.split("\n\n").slice(1).join("\n\n");
      const snippet = rawContent.substring(0, 50).replace(/\n/g, " ");
      contentToSend = `${replyName}:::${snippet}:::REPLY:::${newMessage}`;
    }

    const messageForNotification = newMessage;
    const tempContent = contentToSend;
    setNewMessage("");
    setReplyingTo(null);

    try {
      await sendMessage(
        chatId,
        currentUser.$id,
        chatUser.id,
        tempContent,
        null,
      );
      if (chatUser.expoPushToken) {
        await sendPushNotification(
          chatUser.expoPushToken,
          currentUser.name || "Mood Chat",
          messageForNotification,
          { type: "chat", chatId: chatId, url: `/chat/${chatId}` },
        );
      }
    } catch {
      setNewMessage(tempContent);
      Alert.alert("Error", "No se pudo enviar");
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      setMessages((prev) => prev.filter((m) => m.$id !== messageId));
      await deleteMessage(messageId);
    } catch {
      Alert.alert("Error", t("chat.errorDelete"));
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
    let cleanContent = item.content;
    if (item.content.includes(":::REPLY:::"))
      cleanContent = item.content.split(":::REPLY:::")[1];
    else if (item.content.startsWith("Replying to:"))
      cleanContent = item.content.split("\n\n").slice(1).join("\n\n");
    setEditingMessage({ ...item, cleanContent });
    setNewMessage(cleanContent);
    inputRef.current?.focus();
  };

  const onSwipeToReply = (message: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReplyingTo(message);
    setEditingMessage(null);
    const ref = rowRefs.get(message.$id);
    if (ref) ref.close();
    inputRef.current?.focus();
  };

  const scrollToOriginalMessage = (originalText: string) => {
    const index = messages.findIndex((m) => {
      let content = m.content.includes(":::REPLY:::")
        ? m.content.split(":::REPLY:::")[1]
        : m.content;
      return content.includes(originalText) || content === originalText;
    });
    if (index !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
      Haptics.selectionAsync();
    }
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
    scrollToOriginalMessage,
    t,
  };
};
