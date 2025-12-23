import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getCurrentUser,
  getUserNotifications,
  markNotificationAsRead,
} from "@/lib/appwrite";

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;
      const results = await getUserNotifications(currentUser.$id);
      setNotifications(results);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handlePressNotification = async (item: any) => {
    // 1. Marcar como leído
    markNotificationAsRead(item.$id);

    // Actualizar UI localmente
    const updated = notifications.map((n) =>
      n.$id === item.$id ? { ...n, isRead: true } : n
    );
    setNotifications(updated);

    // 2. Navegar
    if (item.postId) {
      // Va al hilo del post (comentario o like)
      router.push({
        pathname: "/post/[id]",
        params: { id: item.postId },
      });
    } else if (item.type === "follow") {
      // Va al perfil del usuario
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

    return (
      <TouchableOpacity
        onPress={() => handlePressNotification(item)}
        className={`flex-row px-4 py-4 border-b border-zinc-900 ${
          !item.isRead ? "bg-zinc-900/40" : "bg-black"
        }`}
      >
        <View className="mr-3 relative">
          <Image
            source={{ uri: item.senderAvatar }}
            className="w-12 h-12 rounded-full bg-zinc-800"
          />
          <View
            className={`absolute -bottom-1 -right-1 ${color} w-5 h-5 rounded-full items-center justify-center border border-black`}
          >
            <Ionicons name={icon as any} size={10} color="white" />
          </View>
        </View>
        <View className="flex-1 justify-center">
          <Text className="text-white text-[15px]">
            <Text className="font-bold">{item.senderName}</Text> {item.message}
          </Text>
          <Text className="text-zinc-500 text-xs mt-1">
            {new Date(item.$createdAt).toLocaleDateString()}
          </Text>
        </View>
        {!item.isRead && (
          <View className="w-2 h-2 bg-[#5E17EB] rounded-full self-center ml-2" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      <View className="flex-row items-center px-4 h-[50px] border-b border-zinc-900">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg ml-2">
          Notificaciones
        </Text>
      </View>
      <FlatList
        data={notifications}
        renderItem={renderItem}
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
            <Text className="text-zinc-500">Sin notificaciones</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default NotificationsScreen;
