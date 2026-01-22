import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Platform,
  Keyboard, // 🔥 Importamos Keyboard
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

interface ChatInputProps {
  text: string;
  setText: (t: string) => void;
  onSend: () => void;
  replyingTo: any;
  onCancelReply: () => void;
  editingMessage: any;
  onCancelEdit: () => void;
  inputRef: any;
  isDark: boolean;
}

export const ChatInput = ({
  text,
  setText,
  onSend,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  inputRef,
  isDark,
}: ChatInputProps) => {
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // 🔥 DETECTAR TECLADO PARA AJUSTAR EL PADDING
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showListener = Keyboard.addListener(showEvent, () =>
      setKeyboardVisible(true),
    );
    const hideListener = Keyboard.addListener(hideEvent, () =>
      setKeyboardVisible(false),
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  // Colores
  const bgInput = isDark ? "#18181B" : "#F4F4F5";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const iconColor = isDark ? "#A1A1AA" : "#71717A";
  const borderTop = isDark ? "#27272A" : "#E4E4E7";
  const backgroundColor = isDark ? "#000" : "#fff";

  // Lógica de Padding Dinámico
  const bottomPadding = isKeyboardVisible
    ? 350 // Si hay teclado, solo 10px de respiro
    : Math.max(insets.bottom, 10); // Si no, respeta la zona segura (Home Indicator / Nav Bar)

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: borderTop,
        backgroundColor: backgroundColor,
        paddingBottom: bottomPadding,
      }}
    >
      {/* --- BANNER DE RESPUESTA / EDICIÓN --- */}
      {(replyingTo || editingMessage) && (
        <View
          className="flex-row items-center justify-between px-4 py-2 mx-2 mt-2 rounded-xl border-l-4"
          style={{
            backgroundColor: isDark ? "#27272A" : "#F3F4F6",
            borderColor: editingMessage ? "#EAB308" : "#5E17EB",
          }}
        >
          <View className="flex-1 mr-2">
            <Text
              className="text-xs font-bold mb-0.5"
              style={{ color: editingMessage ? "#EAB308" : "#5E17EB" }}
            >
              {editingMessage
                ? "Editando mensaje"
                : `Respondiendo a ${replyingTo?.senderName || "Usuario"}`}
            </Text>
            <Text className="text-xs text-zinc-500" numberOfLines={1}>
              {editingMessage ? editingMessage.body : replyingTo?.body}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (editingMessage) onCancelEdit();
              else onCancelReply();
            }}
          >
            <Ionicons name="close" size={20} color={iconColor} />
          </TouchableOpacity>
        </View>
      )}

      {/* --- BARRA DE ENTRADA --- */}
      <View className="flex-row items-end px-3 py-2">
        <TouchableOpacity className="p-2 mr-1 mb-1">
          <Ionicons name="add" size={24} color="#5E17EB" />
        </TouchableOpacity>

        <View
          className="flex-1 rounded-2xl border"
          style={{
            backgroundColor: bgInput,
            borderColor: isDark ? "#333" : "#E5E5E5",
            minHeight: 40,
            maxHeight: 120,
            paddingHorizontal: 12,
            paddingVertical: Platform.OS === "ios" ? 8 : 4,
            justifyContent: "center",
          }}
        >
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder="Mensaje..."
            placeholderTextColor="#71717A"
            multiline
            style={{
              color: textColor,
              fontSize: 16,
              textAlignVertical: "center",
              paddingTop: 0,
              paddingBottom: 0,
            }}
          />
        </View>

        <TouchableOpacity
          onPress={onSend}
          disabled={!text.trim()}
          className="ml-2 w-10 h-10 rounded-full items-center justify-center mb-1"
          style={{
            backgroundColor: text.trim()
              ? editingMessage
                ? "#EAB308"
                : "#5E17EB"
              : bgInput,
            opacity: text.trim() ? 1 : 0.7,
          }}
        >
          <Ionicons
            name={editingMessage ? "checkmark" : "send"}
            size={18}
            color={text.trim() ? "white" : iconColor}
            style={{ marginLeft: text.trim() ? 2 : 0 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};
