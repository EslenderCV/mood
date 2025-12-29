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
import { useColorScheme } from "nativewind"; // <--- Importante

import {
  getCurrentUser,
  getUserChats,
  searchUsers,
  getOrCreateChat,
  client,
  appwriteConfig,
} from "@/lib/appwrite";

const ChatsList = () => {
  // --- TEMA BLINDADO ---
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Colores calculados
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const inputBg = isDark ? "#18181B" : "#F4F4F5";
  const iconColor = isDark ? "#A1A1AA" : "#52525B";
  const backIconColor = isDark ? "#FFFFFF" : "#000000";
  const unreadColor = "#5E17EB"; // Morado siempre

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
    const isUnread =
      !item.lastMessageIsRead && item.lastSenderId !== currentUser?.$id;

    // Fondo ligeramente diferente si no leído (opcional, aquí lo mantengo limpio)
    const itemBg = bgColor;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleOpenChat(item.otherUser?.$id, item.otherUser)}
        className="flex-row items-center px-5 py-4 border-b"
        style={{ backgroundColor: itemBg, borderColor: borderColor }}
      >
        <Image
          source={{
            uri:
              item.otherUser?.pfp ||
              "https://cloud.appwrite.io/v1/avatars/initials?name=User",
          }}
          className="w-14 h-14 rounded-full"
          style={{ backgroundColor: inputBg }}
        />
        <View className="ml-4 flex-1 justify-center">
          <View className="flex-row justify-between items-center mb-1">
            <Text
              className="text-[16px]"
              style={{
                color: textColor,
                fontWeight: isUnread ? "bold" : "600",
              }}
            >
              {item.otherUser?.username || "Usuario"}
            </Text>
            <Text
              className="text-xs"
              style={{
                color: isUnread ? unreadColor : subTextColor,
                fontWeight: isUnread ? "bold" : "500",
              }}
            >
              {new Date(item.lastMessageAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text
              className="text-[14px] leading-5 flex-1 mr-2"
              style={{
                color: isUnread ? textColor : subTextColor,
                fontWeight: isUnread ? "bold" : "normal",
              }}
              numberOfLines={1}
            >
              {item.lastSenderId === currentUser?.$id && (
                <Text style={{ color: subTextColor, fontWeight: "normal" }}>
                  Tú:{" "}
                </Text>
              )}
              {item.lastMessage}
            </Text>

            {/* PUNTO AZUL SI NO LEÍDO */}
            {isUnread && (
              <View
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: unreadColor }}
              />
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
      className="flex-row items-center px-5 py-3 border-b"
      style={{ backgroundColor: bgColor, borderColor: borderColor }}
    >
      <Image
        source={{ uri: item.pfp }}
        className="w-12 h-12 rounded-full"
        style={{ backgroundColor: inputBg }}
      />
      <View className="ml-4 flex-1">
        <Text className="font-bold text-[16px]" style={{ color: textColor }}>
          {item.name}
        </Text>
        <Text className="text-sm" style={{ color: subTextColor }}>
          @{item.username}
        </Text>
      </View>
      <View
        className="p-2 rounded-full"
        style={{ backgroundColor: unreadColor }}
      >
        <Ionicons name="chatbubble-outline" size={18} color="white" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: bgColor }}
    >
      <View
        className="px-4 pt-2 pb-4 border-b z-10"
        style={{ backgroundColor: bgColor, borderColor: borderColor }}
      >
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <Ionicons name="arrow-back" size={26} color={backIconColor} />
          </TouchableOpacity>
          <Text
            className="font-bold text-3xl ml-2"
            style={{ color: textColor }}
          >
            Mensajes
          </Text>
        </View>

        <View
          className="rounded-2xl flex-row items-center px-4 py-3 border"
          style={{ backgroundColor: inputBg, borderColor: borderColor }}
        >
          <Ionicons name="search" size={20} color={iconColor} />
          <TextInput
            placeholder="Buscar personas..."
            placeholderTextColor={subTextColor}
            className="flex-1 ml-3 text-[16px] font-medium h-full"
            style={{ color: textColor }}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Ionicons name="close-circle" size={20} color={iconColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching ? (
        <View className="flex-1">
          <Text
            className="text-xs font-bold uppercase tracking-widest px-5 py-4"
            style={{ color: subTextColor }}
          >
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
              <Ionicons
                name="chatbubbles-outline"
                size={48}
                color={subTextColor}
                style={{ opacity: 0.5, marginBottom: 10 }}
              />
              <Text className="text-center" style={{ color: subTextColor }}>
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
