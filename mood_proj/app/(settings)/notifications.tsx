import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  Platform,
  LayoutAnimation,
  UIManager,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  Swipeable,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useColorScheme } from "nativewind";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

import {
  client,
  appwriteConfig,
  getCurrentUser,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  acceptFollowRequest,
  deleteFollowRequest,
  deleteNotification,
  clearAllNotifications,
  getUser,
} from "@/lib/appwrite";
import { useLanguage } from "@/context/LanguageContext";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- UTILIDADES ---
const formatTimeAgo = (dateString: string, t: (key: string) => string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return t("notifications.time.justNow") || "Now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60)
    return `${diffInMinutes}${t("notifications.time.m") || "m"}`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24)
    return `${diffInHours}${t("notifications.time.h") || "h"}`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}${t("notifications.time.d") || "d"}`;
};

// --- COMPONENTES UI ---

const FilterPill = ({ label, isActive, onPress, isDark }: any) => {
  const activeBg = "#5E17EB";
  const inactiveBg = isDark ? "#27272A" : "#F3F4F6";
  const activeText = "#FFFFFF";
  const inactiveText = isDark ? "#A1A1AA" : "#71717A";

  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      className="px-5 py-2 rounded-full mr-2 border"
      style={{
        backgroundColor: isActive ? activeBg : inactiveBg,
        borderColor: isActive ? activeBg : isDark ? "#3F3F46" : "#E5E7EB",
      }}
    >
      <Text
        className="text-xs font-bold"
        style={{ color: isActive ? activeText : inactiveText }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const NotificationItem = ({
  item,
  currentUser,
  isDark,
  t,
  onPress,
  onAccept,
  onDeleteRequest,
  onDeleteSingle,
}: any) => {
  const [userData, setUserData] = useState<any>(null);
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#F3F4F6";
  const unreadBg = isDark ? "rgba(94, 23, 235, 0.1)" : "#F5F3FF";
  const iconBg = isDark ? "#18181B" : "#F4F4F5";

  useEffect(() => {
    let isMounted = true;
    if (item.senderId) {
      getUser(item.senderId)
        .then((user) => {
          if (isMounted && user) setUserData(user);
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [item.senderId]);

  const displayName = userData?.name || item.senderName || "Usuario";
  const isVerified = userData?.isVerified;
  const avatarUrl = userData?.pfp || item.senderAvatar;

  let iconName = "notifications";
  let iconColor = "#A1A1AA";
  let iconBgColor = isDark ? "#27272A" : "#F4F4F5";

  switch (item.type) {
    case "like":
      iconName = "heart";
      iconColor = "#EF4444";
      iconBgColor = isDark ? "rgba(239, 68, 68, 0.2)" : "#FEF2F2";
      break;
    case "comment":
      iconName = "chatbubble";
      iconColor = "#5E17EB";
      iconBgColor = isDark ? "rgba(94, 23, 235, 0.2)" : "#F3E8FF";
      break;
    case "follow":
      iconName = "person-add";
      iconColor = "#3B82F6";
      iconBgColor = isDark ? "rgba(59, 130, 246, 0.2)" : "#EFF6FF";
      break;
    case "tag":
      iconName = "at";
      iconColor = "#10B981";
      iconBgColor = isDark ? "rgba(16, 185, 129, 0.2)" : "#ECFDF5";
      break;
    case "follow_request":
      iconName = "lock-closed";
      iconColor = isDark ? "#FFFFFF" : "#000000";
      break;
  }

  const isRequest = item.type === "follow_request";

  const renderRightActions = (progress: any, dragX: any) => {
    if (isRequest) return null;
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });
    return (
      <TouchableOpacity
        onPress={() => onDeleteSingle(item)}
        className="bg-red-500 w-[80px] justify-center items-center"
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash-outline" size={24} color="white" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <TouchableOpacity
        activeOpacity={isRequest ? 1 : 0.7}
        onPress={() => onPress(item)}
        className={`flex-row p-4 border-b ${!item.isRead ? "border-l-4" : ""}`}
        style={{
          backgroundColor: !item.isRead ? unreadBg : bgColor,
          borderColor: borderColor,
          borderLeftColor: !item.isRead ? "#5E17EB" : borderColor,
        }}
      >
        <View className="mr-4 relative">
          <Image
            source={{ uri: avatarUrl }}
            className="w-12 h-12 rounded-full border"
            style={{ borderColor: borderColor }}
            contentFit="cover"
            transition={200}
          />
          {!isRequest && (
            <View
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full items-center justify-center border-2"
              style={{ backgroundColor: iconBgColor, borderColor: bgColor }}
            >
              <Ionicons name={iconName as any} size={12} color={iconColor} />
            </View>
          )}
        </View>

        <View className="flex-1 justify-center space-y-1">
          <Text
            className="text-[15px] leading-5"
            style={{ color: textColor }}
            numberOfLines={2}
          >
            <Text className="font-bold">{displayName}</Text>{" "}
            {isVerified && (
              <MaterialIcons
                name="verified"
                size={14}
                color="#5E17EB"
                style={{ marginLeft: 4, top: 2 }}
              />
            )}
            <Text style={{ color: isDark ? "#D4D4D8" : "#4B5563" }}>
              {" "}
              {item.message.replace(item.senderName, "").trim()}
            </Text>
          </Text>

          {isRequest ? (
            <View className="flex-row mt-2 gap-3">
              <TouchableOpacity
                onPress={() => onAccept(item)}
                className="bg-[#5E17EB] px-6 py-2 rounded-xl flex-1 items-center shadow-sm"
              >
                <Text className="text-white font-bold text-xs">
                  {t("notifications.confirm") || "Confirmar"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onDeleteRequest(item)}
                className="px-6 py-2 rounded-xl flex-1 items-center border"
                style={{ borderColor: borderColor, backgroundColor: iconBg }}
              >
                <Text
                  className="font-bold text-xs"
                  style={{ color: textColor }}
                >
                  {t("notifications.delete") || "Delete"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text className="text-xs" style={{ color: subTextColor }}>
              {formatTimeAgo(item.$createdAt, t)}
            </Text>
          )}
        </View>

        {!isRequest && (
          <View className="ml-2 justify-center">
            {item.postImage ? (
              <Image
                source={{ uri: item.postImage }}
                className="w-10 h-10 rounded-lg"
                contentFit="cover"
                transition={200}
              />
            ) : !item.isRead ? (
              <View className="w-2 h-2 bg-[#5E17EB] rounded-full" />
            ) : null}
          </View>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
};

const NotificationsScreen = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";

  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Estado para la carga inicial (Spinner Instagram)
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "requests" | "activity">("all");

  // 🔥 1. CARGA INICIAL ÚNICA
  // Se ejecuta solo al montar el componente. No vuelve a cargar al enfocar.
  useEffect(() => {
    fetchNotifications(true);
  }, []);

  // 🔥 2. AL ENFOCAR: SOLO MARCAR COMO LEÍDO
  // No muestra loading ni recarga la lista. Es silencioso.
  useFocusEffect(
    useCallback(() => {
      const markAsReadSilently = async () => {
        if (currentUser?.$id) {
          const hasUnread = allNotifications.some((n: any) => !n.isRead);
          if (hasUnread) {
            // Actualizar backend
            await markAllNotificationsAsRead(currentUser.$id);
            // Actualizar UI localmente sin fetch para evitar parpadeos
            setAllNotifications((prev) =>
              prev.map((n) => ({ ...n, isRead: true })),
            );
          }
        }
      };
      markAsReadSilently();
    }, [currentUser, allNotifications]),
  );

  useEffect(() => {
    if (filter === "all") setFilteredNotifications(allNotifications);
    else if (filter === "requests")
      setFilteredNotifications(
        allNotifications.filter((n) => n.type === "follow_request"),
      );
    else
      setFilteredNotifications(
        allNotifications.filter((n) => n.type !== "follow_request"),
      );
  }, [filter, allNotifications]);

  // Suscripción en tiempo real (Esto mantiene la lista fresca sin recargas manuales)
  useEffect(() => {
    if (!currentUser) return;
    const channel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.notificationsCollectionId}.documents`;
    const unsubscribe = client.subscribe(channel, (response) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      if (response.events.includes("databases.*.documents.*.create")) {
        const newPayload = response.payload as any;
        if (newPayload.userId === currentUser.$id)
          setAllNotifications((prev) => [newPayload, ...prev]);
      }
      if (response.events.includes("databases.*.documents.*.delete")) {
        const deletedPayload = response.payload as any;
        setAllNotifications((prev) =>
          prev.filter((n) => n.$id !== deletedPayload.$id),
        );
      }
      if (response.events.includes("databases.*.documents.*.update")) {
        const updatedPayload = response.payload as any;
        setAllNotifications((prev) =>
          prev.map((n) => (n.$id === updatedPayload.$id ? updatedPayload : n)),
        );
      }
    });
    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const fetchNotifications = async (showLoading = false) => {
    if (showLoading) setIsInitialLoading(true);

    try {
      const user = await getCurrentUser();
      if (!user) return;
      setCurrentUser(user);
      const results = await getUserNotifications(user.$id);
      setAllNotifications(results);
    } catch (error) {
      console.log(error);
    } finally {
      if (showLoading) setIsInitialLoading(false);
      setRefreshing(false);
    }
  };

  const handlePressNotification = async (item: any) => {
    if (item.type === "follow_request") return;
    if (!item.isRead) {
      markNotificationAsRead(item.$id);
      setAllNotifications((prev) =>
        prev.map((n) => (n.$id === item.$id ? { ...n, isRead: true } : n)),
      );
    }
    if (item.postId) {
      router.push({ pathname: "/post/[id]", params: { id: item.postId } });
    } else if (item.type === "follow" || item.type === "tag") {
      router.push({
        pathname: "/user/[id]",
        params: {
          id: item.senderId,
          username: item.senderName,
          name: item.senderName,
          avatar: item.senderAvatar,
        },
      } as any);
    } else if (item.type === "weekly_vibe") {
      router.push({ pathname: "/home", params: { weeklyVibe: "1" } } as any);

    }
  };

  const handleAcceptRequest = async (notification: any) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    try {
      setAllNotifications((prev) =>
        prev.filter((n) => n.$id !== notification.$id),
      );
      await acceptFollowRequest(
        notification.senderId,
        currentUser.$id,
        notification.$id,
      );
    } catch {
      Alert.alert("Error", t("notifications.errorAccept"));
      fetchNotifications(false);
    }
  };

  const handleDeleteRequest = async (notification: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    try {
      setAllNotifications((prev) =>
        prev.filter((n) => n.$id !== notification.$id),
      );
      await deleteFollowRequest(notification.senderId, currentUser.$id);
      await markNotificationAsRead(notification.$id);
    } catch {
      Alert.alert("Error", t("notifications.errorDelete"));
    }
  };

  const handleDeleteSingle = async (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    try {
      setAllNotifications((prev) => prev.filter((n) => n.$id !== item.$id));
      await deleteNotification(item.$id);
    } catch (error) {
      console.log("Error borrando", error);
    }
  };

  const handleClearAll = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(t("notifications.clearTitle"), t("notifications.clearMsg"), [
      { text: t("notifications.cancel"), style: "cancel" },
      {
        text: t("notifications.clearOption"),
        style: "destructive",
        onPress: async () => {
          setAllNotifications([]);
          await clearAllNotifications(currentUser.$id);
        },
      },
    ]);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bgColor }}>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="px-4 pb-2">
          <View className="flex-row items-center justify-between h-[50px] mb-2">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 -ml-2"
            >
              <Ionicons
                name="arrow-back"
                size={26}
                color={isDark ? "white" : "black"}
              />
            </TouchableOpacity>
            <Text className="text-xl font-bold" style={{ color: textColor }}>
              {t("notifications.title") || "Actividad"}
            </Text>
            <View className="flex-row items-center">
              {allNotifications.length > 0 && (
                <TouchableOpacity onPress={handleClearAll} className="p-2">
                  <Ionicons
                    name="trash-outline"
                    size={22}
                    color={subTextColor}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View className="flex-row pb-2">
            <FilterPill
              label={t("notifications.filters.all") || "Todas"}
              isActive={filter === "all"}
              onPress={() => setFilter("all")}
              isDark={isDark}
            />
            <FilterPill
              label={t("notifications.filters.requests") || "Solicitudes"}
              isActive={filter === "requests"}
              onPress={() => setFilter("requests")}
              isDark={isDark}
            />
            <FilterPill
              label={t("notifications.filters.activity") || "Actividad"}
              isActive={filter === "activity"}
              onPress={() => setFilter("activity")}
              isDark={isDark}
            />
          </View>
        </View>

        {/* 🔥 SPINNER ESTILO INSTAGRAM: Minimalista y al inicio */}
        {isInitialLoading ? (
          <View className="flex-1 items-start justify-start pt-8 w-full">
            <View className="w-full items-center">
              <ActivityIndicator
                size="small"
                color="#5E17EB"
                style={{ transform: [{ scale: 1.2 }] }}
              />
            </View>
          </View>
        ) : (
          <FlatList
            data={filteredNotifications}
            renderItem={({ item }) => (
              <NotificationItem
                item={item}
                currentUser={currentUser}
                isDark={isDark}
                t={t}
                onPress={handlePressNotification}
                onAccept={handleAcceptRequest}
                onDeleteRequest={handleDeleteRequest}
                onDeleteSingle={handleDeleteSingle}
              />
            )}
            keyExtractor={(item) => item.$id}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRefreshing(true);
                  // Solo recargamos si el usuario lo pide explícitamente
                  fetchNotifications(false);
                }}
                tintColor="#8856ec"
                colors={["#8856ec"]}
              />
            }
            ListEmptyComponent={
              <View className="mt-20 items-center px-10">
                <View className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full items-center justify-center mb-4">
                  <Ionicons
                    name="notifications-outline"
                    size={40}
                    color={subTextColor}
                  />
                </View>
                <Text
                  className="font-bold text-lg mb-2 text-center"
                  style={{ color: textColor }}
                >
                  {t("notifications.emptyTitle") || "Sin notificaciones"}
                </Text>
                <Text
                  className="text-center text-sm"
                  style={{ color: subTextColor }}
                >
                  {t("notifications.emptyMsg") ||
                    "Aquí aparecerán tus likes, comentarios y nuevos seguidores."}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default NotificationsScreen;
