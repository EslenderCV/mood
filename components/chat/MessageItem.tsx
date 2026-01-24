import React from "react";
import { View, Text, TouchableOpacity, Alert, Dimensions } from "react-native";
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
  messages: any[]; // Necesitamos toda la lista para calcular grupos
  currentUserId: string;
  isDark: boolean;
  onSwipeToReply: (item: any) => void;
  onDelete: (id: string) => void;
  onEdit: (item: any) => void;
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
}: MessageItemProps) => {
  const isMe = item.senderId === currentUserId;

  // --- LÓGICA DE AGRUPAMIENTO (Visual Grouping) ---
  // Nota: La lista está INVERTIDA (index 0 es el más nuevo)
  const nextMessage = messages[index - 1]; // Mensaje visualmente DEBAJO (más nuevo)
  const prevMessage = messages[index + 1]; // Mensaje visualmente ARRIBA (más viejo)

  const isFirstInSequence =
    !prevMessage || prevMessage.senderId !== item.senderId;
  const isLastInSequence =
    !nextMessage || nextMessage.senderId !== item.senderId;

  // Bordes dinámicos
  const borderRadius = 20;
  const borderTopLeft = isMe
    ? borderRadius
    : isFirstInSequence
      ? borderRadius
      : 4;
  const borderTopRight = isMe
    ? isFirstInSequence
      ? borderRadius
      : 4
    : borderRadius;
  const borderBottomLeft = isMe ? borderRadius : isLastInSequence ? 4 : 4;
  const borderBottomRight = isMe ? (isLastInSequence ? 4 : 4) : borderRadius;

  // Márgenes dinámicos (separar grupos distintos, pegar mensajes del mismo grupo)
  const marginBottom = isLastInSequence ? 12 : 2;

  // Colores
  const myGradientColors = ["#6d28d9", "#5b21b6"]; // Un morado más profundo y rico
  const otherBubbleColor = isDark ? "#27272A" : "#E5E5EA"; // Gris iMessage
  const myText = "#FFFFFF";
  const otherText = isDark ? "#FFFFFF" : "#000000";

  // --- MENÚS ---
  const handleLongPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Opciones",
      undefined,
      [
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

  // --- RENDER REPLY ---
  const renderReplyPreview = () => {
    const text = item.body || "";
    if (text.includes(":::REPLY:::")) {
      const parts = text.split(":::REPLY:::");
      const meta = parts[0].split(":::");
      if (meta.length >= 2) {
        return (
          <View
            className="mb-2 pl-3 border-l-4 py-1 rounded-sm overflow-hidden"
            style={{
              borderColor: isMe ? "rgba(255,255,255,0.5)" : "#8B5CF6",
              backgroundColor: isMe
                ? "rgba(0,0,0,0.1)"
                : "rgba(139, 92, 246, 0.1)",
            }}
          >
            <Text
              className={`text-[11px] font-bold mb-0.5 ${isMe ? "text-white/90" : "text-purple-600"}`}
            >
              {meta[0]}
            </Text>
            <Text
              className={`text-[11px] ${isMe ? "text-white/80" : "text-zinc-500"}`}
              numberOfLines={1}
            >
              {meta[1]}
            </Text>
          </View>
        );
      }
    }
    return null;
  };

  const rawBody = item.body || "";
  const cleanContent = rawBody.includes(":::REPLY:::")
    ? rawBody.split(":::REPLY:::")[1]
    : rawBody;

  // --- RENDER SWIPE ACTION ---
  const renderLeftActions = () => (
    <View className="justify-center pl-4 w-16">
      <Ionicons name="arrow-undo" size={20} color="#5E17EB" />
    </View>
  );

  // --- CONTENIDO DE LA BURBUJA ---
  const BubbleContent = () => (
    <View className="px-4 py-2.5">
      {renderReplyPreview()}
      <Text
        style={{
          color: isMe ? myText : otherText,
          fontSize: 16, // Texto un poco más grande estilo moderno
          lineHeight: 22,
        }}
      >
        {cleanContent}
      </Text>

      {/* Hora y Checks (Ocultos o muy sutiles para look limpio) */}
      <View className="flex-row items-center justify-end mt-1 space-x-1 opacity-70">
        <Text
          style={{
            color: isMe ? "rgba(255,255,255,0.7)" : "#A1A1AA",
            fontSize: 9,
          }}
        >
          {new Date(item.$createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
        {isMe && item.readBy && item.readBy.length > 1 && (
          <Ionicons name="checkmark-done" size={12} color="white" />
        )}
      </View>
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
        overshootLeft={false}
      >
        <TouchableOpacity
          activeOpacity={0.95}
          onLongPress={handleLongPress}
          delayLongPress={200}
          style={{
            marginBottom: marginBottom,
            paddingHorizontal: 12,
            flexDirection: isMe ? "row-reverse" : "row",
            alignItems: "flex-end",
          }}
        >
          {/* AVATAR (Solo si es el otro usuario y es el último mensaje del grupo) */}
          {!isMe && (
            <View style={{ width: 32, marginRight: 8 }}>
              {isLastInSequence ? (
                <Image
                  source={
                    item.senderAvatar
                      ? { uri: item.senderAvatar }
                      : require("@/assets/images/icon.png") // Fallback
                  }
                  style={{ width: 32, height: 32, borderRadius: 16 }}
                  contentFit="cover"
                />
              ) : null}
            </View>
          )}

          {/* BURBUJA DE MENSAJE */}
          <View
            style={{
              maxWidth: width * 0.75,
              borderTopLeftRadius: borderTopLeft,
              borderTopRightRadius: borderTopRight,
              borderBottomLeftRadius: borderBottomLeft,
              borderBottomRightRadius: borderBottomRight,
              overflow: "hidden",
              backgroundColor: isMe ? "transparent" : otherBubbleColor, // Transparente si es gradiente
            }}
          >
            {isMe ? (
              <LinearGradient
                colors={myGradientColors as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <BubbleContent />
              </LinearGradient>
            ) : (
              <BubbleContent />
            )}
          </View>
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
  );
};
