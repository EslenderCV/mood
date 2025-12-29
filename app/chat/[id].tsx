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
  Dimensions,
  Alert,
  AlertButton, // <--- Importante para corregir el error de TS
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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
} from "@/lib/appwrite";

const { width } = Dimensions.get("window");

// --- COMPONENTE: TARJETA DE POST ---
const PostPreviewBubble = ({
  postId,
  onLongPress,
}: {
  postId: string;
  onLongPress?: () => void;
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const cardBg = isDark ? "#262626" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A8A8A8" : "#737373";
  const borderColor = isDark ? "#363636" : "#E5E5E5";
  const footerBg = isDark ? "rgba(255,255,255,0.03)" : "#FAFAFA";

  const [post, setPost] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    getPostById(postId).then((data) => {
      if (isMounted) setPost(data);
    });
    return () => {
      isMounted = false;
    };
  }, [postId]);

  if (!post)
    return (
      <View
        className="w-60 h-64 rounded-[20px] justify-center items-center mb-1 border"
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
      style={{ backgroundColor: cardBg, borderColor: borderColor, width: 260 }}
    >
      {post.postedBy && (
        <View className="flex-row items-center px-3 py-2.5 space-x-2 border-b border-black/5 dark:border-white/5">
          <Image
            source={
              post.postedBy.pfp
                ? { uri: post.postedBy.pfp }
                : require("@/assets/noPfp.jpg")
            }
            className="w-6 h-6 rounded-full bg-gray-200"
          />
          <Text
            className="text-[13px] font-semibold"
            style={{ color: textColor }}
            numberOfLines={1}
          >
            {post.postedBy.username}
          </Text>
        </View>
      )}
      <View className="w-full aspect-square bg-zinc-800 relative">
        <Image
          source={
            song?.cover
              ? { uri: song.cover }
              : require("@/assets/images/icon.png")
          }
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>
      <View className="p-3" style={{ backgroundColor: footerBg }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text
              className="font-bold text-[14px] leading-tight"
              numberOfLines={1}
              style={{ color: textColor }}
            >
              {song?.title || "Canción"}
            </Text>
            <Text
              className="text-[12px] mt-0.5 font-medium"
              numberOfLines={1}
              style={{ color: subTextColor }}
            >
              {song?.artist || "Artista"}
            </Text>
          </View>
          <View className="bg-[#5E17EB] w-8 h-8 rounded-full items-center justify-center shadow-sm">
            <Ionicons
              name="play"
              size={14}
              color="white"
              style={{ marginLeft: 2 }}
            />
          </View>
        </View>
        {post.comment && (
          <Text
            className="text-[12px] mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 leading-4"
            numberOfLines={2}
            style={{ color: textColor }}
          >
            <Text className="font-bold">{post.postedBy?.username}</Text>{" "}
            {post.comment}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// --- PANTALLA PRINCIPAL ---
const ChatRoom = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Colores
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const inputBg = isDark ? "#18181B" : "#F4F4F5";
  const headerBg = isDark ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)";
  const backIconColor = isDark ? "#FFFFFF" : "#000000";
  const iconColor = isDark ? "#A1A1AA" : "#52525B";

  // COLOR ORIGINAL RESTAURADO
  const myBubbleBg = "#5E17EB";
  const myBubbleText = "#FFFFFF";
  const otherBubbleBg = isDark ? "#27272A" : "#F3F4F6";
  const otherBubbleText = isDark ? "#FFFFFF" : "#000000";

  // Fondos de la caja de respuesta
  const replyBoxMyBg = "rgba(0, 0, 0, 0.2)";
  const replyBoxOtherBg = isDark
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(0, 0, 0, 0.05)";

  const params = useLocalSearchParams();
  const chatId = params.id as string;
  const otherUserId = params.otherUserId as string;

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const rowRefs = useRef(new Map()).current;

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
              const exists = prev.find((m) => m.$id === payload.$id);
              return exists ? prev : [payload, ...prev];
            });
            getCurrentUser().then((user) => {
              if (user && payload.senderId !== user.$id) {
                markChatAsRead(chatId, user.$id);
              }
            });
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
      const user = await getCurrentUser();
      if (!user) return router.replace("/signIn");
      setCurrentUser(user);
      const msgs = await getChatMessages(chatId);
      setMessages(msgs);
      markChatAsRead(chatId, user.$id);
    } catch (error) {
      console.log("Error loading chat:", error);
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

  // --- LÓGICA DE OPCIONES ---
  const handleLongPress = (item: any) => {
    if (item.senderId !== currentUser?.$id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // ERROR CORREGIDO: Especificamos el tipo AlertButton[]
    const options: AlertButton[] = [{ text: "Cancelar", style: "cancel" }];

    if (!item.sharedPostId) {
      options.push({
        text: "Editar",
        onPress: () => startEditing(item),
      });
    }

    options.push({
      text: "Eliminar",
      style: "destructive",
      onPress: () => confirmDelete(item.$id),
    });

    Alert.alert("Opciones", "", options);
  };

  const startEditing = (item: any) => {
    setReplyingTo(null);
    let cleanContent = item.content;

    // Limpieza robusta del contenido
    if (item.content.includes(":::REPLY:::")) {
      const parts = item.content.split(":::REPLY:::");
      // parts[0] es la metadata (Nombre:::Snippet), parts[1] es el mensaje
      if (parts.length > 1) cleanContent = parts[1];
    } else if (item.content.startsWith("Replying to:")) {
      // Soporte antiguo
      const parts = item.content.split("\n\n");
      if (parts.length > 1) cleanContent = parts.slice(1).join("\n\n");
    }

    setEditingMessage({ ...item, cleanContent });
    setNewMessage(cleanContent);
    inputRef.current?.focus();
  };

  const confirmDelete = (messageId: string) => {
    Alert.alert("Eliminar mensaje", "¿Estás seguro? Se borrará para todos.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
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
      Alert.alert("Error", "No se pudo eliminar el mensaje");
      loadData();
    }
  };

  const scrollToOriginalMessage = (originalText: string) => {
    // Buscamos el mensaje que contiene el snippet
    const index = messages.findIndex((m) => {
      // Limpiamos el mensaje candidato por si también es una respuesta
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
      // Haptic feedback para confirmar que se encontró
      Haptics.selectionAsync();
    } else {
      // Opcional: Avisar si no se encontró (ej: mensajes muy antiguos no cargados)
      // Alert.alert("No encontrado", "El mensaje original no está visible.");
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser) return;

    // --- MODO EDICIÓN ---
    if (editingMessage) {
      const tempId = editingMessage.$id;
      let finalContent = newMessage;

      // Mantener la estructura de respuesta si existía
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
        Alert.alert("Error", "No se pudo editar");
      }
      return;
    }

    // --- MODO ENVÍO NORMAL ---
    let contentToSend = newMessage;

    // FORMATO AVANZADO: "NombreUsuario:::Snippet:::REPLY:::Mensaje"
    if (replyingTo) {
      // Determinar el nombre a mostrar en la respuesta
      const replyName =
        replyingTo.senderId === currentUser.$id ? "Tú" : params.otherUserName;

      // Limpiar el contenido original (para no anidar respuestas infinitas)
      let rawContent = replyingTo.content;
      if (replyingTo.content.includes(":::REPLY:::")) {
        // Si respondo a una respuesta, tomo solo el mensaje real
        rawContent = replyingTo.content.split(":::REPLY:::")[1];
      } else if (replyingTo.content.startsWith("Replying to:")) {
        rawContent = replyingTo.content.split("\n\n").slice(1).join("\n\n");
      }

      const snippet = rawContent.substring(0, 50).replace(/\n/g, " ");

      // Construimos el string con metadatos
      contentToSend = `${replyName}:::${snippet}:::REPLY:::${newMessage}`;
    }

    const tempContent = contentToSend;
    setNewMessage("");
    setReplyingTo(null);

    try {
      await sendMessage(
        chatId,
        currentUser.$id,
        otherUserId,
        tempContent,
        null
      );
    } catch (error) {
      setNewMessage(tempContent);
    }
  };

  // ACCIONES SWIPE
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

    // --- PARSEO DEL MENSAJE ---
    let displayContent = item.content;
    let replySnippet = null;
    let replyName = null;

    // 1. Formato Nuevo: "Nombre:::Snippet:::REPLY:::Mensaje"
    if (item.content.includes(":::REPLY:::")) {
      const parts = item.content.split(":::REPLY:::");
      const metadata = parts[0].split(":::");

      if (metadata.length >= 2) {
        replyName = metadata[0];
        replySnippet = metadata[1];
      } else {
        // Fallback si algo falló en el guardado
        replyName = "Respuesta";
        replySnippet = metadata[0];
      }
      displayContent = parts[1];
    }
    // 2. Formato Antiguo (Legacy): "Replying to:..."
    else if (item.content.startsWith("Replying to:")) {
      const parts = item.content.split("\n\n");
      if (parts.length > 1) {
        replyName = "Respuesta"; // No teníamos nombre antes
        replySnippet = parts[0].replace("Replying to: ", "").replace(/"/g, "");
        displayContent = parts.slice(1).join("\n\n");
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
                source={{ uri: params.otherUserAvatar as string }}
                className="w-7 h-7 rounded-full self-end mr-2 mb-1"
                style={{ backgroundColor: inputBg }}
              />
            )}
            <View
              className={`max-w-[80%] ${isMe ? "items-end" : "items-start"}`}
            >
              {item.sharedPostId ? (
                <PostPreviewBubble
                  postId={item.sharedPostId}
                  onLongPress={() => handleLongPress(item)}
                />
              ) : (
                <View
                  className={`px-3 py-2 rounded-[18px] ${
                    isMe ? "rounded-tr-none" : "rounded-tl-none"
                  }`}
                  style={{
                    backgroundColor: isMe ? myBubbleBg : otherBubbleBg,
                    opacity: editingMessage?.$id === item.$id ? 0.5 : 1,
                    minWidth: 100,
                  }}
                >
                  {/* CAJA DE RESPUESTA (ESTILO WHATSAPP) */}
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

                  {/* TEXTO DEL MENSAJE */}
                  <Text
                    className="text-[15px] leading-5"
                    style={{ color: isMe ? myBubbleText : otherBubbleText }}
                  >
                    {displayContent}
                  </Text>

                  {/* META (HORA + CHECK) */}
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        className="flex-1"
        edges={["top"]}
        style={{ backgroundColor: bgColor }}
      >
        <Stack.Screen
          options={{
            headerShown: false,
            gestureEnabled: true,
            gestureDirection: "horizontal",
            animation: "slide_from_right",
          }}
        />

        {/* HEADER */}
        <View
          className="flex-row items-center px-2 py-2 border-b z-10"
          style={{ backgroundColor: headerBg, borderColor: borderColor }}
        >
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="chevron-back" size={28} color={backIconColor} />
          </TouchableOpacity>
          <Image
            source={{ uri: params.otherUserAvatar as string }}
            className="w-9 h-9 rounded-full"
            style={{ backgroundColor: inputBg }}
          />
          <View className="ml-3 flex-1">
            <Text
              className="font-bold text-base"
              numberOfLines={1}
              style={{ color: textColor }}
            >
              {params.otherUserName}
            </Text>
            {isOtherUserOnline && (
              <Text className="text-xs text-green-500">En línea</Text>
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
          onScrollToIndexFailed={() => {}}
        />

        {/* INPUT */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          {/* BARRA FLOTANTE DE RESPUESTA/EDICIÓN */}
          {(replyingTo || editingMessage) && (
            <View
              className="flex-row items-center justify-between px-3 py-2 m-2 rounded-xl border-l-4"
              style={{
                backgroundColor: inputBg,
                borderColor: editingMessage ? "#EAB308" : "#5E17EB",
                borderLeftWidth: 4,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                elevation: 2,
              }}
            >
              <View className="flex-1 pl-2">
                <Text
                  className="text-xs font-bold mb-0.5"
                  style={{ color: editingMessage ? "#EAB308" : "#5E17EB" }}
                >
                  {editingMessage
                    ? "Editando mensaje"
                    : `Respondiendo a ${
                        replyingTo.senderId === currentUser?.$id
                          ? "ti mismo"
                          : params.otherUserName
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
                  editingMessage ? "Edita tu mensaje..." : "Mensaje..."
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
