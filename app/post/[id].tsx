import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Alert,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { useGlobalContext } from "@/context/GlobalProvider";
import {
  getPostById,
  createComment,
  getPostComments,
  toggleLikePost,
  toggleSavePost,
  searchUsers,
  sendTagNotification,
  deletePost,
  reportPost,
  getDeezerTrackUrl,
  createNotification, // Importamos esto para notificar respuestas
} from "@/lib/appwrite";
import CommentItem from "@/components/CommentItem";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";

import ShareModal from "@/components/ShareModal";
import OptionsModal from "@/components/OptionsModal";
import MoodShareCard from "@/components/MoodShareCard";

const { width } = Dimensions.get("window");

// Función simplificada: Solo maneja la notificación de RESPUESTA a otro comentario.
// (El dueño del post y las menciones se manejan en otras funciones).
const sendReplyNotification = async (
  post: any,
  currentUser: any,
  replyingToUser: any
) => {
  if (replyingToUser && replyingToUser.$id !== currentUser.$id) {
    try {
      await createNotification({
        userId: replyingToUser.$id,
        type: "comment", // Reusamos el tipo comment
        message: "respondió tu comentario ↩️",
        senderId: currentUser.$id,
        senderName: currentUser.username,
        senderAvatar: currentUser.pfp,
        postId: post.$id,
      });
    } catch (e) {
      console.error("Error notificando respuesta:", e);
    }
  }
};

const formatTimeAgo = (dateString: string, t: (key: string) => string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return t("postDetails.time.seconds");
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}${t("postDetails.time.m")}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${t("postDetails.time.h")}`;
  return `${Math.floor(h / 24)}${t("postDetails.time.d")}`;
};

const parseSongData = (songDataString: string) => {
  try {
    if (!songDataString) return null;
    const song = JSON.parse(songDataString);
    if (song.cover && song.cover.includes("100x100bb"))
      song.cover = song.cover.replace("100x100bb", "600x600bb");
    return song;
  } catch (e) {
    return null;
  }
};

const AudioVisualizer = ({
  isPlaying,
  color,
}: {
  isPlaying: boolean;
  color: string;
}) => {
  return (
    <View className="flex-row items-end gap-[3px] h-4 ml-2 opacity-80">
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          className={`w-[3px] rounded-full`}
          style={{
            height: isPlaying ? Math.random() * 14 + 4 : 4,
            backgroundColor: isPlaying ? "#5E17EB" : color,
          }}
        />
      ))}
    </View>
  );
};

const PostDetails = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FAFAFA" : "#18181B";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const songCardBg = isDark ? "#18181B" : "#F8FAFC";
  const inputBg = isDark ? "#27272A" : "#F3F4F6";
  const backIconColor = isDark ? "#FFFFFF" : "#000000";
  const suggestionBg = isDark ? "#18181B" : "#FFFFFF";
  const accentColor = "#5E17EB";

  const { id } = useLocalSearchParams();
  const { user } = useGlobalContext();
  const postId = Array.isArray(id) ? id[0] : id;

  const [post, setPost] = useState<any>(null);
  const [allComments, setAllComments] = useState<any[]>([]);
  const [rootComments, setRootComments] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // --- ESTADOS PARA COMPARTIR ---
  const [isOptionsVisible, setOptionsVisible] = useState(false);
  const [isShareVisible, setShareVisible] = useState(false);
  const [isViralModalVisible, setViralModalVisible] = useState(false);
  const [isShareSelectorVisible, setShareSelectorVisible] = useState(false);

  const [replyingTo, setReplyingTo] = useState<{
    rootId: string;
    username: string;
    userId: string;
  } | null>(null);

  const [commentText, setCommentText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [currentSongUrl, setCurrentSongUrl] = useState<string | null>(null);

  const player = useAudioPlayer(currentSongUrl);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchData();
  }, [postId]);

  useEffect(() => {
    if (allComments.length > 0) {
      const roots = allComments.filter((c) => !c.parentId);
      setRootComments(roots);
    }
  }, [allComments]);

  useEffect(() => {
    if (currentSongUrl && player) {
      if (!player.playing) {
        player.play();
        setIsPlaying(true);
      }

      const statusListener = (status: any) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          player.seekTo(0);
          player.pause();
        }
      };

      if (player.addListener) {
        player.addListener("playbackStatusUpdate", statusListener);
      } else if ((player as any).setOnPlaybackStatusUpdate) {
        (player as any).setOnPlaybackStatusUpdate(statusListener);
      }

      return () => {
        if (player.removeListener) {
          player.removeListener("playbackStatusUpdate", statusListener);
        }
      };
    }
  }, [currentSongUrl, player]);

  const fetchData = async () => {
    try {
      const [postData, commentsData] = await Promise.all([
        getPostById(postId),
        getPostComments(postId),
      ]);
      setPost(postData);
      setAllComments(commentsData);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo cargar el post");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const getViralPostData = () => {
    if (!post) return null;
    const song = parseSongData(post.songData);
    const creator = post.postedBy || post.creator || {};

    return {
      title: song?.title || "Música",
      artist: song?.artist || "Artista",
      cover: song?.cover || null,
      originalPostCreator: creator.username || "usuario",
      creatorPfp: creator.pfp || null,
      comment: post.comment || null,
    };
  };

  const handlePlayPause = async () => {
    if (currentSongUrl && player) {
      if (player.playing) {
        player.pause();
        setIsPlaying(false);
      } else {
        if (player.currentTime >= player.duration) {
          player.seekTo(0);
        }
        player.play();
        setIsPlaying(true);
      }
      return;
    }

    try {
      setIsLoadingAudio(true);
      const songData = parseSongData(post.songData);
      const trackId = songData?.id || songData?.spotifyId;

      if (!trackId) {
        Alert.alert("Error", "ID de canción no disponible.");
        setIsLoadingAudio(false);
        return;
      }

      const previewUrl = await getDeezerTrackUrl(trackId);

      if (!previewUrl) {
        Alert.alert("Error", "No se pudo obtener el audio.");
        setIsLoadingAudio(false);
        return;
      }

      setCurrentSongUrl(previewUrl);
      setIsLoadingAudio(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Ocurrió un error al reproducir.");
      setIsLoadingAudio(false);
    }
  };

  const handleDeleteAction = () => {
    setOptionsVisible(false);
    Alert.alert("¿Eliminar?", "Esta acción es irreversible.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(post.$id);
            router.back();
          } catch (e) {
            Alert.alert("Error", "No se pudo eliminar");
          }
        },
      },
    ]);
  };

  const handleReportAction = () => {
    setOptionsVisible(false);
    Alert.alert("Reportar", "Selecciona una razón:", [
      { text: "Cancelar", style: "cancel" },
      { text: "Spam/Inapropiado", onPress: () => submitReport("spam") },
      { text: "Otro", onPress: () => submitReport("other") },
    ]);
  };

  const submitReport = async (reason: string) => {
    if (!user) return;
    try {
      await reportPost(post.$id, user.$id, reason);
      Alert.alert("Reporte enviado", "Gracias por ayudarnos.");
    } catch (e) {
      Alert.alert("Error", "Inténtalo más tarde.");
    }
  };

  const handleTextChange = async (text: string) => {
    setCommentText(text);
    const words = text.split(" ");
    const lastWord = words[words.length - 1];

    if (lastWord && lastWord.startsWith("@") && lastWord.length > 1) {
      const query = lastWord.substring(1);
      try {
        const results = await searchUsers(query);
        const filtered = results.filter((u) => u.$id !== user?.$id);
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      } catch (error) {
        console.log(error);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectUser = (username: string) => {
    const words = commentText.split(" ");
    words.pop();
    const newText = `${words.join(" ")} @${username} `;
    setCommentText(newText);
    setShowSuggestions(false);
  };

  const processMentions = async (content: string, postId: string) => {
    if (!user) return;
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex);
    if (!matches) return;

    const uniqueMentions = [...new Set(matches)];

    uniqueMentions.forEach(async (mention) => {
      const username = mention.substring(1);
      const users = await searchUsers(username);
      const targetUser = users.find((u) => u.username === username);
      if (targetUser) {
        // Esto envía la notificación de "Tag" (DB + Push)
        await sendTagNotification(user.$id, targetUser.$id, postId);
      }
    });
  };

  const handleReply = (targetComment: any) => {
    const rootId = targetComment.parentId
      ? targetComment.parentId
      : targetComment.$id;
    const username = targetComment.username;

    setReplyingTo({
      rootId: rootId,
      username: username,
      userId: targetComment.userId,
    });

    setCommentText(`@${username} `);
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setCommentText("");
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);

    try {
      const parentId = replyingTo ? replyingTo.rootId : null;

      // 1. crear comentario (Appwrite.ts se encarga de notificar al dueño del post)
      const newComment = await createComment(
        postId,
        {
          content: commentText,
          userId: user?.$id,
          username: user?.username,
          avatar: user?.pfp,
        },
        parentId
      );

      // 2. Notificar si es una respuesta a OTRO usuario (no al dueño del post)
      await sendReplyNotification(
        post,
        user,
        replyingTo ? { $id: replyingTo.userId } : null
      );

      // 3. Notificar menciones
      await processMentions(commentText, postId);

      setAllComments((prev) => [newComment, ...prev]);
      setCommentText("");
      setReplyingTo(null);
      setShowSuggestions(false);
    } catch (error) {
      console.log("Error enviando:", error);
    } finally {
      setSending(false);
    }
  };

  const handleLike = async () => {
    if (!post || !user) return;

    // UI Optimista
    const originalPost = { ...post };
    const originalLikes = post.likedBy || [];
    const isLiked = originalLikes.includes(user.$id);

    const newLikes = isLiked
      ? originalLikes.filter((id: string) => id !== user.$id)
      : [...originalLikes, user.$id];

    setPost({ ...post, likedBy: newLikes });

    try {
      // 1. Llamada a Appwrite (Esto actualiza DB y envía Push automáticamente)
      await toggleLikePost(post.$id, user.$id, originalLikes);
    } catch (error) {
      console.error("Error like:", error);
      // Revertir si falla
      setPost(originalPost);
    }
  };

  const handleSave = async () => {
    if (!post || !user) return;
    const originalSaved = post.savedBy || [];
    const isSaved = originalSaved.includes(user.$id);
    const newSaved = isSaved
      ? originalSaved.filter((id: string) => id !== user.$id)
      : [...originalSaved, user.$id];

    setPost({ ...post, savedBy: newSaved });
    try {
      await toggleSavePost(post.$id, user.$id);
    } catch (e) {}
  };

  // --- RENDERIZADO DEL POST ---
  const renderHeader = () => {
    if (!post) return null;
    const songData = parseSongData(post.songData);
    const creator = post.postedBy || {};
    const likedBy = post.likedBy || [];
    const isLiked = user ? likedBy.includes(user.$id) : false;
    const savedBy = post.savedBy || [];
    const isSaved = user ? savedBy.includes(user.$id) : false;

    return (
      <View
        className="px-5 pt-2 pb-2 mb-2"
        style={{ backgroundColor: bgColor }}
      >
        {/* User Info Header */}
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            className="flex-row items-center flex-1"
            onPress={() => {
              if (creator.$id) router.push(`/user/${creator.$id}` as any);
            }}
          >
            <Image
              source={
                creator.pfp
                  ? { uri: creator.pfp }
                  : require("@/assets/noPfp.jpg")
              }
              className="w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-800"
            />
            <View className="ml-3 flex-1">
              <Text
                className="font-bold text-[17px] leading-5"
                style={{ color: textColor }}
              >
                {creator.name}
              </Text>
              <Text
                className="text-xs font-medium mt-0.5"
                style={{ color: subTextColor }}
              >
                @{creator.username} · {formatTimeAgo(post.$createdAt, t)}
              </Text>
            </View>
          </TouchableOpacity>

          {post.isPrivate && (
            <View className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full">
              <Ionicons name="lock-closed" size={14} color={subTextColor} />
            </View>
          )}
        </View>

        {/* Caption */}
        {post.comment && (
          <Text
            className="text-[17px] leading-7 font-normal mb-5 px-1"
            style={{ color: textColor }}
          >
            {post.comment}
          </Text>
        )}

        {/* SONG CARD */}
        {songData && (
          <View
            className="rounded-[24px] p-4 flex-row items-center mb-6 border relative overflow-hidden"
            style={{
              backgroundColor: songCardBg,
              borderColor: borderColor,
            }}
          >
            {isPlaying && (
              <View className="absolute inset-0 bg-[#5E17EB] opacity-5" />
            )}

            <Image
              source={{ uri: songData.cover }}
              className="w-20 h-20 rounded-2xl"
              style={{ backgroundColor: isDark ? "#27272A" : "#E4E4E7" }}
            />

            <View className="flex-1 ml-4 mr-2 justify-center">
              <Text
                className="font-black text-[18px] mb-1 tracking-tight"
                numberOfLines={1}
                style={{ color: textColor }}
              >
                {songData.title}
              </Text>
              <Text
                className="text-sm font-medium mb-2 opacity-80"
                numberOfLines={1}
                style={{ color: subTextColor }}
              >
                {songData.artist}
              </Text>

              <View className="flex-row items-center">
                <Ionicons name="musical-notes" size={12} color={accentColor} />
                <Text className="text-[10px] ml-1 font-bold text-[#5E17EB]">
                  MOOD PREVIEW
                </Text>
                {isPlaying && (
                  <AudioVisualizer isPlaying={isPlaying} color={subTextColor} />
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={handlePlayPause}
              className="w-14 h-14 rounded-full items-center justify-center shadow-md"
              style={{ backgroundColor: accentColor }}
              activeOpacity={0.8}
            >
              {isLoadingAudio ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={24}
                  color="white"
                  style={{ marginLeft: isPlaying ? 0 : 3 }}
                />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Actions Row */}
        <View className="flex-row justify-between items-center mt-2 px-4 pb-2">
          <View className="flex-row gap-8">
            <TouchableOpacity
              onPress={handleLike}
              className="flex-row items-center gap-2"
              activeOpacity={0.6}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={26}
                color={isLiked ? "#EF4444" : subTextColor}
              />
              {likedBy.length > 0 && (
                <Text
                  className="font-semibold text-base"
                  style={{ color: isLiked ? "#EF4444" : subTextColor }}
                >
                  {likedBy.length}
                </Text>
              )}
            </TouchableOpacity>

            <View className="flex-row items-center gap-2">
              <Ionicons
                name="chatbubble-outline"
                size={24}
                color={subTextColor}
              />
              {allComments.length > 0 && (
                <Text
                  className="font-semibold text-base"
                  style={{ color: subTextColor }}
                >
                  {allComments.length}
                </Text>
              )}
            </View>
          </View>

          <View className="flex-row gap-6">
            <TouchableOpacity onPress={() => setShareSelectorVisible(true)}>
              <Ionicons
                name="share-social-outline"
                size={24}
                color={subTextColor}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSave}>
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={24}
                color={isSaved ? accentColor : subTextColor}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View
          className="h-[1px] w-full mt-4 opacity-30"
          style={{ backgroundColor: borderColor }}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: bgColor }}
      >
        <ActivityIndicator color={accentColor} size="large" />
      </SafeAreaView>
    );
  }

  const isOwner = user?.$id === (post?.postedBy?.$id || post?.creator?.$id);

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: bgColor }}
    >
      {/* Header Limpio */}
      <View
        className="flex-row items-center justify-between px-4 h-[50px] border-b z-10"
        style={{ backgroundColor: bgColor, borderColor: borderColor }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 rounded-full active:bg-zinc-100 dark:active:bg-zinc-800"
        >
          <Ionicons name="arrow-back" size={24} color={backIconColor} />
        </TouchableOpacity>

        <Text className="font-bold text-base" style={{ color: textColor }}>
          Vibe
        </Text>

        <TouchableOpacity
          onPress={() => setOptionsVisible(true)}
          className="p-2 -mr-2 rounded-full active:bg-zinc-100 dark:active:bg-zinc-800"
        >
          <Ionicons name="ellipsis-horizontal" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={rootComments}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => (
          <CommentItem
            item={item}
            currentUserId={user?.$id || ""}
            onReply={handleReply}
            allComments={allComments}
          />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-10 opacity-60">
            <Text
              className="text-center font-medium"
              style={{ color: subTextColor }}
            >
              {t("postDetails.emptyComments")}
            </Text>
            <Text
              className="text-center text-xs mt-2 opacity-60"
              style={{ color: subTextColor }}
            >
              Sé el primero en opinar sobre este Vibe.
            </Text>
          </View>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="absolute bottom-0 w-full"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Sugerencias de mención */}
        {showSuggestions && (
          <View
            className="w-full border-t border-b"
            style={{
              backgroundColor: suggestionBg,
              borderColor: borderColor,
              maxHeight: 180,
            }}
          >
            <FlatList
              data={suggestions}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) => item.$id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectUser(item.username)}
                  className="flex-row items-center px-4 py-3 border-b"
                  style={{ borderColor: borderColor }}
                >
                  <Image
                    source={{ uri: item.pfp }}
                    className="w-8 h-8 rounded-full mr-3 bg-zinc-800"
                  />
                  <Text
                    className="font-bold text-sm"
                    style={{ color: textColor }}
                  >
                    {item.username}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Input Container Moderno */}
        <View
          className="border-t pb-6 pt-2 px-2"
          style={{ backgroundColor: bgColor, borderColor: borderColor }}
        >
          {replyingTo && (
            <View className="flex-row items-center justify-between px-4 pb-2 mb-1">
              <Text
                className="text-xs font-medium"
                style={{ color: subTextColor }}
              >
                Respondiendo a{" "}
                <Text style={{ color: accentColor }}>
                  @{replyingTo.username}
                </Text>
              </Text>
              <TouchableOpacity onPress={cancelReply} className="p-1">
                <Ionicons name="close" size={16} color={subTextColor} />
              </TouchableOpacity>
            </View>
          )}

          <View className="flex-row items-end gap-3 px-2">
            <Image
              source={{
                uri:
                  user?.pfp ||
                  "https://cloud.appwrite.io/v1/avatars/initials?name=Me",
              }}
              className="w-10 h-10 rounded-full mb-1"
              style={{ backgroundColor: inputBg }}
            />
            <View
              className="flex-1 rounded-3xl flex-row items-center px-5 py-1 border"
              style={{
                backgroundColor: inputBg,
                borderColor: isDark ? "transparent" : borderColor,
              }}
            >
              <TextInput
                ref={inputRef}
                placeholder={
                  replyingTo
                    ? `Responde a ${replyingTo.username}...`
                    : "Escribe un comentario..."
                }
                placeholderTextColor={subTextColor}
                className="flex-1 text-[16px] py-3"
                style={{ color: textColor, maxHeight: 100 }}
                value={commentText}
                onChangeText={handleTextChange}
                multiline
              />
            </View>
            <TouchableOpacity
              onPress={submitComment}
              disabled={!commentText.trim() || sending}
              className={`w-11 h-11 rounded-full items-center justify-center mb-0.5 ${
                commentText.trim()
                  ? "opacity-100 scale-100 shadow-md"
                  : "opacity-60 scale-95"
              }`}
              style={{
                backgroundColor: commentText.trim() ? accentColor : inputBg,
              }}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={24}
                  color={commentText.trim() ? "white" : subTextColor}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* MODAL SELECTOR DE COMPARTIR (Bottom Sheet) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isShareSelectorVisible}
        onRequestClose={() => setShareSelectorVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setShareSelectorVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/60">
            <TouchableWithoutFeedback>
              <View
                className="rounded-t-[32px] p-6 pb-12"
                style={{ backgroundColor: isDark ? "#18181B" : "white" }}
              >
                <View className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full self-center mb-6" />
                <Text
                  className="text-xl font-bold text-center mb-8"
                  style={{ color: isDark ? "white" : "black" }}
                >
                  Compartir Vibe
                </Text>

                <View className="flex-row gap-4">
                  {/* OPCIÓN INTERNA */}
                  <TouchableOpacity
                    onPress={() => {
                      setShareSelectorVisible(false);
                      setTimeout(() => setShareVisible(true), 300);
                    }}
                    className="flex-1 p-5 rounded-3xl items-center border"
                    style={{
                      backgroundColor: isDark ? "#27272A" : "#F3F4F6",
                      borderColor: isDark ? "#3F3F46" : "#E5E5E5",
                    }}
                  >
                    <View className="w-14 h-14 bg-[#5E17EB]/10 rounded-full items-center justify-center mb-3">
                      <Ionicons name="repeat" size={28} color="#5E17EB" />
                    </View>
                    <Text
                      className="font-bold text-base mb-1"
                      style={{ color: isDark ? "white" : "black" }}
                    >
                      En Mood
                    </Text>
                  </TouchableOpacity>

                  {/* OPCIÓN EXTERNA */}
                  <TouchableOpacity
                    onPress={() => {
                      setShareSelectorVisible(false);
                      setTimeout(() => setViralModalVisible(true), 300);
                    }}
                    className="flex-1 p-5 rounded-3xl items-center border"
                    style={{
                      backgroundColor: isDark ? "#27272A" : "#F3F4F6",
                      borderColor: isDark ? "#3F3F46" : "#E5E5E5",
                    }}
                  >
                    <View className="w-14 h-14 bg-pink-500/10 rounded-full items-center justify-center mb-3">
                      <Ionicons name="share-social" size={28} color="#ec4899" />
                    </View>
                    <Text
                      className="font-bold text-base mb-1"
                      style={{ color: isDark ? "white" : "black" }}
                    >
                      Viral Card
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => setShareSelectorVisible(false)}
                  className="mt-6 p-4 rounded-full items-center"
                >
                  <Text
                    className="font-bold text-base"
                    style={{ color: subTextColor }}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <OptionsModal
        isVisible={isOptionsVisible}
        onClose={() => setOptionsVisible(false)}
        onDelete={handleDeleteAction}
        onReport={handleReportAction}
        isOwner={isOwner}
      />
      <ShareModal
        isVisible={isShareVisible}
        onClose={() => setShareVisible(false)}
        postId={post?.$id || ""}
      />
      <MoodShareCard
        isVisible={isViralModalVisible}
        onClose={() => setViralModalVisible(false)}
        post={getViralPostData()}
      />
    </SafeAreaView>
  );
};

export default PostDetails;
