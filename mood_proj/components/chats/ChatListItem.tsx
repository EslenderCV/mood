import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import Swipeable from "react-native-gesture-handler/Swipeable";

import { tStatic } from "@/context/LanguageContext";
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

  const displayName = otherUser.name || otherUser.username || "Usuario Mood";

  // Fallback seguro para avatar
  const avatarUrl = otherUser.pfp
    ? otherUser.pfp
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=5E17EB&color=fff&bold=true`;

  const renderRightActions = (_: any, dragX: any) => {
    return (
      <TouchableOpacity
        onPress={onDelete}
        className="bg-red-500 justify-center items-center w-[80px]"
      >
        <Ionicons name="trash-outline" size={24} color="white" />
        <Text className="text-white text-xs font-bold mt-1">{tStatic("ui.s_a96f30f0")}</Text>
      </TouchableOpacity>
    );
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();

    // Si es hoy
    if (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth()
    ) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    // Si fue en la semana (menos de 7 días)
    const diff = now.getTime() - date.getTime();
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      return days[date.getDay()];
    }
    return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
  };

  let previewMessage = chat.lastMessage || "Iniciar conversación";
  let isTyping = false;

  if (chat.isTyping && Array.isArray(chat.isTyping)) {
    if (chat.isTyping.includes(otherUser.$id)) {
      isTyping = true;
      previewMessage = "Escribiendo...";
    }
  }

  if (!isTyping && previewMessage.includes(":::REPLY:::")) {
    previewMessage = "Respondió a un mensaje";
  }

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className={`flex-row px-4 py-3.5 items-center ${isDark ? "bg-black" : "bg-white"}`}
      >
        {/* Avatar Grande con Borde si no leído */}
        <View
          className={`rounded-full p-[2px] ${isUnread ? "border-2 border-[#5E17EB]" : "border-transparent"}`}
        >
          <Image
            source={{ uri: avatarUrl }}
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: "#27272A",
            }}
            contentFit="cover"
          />
        </View>

        <View className="flex-1 ml-3.5 justify-center h-full">
          <View className="flex-row justify-between items-center mb-1">
            <View className="flex-row items-center max-w-[75%]">
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
            <Text
              className={`text-[12px] ${isUnread ? "text-[#5E17EB] font-bold" : "text-zinc-500"}`}
            >
              {isTyping ? "" : formatTime(chat.lastMessageTime)}
            </Text>
          </View>

          <View className="flex-row justify-between items-center pr-2">
            <Text
              className={`text-[14px] leading-5 flex-1 mr-2 ${
                isTyping
                  ? "text-[#5E17EB] font-bold italic"
                  : isUnread
                    ? isDark
                      ? "text-white font-semibold"
                      : "text-black font-semibold"
                    : "text-zinc-500"
              }`}
              numberOfLines={2}
            >
              {previewMessage}
            </Text>

            {/* Punto Azul de No Leído (Classic iOS Style) */}
            {!isTyping && isUnread && (
              <View className="w-3 h-3 bg-[#5E17EB] rounded-full shadow-sm" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};