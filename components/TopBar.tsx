import { View, Image, TouchableOpacity } from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Link, router, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import {
  getCurrentUser,
  getUnreadNotificationCount,
  getUnreadMessagesCount,
  client,
  appwriteConfig,
} from "@/lib/appwrite";

const TopBar = () => {
  // --- TEMA DINÁMICO ---
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Colores calculados
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const borderColor = isDark ? "#27272A" : "#F4F4F5";
  const btnBg = isDark ? "#18181B" : "#F4F4F5";
  const iconColor = isDark ? "#5E17EB" : "#000000";

  // --- ESTADOS DE LÓGICA ---
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
  const [hasUnreadChats, setHasUnreadChats] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const initUser = async () => {
      try {
        const user = await getCurrentUser();
        if (user) setUserId(user.$id);
      } catch (error) {
        console.log("Error TopBar init:", error);
      }
    };
    initUser();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) refreshCounts(userId);
    }, [userId])
  );

  const refreshCounts = async (uid: string) => {
    const notifCount = await getUnreadNotificationCount(uid);
    setHasUnreadNotifs(notifCount > 0);
    const chatCount = await getUnreadMessagesCount(uid);
    setHasUnreadChats(chatCount > 0);
  };

  useEffect(() => {
    if (!userId) return;
    const notifChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.notificationsCollectionId}.documents`;
    const msgChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`;

    const unsubscribe = client.subscribe(
      [notifChannel, msgChannel],
      (response) => {
        if (
          response.events.includes(
            "databases.*.collections.*.documents.*.create"
          )
        ) {
          const payload = response.payload as any;
          if (
            payload.$collectionId ===
              appwriteConfig.notificationsCollectionId &&
            payload.userId === userId
          ) {
            setHasUnreadNotifs(true);
          }
          if (
            payload.$collectionId === appwriteConfig.messagesCollectionId &&
            payload.receiverId === userId
          ) {
            setHasUnreadChats(true);
          }
        }
      }
    );
    return () => {
      unsubscribe();
    };
  }, [userId]);

  return (
    <View
      className="flex-row items-center justify-between w-full px-5 py-2 border-b"
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderBottomWidth: isDark ? 1 : 0,
      }}
    >
      {/* LOGO ADAPTATIVO */}
      <View className="h-[45px] w-[80px] justify-center">
        <Image
          source={require("@/assets/fullLogo.png")}
          resizeMode="contain"
          className="w-full h-full"
          // AQUÍ ESTÁ EL TRUCO:
          // Si es oscuro: undefined (usa colores originales: icono morado + texto blanco).
          // Si es claro: "#5E17EB" (pinta TODO el logo de morado para que el texto se lea).
          style={{ tintColor: isDark ? undefined : "#5E17EB" }}
        />
      </View>

      {/* ICONOS */}
      <View className="flex-row items-center gap-x-3">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            setHasUnreadNotifs(false);
            router.push("/notifications");
          }}
          className="p-2.5 rounded-full relative"
          style={{
            backgroundColor: btnBg,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0 : 0.05,
            shadowRadius: 4,
            elevation: isDark ? 0 : 2,
          }}
        >
          {hasUnreadNotifs && (
            <View className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-[#FF2D55] rounded-full z-10 border border-white dark:border-black" />
          )}
          <Ionicons name="notifications-outline" color={iconColor} size={22} />
        </TouchableOpacity>

        <Link href="/chats" asChild>
          <TouchableOpacity
            activeOpacity={0.7}
            className="p-2.5 rounded-full relative"
            style={{
              backgroundColor: btnBg,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0 : 0.05,
              shadowRadius: 4,
              elevation: isDark ? 0 : 2,
            }}
          >
            {hasUnreadChats && (
              <View className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-[#5E17EB] rounded-full z-10 border border-white dark:border-black" />
            )}
            <Ionicons name="chatbubble-outline" color={iconColor} size={22} />
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
};

export default TopBar;
