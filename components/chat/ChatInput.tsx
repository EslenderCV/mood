import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Platform,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur"; // Si quieres blur, si no, usa View solido

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

  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const hideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false),
    );
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const backgroundColor = isDark ? "#000000" : "#FFFFFF";
  const inputBg = isDark ? "#27272A" : "#F2F2F2"; // Gris muy suave
  const iconColor = "#5E17EB"; // Color de marca

  return (
    <View
      style={{
        backgroundColor: backgroundColor,
        paddingBottom: isKeyboardVisible ? 10 : insets.bottom + 10,
        paddingTop: 10,
      }}
    >
      {/* Banner de Respuesta */}
      {(replyingTo || editingMessage) && (
        <View className="flex-row items-center justify-between px-4 py-2 mx-4 mb-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-l-4 border-[#5E17EB]">
          <View className="flex-1">
            <Text className="text-xs font-bold text-[#5E17EB] mb-0.5">
              {editingMessage
                ? "Editando"
                : `Respondiendo a ${replyingTo?.senderName || "..."}`}
            </Text>
            <Text
              className="text-xs text-zinc-500 dark:text-zinc-400"
              numberOfLines={1}
            >
              {editingMessage ? editingMessage.body : replyingTo?.body}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              editingMessage ? onCancelEdit() : onCancelReply();
            }}
          >
            <Ionicons
              name="close-circle"
              size={24}
              color={isDark ? "#555" : "#ccc"}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Cápsula */}
      <View className="flex-row items-end px-3">
        {/* Botón Multimedia (Cámara/Fotos) - Estilo iOS */}
        <TouchableOpacity className="mb-2 mr-2 bg-zinc-200 dark:bg-zinc-800 w-10 h-10 rounded-full items-center justify-center">
          <Ionicons name="add" size={24} color={isDark ? "white" : "black"} />
        </TouchableOpacity>

        <View
          className="flex-1 flex-row items-end rounded-[24px] px-4 py-2 mr-2 border border-transparent focus:border-purple-500/30"
          style={{
            backgroundColor: inputBg,
            minHeight: 44,
            maxHeight: 120,
          }}
        >
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder="Mensaje..."
            placeholderTextColor="#9ca3af"
            multiline
            style={{
              flex: 1,
              color: isDark ? "white" : "black",
              fontSize: 16,
              paddingTop: Platform.OS === "ios" ? 6 : 2,
              paddingBottom: Platform.OS === "ios" ? 6 : 2,
              maxHeight: 100,
            }}
          />
        </View>

        {/* Botón de Enviar (Solo visible si hay texto) */}
        {text.trim().length > 0 && (
          <TouchableOpacity
            onPress={onSend}
            className="mb-2 w-10 h-10 rounded-full items-center justify-center bg-[#5E17EB] shadow-sm"
          >
            <Ionicons
              name={editingMessage ? "checkmark" : "arrow-up"}
              size={24}
              color="white"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
