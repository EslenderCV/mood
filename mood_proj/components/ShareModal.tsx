import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useGlobalContext } from "@/context/GlobalProvider";
import {
  getFollowedUserIds,
  getUser,
  sendMessage,
  getOrCreateChat,
  searchUsers,
} from "@/lib/appwrite";
import { useColorScheme } from "nativewind";

import { tStatic } from "@/context/LanguageContext";
const ShareModal = ({ isVisible, onClose, postId }: any) => {
  const { user } = useGlobalContext();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingMap, setSendingMap] = useState<{ [key: string]: boolean }>({});

  const bgColor = isDark ? "#18181B" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const inputBg = isDark ? "#27272A" : "#F4F4F5";

  const loadInitialUsers = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        const followedIds = await getFollowedUserIds(user.$id);
        const userData = await Promise.all(
          followedIds.map((id) => getUser(id))
        );
        setUsers(userData.filter((u) => u !== null));
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isVisible) loadInitialUsers();
  }, [isVisible, loadInitialUsers]);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length > 2) {
      const results = await searchUsers(text);
      setUsers(results);
    } else if (text.length === 0) {
      loadInitialUsers();
    }
  };

  const handleSend = async (targetUser: any) => {
    if (!user) return;

    setSendingMap((prev) => ({ ...prev, [targetUser.$id]: true }));

    try {
	    const chat = await getOrCreateChat(user.$id, targetUser.$id);
	    const chatId = (chat as any)?.$id ?? (chat as any)?.id;
	    if (!chatId) throw new Error("chatId_missing");

      let finalPostId = null;
      let finalPlaylistId = null;

      if (
        postId &&
        typeof postId === "string" &&
        postId.startsWith("playlist:")
      ) {
        finalPlaylistId = postId.replace("playlist:", "");
      } else {
        finalPostId = postId;
      }

      const attachments: string[] = [];
      if (finalPostId) attachments.push(`post:${finalPostId}`);
      if (finalPlaylistId) attachments.push(`playlist:${finalPlaylistId}`);

	    const body = finalPostId
	      ? "📌 Te compartió un post"
	      : finalPlaylistId
	        ? "📌 Te compartió una playlist"
	        : "";

	    await sendMessage({
	      chatId,
        senderId: user.$id,
        receiverId: targetUser.$id,
	      body,
        type: attachments.length ? "post" : "text",
        attachments,
      });

      Alert.alert("Enviado", `Compartido con ${targetUser.username}`);
    } catch {
      Alert.alert(tStatic("ui.s_902b0d55"), tStatic("ui.s_2eac473a"));
    } finally {
      setSendingMap((prev) => ({ ...prev, [targetUser.$id]: false }));
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        className="flex-1 justify-end bg-black/60"
      >
        <TouchableOpacity
          activeOpacity={1}
          className="rounded-t-3xl h-[70%] p-6"
          style={{ backgroundColor: bgColor }}
        >
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold" style={{ color: textColor }}>{tStatic("ui.s_6a951304")}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={subTextColor} />
            </TouchableOpacity>
          </View>

          <TextInput
            className="p-4 rounded-xl mb-4"
            style={{ backgroundColor: inputBg, color: textColor }}
            placeholder={tStatic("ui.s_3bd5180d")}
            placeholderTextColor={subTextColor}
            value={searchQuery}
            onChangeText={handleSearch}
          />

          {loading ? (
            <ActivityIndicator size="large" color="#5E17EB" className="mt-10" />
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item.$id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View
                  className="flex-row items-center justify-between p-3 border-b"
                  style={{ borderColor: isDark ? "#27272A" : "#F4F4F5" }}
                >
                  <View className="flex-row items-center">
                    <Image
                      source={
                        item.pfp
                          ? { uri: item.pfp }
                          : require("@/assets/noPfp.jpg")
                      }
                      className="w-10 h-10 rounded-full bg-zinc-700"
                    />
                    <Text
                      className="ml-3 font-bold text-base"
                      style={{ color: textColor }}
                    >
                      {item.username}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleSend(item)}
                    disabled={sendingMap[item.$id]}
                    className={`px-5 py-2 rounded-full ${
                      sendingMap[item.$id] ? "bg-zinc-500" : "bg-[#5E17EB]"
                    }`}
                  >
                    <Text className="text-white font-bold text-sm">
                      {sendingMap[item.$id] ? "..." : tStatic("ui.s_30cc00ae")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text
                  className="text-center mt-10"
                  style={{ color: subTextColor }}
                >{tStatic("ui.s_fecf6798")}</Text>
              }
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default ShareModal;