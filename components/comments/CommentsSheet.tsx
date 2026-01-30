import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Keyboard,
  Alert,
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
import { databases, appwriteConfig, uploadVoiceNote } from "@/lib/appwrite";
import { Query, ID } from "react-native-appwrite";
import { useLanguage } from "@/context/LanguageContext";
// 🔥 CORRECCIÓN: Importamos desde la misma carpeta (./) no desde explore
import { VoiceVibeRecorder } from "./VoiceVibeRecorder";

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
}) => {
  // Detectar si es nota de voz
  let isVoice = false;
  let voiceData = null;
  try {
    if (item.body.startsWith("{") && item.body.includes("audioUrl")) {
      voiceData = JSON.parse(item.body);
      isVoice = true;
    }
  } catch (e) {}

  return (
    <View className="flex-row items-start px-5 py-3">
      <Image
        source={
          item.user?.pfp
            ? { uri: item.user.pfp }
            : require("@/assets/noPfp.jpg")
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

        {isVoice ? (
          <View className="mt-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-2 px-3 self-start flex-row items-center border border-zinc-200 dark:border-zinc-700">
            <View className="w-8 h-8 rounded-full bg-[#5E17EB] items-center justify-center mr-2">
              <Ionicons
                name="play"
                size={14}
                color="white"
                style={{ marginLeft: 2 }}
              />
            </View>
            <View>
              <Text
                className={`text-xs font-bold ${isDark ? "text-white" : "text-black"}`}
              >
                Voice Vibe
              </Text>
              <Text className="text-[10px] text-zinc-500">
                {voiceData.duration ? `${voiceData.duration}s` : "Audio"} • Con
                música
              </Text>
            </View>
          </View>
        ) : (
          <Text
            className={`text-sm mt-0.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
          >
            {item.body}
          </Text>
        )}
      </View>
    </View>
  );
};

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

  // 🔥 ESTADOS PARA VOICE VIBES
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [activeSongUrl, setActiveSongUrl] = useState<string | null>(null);

  const snapPoints = useMemo(() => ["50%", "90%"], []);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);

    const fetchCommentsAndPost = async () => {
      try {
        // 1. Obtener Comentarios
        const resComments = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.commentsCollectionId,
          [Query.equal("post", postId), Query.orderDesc("$createdAt")],
        );
        setComments(resComments.documents);

        // 2. 🔥 Obtener detalles del post para sacar la música de fondo
        const resPost = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.postsCollectionId,
          postId,
        );

        if (resPost.songData) {
          try {
            const song = JSON.parse(resPost.songData);
            if (song.preview) setActiveSongUrl(song.preview);
          } catch (e) {
            console.log("Error parsing song for preview");
          }
        }
      } catch (e) {
        console.log("Error fetching data:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchCommentsAndPost();
  }, [postId]);

  // Manejo de envío de texto normal
  const handleSendText = async () => {
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

  // 🔥 Manejo de subida de nota de voz
  const handleVoiceUpload = async (uri: string, duration: number) => {
    if (!user || !postId) return;
    setIsRecordingMode(false);
    setSending(true);

    try {
      // 1. Subir audio a Appwrite Storage
      const fileUrl = await uploadVoiceNote(uri);

      // 2. Crear payload especial
      const voicePayload = JSON.stringify({
        audioUrl: fileUrl,
        duration: duration,
        songContext: activeSongUrl, // Guardamos qué sonaba de fondo
        type: "voice_vibe",
      });

      // 3. Guardar comentario
      const res = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.commentsCollectionId,
        ID.unique(),
        {
          body: voicePayload, // Guardamos el JSON en el body
          post: postId,
          user: user.$id,
          createdAt: new Date().toISOString(),
        },
      );

      setComments((prev) => [
        { ...res, user: { username: user.username, pfp: user.pfp } },
        ...prev,
      ]);
    } catch (e) {
      Alert.alert("Error", "No se pudo subir la nota de voz.");
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
          className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 absolute bottom-0 w-full"
          style={{ backgroundColor: isDark ? "#18181B" : "white" }}
        >
          {isRecordingMode ? (
            /* 🔥 MODO GRABACIÓN */
            <VoiceVibeRecorder
              songPreviewUrl={activeSongUrl}
              onRecordingComplete={handleVoiceUpload}
              onCancel={() => setIsRecordingMode(false)}
              isDark={isDark}
            />
          ) : (
            /* 🔥 MODO TEXTO ESTÁNDAR */
            <View className="flex-row items-center">
              <Image
                source={
                  user?.pfp ? { uri: user.pfp } : require("@/assets/noPfp.jpg")
                }
                className="w-8 h-8 rounded-full mr-3"
              />

              {/* Botón Micrófono para activar modo grabación */}
              <TouchableOpacity
                onPress={() => setIsRecordingMode(true)}
                className="mr-2 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
              >
                <Ionicons name="mic" size={18} color="#EF4444" />
              </TouchableOpacity>

              <BottomSheetTextInput
                value={newComment}
                onChangeText={setNewComment}
                placeholder={
                  t("comments.placeholder") || "Añade un comentario..."
                }
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
                onPress={handleSendText}
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
                      newComment.trim()
                        ? "white"
                        : isDark
                          ? "#52525B"
                          : "#A1A1AA"
                    }
                  />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </BottomSheetModal>
  );
};

export default CommentsSheet;
