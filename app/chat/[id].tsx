import React from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  AlertButton,
} from "react-native";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import { useColorScheme } from "nativewind";
import * as Haptics from "expo-haptics";

import { useChatLogic } from "@/hooks/useChatLogic";
import { ChatRoomSkeleton } from "@/components/chat/ChatSkeleton";
import {
  PostPreviewBubble,
  ChatPlaylistCard,
} from "@/components/chat/ChatBubbles";

const ChatRoom = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const logic = useChatLogic();
  const { t } = logic;

  // Colors
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const inputBg = isDark ? "#18181B" : "#F4F4F5";
  const headerBg = isDark ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)";
  const iconColor = isDark ? "#A1A1AA" : "#52525B";

  // Bubbles Colors
  const myBubbleBg = "#5E17EB";
  const myBubbleText = "#FFFFFF";
  const otherBubbleBg = isDark ? "#27272A" : "#F3F4F6";
  const otherBubbleText = isDark ? "#FFFFFF" : "#000000";
  const replyBoxMyBg = "rgba(0, 0, 0, 0.2)";
  const replyBoxOtherBg = isDark
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(0, 0, 0, 0.05)";

  if (logic.isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView
          className="flex-1"
          edges={["top"]}
          style={{ backgroundColor: bgColor }}
        >
          <ChatRoomSkeleton isDark={isDark} />
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  // --- RENDER MESSAGE ITEM ---
  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === logic.currentUser?.$id;
    const time = new Date(item.$createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const hasSharedPost = !!item.sharedPostId;
    const hasSharedPlaylist = !!item.sharedPlaylistId;
    const hasContent = item.content && item.content.trim().length > 0;

    if (!hasSharedPost && !hasSharedPlaylist && !hasContent) return null;

    // Parse Reply Logic
    let displayContent = item.content;
    let replySnippet = null;
    let replyName = null;

    if (hasContent) {
      if (item.content.includes(":::REPLY:::")) {
        const parts = item.content.split(":::REPLY:::");
        const metadata = parts[0].split(":::");
        replyName = metadata.length >= 2 ? metadata[0] : t("chat.reply");
        replySnippet = metadata.length >= 2 ? metadata[1] : metadata[0];
        displayContent = parts[1];
      } else if (item.content.startsWith("Replying to:")) {
        const parts = item.content.split("\n\n");
        if (parts.length > 1) {
          replyName = t("chat.reply");
          replySnippet = parts[0]
            .replace("Replying to: ", "")
            .replace(/"/g, "");
          displayContent = parts.slice(1).join("\n\n");
        }
      }
    }

    const handleLongPress = () => {
      if (!isMe) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const options: AlertButton[] = [
        { text: t("chat.cancel"), style: "cancel" },
      ];
      if (!hasSharedPost && !hasSharedPlaylist)
        options.push({
          text: t("chat.edit"),
          onPress: () => logic.startEditing(item),
        });
      options.push({
        text: t("chat.delete"),
        style: "destructive",
        onPress: () => logic.confirmDelete(item.$id),
      });
      Alert.alert(t("chat.options"), "", options);
    };

    return (
      <Swipeable
        ref={(ref) => {
          if (ref && item.$id) logic.rowRefs.set(item.$id, ref);
        }}
        renderRightActions={
          isMe
            ? () => (
                <View className="justify-center items-end pr-4 w-20">
                  <Ionicons name="arrow-undo" size={24} color={iconColor} />
                </View>
              )
            : undefined
        }
        renderLeftActions={
          !isMe
            ? () => (
                <View className="justify-center items-start pl-4 w-20">
                  <Ionicons
                    name="arrow-undo"
                    size={24}
                    color={iconColor}
                    style={{ transform: [{ scaleX: -1 }] }}
                  />
                </View>
              )
            : undefined
        }
        onSwipeableWillOpen={() => logic.onSwipeToReply(item)}
        friction={2}
        overshootRight={false}
        overshootLeft={false}
        activeOffsetX={isMe ? [-20, 9999] : [-9999, 35]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={handleLongPress}
          delayLongPress={300}
        >
          <View
            className={`mb-2 flex-row ${isMe ? "justify-end" : "justify-start"} px-4`}
          >
            {!isMe && (
              <Image
                source={
                  logic.chatUser.avatar
                    ? { uri: logic.chatUser.avatar }
                    : require("@/assets/noPfp.jpg")
                }
                className="w-7 h-7 rounded-full self-end mr-2 mb-1"
                style={{ backgroundColor: inputBg }}
              />
            )}
            <View
              className={`max-w-[80%] ${isMe ? "items-end" : "items-start"}`}
            >
              {hasSharedPost && (
                <PostPreviewBubble
                  postId={item.sharedPostId}
                  onLongPress={handleLongPress}
                />
              )}
              {hasSharedPlaylist && (
                <ChatPlaylistCard
                  playlistId={item.sharedPlaylistId}
                  isMyMessage={isMe}
                />
              )}

              {hasContent && (
                <View
                  className={`px-3 py-2 rounded-[18px] ${isMe ? "rounded-tr-none" : "rounded-tl-none"} mt-1`}
                  style={{
                    backgroundColor: isMe ? myBubbleBg : otherBubbleBg,
                    opacity: logic.editingMessage?.$id === item.$id ? 0.5 : 1,
                    minWidth: 80,
                  }}
                >
                  {replySnippet && (
                    <TouchableOpacity
                      onPress={() =>
                        logic.scrollToOriginalMessage(replySnippet as string)
                      }
                      className="mb-1 rounded-md overflow-hidden border-l-4 p-1.5"
                      style={{
                        backgroundColor: isMe ? replyBoxMyBg : replyBoxOtherBg,
                        borderColor: isMe ? "rgba(255,255,255,0.7)" : "#5E17EB",
                      }}
                    >
                      <Text
                        className="text-[11px] font-bold mb-0.5"
                        style={{
                          color: isMe ? "rgba(255,255,255,0.9)" : "#5E17EB",
                        }}
                      >
                        {replyName}
                      </Text>
                      <Text
                        className="text-[12px]"
                        numberOfLines={1}
                        style={{
                          color: isMe ? "rgba(255,255,255,0.7)" : subTextColor,
                        }}
                      >
                        {replySnippet}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <Text
                    className="text-[15px] leading-5"
                    style={{ color: isMe ? myBubbleText : otherBubbleText }}
                  >
                    {displayContent}
                  </Text>
                  <View className="flex-row items-center justify-end mt-1 space-x-1">
                    <Text
                      className="text-[10px]"
                      style={{
                        color: isMe ? "rgba(255,255,255,0.6)" : subTextColor,
                      }}
                    >
                      {time}
                    </Text>
                    {isMe && (
                      <Ionicons
                        name="checkmark-done"
                        size={14}
                        color={
                          item.isRead ? "#60A5FA" : "rgba(255,255,255,0.6)"
                        }
                      />
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        className="flex-1"
        edges={["top"]}
        style={{ backgroundColor: bgColor }}
      >
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View
          className="flex-row items-center px-2 py-2 border-b z-10"
          style={{ backgroundColor: headerBg, borderColor: borderColor }}
        >
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons
              name="chevron-back"
              size={28}
              color={isDark ? "#FFF" : "#000"}
            />
          </TouchableOpacity>
          <Image
            source={
              logic.chatUser.avatar
                ? { uri: logic.chatUser.avatar }
                : require("@/assets/noPfp.jpg")
            }
            className="w-9 h-9 rounded-full"
            style={{ backgroundColor: inputBg }}
          />
          <View className="ml-3 flex-1">
            <View className="flex-row items-center">
              <Text
                className="font-bold text-base"
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
          </View>
        </View>

        <FlatList
          ref={logic.flatListRef}
          data={logic.messages}
          keyExtractor={(item) => item.$id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={{ paddingVertical: 15 }}
          className="flex-1"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          {(logic.replyingTo || logic.editingMessage) && (
            <View
              className="flex-row items-center justify-between px-3 py-2 m-2 rounded-xl border-l-4"
              style={{
                backgroundColor: inputBg,
                borderColor: logic.editingMessage ? "#EAB308" : "#5E17EB",
                borderLeftWidth: 4,
                elevation: 2,
              }}
            >
              <View className="flex-1 pl-2">
                <Text
                  className="text-xs font-bold mb-0.5"
                  style={{
                    color: logic.editingMessage ? "#EAB308" : "#5E17EB",
                  }}
                >
                  {logic.editingMessage
                    ? t("chat.editing")
                    : `${t("chat.replyingTo")} ${logic.replyingTo.senderId === logic.currentUser?.$id ? t("chat.yourself") : logic.chatUser.name}`}
                </Text>
                <Text
                  className="text-xs"
                  numberOfLines={1}
                  style={{ color: subTextColor }}
                >
                  {logic.editingMessage
                    ? logic.editingMessage.content.includes(":::REPLY:::")
                      ? logic.editingMessage.content.split(":::REPLY:::")[1]
                      : logic.editingMessage.cleanContent
                    : logic.replyingTo.content.includes(":::REPLY:::")
                      ? logic.replyingTo.content.split(":::REPLY:::")[1]
                      : logic.replyingTo.content}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  logic.setReplyingTo(null);
                  logic.setEditingMessage(null);
                  logic.setNewMessage("");
                }}
                className="p-2"
              >
                <Ionicons name="close" size={20} color={iconColor} />
              </TouchableOpacity>
            </View>
          )}

          <View
            className="flex-row items-end px-3 py-3 border-t"
            style={{ backgroundColor: bgColor, borderColor: borderColor }}
          >
            <View
              className="flex-1 flex-row items-center rounded-3xl border px-4 min-h-[40px]"
              style={{ backgroundColor: inputBg, borderColor: borderColor }}
            >
              <TextInput
                ref={logic.inputRef}
                placeholder={
                  logic.editingMessage
                    ? t("chat.placeholderEdit")
                    : t("chat.placeholder")
                }
                placeholderTextColor={subTextColor}
                className="flex-1 text-[15px] py-2.5 max-h-28"
                style={{ color: textColor }}
                multiline
                value={logic.newMessage}
                onChangeText={logic.setNewMessage}
              />
            </View>
            <TouchableOpacity
              onPress={logic.handleSend}
              className="ml-2 w-10 h-10 rounded-full items-center justify-center"
              style={{
                backgroundColor: logic.newMessage.trim()
                  ? logic.editingMessage
                    ? "#EAB308"
                    : "#5E17EB"
                  : inputBg,
                opacity: logic.newMessage.trim() ? 1 : 0.7,
              }}
              disabled={!logic.newMessage.trim()}
            >
              <Ionicons
                name={logic.editingMessage ? "checkmark" : "send"}
                size={18}
                color={
                  logic.newMessage.trim()
                    ? logic.editingMessage
                      ? "black"
                      : "white"
                    : subTextColor
                }
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default ChatRoom;
