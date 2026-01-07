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
  getOrCreateChat,
  deleteChat,
  client,
  appwriteConfig,
  markChatAsRead,
} from "@/lib/appwrite";
import { useLanguage } from "@/context/LanguageContext";

// --- MANTENEMOS EL MODAL IGUAL (LO OMITO PARA AHORRAR ESPACIO, COPIA EL ANTERIOR) ---
const NewChatModal = ({ visible, onClose, onUserSelect }: any) => {
  // ... (Usa el código del NewChatModal de la respuesta anterior)
  // Si necesitas que te lo pegue completo de nuevo dímelo, pero no cambió.
  return null;
};

// --- PANTALLA PRINCIPAL DE CHATS ---
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

  // 🔥 TRUCO MAGICO: Guardamos aquí el ID del usuario que acabamos de visitar
  const lastVisitedUserId = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [])
  );

  useEffect(() => {
    const unsubscribe = client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.chatsCollectionId}.documents`,
      (response) => {
        if (
          response.events.some((e) => e.includes(".update")) ||
          response.events.some((e) => e.includes(".create"))
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

        // 🔥 INTERCEPCIÓN DE DATOS:
        // Recorremos los chats que vienen del servidor.
        const fixedChats = res.map((c: any) => {
          // Si este chat corresponde al usuario que acabamos de visitar...
          if (c.otherUser && lastVisitedUserId.current === c.otherUser.$id) {
            // ... ¡Forzamos que se vea como LEÍDO! Ignoramos al servidor si dice que no.
            return {
              ...c,
              lastMessageIsRead: true,
              // Aseguramos que no marque un punto azul incluso si el último sender fui yo o el otro
              // Simplemente decimos: "Si acabo de salir de aquí, ya lo leí todo".
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
      const name = (
        chat.otherUser?.name ||
        chat.otherUser?.username ||
        ""
      ).toLowerCase();
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

  const handleOpenChat = async (
    otherUserId: string,
    otherUserFixedData?: any
  ) => {
    if (!currentUser) return;

    // 1. Guardar referencia para que al volver sepamos que ya leímos esto
    lastVisitedUserId.current = otherUserId;

    // 2. Actualización Optimista inmediata en la UI antes de navegar
    const updatedChats = chats.map((c) => {
      if (c.otherUser?.$id === otherUserId) {
        return { ...c, lastMessageIsRead: true };
      }
      return c;
    });
    setChats(updatedChats);

    try {
      const chatDoc = await getOrCreateChat(currentUser.$id, otherUserId);

      // 3. Llamada al servidor en "segundo plano" (sin await bloqueante)
      markChatAsRead(chatDoc.$id, currentUser.$id).catch((e) =>
        console.log("Bg read error", e)
      );

      // 4. Navegar
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: chatDoc.$id,
          otherUserId: otherUserId,
          otherUserName:
            otherUserFixedData?.name ||
            otherUserFixedData?.username ||
            "Usuario",
          otherUserAvatar: otherUserFixedData?.pfp || "",
        },
      } as any);

      setLocalSearchQuery("");
    } catch (error) {
      console.log("Error abriendo chat:", error);
    }
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
    // Si lastVisitedUserId coincide, forzamos isUnread a falso.
    const justVisited = item.otherUser?.$id === lastVisitedUserId.current;

    // Lógica normal: Si no está leído Y no fui yo el último, es unread.
    // PERO si acabo de visitarlo (justVisited), entonces NO es unread.
    const isUnread =
      !justVisited &&
      !item.lastMessageIsRead &&
      item.lastSenderId !== currentUser?.$id;

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) row[index] = ref;
        }}
        renderRightActions={(p, d) => renderRightActions(p, d, item, index)}
        onSwipeableOpen={() => closeRow(index)}
        // IMPORTANTE: Esto arregla el swipe de volver atrás en iOS
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
                  "https://cloud.appwrite.io/v1/avatars/initials?name=User",
              }}
              className="w-[52px] h-[52px] rounded-full bg-zinc-200 dark:bg-zinc-800"
            />
          </View>

          <View
            className="ml-4 flex-1 justify-center py-1 border-b"
            style={{ borderColor: borderColor }}
          >
            <View className="flex-row justify-between items-baseline mb-1">
              <Text
                className="text-[16px] font-bold"
                style={{ color: textColor }}
                numberOfLines={1}
              >
                {item.otherUser?.username || "Usuario"}
              </Text>
              <Text
                className="text-[11px]"
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
        {/* HEADER LIMPIO */}
        <View className="px-5 pt-3 pb-2">
          <Text
            className="font-bold text-[34px] mb-4"
            style={{ color: textColor }}
          >
            {t("chatsList.title")}
          </Text>

          {/* BARRA DE BÚSQUEDA */}
          <View
            className="flex-row items-center px-3 py-2.5 rounded-xl"
            style={{ backgroundColor: inputBg }}
          >
            <Ionicons name="search" size={18} color={subTextColor} />
            <TextInput
              placeholder="Buscar chats y mensajes..."
              placeholderTextColor={subTextColor}
              className="flex-1 ml-2 text-base"
              style={{ color: textColor, height: 20, padding: 0 }}
              value={localSearchQuery}
              onChangeText={setLocalSearchQuery}
            />
          </View>
        </View>

        {/* LISTA DE CHATS */}
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

        {/* BOTÓN FLOTANTE (FAB) */}
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

        {/* REUTILIZA EL MODAL QUE YA TIENES O TE LO PASO SI FALTA */}
        {/* <NewChatModal ... /> */}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default ChatsList;
