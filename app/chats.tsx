import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Animated,
  Modal,
  ActivityIndicator,
} from "react-native";
import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/Swipeable";

import {
  getCurrentUser,
  getUserChats,
  searchUsers,
  getLatestUsers,
  deleteChat,
  client,
  appwriteConfig,
  markChatAsRead,
  getOrCreateChat,
} from "@/lib/appwrite";
import { useLanguage } from "@/context/LanguageContext";

// --- COMPONENTE MODAL PARA NUEVO CHAT ---
const NewChatModal = ({ visible, onClose, onUserSelect }: any) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const bgColor = isDark ? "#18181B" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const inputBg = isDark ? "#27272A" : "#F4F4F5";
  const borderColor = isDark ? "#3F3F46" : "#E5E5E5";
  const closeBtnBg = isDark ? "#3F3F46" : "#E4E4E7";
  const closeBtnIcon = isDark ? "#FFFFFF" : "#18181B";

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        let res;
        if (query.trim().length > 0) {
          res = await searchUsers(query);
        } else {
          res = await getLatestUsers();
        }
        setUsers(res || []);
      } catch (error) {
        console.log("Error buscando usuarios:", error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchUsers, 500);
    return () => clearTimeout(timeoutId);
  }, [query, visible]);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-end">
        <View
          className="h-[90%] rounded-t-[32px] overflow-hidden shadow-2xl"
          style={{ backgroundColor: bgColor }}
        >
          <View
            className="px-6 pt-6 pb-4 flex-row items-center justify-between border-b"
            style={{ borderColor }}
          >
            <Text
              className="text-xl font-bold tracking-tight"
              style={{ color: textColor }}
            >
              Nuevo Mensaje
            </Text>

            <TouchableOpacity
              onPress={onClose}
              className="p-2 rounded-full"
              style={{ backgroundColor: closeBtnBg }}
            >
              <Ionicons name="close" size={20} color={closeBtnIcon} />
            </TouchableOpacity>
          </View>

          <View className="px-5 py-4">
            <View
              className="flex-row items-center px-4 py-3 rounded-2xl"
              style={{ backgroundColor: inputBg }}
            >
              <Ionicons name="search" size={20} color={subTextColor} />
              <TextInput
                placeholder="Buscar por nombre o usuario..."
                placeholderTextColor={subTextColor}
                className="flex-1 ml-3 text-base"
                style={{ color: textColor }}
                value={query}
                onChangeText={setQuery}
                autoFocus={false}
              />
            </View>
          </View>

          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#5E17EB" />
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item.$id}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: 40,
              }}
              ListEmptyComponent={
                <View className="mt-10 items-center">
                  <Text style={{ color: subTextColor }}>
                    No se encontraron usuarios
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => onUserSelect(item)}
                  className="flex-row items-center py-4 border-b"
                  style={{ borderColor: isDark ? "#27272A" : "#F4F4F5" }}
                >
                  <Image
                    source={{
                      uri:
                        item.pfp ||
                        "https://cloud.appwrite.io/v1/avatars/initials?name=" +
                          (item.name || item.username),
                    }}
                    className="w-12 h-12 rounded-full bg-zinc-700"
                  />
                  <View className="ml-4 flex-1">
                    <Text
                      className="font-bold text-base"
                      numberOfLines={1}
                      style={{ color: textColor }}
                    >
                      {item.name || item.username || "Usuario"}
                    </Text>
                    <Text
                      className="text-sm"
                      numberOfLines={1}
                      style={{ color: subTextColor }}
                    >
                      @{item.username}
                    </Text>
                  </View>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={24}
                    color="#5E17EB"
                  />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

// --- COMPONENTE PRINCIPAL CHATSLIST ---
const ChatsList = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#F4F4F5";
  const inputBg = isDark ? "#18181B" : "#F4F4F5";
  const unreadColor = "#5E17EB";
  const deleteColor = "#EF4444";
  const fabColor = "#5E17EB";

  const [chats, setChats] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [isNewChatVisible, setIsNewChatVisible] = useState(false);

  let row: Array<Swipeable | null> = [];
  let prevOpenedRow: Swipeable | null;

  const lastVisitedUserId = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [])
  );

  // --- LÓGICA ESPEJO EN TIEMPO REAL ---
  useEffect(() => {
    if (!currentUser || !client) return;

    const channels = [
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.chatsCollectionId}.documents`,
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`,
    ];

    const unsubscribe = client.subscribe(channels, (response) => {
      const payload: any = response.payload;
      const event = response.events[0];

      // 1. ESPEJO DE CHATS (Si cambia el documento del chat en la DB, actualizamos aquí)
      if (event.includes(`collections.${appwriteConfig.chatsCollectionId}`)) {
        if (event.includes(".update")) {
          // Si el chat se actualiza (ej: lastMessageIsRead cambia en el backend),
          // reemplazamos el item local con la data fresca del servidor.
          setChats((prevChats) =>
            prevChats.map((chat) => {
              if (chat.$id === payload.$id) {
                // Mantenemos la estructura pero actualizamos los campos cambiados
                return { ...chat, ...payload };
              }
              return chat;
            })
          );
        }

        // Si se crea un nuevo chat para mí
        if (event.includes(".create")) {
          if (payload.users && payload.users.includes(currentUser.$id)) {
            loadChats(); // Recargar para traer datos completos (populados)
          }
        }
      }

      // 2. ESPEJO DE MENSAJES
      if (
        event.includes(`collections.${appwriteConfig.messagesCollectionId}`)
      ) {
        // Si un mensaje se marca como LEÍDO
        if (event.includes(".update") && payload.isRead === true) {
          setChats((prevChats) =>
            prevChats.map((chat) => {
              // Si este mensaje es el último del chat, actualizamos el chat a leído
              if (
                chat.$id === payload.chatId ||
                chat.lastMessage === payload.content
              ) {
                return { ...chat, lastMessageIsRead: true };
              }
              return chat;
            })
          );
        }

        // Si llega un mensaje NUEVO
        if (event.includes(".create")) {
          if (
            payload.senderId === currentUser.$id ||
            payload.receiverId === currentUser.$id
          ) {
            loadChats(); // Recargar para reordenar la lista
          }
        }
      }
    });

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

        const activeChats = res.filter(
          (c: any) => c.lastMessage && c.lastMessage.trim() !== ""
        );

        // Mapeo inicial para consistencia visual inmediata
        const fixedChats = activeChats.map((c: any) => {
          if (c.otherUser && lastVisitedUserId.current === c.otherUser.$id) {
            return {
              ...c,
              lastMessageIsRead: true,
            };
          }
          return c;
        });
        setChats(fixedChats);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = useMemo(() => {
    if (!localSearchQuery) return chats;
    const lowerQuery = localSearchQuery.toLowerCase();
    return chats.filter((chat) => {
      const name = (chat.otherUser?.name || "").toLowerCase();
      const username = (chat.otherUser?.username || "").toLowerCase();
      const lastMsg = (chat.lastMessage || "").toLowerCase();

      return (
        name.includes(lowerQuery) ||
        username.includes(lowerQuery) ||
        lastMsg.includes(lowerQuery)
      );
    });
  }, [chats, localSearchQuery]);

  const handleDeleteChat = async (chatId: string, index: number) => {
    Alert.alert(t("chatsList.deleteTitle"), t("chatsList.deleteMsg"), [
      {
        text: t("chatsList.cancel"),
        style: "cancel",
        onPress: () => closeRow(index),
      },
      {
        text: t("chatsList.deleteOption"),
        style: "destructive",
        onPress: async () => {
          const newChats = [...chats];
          newChats.splice(index, 1);
          setChats(newChats);
          closeRow(index);
          try {
            await deleteChat(chatId);
          } catch (error) {
            loadChats();
          }
        },
      },
    ]);
  };

  const closeRow = (index: number) => {
    if (prevOpenedRow && prevOpenedRow !== row[index]) {
      prevOpenedRow.close();
    }
    prevOpenedRow = row[index];
  };

  // --- CORRECCIÓN DEL BUG ---
  const handleOpenChat = async (
    otherUserId: string,
    otherUserFixedData?: any
  ) => {
    if (!currentUser) return;

    lastVisitedUserId.current = otherUserId;
    setIsNewChatVisible(false);

    const existingChat = chats.find((c) => c.otherUser?.$id === otherUserId);

    let targetChatId = "new";

    if (existingChat) {
      targetChatId = existingChat.$id;

      // 1. Actualización Optimista (Visual Inmediata)
      setChats((prev) =>
        prev.map((c) =>
          c.$id === existingChat.$id ? { ...c, lastMessageIsRead: true } : c
        )
      );

      // 2. Actualización en Servidor (CORREGIDO: Solo 2 argumentos)
      try {
        // Await para asegurar persistencia antes de salir de la pantalla
        await markChatAsRead(existingChat.$id, currentUser.$id);
      } catch (e) {
        console.error("Error al marcar leído en servidor:", e);
      }
    }

    // 3. Navegación
    router.push({
      pathname: "/chat/[id]",
      params: {
        id: targetChatId,
        otherUserId: otherUserId,
        otherUserName:
          otherUserFixedData?.name || otherUserFixedData?.username || "Usuario",
        otherUserAvatar: otherUserFixedData?.pfp || "",
      },
    } as any);

    setLocalSearchQuery("");
  };

  const renderRightActions = (
    progress: any,
    dragX: any,
    item: any,
    index: number
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });
    return (
      <TouchableOpacity
        onPress={() => handleDeleteChat(item.$id, index)}
        className="justify-center items-center w-[80px]"
        style={{ backgroundColor: deleteColor }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash-outline" size={24} color="white" />
          <Text className="text-white text-[10px] font-bold mt-1">
            {t("chatsList.deleteOption")}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderChatItem = ({ item, index }: { item: any; index: number }) => {
    const justVisited = item.otherUser?.$id === lastVisitedUserId.current;

    // Un chat es "no leído" si:
    // 1. No lo acabo de visitar.
    // 2. La propiedad lastMessageIsRead es falsa.
    // 3. El último mensaje fue enviado por el otro usuario.
    const isUnread =
      !justVisited &&
      !item.lastMessageIsRead &&
      item.lastSenderId !== currentUser?.$id;

    const displayName =
      item.otherUser?.name || item.otherUser?.username || "Usuario";

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) row[index] = ref;
        }}
        renderRightActions={(p, d) => renderRightActions(p, d, item, index)}
        onSwipeableOpen={() => closeRow(index)}
        activeOffsetX={[-30, 1000]}
        containerStyle={{ backgroundColor: deleteColor }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => handleOpenChat(item.otherUser?.$id, item.otherUser)}
          className="flex-row items-center px-5 py-3.5"
          style={{ backgroundColor: bgColor }}
        >
          <View className="relative">
            <Image
              source={{
                uri:
                  item.otherUser?.pfp ||
                  "https://cloud.appwrite.io/v1/avatars/initials?name=" +
                    displayName,
              }}
              className="w-[52px] h-[52px] rounded-full bg-zinc-200 dark:bg-zinc-800"
            />
          </View>

          <View
            className="ml-4 flex-1 justify-center py-1 border-b"
            style={{ borderColor: borderColor }}
          >
            <View className="flex-row justify-between items-center mb-1">
              <View className="flex-1 mr-2">
                <Text
                  className="text-[16px] font-bold"
                  style={{ color: textColor }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {displayName}
                </Text>
              </View>

              <Text
                className="text-[11px] shrink-0"
                style={{
                  color: isUnread ? unreadColor : subTextColor,
                  fontWeight: isUnread ? "700" : "400",
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
                className="text-[14px] leading-5 flex-1 mr-4"
                style={{
                  color: isUnread ? textColor : subTextColor,
                  fontWeight: isUnread ? "600" : "400",
                }}
                numberOfLines={1}
              >
                {item.lastSenderId === currentUser?.$id && (
                  <Ionicons
                    name="checkmark-done-outline"
                    size={14}
                    color={subTextColor}
                    style={{ marginRight: 4 }}
                  />
                )}{" "}
                {item.lastMessage}
              </Text>

              {isUnread && (
                <View
                  className="min-w-[10px] h-[10px] rounded-full"
                  style={{ backgroundColor: unreadColor }}
                />
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
        <View className="px-5 pt-3 pb-2">
          <View className="flex-row items-center mb-4 gap-2">
            <TouchableOpacity
              onPress={() => router.push("/home")}
              className="mr-1 -ml-2 p-2 rounded-full active:bg-zinc-100 dark:active:bg-zinc-800"
            >
              <Ionicons name="arrow-back" size={28} color={textColor} />
            </TouchableOpacity>
            <Text
              className="font-bold text-[34px]"
              style={{ color: textColor }}
            >
              {t("chatsList.title")}
            </Text>
          </View>

          <View
            className="flex-row items-center px-3 py-2.5 rounded-xl"
            style={{ backgroundColor: inputBg }}
          >
            <Ionicons name="search" size={18} color={subTextColor} />
            <TextInput
              placeholder="Buscar por nombre..."
              placeholderTextColor={subTextColor}
              className="flex-1 ml-2 text-base"
              style={{ color: textColor, height: 20, padding: 0 }}
              value={localSearchQuery}
              onChangeText={setLocalSearchQuery}
            />
          </View>
        </View>

        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.$id}
          renderItem={renderChatItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadChats}
              tintColor={unreadColor}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View className="flex-1 justify-center items-center mt-32 px-10 opacity-60">
                <Ionicons
                  name="chatbubbles-outline"
                  size={50}
                  color={subTextColor}
                />
                <Text
                  className="text-center font-medium text-lg mt-4"
                  style={{ color: textColor }}
                >
                  {localSearchQuery
                    ? "No hay coincidencias"
                    : "No tienes mensajes aún"}
                </Text>
                <Text
                  className="text-center text-sm mt-1"
                  style={{ color: subTextColor }}
                >
                  Toca el botón + para empezar una conversación.
                </Text>
              </View>
            ) : null
          }
        />

        <TouchableOpacity
          onPress={() => setIsNewChatVisible(true)}
          activeOpacity={0.9}
          className="absolute bottom-8 right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg z-50"
          style={{
            backgroundColor: fabColor,
            shadowColor: fabColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4.65,
            elevation: 8,
          }}
        >
          <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>

        <NewChatModal
          visible={isNewChatVisible}
          onClose={() => setIsNewChatVisible(false)}
          onUserSelect={(selectedUser: any) =>
            handleOpenChat(selectedUser.$id, selectedUser)
          }
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default ChatsList;
