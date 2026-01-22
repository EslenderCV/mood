import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
// ❌ ELIMINADO: import * as Clipboard from "expo-clipboard";

interface MessageItemProps {
  item: any;
  currentUserId: string;
  isDark: boolean;
  onSwipeToReply: (item: any) => void;
  onDelete: (id: string) => void;
  onEdit: (item: any) => void;
}

export const MessageItem = ({
  item,
  currentUserId,
  isDark,
  onSwipeToReply,
  onDelete,
  onEdit,
}: MessageItemProps) => {
  const isMe = item.senderId === currentUserId;

  // Colores
  const myBubble = "#5E17EB";
  const otherBubble = isDark ? "#27272A" : "#F3F4F6";
  const myText = "#FFFFFF";
  const otherText = isDark ? "#FFFFFF" : "#000000";

  // Lógica de menús
  const handleLongPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Opciones",
      undefined,
      [
        // Opción de copiar desactivada temporalmente para evitar crash
        // {
        //   text: "Copiar texto",
        //   onPress: async () => await Clipboard.setStringAsync(item.body || "")
        // },
        isMe ? { text: "Editar", onPress: () => onEdit(item) } : null,
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => onDelete(item.$id),
        },
        { text: "Cancelar", style: "cancel" },
      ].filter(Boolean) as any,
    );
  };

  // Renderizar contenido de respuesta
  const renderReplyPreview = () => {
    // Usamos 'body'
    const text = item.body || "";

    if (text.includes(":::REPLY:::")) {
      const parts = text.split(":::REPLY:::");
      const meta = parts[0].split(":::");
      // meta[0] es el nombre, meta[1] es el mensaje citado
      if (meta.length >= 2) {
        return (
          <View className="mb-1 border-l-2 pl-2 border-white/50 opacity-80">
            <Text className="text-[10px] font-bold text-white">{meta[0]}</Text>
            <Text className="text-[10px] text-white" numberOfLines={1}>
              {meta[1]}
            </Text>
          </View>
        );
      }
    }
    return null;
  };

  // Limpiamos el cuerpo del mensaje
  const rawBody = item.body || "";
  const cleanContent = rawBody.includes(":::REPLY:::")
    ? rawBody.split(":::REPLY:::")[1]
    : rawBody;

  // Renderizar acción de Swipe
  const renderLeftActions = () => {
    return (
      <View className="justify-center pl-4 w-16">
        <Ionicons name="arrow-undo" size={20} color="#5E17EB" />
      </View>
    );
  };

  return (
    <Swipeable
      renderLeftActions={renderLeftActions}
      onSwipeableWillOpen={() => {
        Haptics.selectionAsync();
        onSwipeToReply(item);
      }}
      friction={2}
      overshootLeft={false}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={handleLongPress}
        className={`mb-1.5 px-3 w-full flex-row ${isMe ? "justify-end" : "justify-start"}`}
      >
        <View
          className={`px-3 py-2 rounded-2xl max-w-[80%] shadow-sm ${
            isMe ? "rounded-tr-none" : "rounded-tl-none"
          }`}
          style={{ backgroundColor: isMe ? myBubble : otherBubble }}
        >
          {renderReplyPreview()}

          <Text
            style={{
              color: isMe ? myText : otherText,
              fontSize: 15,
              lineHeight: 20,
            }}
          >
            {cleanContent}
          </Text>

          <View className="flex-row items-center justify-end mt-1 space-x-1">
            <Text
              style={{
                color: isMe ? "rgba(255,255,255,0.7)" : "#A1A1AA",
                fontSize: 10,
              }}
            >
              {new Date(item.$createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {isMe && (
              <Ionicons
                name="checkmark-done"
                size={14}
                color={
                  item.readBy && item.readBy.length > 1
                    ? "#60A5FA"
                    : "rgba(255,255,255,0.6)"
                }
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};
