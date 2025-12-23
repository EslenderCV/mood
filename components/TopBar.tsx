import { View, Image, TouchableOpacity } from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Link, router, useFocusEffect } from "expo-router";
import {
  getCurrentUser,
  getUnreadNotificationCount,
  getUnreadMessagesCount,
  client,
  appwriteConfig,
} from "@/lib/appwrite";

const TopBar = () => {
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
  const [hasUnreadChats, setHasUnreadChats] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // 1. CARGA INICIAL
  useEffect(() => {
    const initUser = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setUserId(user.$id);
          // La carga inicial de contadores se hará en el useFocusEffect de abajo
        }
      } catch (error) {
        console.log("Error TopBar init:", error);
      }
    };
    initUser();
  }, []);

  // 2. RE-VERIFICAR AL ENFOCAR (ESTA ES LA SOLUCIÓN)
  // Cada vez que vuelves a ver esta barra (ej. al salir de un chat), recuenta todo.
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        refreshCounts(userId);
      }
    }, [userId])
  );

  const refreshCounts = async (uid: string) => {
    // Revisar Notificaciones
    const notifCount = await getUnreadNotificationCount(uid);
    setHasUnreadNotifs(notifCount > 0);

    // Revisar Chats (Aquí se dará cuenta que ya leíste el mensaje)
    const chatCount = await getUnreadMessagesCount(uid);
    setHasUnreadChats(chatCount > 0);
  };

  // 3. SUSCRIPCIÓN REALTIME (Para cuando estás viendo la pantalla)
  useEffect(() => {
    if (!userId) return;

    const notifChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.notificationsCollectionId}.documents`;
    const msgChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`;

    const unsubscribe = client.subscribe(
      [notifChannel, msgChannel],
      (response) => {
        // Solo nos importa si se CREA algo nuevo
        if (
          response.events.includes(
            "databases.*.collections.*.documents.*.create"
          )
        ) {
          const payload = response.payload as any;

          // A) Notificaciones
          if (
            payload.$collectionId ===
              appwriteConfig.notificationsCollectionId &&
            payload.userId === userId
          ) {
            setHasUnreadNotifs(true);
          }

          // B) Mensajes
          if (
            payload.$collectionId === appwriteConfig.messagesCollectionId &&
            payload.receiverId === userId
          ) {
            console.log("🔵 Nuevo mensaje entrante en TopBar");
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
    <View className="flex-row items-center justify-between w-full px-5 py-2 bg-black">
      {/* Logo */}
      <View className="h-[45px] w-[80px] justify-center">
        <Image
          source={require("@/assets/fullLogo.png")}
          resizeMode="contain"
          className="w-full h-full"
        />
      </View>

      {/* Iconos Interactivos */}
      <View className="flex-row items-center gap-x-3">
        {/* BOTÓN NOTIFICACIONES */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            setHasUnreadNotifs(false); // Feedback instantáneo
            router.push("/notifications");
          }}
          className="bg-zinc-900/80 p-2.5 rounded-full border border-white/5 relative"
        >
          {hasUnreadNotifs && (
            <View className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-[#FF2D55] rounded-full z-10 border border-black" />
          )}
          <Ionicons name="notifications-outline" color="#5E17EB" size={22} />
        </TouchableOpacity>

        {/* BOTÓN CHATS */}
        <Link href="/chats" asChild>
          <TouchableOpacity
            activeOpacity={0.7}
            className="bg-zinc-900/80 p-2.5 rounded-full border border-white/5 relative"
          >
            {hasUnreadChats && (
              <View className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-[#5E17EB] rounded-full z-10 border border-black" />
            )}
            <Ionicons name="chatbubble-outline" color="#5E17EB" size={22} />
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
};

export default TopBar;
