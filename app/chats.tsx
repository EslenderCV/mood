import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from "react-native";
import React, { useState, useCallback, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getCurrentUser,
  getUserChats,
  searchUsers,
  getOrCreateChat,
  client,
  appwriteConfig,
} from "@/lib/appwrite";

const ChatsList = () => {
  const [chats, setChats] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 1. Carga inicial
  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [])
  );

  // 2. Realtime
  useEffect(() => {
    const unsubscribe = client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.chatsCollectionId}.documents`,
      (response) => {
        if (
          response.events.includes(
            "databases.*.collections.*.documents.*.update"
          ) ||
          response.events.includes(
            "databases.*.collections.*.documents.*.create"
          )
        ) {
          const payload = response.payload as any;
          if (currentUser && payload.search_params.includes(currentUser.$id)) {
            loadChats();
          }
        }
      }
    );
    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const loadChats = async () => {
    try {
      let user = currentUser;
      if (!user) {
        user = await getCurrentUser();
        setCurrentUser(user);
      }
      if (user) {
        const res = await getUserChats(user.$id);
        setChats(res);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length > 1) {
      setIsSearching(true);
      const users = await searchUsers(text);
      setSearchResults(users.filter((u) => u.$id !== currentUser?.$id));
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const handleOpenChat = async (
    otherUserId: string,
    otherUserFixedData?: any
  ) => {
    if (!currentUser) return;
    try {
      const chatDoc = await getOrCreateChat(currentUser.$id, otherUserId);
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: chatDoc.$id,
          otherUserId: otherUserId,
          otherUserName: otherUserFixedData?.username || "Usuario",
          otherUserAvatar: otherUserFixedData?.pfp || "",
        },
      });
      setSearchQuery("");
      setIsSearching(false);
    } catch (error) {
      console.log("Error abriendo chat:", error);
    }
  };

  const renderChatItem = ({ item }: { item: any }) => {
    // LÓGICA DE NO LEÍDO:
    // 1. El último mensaje no está leído.
    // 2. Y ADEMÁS, el que lo envió NO soy yo (lastSenderId != mi ID).
    const isUnread =
      !item.lastMessageIsRead && item.lastSenderId !== currentUser?.$id;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleOpenChat(item.otherUser?.$id, item.otherUser)}
        className="flex-row items-center px-5 py-4 border-b border-zinc-900 bg-black"
      >
        <Image
          source={{
            uri:
              item.otherUser?.pfp ||
              "https://cloud.appwrite.io/v1/avatars/initials?name=User",
          }}
          className="w-14 h-14 rounded-full bg-zinc-800"
        />
        <View className="ml-4 flex-1 justify-center">
          <View className="flex-row justify-between items-center mb-1">
            <Text
              className={`text-white text-[16px] ${
                isUnread ? "font-bold" : "font-semibold"
              }`}
            >
              {item.otherUser?.username || "Usuario"}
            </Text>
            <Text
              className={`text-xs ${
                isUnread
                  ? "text-[#5E17EB] font-bold"
                  : "text-zinc-500 font-medium"
              }`}
            >
              {new Date(item.lastMessageAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text
              className={`text-[14px] leading-5 flex-1 mr-2 ${
                isUnread ? "text-white font-bold" : "text-zinc-400 font-normal"
              }`}
              numberOfLines={1}
            >
              {/* Si yo fui el último, pongo "Tú: " */}
              {item.lastSenderId === currentUser?.$id && (
                <Text className="font-normal text-zinc-500">Tú: </Text>
              )}
              {item.lastMessage}
            </Text>

            {/* PUNTO AZUL SI NO LEÍDO */}
            {isUnread && (
              <View className="w-2.5 h-2.5 rounded-full bg-[#5E17EB]" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearchItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => handleOpenChat(item.$id, item)}
      className="flex-row items-center px-5 py-3 border-b border-zinc-900 bg-black"
    >
      <Image
        source={{ uri: item.pfp }}
        className="w-12 h-12 rounded-full bg-zinc-800"
      />
      <View className="ml-4 flex-1">
        <Text className="text-white font-bold text-[16px]">{item.name}</Text>
        <Text className="text-zinc-500 text-sm">@{item.username}</Text>
      </View>
      <View className="bg-[#5E17EB] p-2 rounded-full">
        <Ionicons name="chatbubble-outline" size={18} color="white" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      <View className="px-4 pt-2 pb-4 border-b border-zinc-900 bg-black z-10">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <Ionicons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-3xl ml-2">Mensajes</Text>
        </View>
        <View className="bg-zinc-900/80 rounded-2xl flex-row items-center px-4 py-3 border border-zinc-800">
          <Ionicons name="search" size={20} color="#A1A1AA" />
          <TextInput
            placeholder="Buscar personas..."
            placeholderTextColor="#71717A"
            className="flex-1 text-white ml-3 text-[16px] font-medium h-full"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Ionicons name="close-circle" size={20} color="#71717A" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching ? (
        <View className="flex-1">
          <Text className="text-zinc-500 text-xs font-bold uppercase tracking-widest px-5 py-4">
            Resultados
          </Text>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.$id}
            renderItem={renderSearchItem}
          />
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.$id}
          renderItem={renderChatItem}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadChats}
              tintColor="#5E17EB"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center mt-32 px-10">
              <Text className="text-zinc-500 text-center">
                No tienes chats activos
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default ChatsList;
