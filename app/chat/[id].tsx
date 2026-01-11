import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  AlertButton,
  useWindowDimensions, // <--- Importado
} from "react-native";
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  useLocalSearchParams,
  router,
  Stack,
  useFocusEffect,
} from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "nativewind";
import {
  getCurrentUser,
  getChatMessages,
  sendMessage,
  deleteMessage,
  updateMessage,
  client,
  appwriteConfig,
  markChatAsRead,
  getPostById,
  getPlaylistById,
  getUser,
  databases,
  sendPushNotification,
} from "@/lib/appwrite";
import { useLanguage } from "@/context/LanguageContext";

const isValidId = (id: string | null | undefined) => {
  if (!id) return false;
  if (id.length > 36) return false;
  const validChars = /^[a-zA-Z0-9_.-]+$/;
  return validChars.test(id);
};

// --- SKELETON LOADER (NUEVO) ---
const ChatRoomSkeleton = ({ isDark }: { isDark: boolean }) => {
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  const myBubbleBg = isDark ? "bg-zinc-700" : "bg-zinc-400"; // Un poco más oscuro para simular "mis" mensajes
  const otherBubbleBg = isDark ? "bg-zinc-800" : "bg-zinc-200";

  return (
    <View className="flex-1 animate-pulse">
      {/* Header Skeleton */}
      <View
        className={`flex-row items-center px-2 py-2 border-b ${
          isDark ? "border-zinc-800" : "border-zinc-200"
        }`}
      >
        <View className={`w-10 h-10 rounded-full ${elementBg} m-2`} />
        <View className={`w-9 h-9 rounded-full ${elementBg}`} />
        <View className="ml-3 flex-1">
          <View className={`w-32 h-4 rounded ${elementBg} mb-1`} />
        </View>
      </View>

      {/* Messages Area Skeleton (Simulando conversación desde abajo) */}
      <View className="flex-1 px-4 py-4 justify-end">
        {/* Mensaje Recibido (Otro) */}
        <View className="flex-row items-end mb-6">
          <View className={`w-7 h-7 rounded-full ${elementBg} mr-2 mb-1`} />
          <View
            className={`w-48 h-12 rounded-[18px] rounded-tl-none ${otherBubbleBg}`}
          />
        </View>

        {/* Mensaje Enviado (Yo) */}
        <View className="flex-row justify-end items-end mb-6">
          <View
            className={`w-64 h-20 rounded-[18px] rounded-tr-none ${myBubbleBg}`}
          />
        </View>

        {/* Mensaje Recibido (Otro) */}
        <View className="flex-row items-end mb-6">
          <View className={`w-7 h-7 rounded-full ${elementBg} mr-2 mb-1`} />
          <View
            className={`w-32 h-10 rounded-[18px] rounded-tl-none ${otherBubbleBg}`}
          />
        </View>

        {/* Mensaje Enviado (Yo) */}
        <View className="flex-row justify-end items-end mb-6">
          <View
            className={`w-40 h-10 rounded-[18px] rounded-tr-none ${myBubbleBg}`}
          />
        </View>
      </View>

      {/* Input Bar Skeleton */}
      <View
        className={`px-3 py-3 border-t ${
          isDark ? "border-zinc-800" : "border-zinc-200"
        }`}
      >
        <View className={`h-[45px] rounded-3xl ${elementBg}`} />
      </View>
    </View>
  );
};

// ... (PostPreviewBubble se mantiene igual)
const PostPreviewBubble = ({
  postId,
  onLongPress,
}: {
  postId: string;
  onLongPress?: () => void;
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();
  const cardBg = isDark ? "#262626" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A8A8A8" : "#737373";
  const borderColor = isDark ? "#363636" : "#E5E5E5";
  const footerBg = isDark ? "rgba(255,255,255,0.03)" : "#FAFAFA";
  const [post, setPost] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!isValidId(postId)) {
      setError(true);
      return;
    }
    getPostById(postId)
      .then((data) => {
        if (isMounted) {
          if (data) setPost(data);
          else setError(true);
        }
      })
      .catch((e) => {
        if (isMounted) setError(true);
      });
    return () => {
      isMounted = false;
    };
  }, [postId]);

  if (error) return null;
  if (!post)
    return (
      <View
        className="w-48 h-20 rounded-xl justify-center items-center mb-1 border"
        style={{ backgroundColor: cardBg, borderColor: borderColor }}
      >
        <ActivityIndicator color="#5E17EB" size="small" />
      </View>
    );

  const song = post.songData ? JSON.parse(post.songData) : null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/post/${postId}` as any)}
      onLongPress={onLongPress}
      delayLongPress={300}
      className="rounded-[22px] overflow-hidden mb-1 border shadow-sm"
      style={{ backgroundColor: cardBg, borderColor: borderColor, width: 240 }}
    >
      <View className="w-full h-32 bg-zinc-800 relative">
        <Image
          source={
            song?.cover
              ? { uri: song.cover }
              : require("@/assets/images/icon.png")
          }
          className="w-full h-full"
          resizeMode="cover"
        />
        <View className="absolute inset-0 bg-black/20 justify-center items-center">
          <Ionicons name="play-circle" size={40} color="white" />
        </View>
      </View>
      <View className="p-3" style={{ backgroundColor: footerBg }}>
        <Text
          className="font-bold text-sm leading-tight"
          numberOfLines={1}
          style={{ color: textColor }}
        >
          {song?.title || t("chat.song")}
        </Text>
        <Text
          className="text-xs mt-0.5 font-medium"
          numberOfLines={1}
          style={{ color: subTextColor }}
        >
          {song?.artist || t("chat.artist")}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ... (ChatPlaylistCard se mantiene igual)
const ChatPlaylistCard = ({
  playlistId,
  isMyMessage,
}: {
  playlistId: string;
  isMyMessage: boolean;
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const cardBg = isDark ? "#262626" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A8A8A8" : "#737373";
  const borderColor = isDark ? "#363636" : "#E5E5E5";

  useEffect(() => {
    let isMounted = true;
    if (!isValidId(playlistId)) {
      setLoading(false);
      setError(true);
      return;
    }
    const loadData = async () => {
      try {
        const data = await getPlaylistById(playlistId);
        if (isMounted) {
          if (data) setPlaylist(data);
          else setError(true);
        }
      } catch (e) {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [playlistId]);

  if (loading)
    return (
      <View
        className="p-3 rounded-xl justify-center items-center mb-1"
        style={{
          backgroundColor: isMyMessage
            ? "rgba(255,255,255,0.2)"
            : "rgba(0,0,0,0.1)",
          width: 200,
          height: 60,
        }}
      >
        <ActivityIndicator
          size="small"
          color={isMyMessage ? "white" : "#5E17EB"}
        />
      </View>
    );

  if (error || !playlist)
    return (
      <View
        className="p-3 rounded-xl mb-1 border justify-center"
        style={{
          backgroundColor: isDark ? "#3f1a1a" : "#fee2e2",
          borderColor: "#fca5a5",
          width: 200,
        }}
      >
        <Text className="text-xs text-red-500 font-bold">
          Playlist no disponible
        </Text>
      </View>
    );

  const platformIcon =
    playlist.platform === "apple"
      ? "logo-apple"
      : playlist.platform === "spotify"
      ? "logo-spotify"
      : "musical-notes";
  const platformColor =
    playlist.platform === "apple"
      ? "#FA243C"
      : playlist.platform === "spotify"
      ? "#1DB954"
      : subTextColor;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/playlist/${playlist.$id}` as any)}
      className="flex-row items-center p-2 rounded-[18px] mb-1 border overflow-hidden"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
        width: 240,
        height: 70,
      }}
    >
      <View className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden relative border border-zinc-700">
        {playlist.cover && !playlist.cover.includes("initials") ? (
          <Image
            source={{ uri: playlist.cover }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center bg-zinc-800">
            <Ionicons name="musical-notes" size={20} color="#5E17EB" />
          </View>
        )}
      </View>
      <View className="ml-3 flex-1 justify-center">
        <Text
          numberOfLines={1}
          className="font-bold text-[14px]"
          style={{ color: textColor }}
        >
          {playlist.name}
        </Text>
        <View className="flex-row items-center mt-1">
          <Ionicons
            name={platformIcon as any}
            size={12}
            color={platformColor}
          />
          <Text className="text-[11px] ml-1.5" style={{ color: subTextColor }}>
            {playlist.songs?.length || 0} canciones
          </Text>
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={subTextColor}
        style={{ opacity: 0.5 }}
      />
    </TouchableOpacity>
  );
};

const ChatRoom = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const inputBg = isDark ? "#18181B" : "#F4F4F5";
  const headerBg = isDark ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)";
  const backIconColor = isDark ? "#FFFFFF" : "#000000";
  const iconColor = isDark ? "#A1A1AA" : "#52525B";
  const myBubbleBg = "#5E17EB";
  const myBubbleText = "#FFFFFF";
  const otherBubbleBg = isDark ? "#27272A" : "#F3F4F6";
  const otherBubbleText = isDark ? "#FFFFFF" : "#000000";
  const replyBoxMyBg = "rgba(0, 0, 0, 0.2)";
  const replyBoxOtherBg = isDark
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(0, 0, 0, 0.05)";

  const params = useLocalSearchParams();
  const chatId = params.id as string;

  // Estado de carga inicial
  const [isLoading, setIsLoading] = useState(true);

  const [chatUser, setChatUser] = useState({
    name: (params.otherUserName as string) || "Usuario",
    avatar: (params.otherUserAvatar as string) || null,
    id: (params.otherUserId as string) || null,
    expoPushToken: null as string | null,
    isVerified: false as boolean,
  });

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const rowRefs = useRef(new Map()).current;

  // --- 🔥 LÓGICA DE LECTURA ROBUSTA ---
  const performReadUpdate = async (userId: string, currentMessages: any[]) => {
    if (!chatId || !userId) return;

    try {
      await markChatAsRead(chatId, userId);
    } catch (e) {
      console.log("Error marking chat read:", e);
    }

    const unreadMessages = currentMessages.filter(
      (m) => !m.isRead && m.senderId !== userId
    );

    if (unreadMessages.length > 0) {
      setMessages((prev) =>
        prev.map((m) =>
          !m.isRead && m.senderId !== userId ? { ...m, isRead: true } : m
        )
      );

      try {
        await Promise.all(
          unreadMessages.map((msg) =>
            databases.updateDocument(
              appwriteConfig.databaseId,
              appwriteConfig.messagesCollectionId,
              msg.$id,
              { isRead: true }
            )
          )
        );
      } catch (e) {
        console.log("Error marking msgs read in DB:", e);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (currentUser?.$id && messages.length > 0) {
        performReadUpdate(currentUser.$id, messages);
      }
    }, [currentUser, messages.length])
  );

  useEffect(() => {
    loadData();
    const unsubscribe = client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`,
      (response) => {
        const payload = response.payload as any;
        if (payload.chatId === chatId) {
          if (
            response.events.includes(
              "databases.*.collections.*.documents.*.create"
            )
          ) {
            setMessages((prev) => {
              if (prev.find((m) => m.$id === payload.$id)) return prev;
              return [payload, ...prev];
            });

            if (currentUser?.$id && payload.senderId !== currentUser.$id) {
              performReadUpdate(currentUser.$id, [payload]);
            }
          }
          if (
            response.events.includes(
              "databases.*.collections.*.documents.*.update"
            )
          ) {
            setMessages((prev) =>
              prev.map((msg) => (msg.$id === payload.$id ? payload : msg))
            );
          }
          if (
            response.events.includes(
              "databases.*.collections.*.documents.*.delete"
            )
          ) {
            setMessages((prev) =>
              prev.filter((msg) => msg.$id !== payload.$id)
            );
          }
        }
      }
    );
    return () => unsubscribe();
  }, [chatId]);

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
              chatId
            );
            if (chatDoc && chatDoc.participants) {
              const otherId = chatDoc.participants.find(
                (p: string) => p !== user.$id
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
        } catch (err) {
          console.log("Info user error:", err);
        }
      }

      const msgs = await getChatMessages(chatId);
      setMessages(msgs);

      if (msgs.length > 0) {
        performReadUpdate(user.$id, msgs);
      }
    } catch (error) {
      console.log("Error loading chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSwipeToReply = (message: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReplyingTo(message);
    setEditingMessage(null);
    const ref = rowRefs.get(message.$id);
    if (ref) ref.close();
    inputRef.current?.focus();
  };

  const handleLongPress = (item: any) => {
    if (item.senderId !== currentUser?.$id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const options: AlertButton[] = [
      { text: t("chat.cancel"), style: "cancel" },
    ];
    if (!item.sharedPostId && !item.sharedPlaylistId) {
      options.push({ text: t("chat.edit"), onPress: () => startEditing(item) });
    }
    options.push({
      text: t("chat.delete"),
      style: "destructive",
      onPress: () => confirmDelete(item.$id),
    });
    Alert.alert(t("chat.options"), "", options);
  };

  const startEditing = (item: any) => {
    setReplyingTo(null);
    let cleanContent = item.content;
    if (item.content.includes(":::REPLY:::")) {
      const parts = item.content.split(":::REPLY:::");
      if (parts.length > 1) cleanContent = parts[1];
    } else if (item.content.startsWith("Replying to:")) {
      const parts = item.content.split("\n\n");
      if (parts.length > 1) cleanContent = parts.slice(1).join("\n\n");
    }
    setEditingMessage({ ...item, cleanContent });
    setNewMessage(cleanContent);
    inputRef.current?.focus();
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

  const handleDelete = async (messageId: string) => {
    try {
      setMessages((prev) => prev.filter((m) => m.$id !== messageId));
      await deleteMessage(messageId);
    } catch (error) {
      Alert.alert("Error", t("chat.errorDelete"));
      loadData();
    }
  };

  const scrollToOriginalMessage = (originalText: string) => {
    const index = messages.findIndex((m) => {
      let contentToCheck = m.content;
      if (m.content.includes(":::REPLY:::"))
        contentToCheck = m.content.split(":::REPLY:::")[1];
      else if (m.content.startsWith("Replying to:"))
        contentToCheck = m.content.split("\n\n")[1];
      return (
        contentToCheck.includes(originalText) || contentToCheck === originalText
      );
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
            m.$id === tempId ? { ...m, content: finalContent } : m
          )
        );
        await updateMessage(tempId, finalContent);
      } catch (error) {
        Alert.alert("Error", t("chat.errorEdit"));
      }
      return;
    }

    let contentToSend = newMessage;
    if (replyingTo) {
      const replyName =
        replyingTo.senderId === currentUser.$id ? t("chat.you") : chatUser.name;
      let rawContent = replyingTo.content;
      if (replyingTo.content.includes(":::REPLY:::")) {
        rawContent = replyingTo.content.split(":::REPLY:::")[1];
      } else if (replyingTo.content.startsWith("Replying to:")) {
        rawContent = replyingTo.content.split("\n\n").slice(1).join("\n\n");
      }
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
        null
      );

      if (chatUser.expoPushToken) {
        const notiTitle =
          currentUser.name || currentUser.username || "Mood Chat";
        const notiBody = messageForNotification;

        await sendPushNotification(
          chatUser.expoPushToken,
          notiTitle,
          notiBody,
          { type: "chat", chatId: chatId, url: `/chat/${chatId}` }
        );
      }
    } catch (error) {
      setNewMessage(tempContent);
      Alert.alert("Error", "No se pudo enviar");
    }
  };

  const renderReplyActionLeft = () => (
    <View className="justify-center items-end pr-4 w-20">
      <Ionicons name="arrow-undo" size={24} color={iconColor} />
    </View>
  );

  const renderReplyActionRight = () => (
    <View className="justify-center items-start pl-4 w-20">
      <Ionicons
        name="arrow-undo"
        size={24}
        color={iconColor}
        style={{ transform: [{ scaleX: -1 }] }}
      />
    </View>
  );

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === currentUser?.$id;
    const time = new Date(item.$createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const hasSharedPost = !!item.sharedPostId;
    const hasSharedPlaylist = !!item.sharedPlaylistId;
    const hasContent = item.content && item.content.trim().length > 0;

    if (!hasSharedPost && !hasSharedPlaylist && !hasContent) return null;

    let displayContent = item.content;
    let replySnippet = null;
    let replyName = null;

    if (hasContent) {
      if (item.content.includes(":::REPLY:::")) {
        const parts = item.content.split(":::REPLY:::");
        const metadata = parts[0].split(":::");
        if (metadata.length >= 2) {
          replyName = metadata[0];
          replySnippet = metadata[1];
        } else {
          replyName = t("chat.reply");
          replySnippet = metadata[0];
        }
        displayContent = parts[1];
      } else if (item.content.startsWith("Replying to:")) {
        const parts = item.content.split("\n\n");
        if (parts.length > 1) {
          replyName = t("chat.reply");
          replySnippet = parts[0]
            .replace("Replying to: ", "")
            .replace(/"/g, "");
          displayContent = parts.slice(1).join("\n\n");
        }
      }
    }

    return (
      <Swipeable
        ref={(ref) => {
          if (ref && item.$id) rowRefs.set(item.$id, ref);
        }}
        renderRightActions={isMe ? renderReplyActionLeft : undefined}
        renderLeftActions={!isMe ? renderReplyActionRight : undefined}
        onSwipeableWillOpen={() => onSwipeToReply(item)}
        friction={2}
        overshootRight={false}
        overshootLeft={false}
        activeOffsetX={isMe ? [-20, 9999] : [-9999, 35]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={() => handleLongPress(item)}
          delayLongPress={300}
        >
          <View
            className={`mb-2 flex-row ${
              isMe ? "justify-end" : "justify-start"
            } px-4`}
          >
            {!isMe && (
              <Image
                source={
                  chatUser.avatar
                    ? { uri: chatUser.avatar }
                    : require("@/assets/noPfp.jpg")
                }
                className="w-7 h-7 rounded-full self-end mr-2 mb-1"
                style={{ backgroundColor: inputBg }}
              />
            )}
            <View
              className={`max-w-[80%] ${isMe ? "items-end" : "items-start"}`}
            >
              {hasSharedPost && (
                <PostPreviewBubble
                  postId={item.sharedPostId}
                  onLongPress={() => handleLongPress(item)}
                />
              )}
              {hasSharedPlaylist && (
                <ChatPlaylistCard
                  playlistId={item.sharedPlaylistId}
                  isMyMessage={isMe}
                />
              )}
              {hasContent && (
                <View
                  className={`px-3 py-2 rounded-[18px] ${
                    isMe ? "rounded-tr-none" : "rounded-tl-none"
                  } mt-1`}
                  style={{
                    backgroundColor: isMe ? myBubbleBg : otherBubbleBg,
                    opacity: editingMessage?.$id === item.$id ? 0.5 : 1,
                    minWidth: 80,
                  }}
                >
                  {replySnippet && (
                    <TouchableOpacity
                      onPress={() =>
                        scrollToOriginalMessage(replySnippet as string)
                      }
                      className="mb-1 rounded-md overflow-hidden border-l-4 p-1.5"
                      style={{
                        backgroundColor: isMe ? replyBoxMyBg : replyBoxOtherBg,
                        borderColor: isMe ? "rgba(255,255,255,0.7)" : "#5E17EB",
                      }}
                    >
                      <Text
                        className="text-[11px] font-bold mb-0.5"
                        style={{
                          color: isMe ? "rgba(255,255,255,0.9)" : "#5E17EB",
                        }}
                      >
                        {replyName}
                      </Text>
                      <Text
                        className="text-[12px]"
                        numberOfLines={1}
                        style={{
                          color: isMe ? "rgba(255,255,255,0.7)" : subTextColor,
                        }}
                      >
                        {replySnippet}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <Text
                    className="text-[15px] leading-5"
                    style={{ color: isMe ? myBubbleText : otherBubbleText }}
                  >
                    {displayContent}
                  </Text>
                  <View className="flex-row items-center justify-end mt-1 space-x-1">
                    <Text
                      className="text-[10px]"
                      style={{
                        color: isMe ? "rgba(255,255,255,0.6)" : subTextColor,
                      }}
                    >
                      {time}
                    </Text>
                    {isMe && (
                      <Ionicons
                        name="checkmark-done"
                        size={14}
                        color={
                          item.isRead ? "#60A5FA" : "rgba(255,255,255,0.6)"
                        }
                      />
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  // --- REEMPLAZO: Mostrar Skeleton mientras carga ---
  if (isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView
          className="flex-1"
          edges={["top"]}
          style={{ backgroundColor: bgColor }}
        >
          <ChatRoomSkeleton isDark={isDark} />
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        className="flex-1"
        edges={["top"]}
        style={{ backgroundColor: bgColor }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <View
          className="flex-row items-center px-2 py-2 border-b z-10"
          style={{ backgroundColor: headerBg, borderColor: borderColor }}
        >
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="chevron-back" size={28} color={backIconColor} />
          </TouchableOpacity>
          <Image
            source={
              chatUser.avatar
                ? { uri: chatUser.avatar }
                : require("@/assets/noPfp.jpg")
            }
            className="w-9 h-9 rounded-full"
            style={{ backgroundColor: inputBg }}
          />
          <View className="ml-3 flex-1">
            <View className="flex-row items-center">
              <Text
                className="font-bold text-base"
                numberOfLines={1}
                style={{ color: textColor }}
              >
                {chatUser.name}
              </Text>
              {/* BADGE EN EL HEADER DEL CHAT */}
              {chatUser.isVerified && (
                <MaterialIcons
                  name="verified"
                  size={14}
                  color="#5E17EB"
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
            {isOtherUserOnline && (
              <Text className="text-xs text-green-500">{t("chat.online")}</Text>
            )}
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.$id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={{ paddingVertical: 15 }}
          className="flex-1"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          {(replyingTo || editingMessage) && (
            <View
              className="flex-row items-center justify-between px-3 py-2 m-2 rounded-xl border-l-4"
              style={{
                backgroundColor: inputBg,
                borderColor: editingMessage ? "#EAB308" : "#5E17EB",
                borderLeftWidth: 4,
                elevation: 2,
              }}
            >
              <View className="flex-1 pl-2">
                <Text
                  className="text-xs font-bold mb-0.5"
                  style={{ color: editingMessage ? "#EAB308" : "#5E17EB" }}
                >
                  {editingMessage
                    ? t("chat.editing")
                    : `${t("chat.replyingTo")} ${
                        replyingTo.senderId === currentUser?.$id
                          ? t("chat.yourself")
                          : chatUser.name
                      }`}
                </Text>
                <Text
                  className="text-xs"
                  numberOfLines={1}
                  style={{ color: subTextColor }}
                >
                  {editingMessage
                    ? editingMessage.content.includes(":::REPLY:::")
                      ? editingMessage.content.split(":::REPLY:::")[1]
                      : editingMessage.cleanContent
                    : replyingTo.content.includes(":::REPLY:::")
                    ? replyingTo.content.split(":::REPLY:::")[1]
                    : replyingTo.content}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setReplyingTo(null);
                  setEditingMessage(null);
                  setNewMessage("");
                }}
                className="p-2"
              >
                <Ionicons name="close" size={20} color={iconColor} />
              </TouchableOpacity>
            </View>
          )}

          <View
            className="flex-row items-end px-3 py-3 border-t"
            style={{ backgroundColor: bgColor, borderColor: borderColor }}
          >
            <View
              className="flex-1 flex-row items-center rounded-3xl border px-4 min-h-[40px]"
              style={{ backgroundColor: inputBg, borderColor: borderColor }}
            >
              <TextInput
                ref={inputRef}
                placeholder={
                  editingMessage
                    ? t("chat.placeholderEdit")
                    : t("chat.placeholder")
                }
                placeholderTextColor={subTextColor}
                className="flex-1 text-[15px] py-2.5 max-h-28"
                style={{ color: textColor }}
                multiline
                value={newMessage}
                onChangeText={setNewMessage}
              />
            </View>
            <TouchableOpacity
              onPress={handleSend}
              className="ml-2 w-10 h-10 rounded-full items-center justify-center transition-all"
              style={{
                backgroundColor: newMessage.trim()
                  ? editingMessage
                    ? "#EAB308"
                    : "#5E17EB"
                  : inputBg,
                opacity: newMessage.trim() ? 1 : 0.7,
              }}
              disabled={!newMessage.trim()}
            >
              <Ionicons
                name={editingMessage ? "checkmark" : "send"}
                size={18}
                color={
                  newMessage.trim()
                    ? editingMessage
                      ? "black"
                      : "white"
                    : subTextColor
                }
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default ChatRoom;
