import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Animated,
} from "react-native";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/Swipeable";

import { useChatsLogic } from "@/hooks/useChatsLogic";
import { ChatListSkeleton } from "@/components/chats/ChatListSkeleton";
import { NewChatModal } from "@/components/chats/NewChatModal";

const ChatsList = ({ onBackPress }: { onBackPress?: () => void }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const logic = useChatsLogic();
  const { t } = logic;

  // Colors
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#F4F4F5";
  const inputBg = isDark ? "#18181B" : "#F4F4F5";
  const unreadColor = "#5E17EB";
  const deleteColor = "#EF4444";
  const fabColor = "#5E17EB";

  // Recargar al volver
  useFocusEffect(
    React.useCallback(() => {
      logic.loadChats(false);
    }, [logic.user]),
  );

  const renderRightActions = (
    progress: any,
    dragX: any,
    item: any,
    index: number,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });
    return (
      <TouchableOpacity
        onPress={() => logic.handleDeleteChat(item.$id, index)}
        className="justify-center items-center w-[80px]"
        style={{ backgroundColor: deleteColor }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash-outline" size={24} color="white" />
          <Text className="text-white text-[10px] font-bold mt-1">
            {t("chatsList.deleteOption")}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderChatItem = ({ item, index }: { item: any; index: number }) => {
    const isUnread =
      !item.lastMessageIsRead && item.lastSenderId !== logic.user?.$id;
    const displayName =
      item.otherUser?.name || item.otherUser?.username || "Usuario";

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) logic.rowRefs.current[index] = ref;
        }}
        renderRightActions={(p, d) => renderRightActions(p, d, item, index)}
        onSwipeableOpen={() => logic.closeRow(index)}
        activeOffsetX={[-30, 1000]}
        containerStyle={{ backgroundColor: deleteColor }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() =>
            logic.handleOpenChat(item.otherUser?.$id, item.otherUser)
          }
          className="flex-row items-center px-5 py-3.5"
          style={{ backgroundColor: bgColor }}
        >
          <View className="relative">
            <Image
              source={{
                uri:
                  item.otherUser?.pfp ||
                  "https://cloud.appwrite.io/v1/avatars/initials?name=" +
                    displayName,
              }}
              className="w-[52px] h-[52px] rounded-full bg-zinc-200 dark:bg-zinc-800"
            />
          </View>
          <View
            className="ml-4 flex-1 justify-center py-1 border-b"
            style={{ borderColor: borderColor }}
          >
            <View className="flex-row justify-between items-center mb-1">
              <View className="flex-1 mr-2 flex-row items-center">
                <Text
                  className="text-[16px] font-bold"
                  style={{ color: textColor }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {displayName}
                </Text>
                {item.otherUser?.isVerified && (
                  <MaterialIcons
                    name="verified"
                    size={14}
                    color="#5E17EB"
                    style={{ marginLeft: 4 }}
                  />
                )}
              </View>
              <Text
                className="text-[11px] shrink-0"
                style={{
                  color: isUnread ? unreadColor : subTextColor,
                  fontWeight: isUnread ? "700" : "400",
                }}
              >
                {new Date(item.lastMessageAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text
                className="text-[14px] leading-5 flex-1 mr-4"
                style={{
                  color: isUnread ? textColor : subTextColor,
                  fontWeight: isUnread ? "600" : "400",
                }}
                numberOfLines={1}
              >
                {item.lastSenderId === logic.user?.$id && (
                  <Ionicons
                    name="checkmark-done-outline"
                    size={14}
                    color={subTextColor}
                    style={{ marginRight: 4 }}
                  />
                )}{" "}
                {item.lastMessage}
              </Text>
              {isUnread && (
                <View
                  className="min-w-[10px] h-[10px] rounded-full"
                  style={{ backgroundColor: unreadColor }}
                />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bgColor }}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Header */}
        <View className="px-5 pt-3 pb-2">
          <View className="flex-row items-center mb-4 gap-2">
            <TouchableOpacity
              onPress={onBackPress ? onBackPress : () => router.back()}
              className="mr-1 -ml-2 p-2 rounded-full active:bg-zinc-100 dark:active:bg-zinc-800"
            >
              <Ionicons name="arrow-back" size={28} color={textColor} />
            </TouchableOpacity>
            <Text
              className="font-bold text-[34px]"
              style={{ color: textColor }}
            >
              {t("chatsList.title")}
            </Text>
          </View>
          <View
            className="flex-row items-center px-3 py-2.5 rounded-xl"
            style={{ backgroundColor: inputBg }}
          >
            <Ionicons name="search" size={18} color={subTextColor} />
            <TextInput
              placeholder="Buscar por nombre..."
              placeholderTextColor={subTextColor}
              className="flex-1 ml-2 text-base"
              style={{ color: textColor, height: 20, padding: 0 }}
              value={logic.localSearchQuery}
              onChangeText={logic.setLocalSearchQuery}
            />
          </View>
        </View>

        {/* List */}
        {logic.loading && logic.filteredChats.length === 0 ? (
          <View className="flex-1 mt-2">
            {logic.skeletonItems.map((i) => (
              <ChatListSkeleton key={i} isDark={isDark} />
            ))}
          </View>
        ) : (
          <FlatList
            data={logic.filteredChats}
            keyExtractor={(item) => item.$id}
            renderItem={renderChatItem}
            contentContainerStyle={{ paddingBottom: 120 }}
            refreshControl={
              <RefreshControl
                refreshing={logic.refreshing}
                onRefresh={logic.onRefresh}
                tintColor={unreadColor}
              />
            }
            ListEmptyComponent={
              <View className="flex-1 justify-center items-center mt-32 px-10 opacity-60">
                <Ionicons
                  name="chatbubbles-outline"
                  size={50}
                  color={subTextColor}
                />
                <Text
                  className="text-center font-medium text-lg mt-4"
                  style={{ color: textColor }}
                >
                  {logic.localSearchQuery
                    ? "No hay coincidencias"
                    : "No tienes mensajes aún"}
                </Text>
                <Text
                  className="text-center text-sm mt-1"
                  style={{ color: subTextColor }}
                >
                  Toca el botón + para empezar una conversación.
                </Text>
              </View>
            }
          />
        )}

        {/* FAB (BOTÓN FLOTANTE) CORREGIDO */}
        <TouchableOpacity
          onPress={() => logic.setIsNewChatVisible(true)}
          activeOpacity={0.9}
          className="absolute right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg z-50"
          style={{
            backgroundColor: fabColor,
            shadowColor: fabColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4.65,
            elevation: 8,
            // 🔥 AJUSTE: insets.bottom + 90px para librar el Tab Bar
            bottom: insets.bottom + 90,
          }}
        >
          <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>

        <NewChatModal
          visible={logic.isNewChatVisible}
          onClose={() => logic.setIsNewChatVisible(false)}
          onUserSelect={(selectedUser: any) =>
            logic.handleOpenChat(selectedUser.$id, selectedUser)
          }
        />
      </View>
    </GestureHandlerRootView>
  );
};

export default ChatsList;
