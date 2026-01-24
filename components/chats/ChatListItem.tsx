import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import Swipeable from "react-native-gesture-handler/Swipeable";

interface ChatListItemProps {
  chat: any;
  currentUserId: string;
  onPress: () => void;
  onDelete: () => void;
}

export const ChatListItem = ({
  chat,
  currentUserId,
  onPress,
  onDelete,
}: ChatListItemProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const otherUser = chat.otherUser || {};
  const unreadCount = chat.unreadCount || 0;
  const isUnread = unreadCount > 0;

  const displayName = otherUser.name || otherUser.username || "Usuario";
  const avatarUrl =
    otherUser.pfp ||
    `https://cloud.appwrite.io/v1/avatars/initials?name=${displayName}`;

  const renderRightActions = (_: any, dragX: any) => {
    return (
      <TouchableOpacity
        onPress={onDelete}
        className="bg-red-500 justify-center items-center w-20"
      >
        <Ionicons name="trash-outline" size={24} color="white" />
      </TouchableOpacity>
    );
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() && date.getMonth() === now.getMonth();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
    }
  };

  // 🔥 LÓGICA DE VISUALIZACIÓN CORREGIDA
  let previewMessage = chat.lastMessage || "Empezar chat...";
  let isReply = false;
  let isTyping = false;

  // Validamos que isTyping exista y sea Array antes de usar .includes
  if (chat.isTyping && Array.isArray(chat.isTyping)) {
    if (chat.isTyping.includes(otherUser.$id)) {
      isTyping = true;
      previewMessage = "Escribiendo...";
    }
  }

  // Limpieza de REPLY (Solo si no está escribiendo)
  if (!isTyping && previewMessage.includes(":::REPLY:::")) {
    const parts = previewMessage.split(":::REPLY:::");
    previewMessage = parts[1] || "Respuesta";
    isReply = true;
  }

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className={`flex-row px-5 py-3 items-center ${isDark ? "bg-black" : "bg-white"}`}
      >
        {/* Avatar */}
        <Image
          source={{ uri: avatarUrl }}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "#27272A",
          }}
          contentFit="cover"
        />

        {/* Contenido */}
        <View className="flex-1 ml-4 justify-center h-full border-b border-zinc-800/50 pb-3">
          <View className="flex-row justify-between items-center mb-1">
            <View className="flex-row items-center max-w-[70%]">
              <Text
                className={`font-bold text-[16px] ${isDark ? "text-white" : "text-black"}`}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              {otherUser.isVerified && (
                <MaterialIcons
                  name="verified"
                  size={14}
                  color="#5E17EB"
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
            {/* Si está escribiendo, mostramos puntos suspensivos o indicador */}
            <Text
              className={`text-xs font-medium ${isTyping ? "text-[#5E17EB]" : "text-zinc-500"}`}
            >
              {isTyping ? "● ● ●" : formatTime(chat.lastMessageTime)}
            </Text>
          </View>

          <View className="flex-row justify-between items-center">
            <View className="flex-1 mr-4 flex-row items-center">
              {/* Icono de Reply solo si NO está escribiendo */}
              {!isTyping && isReply && (
                <Ionicons
                  name="arrow-undo"
                  size={12}
                  color={isDark ? "#A1A1AA" : "#71717A"}
                  style={{ marginRight: 4 }}
                />
              )}

              <Text
                className={`text-[14px] ${
                  isTyping
                    ? "text-[#5E17EB] font-bold italic" // Color destacado para "Escribiendo..."
                    : isUnread
                      ? isDark
                        ? "text-white font-bold"
                        : "text-black font-bold"
                      : "text-zinc-500"
                }`}
                numberOfLines={1}
              >
                {previewMessage}
              </Text>
            </View>

            {/* Badge de No Leídos (solo si no está escribiendo, para no saturar) */}
            {!isTyping && isUnread && (
              <View className="bg-[#5E17EB] min-w-[20px] h-5 px-1.5 rounded-full items-center justify-center">
                <Text className="text-white text-[10px] font-bold">
                  {unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};
