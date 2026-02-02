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

  // Listener para refrescar (Mismo código de lógica, solo UI cambiada)
  useEffect(() => {
    if (!user?.$id) return;
    const chatChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.chatsCollectionId}.documents`;
    const msgChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`;
    const unsubscribe = client.subscribe(
      [chatChannel, msgChannel],
      (response) => {
        if (
          response.events.some(
            (e) => e.includes(".create") || e.includes(".update"),
          )
        ) {
          refreshConversations(false);
        }
      },
    );
    return () => unsubscribe();
  }, [refreshConversations, user?.$id]);

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
    } as any);
  };

  const handleNewChatSelect = (selectedUser: any) => {
    setShowNewChatModal(false);
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
    } as any);
  };

  return (
    <View
      className={`flex-1 ${isDark ? "bg-black" : "bg-white"}`}
      style={{ paddingTop: insets.top }}
    >
      {/* HEADER iOS STYLE */}
      <View className="px-5 pb-2">
        <View className="flex-row justify-between items-center mb-2 mt-2">
          <Text
            className={`text-[34px] font-bold ${isDark ? "text-white" : "text-black"}`}
          >
            Chats
          </Text>
          <TouchableOpacity
            onPress={() => setShowNewChatModal(true)}
            className="w-9 h-9 bg-[#5E17EB] rounded-full items-center justify-center shadow-md"
          >
            <Ionicons name="create-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <View
          className={`flex-row items-center px-4 h-10 rounded-xl ${isDark ? "bg-[#1C1C1E]" : "bg-zinc-100"}`}
        >
          <Ionicons name="search" size={18} color="#A1A1AA" />
          <TextInput
            placeholder="Buscar"
            placeholderTextColor="#A1A1AA"
            className={`flex-1 ml-2 text-[16px] ${isDark ? "text-white" : "text-black"}`}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* LISTA */}
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
                /* Implementar */
              }}
            />
          )}
          ListEmptyComponent={
            <View className="mt-20 items-center px-10">
              <View className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full items-center justify-center mb-4">
                <Ionicons name="chatbubbles" size={40} color="#5E17EB" />
              </View>
              <Text className="text-zinc-500 text-center text-lg font-medium">
                Sin mensajes aún
              </Text>
              <Text className="text-zinc-400 text-center mt-1">
                Inicia una conversación con tus amigos de Mood.
              </Text>
            </View>
          }
          refreshing={loadingChats}
          onRefresh={() => refreshConversations(true)}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <NewChatModal
        visible={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onUserSelect={handleNewChatSelect}
      />
    </View>
  );
};

export default ChatsHome;
