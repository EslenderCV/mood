import React from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme } from "nativewind";
import { Image } from "expo-image";

// Hooks y Lógica
import { useChatLogic } from "@/hooks/useChatLogic";

// Componentes
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageItem } from "@/components/chat/MessageItem";
import { TypingIndicator } from "@/components/chat/TypingIndicator";

const formatLastSeen = (dateString: string | null) => {
  if (!dateString) return "Desconectado";
  const date = new Date(dateString);
  const now = new Date();

  if (date.getDate() === now.getDate() && date.getMonth() === now.getMonth()) {
    return `Última Vez hoy a las ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return `Última Vez el ${date.toLocaleDateString([], { day: "2-digit", month: "2-digit" })}`;
};

const ChatRoom = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const logic = useChatLogic();

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const headerBg = isDark ? "#000000" : "#FFFFFF";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const textColor = isDark ? "#FFFFFF" : "#000000";

  let statusText = "";
  let statusColor = "#71717A";
  let statusFontWeight: "normal" | "bold" = "normal";

  if (logic.isOtherUserTyping) {
    statusText = "Escribiendo...";
    statusColor = "#5E17EB";
    statusFontWeight = "bold";
  } else if (logic.chatUser.isOnline) {
    statusText = "En línea";
    statusColor = "#22C55E";
    statusFontWeight = "bold";
  } else {
    statusText = formatLastSeen(logic.chatUser.lastSeen);
  }

  if (logic.isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: bgColor,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#5E17EB" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <Stack.Screen options={{ headerShown: false }} />

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
          >
            <TouchableWithoutFeedback
              onPress={Keyboard.dismiss}
              accessible={false}
            >
              <View style={{ flex: 1 }}>
                {/* --- HEADER --- */}
                <View
                  className="flex-row items-center px-4 py-3 border-b z-10 shadow-sm"
                  style={{
                    backgroundColor: headerBg,
                    borderColor: borderColor,
                  }}
                >
                  <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
                    <Ionicons name="chevron-back" size={28} color={textColor} />
                  </TouchableOpacity>

                  <Image
                    source={
                      logic.chatUser.avatar
                        ? { uri: logic.chatUser.avatar }
                        : require("@/assets/images/icon.png")
                    }
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      marginLeft: 10,
                      backgroundColor: "#333",
                    }}
                    contentFit="cover"
                  />
                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center">
                      <Text
                        className="font-bold text-[16px]"
                        numberOfLines={1}
                        style={{ color: textColor }}
                      >
                        {logic.chatUser.name}
                      </Text>
                      {logic.chatUser.isVerified && (
                        <MaterialIcons
                          name="verified"
                          size={14}
                          color="#5E17EB"
                          style={{ marginLeft: 4 }}
                        />
                      )}
                    </View>

                    <Text
                      className="text-xs"
                      style={{
                        color: statusColor,
                        fontWeight: statusFontWeight,
                      }}
                    >
                      {statusText}
                    </Text>
                  </View>
                </View>

                {/* --- BODY --- */}
                <View style={{ flex: 1 }}>
                  <FlatList
                    ref={logic.flatListRef}
                    data={logic.messages}
                    keyExtractor={(item) => item.$id}
                    renderItem={({ item, index }) => (
                      <MessageItem
                        item={item}
                        index={index}
                        messages={logic.messages}
                        currentUserId={logic.currentUser?.$id}
                        isDark={isDark}
                        onSwipeToReply={logic.onSwipeToReply}
                        onDelete={logic.confirmDelete}
                        onEdit={logic.startEditing}
                        otherUserAvatar={logic.chatUser.avatar}
                      />
                    )}
                    inverted
                    contentContainerStyle={{ paddingVertical: 15 }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    onScrollBeginDrag={Keyboard.dismiss}
                    showsVerticalScrollIndicator={false}
                  />

                  <View
                    style={{
                      paddingLeft: 10,
                      paddingBottom: 5,
                      display: logic.isOtherUserTyping ? "flex" : "none",
                    }}
                  >
                    <TypingIndicator isVisible={true} />
                  </View>

                  <ChatInput
                    text={logic.newMessage}
                    setText={logic.handleTyping}
                    onSend={logic.handleSend}
                    replyingTo={logic.replyingTo}
                    onCancelReply={() => logic.setReplyingTo(null)}
                    editingMessage={logic.editingMessage}
                    onCancelEdit={() => {
                      logic.setEditingMessage(null);
                      logic.setNewMessage("");
                    }}
                    inputRef={logic.inputRef}
                    isDark={isDark}
                    onSendSong={logic.sendSong} // 🔥 Conectado
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
};

export default ChatRoom;
