import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getPostComments, createComment } from "@/lib/appwrite";

import { tStatic } from "@/context/LanguageContext";
const CommentsSheet = ({ visible, onClose, postId, currentUser }: any) => {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPostComments(postId);
      setComments(res);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (visible) {
      loadComments();
    }
  }, [visible, loadComments]);

  const handleSend = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    try {
      const comment = await createComment(postId, {
        content: newComment,
        userId: currentUser?.$id,
        username: currentUser?.name || currentUser?.username,
        avatar: currentUser?.pfp,
        isVerified: currentUser?.isVerified,
      });
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
      Keyboard.dismiss();
    } catch {
      Alert.alert(tStatic("ui.s_902b0d55"), tStatic("ui.s_7aeddfb8"));
    } finally {
      setSending(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            height: "70%",
            backgroundColor: "#18181B",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: "hidden",
          }}
        >
          <View className="items-center pt-3 pb-2 border-b border-zinc-800">
            <View className="w-10 h-1 bg-zinc-600 rounded-full mb-2" />
            <Text className="text-white font-bold">
              {tStatic("ui.s_74dc3bac")}{comments.length})
            </Text>
          </View>

          {loading ? (
            <View className="flex-1 justify-center">
              <ActivityIndicator color="#5E17EB" />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.$id}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              renderItem={({ item }) => (
                <View className="flex-row mb-4">
                  <Image
                    source={
                      item.avatar
                        ? { uri: item.avatar }
                        : require("@/assets/noPfp.jpg")
                    }
                    className="w-8 h-8 rounded-full mr-3 bg-zinc-700"
                  />
                  <View className="flex-1">
                    <Text className="text-zinc-300 font-bold text-xs mr-2">
                      {item.username}
                    </Text>
                    <Text className="text-white text-sm mt-0.5">
                      {item.content}
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text className="text-zinc-500 text-center mt-10">{tStatic("ui.s_007a41ed")}</Text>
              }
            />
          )}

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            <View className="px-4 pt-3 pb-8 bg-zinc-900 border-t border-zinc-800 flex-row items-center">
              <TextInput
                placeholder={tStatic("ui.s_a816ff98")}
                placeholderTextColor="#71717A"
                className="flex-1 bg-black text-white px-4 py-3 rounded-full mr-3"
                value={newComment}
                onChangeText={setNewComment}
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!newComment.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator color="#5E17EB" />
                ) : (
                  <Ionicons
                    name="arrow-up-circle"
                    size={38}
                    color={newComment.trim() ? "#5E17EB" : "#555"}
                  />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default CommentsSheet;