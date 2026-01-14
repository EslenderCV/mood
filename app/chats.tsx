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
  useWindowDimensions,
  BackHandler,
} from "react-native";
import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
// 👇 Importamos el hook de insets, ya no usaremos el componente SafeAreaView
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import {
  GestureHandlerRootView,
  PanGestureHandler,
  State,
} from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/Swipeable";

import { useGlobalContext } from "@/context/GlobalProvider";

import {
  getUserChats,
  searchUsers,
  getLatestUsers,
  deleteChat,
  client,
  appwriteConfig,
} from "@/lib/appwrite";
import { useLanguage } from "@/context/LanguageContext";

const ChatSkeleton = ({ isDark }: { isDark: boolean }) => {
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  return (
    <View className="flex-row items-center px-5 py-3.5 animate-pulse w-full">
      <View className={`w-[52px] h-[52px] rounded-full ${elementBg}`} />
      <View className="ml-4 flex-1 justify-center space-y-2">
        <View className="flex-row justify-between items-center w-full">
          <View className={`w-32 h-4 rounded ${elementBg}`} />
          <View className={`w-10 h-3 rounded ${elementBg}`} />
        </View>
        <View className={`w-48 h-3 rounded ${elementBg}`} />
      </View>
    </View>
  );
};

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
                    <View className="flex-row items-center">
                      <Text
                        className="font-bold text-base"
                        numberOfLines={1}
                        style={{ color: textColor }}
                      >
                        {item.name || item.username || "Usuario"}
                      </Text>
                      {item.isVerified && (
                        <MaterialIcons
                          name="verified"
                          size={14}
                          color="#5E17EB"
                          style={{ marginLeft: 4 }}
                        />
                      )}
                    </View>
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

const ChatsList = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();
  const { height, width } = useWindowDimensions();
  const { user, chats, setChats } = useGlobalContext();

  // 🔥 HOOK PARA MEDIDAS EXACTAS
  const insets = useSafeAreaInsets();

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#F4F4F5";
  const inputBg = isDark ? "#18181B" : "#F4F4F5";
  const unreadColor = "#5E17EB";
  const deleteColor = "#EF4444";
  const fabColor = "#5E17EB";

  const [loading, setLoading] = useState(chats.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [isNewChatVisible, setIsNewChatVisible] = useState(false);

  // --- ANIMACIÓN DE SALIDA MANUAL ---
  const translateX = useRef(new Animated.Value(0)).current;

  const handleGoBack = useCallback(() => {
    Animated.timing(translateX, {
      toValue: width,
      duration: 250,
      useNativeDriver: true,
      easing: (t) => t * (2 - t),
    }).start(() => {
      router.back();
    });
    return true;
  }, [width, translateX]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleGoBack
    );
    return () => backHandler.remove();
  }, [handleGoBack]);

  const onPanGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: false }
  );

  const onPanHandlerStateChange = ({ nativeEvent }: any) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      if (nativeEvent.translationX > 60 || nativeEvent.velocityX > 600) {
        handleGoBack();
      } else {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
      }
    }
  };

  const skeletonItems = useMemo(() => {
    const ESTIMATED_ITEM_HEIGHT = 80;
    const HEADER_HEIGHT = 140;
    const itemsToFillScreen = Math.ceil(
      (height - HEADER_HEIGHT) / ESTIMATED_ITEM_HEIGHT
    );
    const count = Math.max(itemsToFillScreen, 8);
    return Array.from({ length: count }, (_, i) => i);
  }, [height]);

  let row: Array<Swipeable | null> = [];
  let prevOpenedRow: Swipeable | null;

  useFocusEffect(
    useCallback(() => {
      loadChats(false);
    }, [user])
  );

  useEffect(() => {
    if (!user || !client) return;
    const channels = [
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.chatsCollectionId}.documents`,
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`,
    ];
    const unsubscribe = client.subscribe(channels, (response) => {
      const payload: any = response.payload;
      const event = response.events[0];
      if (event.includes(`collections.${appwriteConfig.chatsCollectionId}`)) {
        if (event.includes(".update")) {
          setChats((prevChats) =>
            prevChats.map((chat) => {
              if (chat.$id === payload.$id) {
                return { ...chat, ...payload, otherUser: chat.otherUser };
              }
              return chat;
            })
          );
        }
        if (event.includes(".create")) {
          if (payload.users && payload.users.includes(user.$id))
            loadChats(false);
        }
      }
      if (
        event.includes(`collections.${appwriteConfig.messagesCollectionId}`)
      ) {
        if (event.includes(".create")) {
          const chatId = payload.chatId;
          const isMyMsg = payload.senderId === user.$id;
          setChats((prevChats) => {
            const chatIndex = prevChats.findIndex((c) => c.$id === chatId);
            if (chatIndex === -1) {
              loadChats(false);
              return prevChats;
            }
            const updatedChat = {
              ...prevChats[chatIndex],
              lastMessage: payload.content,
              lastMessageAt: payload.$createdAt,
              lastSenderId: payload.senderId,
              lastMessageIsRead: isMyMsg,
            };
            const newChats = [...prevChats];
            newChats.splice(chatIndex, 1);
            return [updatedChat, ...newChats];
          });
        }
      }
    });
    return () => {
      unsubscribe();
    };
  }, [user]);

  const loadChats = async (showLoading = true) => {
    try {
      if (user) {
        if (showLoading && chats.length === 0) setLoading(true);
        const res = await getUserChats(user.$id);
        const activeChats = res.filter(
          (c: any) => c.lastMessage && c.lastMessage.trim() !== ""
        );
        setChats(activeChats);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadChats(true);
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

  const handleOpenChat = async (
    otherUserId: string,
    otherUserFixedData?: any
  ) => {
    if (!user) return;
    setIsNewChatVisible(false);
    setChats((prev) =>
      prev.map((c) =>
        c.otherUser?.$id === otherUserId ? { ...c, lastMessageIsRead: true } : c
      )
    );
    const existingChat = chats.find((c) => c.otherUser?.$id === otherUserId);
    let targetChatId = existingChat ? existingChat.$id : "new";
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
    const isUnread = !item.lastMessageIsRead && item.lastSenderId !== user?.$id;
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
              <View className="flex-1 mr-2 flex-row items-center">
                <Text
                  className="text-[16px] font-bold"
                  style={{ color: textColor }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {displayName}
                </Text>
                {item.otherUser?.isVerified && (
                  <MaterialIcons
                    name="verified"
                    size={14}
                    color="#5E17EB"
                    style={{ marginLeft: 4 }}
                  />
                )}
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
                {item.lastSenderId === user?.$id && (
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
      <PanGestureHandler
        onGestureEvent={onPanGestureEvent}
        onHandlerStateChange={onPanHandlerStateChange}
        activeOffsetX={[0, 20]} // Gesto solo desde el borde izquierdo
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: bgColor,
            // 🚀 CORRECCIÓN DEL LAYOUT: Padding manual en vez de SafeAreaView
            paddingTop: insets.top,
            transform: [
              {
                translateX: translateX.interpolate({
                  inputRange: [0, width],
                  outputRange: [0, width],
                  extrapolate: "clamp",
                }),
              },
            ],
            // Sombra para dar efecto de capas al salir
            shadowColor: "#000",
            shadowOffset: { width: -5, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 20,
          }}
        >
          {/* Ya no usamos SafeAreaView aquí porque el AnimatedView ya tiene el padding */}
          <View style={{ flex: 1, backgroundColor: bgColor }}>
            <View className="px-5 pt-3 pb-2">
              <View className="flex-row items-center mb-4 gap-2">
                <TouchableOpacity
                  onPress={handleGoBack}
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

            {loading && chats.length === 0 ? (
              <View className="flex-1 mt-2">
                {skeletonItems.map((i) => (
                  <ChatSkeleton key={i} isDark={isDark} />
                ))}
              </View>
            ) : (
              <FlatList
                data={filteredChats}
                keyExtractor={(item) => item.$id}
                renderItem={renderChatItem}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={unreadColor}
                  />
                }
                ListEmptyComponent={
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
                }
              />
            )}

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
          </View>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
};

export default ChatsList;
