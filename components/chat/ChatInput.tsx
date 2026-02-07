import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Platform,
  Keyboard,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ChatMusicModal } from "./ChatMusicModal"; // 🔥 Importamos el Modal

import { tStatic } from "@/context/LanguageContext";
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
  onSendSong: (song: any) => void; // 🔥 Nueva Prop
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
  onSendSong, // 🔥
}: ChatInputProps) => {
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isMusicModalVisible, setMusicModalVisible] = useState(false); // 🔥

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

  const containerBg = isDark ? "#000000" : "#FFFFFF";
  const inputBg = isDark ? "#18181B" : "#F3F4F6";
  const buttonBg = isDark ? "#27272A" : "#E4E4E7";
  const iconColor = "#5E17EB";

  return (
    <View
      style={{
        backgroundColor: containerBg,
        paddingBottom: isKeyboardVisible ? 16 : insets.bottom + 10,
        paddingTop: 10,
        paddingHorizontal: 10,
      }}
    >
      {(replyingTo || editingMessage) && (
        <View className="flex-row items-center justify-between px-4 py-3 mx-1 mb-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-l-4 border-[#5E17EB]">
          <View className="flex-1 mr-2">
            <Text className="text-xs font-bold text-[#5E17EB] mb-0.5">
              {editingMessage
                ? "Editando mensaje"
                : `Respondiendo a ${replyingTo?.senderName || "Usuario"}`}
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
              if (editingMessage) {
                onCancelEdit();
              } else {
                onCancelReply();
              }
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="close-circle"
              size={22}
              color={isDark ? "#71717A" : "#A1A1AA"}
            />
          </TouchableOpacity>
        </View>
      )}

      <View className="flex-row items-center justify-middle">
        {/* 🔥 Botón de Música Activo */}
        <TouchableOpacity
          className="mr-2 w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: buttonBg }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setMusicModalVisible(true);
          }}
        >
          <Ionicons name="musical-notes" size={24} color={iconColor} />
        </TouchableOpacity>

        <View
          className="flex-1 flex-row items-end rounded-[24px] px-4 py-2 border border-transparent"
          style={{
            backgroundColor: inputBg,
            minHeight: 48,
            maxHeight: 120,
          }}
        >
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder={tStatic("ui.s_a0ba125b")}
            placeholderTextColor="#9ca3af"
            multiline
            style={{
              flex: 1,
              color: isDark ? "white" : "black",
              fontSize: 16,
              paddingTop: Platform.OS === "ios" ? 8 : 4,
              paddingBottom: Platform.OS === "ios" ? 8 : 4,
              maxHeight: 100,
            }}
          />
        </View>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onSend();
          }}
          className={`ml-2 w-10 h-10 rounded-full items-center justify-center bg-${text.trim().length > 0 ? "[#5E17EB]" : "gray"} shadow-sm`}
          disabled={text.trim().length === 0}
        >
          <Ionicons
            name={editingMessage ? "checkmark" : "arrow-up"}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>

      {/* 🔥 Renderizamos el Modal */}
      <ChatMusicModal
        visible={isMusicModalVisible}
        onClose={() => setMusicModalVisible(false)}
        onSendSong={onSendSong}
      />
    </View>
  );
};