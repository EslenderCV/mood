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
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import {
  getCurrentUser,
  getChatMessages,
  sendMessage,
  client,
  appwriteConfig,
  markChatAsRead,
  getPostById,
} from "@/lib/appwrite";

// --- MEJORA: Burbuja de Post "Card Style" ---
const PostPreviewBubble = ({ postId }: { postId: string }) => {
  const [post, setPost] = useState<any>(null);

  useEffect(() => {
    getPostById(postId).then(setPost);
  }, [postId]);

  if (!post)
    return <View className="w-60 h-24 bg-zinc-900 rounded-2xl animate-pulse" />;

  const song = post.songData ? JSON.parse(post.songData) : null;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/post/${postId}`)}
      className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden w-64 shadow-2xl"
    >
      <View className="flex-row p-3 items-center">
        <Image
          source={{ uri: song?.cover }}
          className="w-14 h-14 rounded-xl shadow-md"
        />
        <View className="ml-3 flex-1">
          <Text className="text-white font-bold text-sm" numberOfLines={1}>
            {song?.title}
          </Text>
          <Text className="text-zinc-500 text-xs" numberOfLines={1}>
            {song?.artist}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#52525B" />
      </View>
      <View className="bg-zinc-800/50 px-3 py-2 flex-row items-center">
        <Image
          source={{ uri: post.postedBy?.pfp }}
          className="w-4 h-4 rounded-full mr-2"
        />
        <Text className="text-zinc-400 text-[10px]">
          Compartido por {post.postedBy?.username}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const ChatRoom = () => {
  const params = useLocalSearchParams();
  const chatId = params.id as string;
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [isOtherActive, setIsOtherActive] = useState(false); // Simulación de presencia

  useEffect(() => {
    loadData();
    // Suscripción Realtime para mensajes y actualización de lectura
    const unsubscribe = client.subscribe(
      [
        `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`,
      ],
      (response) => {
        const payload = response.payload as any;
        if (payload.chatId === chatId) {
          if (response.events.includes("*.create")) {
            setMessages((prev) => [payload, ...prev]);
            if (payload.senderId !== currentUser?.$id) markAsRead();
          }
          if (response.events.includes("*.update")) {
            setMessages((prev) =>
              prev.map((m) => (m.$id === payload.$id ? payload : m))
            );
          }
        }
      }
    );
    return () => unsubscribe();
  }, [chatId, currentUser]);

  const loadData = async () => {
    const user = await getCurrentUser();
    setCurrentUser(user);
    const msgs = await getChatMessages(chatId);
    setMessages(msgs);
    markAsRead();
  };

  const markAsRead = () => markChatAsRead(chatId, currentUser?.$id);

  const onReplySwipe = (message: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReplyingTo(message);
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    const content = replyingTo
      ? `↪ Replying to: "${replyingTo.content.substring(
          0,
          20
        )}..."\n${newMessage}`
      : newMessage;
    setNewMessage("");
    setReplyingTo(null);
    await sendMessage(
      chatId,
      currentUser.$id,
      params.otherUserId as string,
      content
    );
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === currentUser?.$id;
    const time = new Date(item.$createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <Swipeable
        renderRightActions={() => <View className="w-10" />}
        onSwipeableWillOpen={() => onReplySwipe(item)}
      >
        <View
          className={`mb-3 flex-row ${
            isMe ? "justify-end" : "justify-start"
          } px-4`}
        >
          {!isMe && (
            <Image
              source={{ uri: params.otherUserAvatar as string }}
              className="w-7 h-7 rounded-full self-end mr-2"
            />
          )}

          <View className="max-w-[80%]">
            {item.sharedPostId ? (
              <PostPreviewBubble postId={item.sharedPostId} />
            ) : (
              <View
                className={`px-4 py-2.5 rounded-[22px] ${
                  isMe
                    ? "bg-[#5E17EB] rounded-br-none"
                    : "bg-[#27272A] rounded-bl-none border border-zinc-800"
                }`}
              >
                <Text className="text-white text-[15px] leading-5">
                  {item.content}
                </Text>
                <View className="flex-row items-center justify-end mt-1 space-x-1">
                  <Text className="text-[9px] text-zinc-300 opacity-60">
                    {time}
                  </Text>
                  {isMe && (
                    <Ionicons
                      name={item.isRead ? "checkmark-done" : "checkmark"}
                      size={12}
                      color={item.isRead ? "#A5F3FC" : "white"}
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
      <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
        {/* HEADER MEJORADO */}
        <View className="flex-row items-center px-4 py-3 border-b border-zinc-900">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <Image
            source={{ uri: params.otherUserAvatar as string }}
            className="w-10 h-10 rounded-full ml-2"
          />
          <View className="ml-3 flex-1">
            <Text className="text-white font-bold text-base">
              {params.otherUserName}
            </Text>
            <View className="flex-row items-center">
              <View
                className={`w-2 h-2 rounded-full mr-1.5 ${
                  isOtherActive ? "bg-emerald-500" : "bg-zinc-600"
                }`}
              />
              <Text className="text-zinc-500 text-[10px] font-medium">
                {isOtherActive ? "Activo ahora" : "Desconectado"}
              </Text>
            </View>
          </View>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.$id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={{ paddingVertical: 20 }}
        />

        {/* INPUT TIPO WHATSAPP */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={10}
        >
          {replyingTo && (
            <View className="bg-zinc-900 px-4 py-2 border-t border-zinc-800 flex-row justify-between items-center">
              <View className="border-l-4 border-[#5E17EB] pl-3">
                <Text className="text-[#5E17EB] text-[10px] font-bold">
                  Respondiendo a
                </Text>
                <Text className="text-zinc-400 text-xs" numberOfLines={1}>
                  {replyingTo.content}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Ionicons name="close-circle" size={20} color="#71717A" />
              </TouchableOpacity>
            </View>
          )}
          <View className="flex-row items-end px-4 py-3 bg-black border-t border-zinc-900">
            <View className="flex-1 bg-[#18181B] rounded-[24px] px-4 py-2.5 border border-zinc-800 flex-row items-center">
              <TextInput
                placeholder="Escribe un mensaje..."
                placeholderTextColor="#71717A"
                className="flex-1 text-white text-[15px] max-h-24"
                multiline
                value={newMessage}
                onChangeText={setNewMessage}
              />
              <Ionicons
                name="happy-outline"
                size={24}
                color="#71717A"
                className="ml-2"
              />
            </View>
            <TouchableOpacity
              onPress={handleSend}
              className={`ml-3 w-11 h-11 rounded-full items-center justify-center ${
                newMessage.trim() ? "bg-[#5E17EB]" : "bg-zinc-800"
              }`}
            >
              <Ionicons
                name={newMessage.trim() ? "send" : "mic-outline"}
                size={20}
                color="white"
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default ChatRoom;
