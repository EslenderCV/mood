import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Swipeable,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useColorScheme } from "nativewind";
import {
  client,
  appwriteConfig,
  getCurrentUser,
  getUserNotifications,
  markNotificationAsRead,
  acceptFollowRequest,
  deleteFollowRequest,
  deleteNotification,
  clearAllNotifications,
} from "@/lib/appwrite";

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "hace unos segundos";

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
};

const NotificationsScreen = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const unreadBg = isDark ? "rgba(39, 39, 42, 0.4)" : "#F3F4F6";
  const iconBg = isDark ? "#27272A" : "#E4E4E7";
  const backIconColor = isDark ? "#FFFFFF" : "#000000";

  const [notifications, setNotifications] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const channel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.notificationsCollectionId}.documents`;

    const unsubscribe = client.subscribe(channel, (response) => {
      if (response.events.includes("databases.*.documents.*.create")) {
        const newPayload = response.payload as any;
        if (newPayload.userId === currentUser.$id) {
          setNotifications((prev) => [newPayload, ...prev]);
        }
      }
      if (response.events.includes("databases.*.documents.*.delete")) {
        const deletedPayload = response.payload as any;
        setNotifications((prev) =>
          prev.filter((n) => n.$id !== deletedPayload.$id)
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const fetchNotifications = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      setCurrentUser(user);
      const results = await getUserNotifications(user.$id);
      setNotifications(results);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handlePressNotification = async (item: any) => {
    if (item.type === "follow_request") return;

    markNotificationAsRead(item.$id);
    const updated = notifications.map((n) =>
      n.$id === item.$id ? { ...n, isRead: true } : n
    );
    setNotifications(updated);

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
      });
    }
  };

  const handleAcceptRequest = async (notification: any) => {
    try {
      setNotifications((prev) =>
        prev.filter((n) => n.$id !== notification.$id)
      );
      await acceptFollowRequest(
        notification.senderId,
        currentUser.$id,
        notification.$id
      );
    } catch (error) {
      Alert.alert("Error", "No se pudo aceptar.");
      fetchNotifications();
    }
  };

  const handleDeleteRequest = async (notification: any) => {
    try {
      setNotifications((prev) =>
        prev.filter((n) => n.$id !== notification.$id)
      );
      await deleteFollowRequest(notification.senderId, currentUser.$id);
      await markNotificationAsRead(notification.$id);
    } catch (error) {
      Alert.alert("Error", "No se pudo eliminar.");
    }
  };

  const handleDeleteSingle = async (item: any) => {
    try {
      setNotifications((prev) => prev.filter((n) => n.$id !== item.$id));
      await deleteNotification(item.$id);
    } catch (error) {
      console.log("Error borrando", error);
    }
  };

  const handleClearAll = () => {
    Alert.alert("Limpiar Notificaciones", "¿Estás seguro de borrar todo?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          setIsLoading(true);
          await clearAllNotifications(currentUser.$id);
          setNotifications([]);
          setIsLoading(false);
        },
      },
    ]);
  };

  const renderRightActions = (progress: any, dragX: any, item: any) => {
    if (item.type === "follow_request") return null;

    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    return (
      <TouchableOpacity
        onPress={() => handleDeleteSingle(item)}
        className="bg-red-600 justify-center items-center w-[80px]"
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash-outline" size={24} color="white" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    let icon = "notifications";
    let color = "bg-zinc-800";

    if (item.type === "like") {
      icon = "heart";
      color = "bg-red-500";
    }
    if (item.type === "comment") {
      icon = "chatbubble";
      color = "bg-[#5E17EB]";
    }
    if (item.type === "follow") {
      icon = "person-add";
      color = "bg-blue-500";
    }
    if (item.type === "tag") {
      icon = "at";
      color = "bg-green-500";
    }
    if (item.type === "follow_request") {
      icon = "lock-closed";
      color = isDark ? "bg-zinc-600" : "bg-zinc-500";
    }

    const rowBg = !item.isRead ? unreadBg : bgColor;

    return (
      <Swipeable
        renderRightActions={(progress, dragX) =>
          renderRightActions(progress, dragX, item)
        }
        overshootRight={false}
      >
        <TouchableOpacity
          activeOpacity={item.type === "follow_request" ? 1 : 0.7}
          onPress={() => handlePressNotification(item)}
          className="flex-row px-4 py-4 border-b"
          style={{ backgroundColor: rowBg, borderColor: borderColor }}
        >
          <View className="mr-3 relative">
            <Image
              source={{ uri: item.senderAvatar }}
              className="w-12 h-12 rounded-full"
              style={{ backgroundColor: iconBg }}
            />
            <View
              className={`absolute -bottom-1 -right-1 ${color} w-5 h-5 rounded-full items-center justify-center border`}
              style={{ borderColor: bgColor }}
            >
              <Ionicons name={icon as any} size={10} color="white" />
            </View>
          </View>
          <View className="flex-1 justify-center">
            <Text className="text-[15px]" style={{ color: textColor }}>
              <Text className="font-bold">{item.senderName}</Text>{" "}
              {item.message}
            </Text>

            {item.type === "follow_request" ? (
              <View className="flex-row mt-3 gap-3">
                <TouchableOpacity
                  onPress={() => handleAcceptRequest(item)}
                  className="bg-[#5E17EB] px-4 py-1.5 rounded-lg flex-1 items-center"
                >
                  <Text className="text-white font-bold text-xs">
                    Confirmar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteRequest(item)}
                  className="px-4 py-1.5 rounded-lg flex-1 items-center"
                  style={{ backgroundColor: iconBg }}
                >
                  <Text
                    className="font-bold text-xs"
                    style={{ color: textColor }}
                  >
                    Eliminar
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text className="text-xs mt-1" style={{ color: subTextColor }}>
                {formatTimeAgo(item.$createdAt)}
              </Text>
            )}
          </View>
          <View className="items-center justify-center pl-2">
            {!item.isRead && item.type !== "follow_request" && (
              <View className="w-2 h-2 bg-[#5E17EB] rounded-full" />
            )}
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bgColor }}>
      <SafeAreaView
        className="flex-1"
        edges={["top"]}
        style={{ backgroundColor: bgColor }}
      >
        <View
          className="flex-row items-center justify-between px-4 h-[50px] border-b"
          style={{ borderColor: borderColor }}
        >
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 -ml-2"
            >
              <Ionicons name="arrow-back" size={24} color={backIconColor} />
            </TouchableOpacity>
            <Text
              className="font-bold text-lg ml-2"
              style={{ color: textColor }}
            >
              Notificaciones
            </Text>
          </View>

          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} className="p-2">
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.$id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchNotifications();
              }}
              tintColor="#5E17EB"
            />
          }
          ListEmptyComponent={
            <View className="mt-20 items-center">
              <Ionicons
                name="notifications-off-outline"
                size={48}
                color={subTextColor}
                style={{ opacity: 0.5, marginBottom: 10 }}
              />
              <Text style={{ color: subTextColor }}>Sin notificaciones</Text>
            </View>
          }
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default NotificationsScreen;
