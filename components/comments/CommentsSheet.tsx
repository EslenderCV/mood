import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Keyboard,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetTextInput,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCommentsModal } from "@/context/CommentsModalContext";
import { useGlobalContext } from "@/context/GlobalProvider";
import { databases, appwriteConfig } from "@/lib/appwrite";
import { Query, ID } from "react-native-appwrite";
import { useLanguage } from "@/context/LanguageContext";

// Estructura de datos
interface CommentData {
  $id: string;
  $createdAt: string;
  body: string;
  user: {
    username: string;
    pfp: string | null;
  };
}

// Componente individual de comentario
const CommentItem = ({
  item,
  isDark,
}: {
  item: CommentData;
  isDark: boolean;
}) => (
  <View className="flex-row items-start px-5 py-3">
    <Image
      source={
        item.user?.pfp ? { uri: item.user.pfp } : require("@/assets/noPfp.jpg")
      }
      className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800"
      contentFit="cover"
    />
    <View className="ml-3 flex-1">
      <View className="flex-row items-baseline">
        <Text
          className={`text-xs font-bold ${isDark ? "text-white" : "text-black"}`}
        >
          {item.user?.username || "Usuario"}
        </Text>
        <Text className="text-[10px] text-zinc-500 ml-2">
          {new Date(item.$createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text
        className={`text-sm mt-0.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
      >
        {item.body}
      </Text>
    </View>
  </View>
);

const CommentsSheet = () => {
  const { sheetRef, postId } = useCommentsModal();
  const { user } = useGlobalContext();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  const snapPoints = useMemo(() => ["50%", "90%"], []);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);

    const fetchComments = async () => {
      try {
        const res = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.commentsCollectionId,
          [Query.equal("post", postId), Query.orderDesc("$createdAt")],
        );
        setComments(res.documents);
      } catch (e) {
        console.log("Error comments:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [postId]);

  const handleSend = async () => {
    if (!newComment.trim() || !user || !postId) return;
    setSending(true);
    Keyboard.dismiss();

    try {
      const payload = {
        body: newComment,
        post: postId,
        user: user.$id,
        createdAt: new Date().toISOString(),
      };

      const res = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.commentsCollectionId,
        ID.unique(),
        payload,
      );

      setComments((prev) => [
        { ...res, user: { username: user.username, pfp: user.pfp } },
        ...prev,
      ]);
      setNewComment("");
    } catch (e) {
      console.log(e);
    } finally {
      setSending(false);
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: isDark ? "#18181B" : "white" }}
      handleIndicatorStyle={{ backgroundColor: isDark ? "#52525B" : "#E4E4E7" }}
    >
      <View className="flex-1" style={{ paddingBottom: insets.bottom }}>
        {/* Header */}
        <View className="px-5 pb-3 border-b border-zinc-100 dark:border-zinc-800 items-center">
          <Text
            className={`font-bold text-base ${isDark ? "text-white" : "text-black"}`}
          >
            {t("comments.title") || "Comentarios"}
          </Text>
        </View>

        {/* Lista */}
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator color="#5E17EB" />
          </View>
        ) : (
          <BottomSheetFlatList
            data={comments}
            // 🔥 CORRECCIÓN AQUÍ: Tipamos explícitamente 'item' como 'any' o 'CommentData'
            keyExtractor={(item: any) => item.$id}
            renderItem={({ item }: { item: any }) => (
              <CommentItem item={item} isDark={isDark} />
            )}
            contentContainerStyle={{ paddingBottom: 80 }}
            ListEmptyComponent={
              <View className="pt-10 items-center">
                <Text className="text-zinc-500">
                  {t("comments.empty") || "Sé el primero en comentar."}
                </Text>
              </View>
            }
          />
        )}

        {/* Input Footer */}
        <View
          className="px-4 py-3 flex-row items-center border-t border-zinc-100 dark:border-zinc-800 absolute bottom-0 w-full"
          style={{ backgroundColor: isDark ? "#18181B" : "white" }}
        >
          <Image
            source={
              user?.pfp ? { uri: user.pfp } : require("@/assets/noPfp.jpg")
            }
            className="w-8 h-8 rounded-full mr-3"
          />
          <BottomSheetTextInput
            value={newComment}
            onChangeText={setNewComment}
            placeholder={t("comments.placeholder") || "Añade un comentario..."}
            placeholderTextColor="#A1A1AA"
            style={{
              flex: 1,
              backgroundColor: isDark ? "#27272A" : "#F4F4F5",
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              color: isDark ? "white" : "black",
              maxHeight: 100,
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!newComment.trim() || sending}
            className={`ml-3 w-10 h-10 items-center justify-center rounded-full ${newComment.trim() ? "bg-[#5E17EB]" : "bg-transparent"}`}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons
                name="arrow-up"
                size={24}
                color={
                  newComment.trim() ? "white" : isDark ? "#52525B" : "#A1A1AA"
                }
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheetModal>
  );
};

export default CommentsSheet;
