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
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";
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

// --- COMPONENTE: TARJETA DE POST (Estilo Spotify/Card) ---
const PostPreviewBubble = ({ postId }: { postId: string }) => {
  const [post, setPost] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    getPostById(postId).then((data) => {
      if (isMounted) setPost(data);
    });
    return () => { isMounted = false; };
  }, [postId]);

  if (!post) return (
    <View className="w-60 h-20 bg-zinc-900 rounded-2xl border border-zinc-800 justify-center items-center">
      <ActivityIndicator color="#5E17EB" size="small" />
    </View>
  );

  const song = post.songData ? JSON.parse(post.songData) : null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/post/${postId}`)}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden w-64 mt-1"
    >
      <View className="flex-row p-3 items-center">
        {song?.cover ? (
          <Image source={{ uri: song.cover }} className="w-12 h-12 rounded-md mr-3 bg-zinc-800" />
        ) : (
          <View className="w-12 h-12 rounded-md mr-3 bg-zinc-800 items-center justify-center">
            <Ionicons name="musical-note" color="gray" size={20} />
          </View>
        )}
        <View className="flex-1 justify-center">
          <Text className="text-white font-bold text-sm" numberOfLines={1}>{song?.title || "Sin título"}</Text>
          <Text className="text-zinc-400 text-xs" numberOfLines={1}>{song?.artist || "Desconocido"}</Text>
        </View>
        <Ionicons name="play-circle" size={28} color="#5E17EB" />
      </View>
      <View className="bg-zinc-950 px-3 py-1.5 flex-row items-center border-t border-zinc-800">
        <Ionicons name="share-social-outline" size={12} color="#71717A" />
        <Text className="text-zinc-500 text-[10px] ml-1">Compartido por {post.postedBy?.username}</Text>
      </View>
    </TouchableOpacity>
  );
};

// --- PANTALLA PRINCIPAL ---
const ChatRoom = () => {
  const params = useLocalSearchParams();
  const chatId = params.id as string;
  const otherUserId = params.otherUserId as string;

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false); // Simulado por ahora

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadData();

    // SUSCRIPCIÓN REALTIME
    const unsubscribe = client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`,
      (response) => {
        const payload = response.payload as any;
        
        // Solo actuar si es de este chat
        if (payload.chatId === chatId) {
          // 1. NUEVO MENSAJE
          if (response.events.includes("databases.*.collections.*.documents.*.create")) {
            setMessages((prev) => [payload, ...prev]);
            
            // Si el mensaje NO es mío, marcarlo como leído inmediatamente
            getCurrentUser().then(user => {
               if(user && payload.senderId !== user.$id) {
                 markChatAsRead(chatId, user.$id);
               }
            });
          }
          
          // 2. ACTUALIZACIÓN (Ej: Alguien leyó el mensaje -> isRead cambia a true)
          if (response.events.includes("databases.*.collections.*.documents.*.update")) {
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
      if(!user) {
        // Redirigir si no hay usuario (protección extra)
        return router.replace("/signIn");
      }
      setCurrentUser(user);
      
      const msgs = await getChatMessages(chatId);
      setMessages(msgs);
      
      // Marcar como leídos al entrar
      markChatAsRead(chatId, user.$id);
    } catch (error) {
      console.log("Error loading chat:", error);
    }
  };

  const onSwipeToReply = (message: any) => {
    // Vibración suave estilo iOS
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReplyingTo(message);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser) return;

    // Lógica de respuesta (Cita)
    let contentToSend = newMessage;
    if (replyingTo) {
      const replyPreview = replyingTo.content.length > 30 
        ? replyingTo.content.substring(0, 30) + "..." 
        : replyingTo.content;
      // Añadimos metadata visual al texto (puedes mejorar esto guardándolo en un campo separado si prefieres)
      contentToSend = `Replying to: "${replyPreview}"\n\n${newMessage}`;
    }

    const tempContent = contentToSend;
    setNewMessage("");
    setReplyingTo(null);

    try {
      // Usamos tu función sendMessage del lib/appwrite.ts
      // Argumentos: chatId, senderId, receiverId, content, sharedPostId
      await sendMessage(chatId, currentUser.$id, otherUserId, tempContent, null);
    } catch (error) {
      console.log("Error sending:", error);
      setNewMessage(tempContent); // Restaurar si falla
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === currentUser?.$id;
    const time = new Date(item.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isReply = item.content.startsWith("Replying to:");

    return (
      <Swipeable
        renderRightActions={() => <View className="w-10" />} // Espacio vacío para permitir el gesto
        onSwipeableWillOpen={() => onSwipeToReply(item)}
        friction={2}
      >
        <View className={`mb-2 flex-row ${isMe ? "justify-end" : "justify-start"} px-4`}>
          {!isMe && (
            <Image
              source={{ uri: params.otherUserAvatar as string }}
              className="w-8 h-8 rounded-full self-end mr-2 mb-1"
            />
          )}

          <View className={`max-w-[80%] ${isMe ? "items-end" : "items-start"}`}>
            {item.sharedPostId ? (
              // --- RENDERIZADO DE POST ---
              <PostPreviewBubble postId={item.sharedPostId} />
            ) : (
              // --- RENDERIZADO DE TEXTO ---
              <View
                className={`px-4 py-2 rounded-2xl ${
                  isMe ? "bg-[#5E17EB] rounded-br-sm" : "bg-zinc-800 rounded-bl-sm border border-zinc-700"
                }`}
              >
                {/* Estilo especial para respuestas */}
                {isReply && (
                   <View className="mb-2 pl-2 border-l-2 border-white/30">
                     <Text className="text-white/60 text-xs italic">{item.content.split("\n\n")[0]}</Text>
                   </View>
                )}
                
                <Text className="text-white text-[15px] leading-5">
                  {isReply ? item.content.split("\n\n")[1] : item.content}
                </Text>

                {/* Footer del mensaje: Hora + Visto */}
                <View className="flex-row items-center justify-end mt-1 space-x-1">
                  <Text className="text-[10px] text-white/50">{time}</Text>
                  {isMe && (
                    <Ionicons 
                      name="checkmark-done" 
                      size={14} 
                      color={item.isRead ? "#38BDF8" : "rgba(255,255,255,0.3)"} // Azul si leido, gris si no
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
        {/* --- HEADER --- */}
        <View className="flex-row items-center px-2 py-2 border-b border-zinc-900 bg-black/90 blur-md z-10">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          
          <Image source={{ uri: params.otherUserAvatar as string }} className="w-10 h-10 rounded-full bg-zinc-800" />
          
          <View className="ml-3 flex-1">
            <Text className="text-white font-bold text-base" numberOfLines={1}>
              {params.otherUserName}
            </Text>
            {/* Lógica de "En Línea" */}
            <Text className={`text-xs ${isOtherUserOnline ? "text-emerald-400" : "text-zinc-500"}`}>
               {isOtherUserOnline ? "En línea" : "Desconectado"}
            </Text>
          </View>

          <TouchableOpacity className="p-2">
             <Ionicons name="videocam-outline" size={26} color="#71717A" /> 
          </TouchableOpacity>
        </View>

        {/* --- LISTA MENSAJES --- */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.$id}
          renderItem={renderMessage}
          inverted // Importante para chat
          contentContainerStyle={{ paddingVertical: 15 }}
          className="flex-1"
        />

        {/* --- INPUT AREA --- */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          {/* Barra de Respuesta */}
          {replyingTo && (
            <View className="flex-row items-center justify-between px-4 py-2 bg-zinc-900 border-t border-zinc-800">
              <View className="flex-1 border-l-4 border-[#5E17EB] pl-3 py-1">
                <Text className="text-[#5E17EB] text-xs font-bold mb-0.5">Respondiendo a</Text>
                <Text className="text-zinc-400 text-xs" numberOfLines={1}>{replyingTo.content}</Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)} className="p-2">
                <Ionicons name="close-circle" size={24} color="#52525B" />
              </TouchableOpacity>
            </View>
          )}

          {/* Caja de Texto */}
          <View className="flex-row items-end px-3 py-3 bg-black border-t border-zinc-900">
            <View className="flex-1 flex-row items-center bg-zinc-900 rounded-3xl border border-zinc-800 px-4 min-h-[44px]">
              <TextInput
                placeholder="Mensaje..."
                placeholderTextColor="#71717A"
                className="flex-1 text-white text-[15px] py-3 max-h-32"
                multiline
                value={newMessage}
                onChangeText={setNewMessage}
              />
            </View>
            
            <TouchableOpacity 
              onPress={handleSend}
              className={`ml-2 w-11 h-11 rounded-full items-center justify-center ${
                newMessage.trim() ? "bg-[#5E17EB]" : "bg-zinc-800"
              }`}
              disabled={!newMessage.trim()}
            >
              <Ionicons 
                name={newMessage.trim() ? "send" : "mic"} 
                size={20} 
                color={newMessage.trim() ? "white" : "#71717A"} 
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default ChatRoom;