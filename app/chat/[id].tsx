import React from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme } from "nativewind";
import { Image } from "expo-image";

// Hooks
import { useChatLogic } from "@/hooks/useChatLogic";

// Componentes
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageItem } from "@/components/chat/MessageItem";

const ChatRoom = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const logic = useChatLogic();

  // Colores
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const headerBg = isDark ? "#000000" : "#FFFFFF";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const textColor = isDark ? "#FFFFFF" : "#000000";

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
          {/* <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          > */}
          {/* HEADER */}
          <View
            className="flex-row items-center px-4 py-3 border-b z-10 shadow-sm"
            style={{ backgroundColor: headerBg, borderColor: borderColor }}
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color={textColor}
              onPress={() => router.back()}
            />
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
                {!logic.chatUser.isVerified && (
                  <MaterialIcons
                    name="verified"
                    size={14}
                    color="#5E17EB"
                    style={{ marginLeft: 4 }}
                  />
                )}
              </View>
              <Text className="text-xs text-zinc-500">En línea</Text>
            </View>
          </View>

          {/* LISTA */}
          <FlatList
            ref={logic.flatListRef}
            data={logic.messages}
            keyExtractor={(item) => item.$id}
            renderItem={({ item }) => (
              <MessageItem
                item={item}
                currentUserId={logic.currentUser?.$id}
                isDark={isDark}
                onSwipeToReply={logic.onSwipeToReply}
                onDelete={logic.confirmDelete}
                onEdit={logic.startEditing}
              />
            )}
            inverted
            contentContainerStyle={{ paddingVertical: 15 }}
            keyboardShouldPersistTaps="handled"
          />

          {/* INPUT */}
          <ChatInput
            text={logic.newMessage}
            setText={logic.setNewMessage}
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
          />
          {/* </KeyboardAvoidingView> */}
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
};

export default ChatRoom;
