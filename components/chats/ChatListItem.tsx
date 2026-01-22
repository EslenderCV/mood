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

  // Formato de hora inteligente (10:30 AM o Ayer)
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
            <Text className="text-zinc-500 text-xs font-medium">
              {formatTime(chat.lastMessageTime)}
            </Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text
              className={`text-[14px] flex-1 mr-4 ${isUnread ? (isDark ? "text-white font-bold" : "text-black font-bold") : "text-zinc-500"}`}
              numberOfLines={1}
            >
              {chat.lastMessage || "Empezar chat..."}
            </Text>

            {/* Badge de No Leídos */}
            {isUnread && (
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
