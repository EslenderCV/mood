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
  client,
  appwriteConfig,
  markChatAsRead,
  getPostById,
} from "@/lib/appwrite";

const { width } = Dimensions.get("window");

// --- COMPONENTE: TARJETA DE POST (ESTILO INSTAGRAM VERTICAL) ---
const PostPreviewBubble = ({ postId }: { postId: string }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Colores Premium
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
      onPress={() => router.push(`/post/${postId}`)}
      className="rounded-[22px] overflow-hidden mb-1 border shadow-sm"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
        width: 260,
      }}
    >
      {/* 1. HEADER: USUARIO */}
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

      {/* 2. MEDIA: PORTADA GRANDE */}
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
        <View className="absolute bottom-0 w-full h-10 bg-black/10" />
      </View>

      {/* 3. FOOTER */}
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

  const myBubbleBg = "#5E17EB";
  const otherBubbleBg = isDark ? "#27272A" : "#F3F4F6";
  const otherBubbleText = isDark ? "#FFFFFF" : "#000000";

  const params = useLocalSearchParams();
  const chatId = params.id as string;
  const otherUserId = params.otherUserId as string;

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);

  const flatListRef = useRef<FlatList>(null);
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
            setMessages((prev) => [payload, ...prev]);
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
    const ref = rowRefs.get(message.$id);
    if (ref) ref.close();
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser) return;
    let contentToSend = newMessage;
    if (replyingTo) {
      const replyPreview =
        replyingTo.content.length > 30
          ? replyingTo.content.substring(0, 30) + "..."
          : replyingTo.content;
      contentToSend = `Replying to: "${replyPreview}"\n\n${newMessage}`;
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
      console.log("Error sending:", error);
      setNewMessage(tempContent);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === currentUser?.$id;
    const time = new Date(item.$createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const isReply = item.content.startsWith("Replying to:");

    return (
      <Swipeable
        ref={(ref) => {
          if (ref && item.$id) rowRefs.set(item.$id, ref);
        }}
        // --- CAMBIO CLAVE: Usar renderRightActions (Deslizar a la Izquierda) ---
        // Esto evita el conflicto con el gesto de navegación (Deslizar a la Derecha)
        renderRightActions={() => (
          <View className="justify-center items-end pr-4 w-20">
            <Ionicons name="arrow-undo" size={24} color={iconColor} />
          </View>
        )}
        onSwipeableWillOpen={() => onSwipeToReply(item)}
        // Umbral para activar el gesto (evita conflictos con scroll vertical)
        activeOffsetX={[-20, 20]}
        friction={2}
        overshootRight={false}
      >
        <View
          className={`mb-3 flex-row ${
            isMe ? "justify-end" : "justify-start"
          } px-4`}
        >
          {!isMe && (
            <Image
              source={{ uri: params.otherUserAvatar as string }}
              className="w-8 h-8 rounded-full self-end mr-2 mb-1"
              style={{ backgroundColor: inputBg }}
            />
          )}
          <View className={`max-w-[85%] ${isMe ? "items-end" : "items-start"}`}>
            {item.sharedPostId ? (
              <PostPreviewBubble postId={item.sharedPostId} />
            ) : (
              <View
                className={`px-4 py-2.5 rounded-[20px] ${
                  isMe ? "rounded-br-sm" : "rounded-bl-sm"
                }`}
                style={{
                  backgroundColor: isMe ? myBubbleBg : otherBubbleBg,
                  borderWidth: isMe ? 0 : 1,
                  borderColor: isMe ? "transparent" : borderColor,
                }}
              >
                {isReply && (
                  <View
                    className="mb-2 pl-2 border-l-2"
                    style={{
                      borderColor: isMe
                        ? "rgba(255,255,255,0.3)"
                        : subTextColor,
                    }}
                  >
                    <Text
                      className="text-xs italic"
                      style={{
                        color: isMe ? "rgba(255,255,255,0.8)" : subTextColor,
                      }}
                    >
                      {item.content.split("\n\n")[0]}
                    </Text>
                  </View>
                )}
                <Text
                  className="text-[15px] leading-5"
                  style={{ color: isMe ? "#FFFFFF" : otherBubbleText }}
                >
                  {isReply ? item.content.split("\n\n")[1] : item.content}
                </Text>
                <View className="flex-row items-center justify-end mt-1 space-x-1 opacity-70">
                  <Text
                    className="text-[10px]"
                    style={{ color: isMe ? "#E0E7FF" : subTextColor }}
                  >
                    {time}
                  </Text>
                  {isMe && (
                    <Ionicons
                      name="checkmark-done"
                      size={14}
                      color={item.isRead ? "#60A5FA" : "#E0E7FF"}
                    />
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
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
        {/* NAVEGACIÓN Y GESTOS */}
        <Stack.Screen
          options={{
            headerShown: false,
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
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
            className="w-10 h-10 rounded-full"
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
            <Text
              className="text-xs"
              style={{ color: isOtherUserOnline ? "#34D399" : subTextColor }}
            >
              {isOtherUserOnline ? "En línea" : "Desconectado"}
            </Text>
          </View>
        </View>

        {/* LISTA */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.$id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={{ paddingVertical: 15 }}
          className="flex-1"
        />

        {/* INPUT */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          {replyingTo && (
            <View
              className="flex-row items-center justify-between px-4 py-2 border-t"
              style={{ backgroundColor: inputBg, borderColor: borderColor }}
            >
              <View className="flex-1 border-l-4 border-[#5E17EB] pl-3 py-1">
                <Text className="text-[#5E17EB] text-xs font-bold mb-0.5">
                  Respondiendo a
                </Text>
                <Text
                  className="text-xs"
                  numberOfLines={1}
                  style={{ color: subTextColor }}
                >
                  {replyingTo.content}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReplyingTo(null)}
                className="p-2"
              >
                <Ionicons name="close-circle" size={24} color={iconColor} />
              </TouchableOpacity>
            </View>
          )}
          <View
            className="flex-row items-end px-3 py-3 border-t"
            style={{ backgroundColor: bgColor, borderColor: borderColor }}
          >
            <View
              className="flex-1 flex-row items-center rounded-3xl border px-4 min-h-[44px]"
              style={{ backgroundColor: inputBg, borderColor: borderColor }}
            >
              <TextInput
                placeholder="Mensaje..."
                placeholderTextColor={subTextColor}
                className="flex-1 text-[15px] py-3 max-h-32"
                style={{ color: textColor }}
                multiline
                value={newMessage}
                onChangeText={setNewMessage}
              />
            </View>
            <TouchableOpacity
              onPress={handleSend}
              className="ml-2 w-11 h-11 rounded-full items-center justify-center transition-all"
              style={{
                backgroundColor: newMessage.trim() ? "#5E17EB" : inputBg,
                opacity: newMessage.trim() ? 1 : 0.7,
              }}
              disabled={!newMessage.trim()}
            >
              <Ionicons
                name="send"
                size={20}
                color={newMessage.trim() ? "white" : subTextColor}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default ChatRoom;
