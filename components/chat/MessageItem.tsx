import React from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Image } from "expo-image";

const { width } = Dimensions.get("window");

interface MessageItemProps {
  item: any;
  index: number;
  messages: any[];
  currentUserId: string;
  isDark: boolean;
  onSwipeToReply: (item: any) => void;
  onDelete: (id: string) => void;
  onEdit: (item: any) => void;
  // 🔥 NUEVA PROP: Recibimos la foto desde el padre
  otherUserAvatar: string | null;
}

export const MessageItem = ({
  item,
  index,
  messages,
  currentUserId,
  isDark,
  onSwipeToReply,
  onDelete,
  onEdit,
  otherUserAvatar, // 🔥 La desestructuramos aquí
}: MessageItemProps) => {
  const isMe = item.senderId === currentUserId;

  const previousMessage = messages[index + 1];
  const nextMessage = messages[index - 1];

  const isFirstInGroup =
    !previousMessage || previousMessage.senderId !== item.senderId;
  const isLastInGroup = !nextMessage || nextMessage.senderId !== item.senderId;

  // Bordes dinámicos
  const borderTopLeft = isMe ? 20 : isFirstInGroup ? 20 : 4;
  const borderTopRight = isMe ? (isFirstInGroup ? 20 : 4) : 20;
  const borderBottomLeft = isMe ? 20 : isLastInGroup ? 4 : 4;
  const borderBottomRight = isMe ? (isLastInGroup ? 4 : 4) : 20;

  const marginBottom = isLastInGroup ? 12 : 2;

  const myGradientColors = ["#5E17EB", "#7c3aed"];
  const otherBubbleColor = isDark ? "#27272A" : "#E5E5EA";
  const myTextColor = "#FFFFFF";
  const otherTextColor = isDark ? "#FFFFFF" : "#000000";

  const renderReply = () => {
    if (item.body?.includes(":::REPLY:::")) {
      const parts = item.body.split(":::REPLY:::");
      const meta = parts[0].split(":::");
      return (
        <View
          className={`mb-2 pl-2 border-l-2 ${isMe ? "border-white/50" : "border-[#5E17EB]"}`}
        >
          <Text
            className={`text-[10px] font-bold ${isMe ? "text-white/80" : "text-[#5E17EB]"}`}
          >
            {meta[0] || "Respuesta"}
          </Text>
          <Text
            className={`text-[10px] ${isMe ? "text-white/60" : "text-zinc-500"}`}
            numberOfLines={1}
          >
            {meta[1] || "..."}
          </Text>
        </View>
      );
    }
    return null;
  };

  const cleanBody = item.body?.includes(":::REPLY:::")
    ? item.body.split(":::REPLY:::")[1]
    : item.body;

  const renderLeftActions = () => (
    <View className="justify-center pl-4 w-16">
      <Ionicons name="arrow-undo" size={20} color="#5E17EB" />
    </View>
  );

  return (
    <Animated.View entering={FadeInUp.duration(300).springify()}>
      <Swipeable
        renderLeftActions={renderLeftActions}
        onSwipeableWillOpen={() => {
          Haptics.selectionAsync();
          onSwipeToReply(item);
        }}
        friction={2}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onDelete(item.$id);
          }}
          style={{
            flexDirection: isMe ? "row-reverse" : "row",
            marginBottom: marginBottom,
            paddingHorizontal: 12,
            alignItems: "flex-end",
          }}
        >
          {/* AVATAR (Solo si es el otro usuario y es el último del grupo) */}
          {!isMe && (
            <View style={{ width: 34, marginRight: 8 }}>
              {isLastInGroup ? (
                <Image
                  source={
                    otherUserAvatar // 🔥 USAMOS LA PROP AQUÍ
                      ? { uri: otherUserAvatar }
                      : require("@/assets/images/icon.png")
                  }
                  style={{ width: 30, height: 30, borderRadius: 15 }}
                  contentFit="cover"
                />
              ) : null}
            </View>
          )}

          {/* BURBUJA */}
          <View
            style={{
              maxWidth: width * 0.72,
              borderTopLeftRadius: borderTopLeft,
              borderTopRightRadius: borderTopRight,
              borderBottomLeftRadius: borderBottomLeft,
              borderBottomRightRadius: borderBottomRight,
              overflow: "hidden",
              backgroundColor: isMe ? "transparent" : otherBubbleColor,
            }}
          >
            {isMe ? (
              <LinearGradient
                colors={myGradientColors as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingHorizontal: 14, paddingVertical: 10 }}
              >
                {renderReply()}
                <Text
                  style={{ color: myTextColor, fontSize: 16, lineHeight: 22 }}
                >
                  {cleanBody}
                </Text>
                <View className="flex-row justify-end items-center mt-1 space-x-1">
                  <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>
                    {new Date(item.$createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  {item.readBy?.length > 1 && (
                    <Ionicons name="checkmark-done" size={10} color="white" />
                  )}
                </View>
              </LinearGradient>
            ) : (
              <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
                {renderReply()}
                <Text
                  style={{
                    color: otherTextColor,
                    fontSize: 16,
                    lineHeight: 22,
                  }}
                >
                  {cleanBody}
                </Text>
                <Text
                  style={{
                    fontSize: 9,
                    color: isDark ? "#A1A1AA" : "#71717A",
                    marginTop: 4,
                    alignSelf: "flex-end",
                  }}
                >
                  {new Date(item.$createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
  );
};
