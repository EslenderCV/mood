import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

// 🔥 IMPORTAMOS APPWRITE
import { client, appwriteConfig } from "@/lib/appwrite";

import { useChatGlobal } from "@/context/ChatContext";
import { useGlobalContext } from "@/context/GlobalProvider";
import { ChatListItem } from "@/components/chats/ChatListItem";
import { NewChatModal } from "@/components/chats/NewChatModal";

const ChatsHome = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { user } = useGlobalContext();
  const { conversations, loadingChats, refreshConversations } = useChatGlobal();

  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // 🔥 LISTENER PARA REFRESCAR LISTA DE CHATS
  useEffect(() => {
    if (!user?.$id) return;

    const chatChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.chatsCollectionId}.documents`;
    const msgChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`;

    const unsubscribe = client.subscribe(
      [chatChannel, msgChannel],
      (response) => {
        // Si hay una nueva conversación o mensaje, refrescamos la lista
        if (
          response.events.includes(
            "databases.*.collections.*.documents.*.create",
          ) ||
          response.events.includes(
            "databases.*.collections.*.documents.*.update",
          )
        ) {
          // Refrescamos sin spinner (silencioso)
          refreshConversations(false);
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, [user?.$id]);

  // Filtrado local para búsqueda rápida
  const filteredChats = conversations.filter((c) => {
    const name = c.otherUser?.name || c.otherUser?.username || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleOpenChat = (chat: any) => {
    router.push({
      pathname: "/chat/[id]",
      params: {
        id: chat.$id,
        otherUserId: chat.otherUser?.$id,
        otherUserName: chat.otherUser?.name || chat.otherUser?.username,
        otherUserAvatar: chat.otherUser?.pfp,
      },
    });
  };

  const handleNewChatSelect = (selectedUser: any) => {
    setShowNewChatModal(false);
    // Navegamos con un ID temporal 'new' o buscamos si ya existe en la lista local
    const existing = conversations.find(
      (c) => c.otherUser?.$id === selectedUser.$id,
    );

    router.push({
      pathname: "/chat/[id]",
      params: {
        id: existing ? existing.$id : "new",
        otherUserId: selectedUser.$id,
        otherUserName: selectedUser.name || selectedUser.username,
        otherUserAvatar: selectedUser.pfp,
      },
    });
  };

  return (
    <View
      className={`flex-1 ${isDark ? "bg-black" : "bg-white"}`}
      style={{ paddingTop: insets.top }}
    >
      {/* HEADER */}
      <View className="px-5 pt-2 pb-4">
        <View className="flex-row justify-between items-center mb-4">
          <Text
            className={`text-3xl font-bold ${isDark ? "text-white" : "text-black"}`}
          >
            Chats
          </Text>
          <TouchableOpacity
            onPress={() => setShowNewChatModal(true)}
            className="w-10 h-10 bg-[#5E17EB] rounded-full items-center justify-center"
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <View
          className={`flex-row items-center px-4 py-2.5 rounded-xl ${isDark ? "bg-zinc-900" : "bg-zinc-100"}`}
        >
          <Ionicons name="search" size={20} color="#71717A" />
          <TextInput
            placeholder="Buscar conversaciones..."
            placeholderTextColor="#71717A"
            className={`flex-1 ml-3 text-base ${isDark ? "text-white" : "text-black"}`}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* LISTA DE CHATS */}
      {loadingChats && conversations.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#5E17EB" />
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.$id}
          renderItem={({ item }) => (
            <ChatListItem
              chat={item}
              currentUserId={user?.$id || ""}
              onPress={() => handleOpenChat(item)}
              onDelete={() => {
                /* Implementar borrado luego */
              }}
            />
          )}
          ListEmptyComponent={
            <View className="mt-20 items-center px-10">
              <Ionicons name="chatbubbles-outline" size={64} color="#3F3F46" />
              <Text className="text-zinc-500 text-center mt-4">
                No tienes conversaciones activas. ¡Inicia una nueva tocando el
                botón +!
              </Text>
            </View>
          }
          refreshing={loadingChats}
          onRefresh={() => refreshConversations(true)}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* MODAL NUEVO CHAT */}
      <NewChatModal
        visible={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onUserSelect={handleNewChatSelect}
      />
    </View>
  );
};

export default ChatsHome;
