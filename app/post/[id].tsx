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
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ScrollView,
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
  deletePost, // Importado
  togglePostPrivacy, // Importado
  reportPost, // Importado
} from "@/lib/appwrite";
import CommentItem from "@/components/CommentItem";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";

// --- IMPORTAR MODALES ---
import ShareModal from "@/components/ShareModal";
import OptionsModal from "@/components/OptionsModal";

// --- HELPERS ---
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

const PostDetails = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();

  // Colores
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const cardBg = isDark ? "#1C1C1E" : "#F4F4F5";
  const inputBg = isDark ? "#18181B" : "#F4F4F5";
  const backIconColor = isDark ? "#FFFFFF" : "#000000";
  const suggestionBg = isDark ? "#18181B" : "#FFFFFF";
  const iconColor = isDark ? "#A1A1AA" : "#52525B"; // Color para iconos de acción

  const { id } = useLocalSearchParams();
  const { user } = useGlobalContext();
  const postId = Array.isArray(id) ? id[0] : id;

  const [post, setPost] = useState<any>(null);
  const [allComments, setAllComments] = useState<any[]>([]);
  const [rootComments, setRootComments] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // --- ESTADOS PARA MODALES ---
  const [isOptionsVisible, setOptionsVisible] = useState(false);
  const [isShareVisible, setShareVisible] = useState(false);

  const [replyingTo, setReplyingTo] = useState<{
    rootId: string;
    username: string;
  } | null>(null);

  const [commentText, setCommentText] = useState("");

  // Estados Etiquetas
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const player = useAudioPlayer(
    post ? parseSongData(post.songData)?.preview : null
  );

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

  // --- GESTIÓN DE OPCIONES (3 PUNTOS) ---
  const handleTogglePrivacyAction = async () => {
    setOptionsVisible(false);
    try {
      const newStatus = !post.isPrivate;
      setPost({ ...post, isPrivate: newStatus }); // UI inmediata
      await togglePostPrivacy(post.$id, post.isPrivate);
      Alert.alert(
        "Éxito",
        `Post ahora es ${newStatus ? "Privado" : "Público"}`
      );
    } catch (error) {
      fetchData(); // Revertir si falla
      Alert.alert("Error", "No se pudo actualizar");
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
            router.back(); // Volver atrás si se borra
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

  // --- LÓGICA ETIQUETAS Y COMENTARIOS ---
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
        await sendTagNotification(user.$id, targetUser.$id, postId);
      }
    });
  };

  const handleReply = (targetComment: any) => {
    const rootId = targetComment.parentId
      ? targetComment.parentId
      : targetComment.$id;
    const username = targetComment.username;
    setReplyingTo({ rootId: rootId, username: username });
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

  // --- ACCIONES POST (Like, Save, Play) ---
  const handleLike = async () => {
    if (!post || !user) return;
    const originalLikes = post.likedBy || [];
    const isLiked = originalLikes.includes(user.$id);
    const newLikes = isLiked
      ? originalLikes.filter((id: string) => id !== user.$id)
      : [...originalLikes, user.$id];

    setPost({ ...post, likedBy: newLikes });
    try {
      await toggleLikePost(post.$id, user.$id, originalLikes);
    } catch (error) {
      setPost(post);
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

  const handlePlay = () => {
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

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
        className="px-4 pt-2 pb-4 mb-2"
        style={{ backgroundColor: bgColor }}
      >
        <TouchableOpacity
          className="flex-row items-center mb-3"
          onPress={() => {
            if (creator.$id) router.push(`/user/${creator.$id}` as any);
          }}
        >
          <Image
            source={
              creator.pfp ? { uri: creator.pfp } : require("@/assets/noPfp.jpg")
            }
            className="w-10 h-10 rounded-full border"
            style={{ borderColor: borderColor, backgroundColor: cardBg }}
          />
          <View className="ml-3 flex-1">
            <Text className="font-bold text-base" style={{ color: textColor }}>
              {creator.name}
            </Text>
            <Text className="text-sm" style={{ color: subTextColor }}>
              @{creator.username} · {formatTimeAgo(post.$createdAt, t)}
            </Text>
          </View>

          {/* Icono de Privado si aplica */}
          {post.isPrivate && (
            <View className="bg-zinc-800 p-1.5 rounded-md mr-1">
              <Ionicons name="lock-closed" size={12} color="#A1A1AA" />
            </View>
          )}
        </TouchableOpacity>

        {post.comment && (
          <Text
            className="text-[15px] mb-4 leading-6 px-1"
            style={{ color: textColor }}
          >
            {post.comment}
          </Text>
        )}

        {songData && (
          <View
            className="rounded-2xl p-4 flex-row items-center border mb-4"
            style={{ backgroundColor: cardBg, borderColor: borderColor }}
          >
            <Image
              source={{ uri: songData.cover }}
              className="w-16 h-16 rounded-xl"
              style={{ backgroundColor: isDark ? "#27272A" : "#E4E4E7" }}
            />
            <View className="flex-1 ml-4 mr-2">
              <Text
                className="font-bold text-base"
                numberOfLines={1}
                style={{ color: textColor }}
              >
                {songData.title}
              </Text>
              <Text
                className="text-sm mt-1"
                numberOfLines={1}
                style={{ color: subTextColor }}
              >
                {songData.artist}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handlePlay}
              className="w-12 h-12 rounded-full bg-[#5E17EB] items-center justify-center shadow-lg"
              activeOpacity={0.8}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={24}
                color="white"
                style={{ marginLeft: isPlaying ? 0 : 2 }}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* BARRA DE ACCIONES PRINCIPAL */}
        <View className="flex-row justify-between items-center mt-2 px-2">
          <View className="flex-row gap-6">
            <TouchableOpacity
              onPress={handleLike}
              className="flex-row items-center"
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={26}
                color={isLiked ? "#EF4444" : "#A1A1AA"}
              />
              {likedBy.length > 0 && (
                <Text
                  className="ml-2 font-medium"
                  style={{ color: isLiked ? "#EF4444" : subTextColor }}
                >
                  {likedBy.length}
                </Text>
              )}
            </TouchableOpacity>

            <View className="flex-row items-center">
              <Ionicons name="chatbubble-outline" size={24} color="#A1A1AA" />
              <Text
                className="ml-2 font-medium"
                style={{ color: subTextColor }}
              >
                {allComments.length}
              </Text>
            </View>

            {/* BOTÓN DE COMPARTIR */}
            <TouchableOpacity onPress={() => setShareVisible(true)}>
              <Ionicons name="share-social-outline" size={24} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleSave}>
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={24}
              color={isSaved ? "#5E17EB" : "#A1A1AA"}
            />
          </TouchableOpacity>
        </View>
        <View
          className="h-[1px] w-full mt-6"
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
        <ActivityIndicator color="#5E17EB" size="large" />
      </SafeAreaView>
    );
  }

  // Verificar propiedad para el modal de opciones
  const isOwner = user?.$id === (post?.postedBy?.$id || post?.creator?.$id);

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: bgColor }}
    >
      {/* HEADER DE LA PANTALLA */}
      <View
        className="flex-row items-center justify-between px-4 h-[50px] border-b z-10"
        style={{ backgroundColor: bgColor, borderColor: borderColor }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <Ionicons name="arrow-back" size={24} color={backIconColor} />
          </TouchableOpacity>
          <Text className="font-bold text-lg ml-4" style={{ color: textColor }}>
            {t("postDetails.headerTitle")}
          </Text>
        </View>

        {/* BOTÓN DE 3 PUNTOS */}
        <TouchableOpacity
          onPress={() => setOptionsVisible(true)}
          className="p-2 -mr-2"
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
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <Text className="text-center mt-10" style={{ color: subTextColor }}>
            {t("postDetails.emptyComments")}
          </Text>
        }
      />

      {/* INPUT DE COMENTARIOS */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        className="absolute bottom-0 w-full border-t"
        style={{ backgroundColor: bgColor, borderColor: borderColor }}
      >
        {/* LISTA DE SUGERENCIAS FLOTANTE */}
        {showSuggestions && (
          <View
            className="w-full border-b"
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

        {replyingTo && (
          <View
            className="flex-row items-center justify-between px-4 py-2"
            style={{ backgroundColor: isDark ? "#18181B" : "#E4E4E7" }}
          >
            <Text className="text-xs" style={{ color: subTextColor }}>
              {t("postDetails.replyingTo")}{" "}
              <Text className="text-[#5E17EB] font-bold">
                @{replyingTo.username}
              </Text>
            </Text>
            <TouchableOpacity onPress={cancelReply}>
              <Ionicons name="close" size={16} color={subTextColor} />
            </TouchableOpacity>
          </View>
        )}

        <View className="flex-row items-center px-4 py-3 pb-6">
          <Image
            source={{
              uri:
                user?.pfp ||
                "https://cloud.appwrite.io/v1/avatars/initials?name=Me",
            }}
            className="w-9 h-9 rounded-full mr-3"
            style={{ backgroundColor: cardBg }}
          />
          <View
            className="flex-1 rounded-full flex-row items-center px-4 py-2 border"
            style={{ backgroundColor: inputBg, borderColor: borderColor }}
          >
            <TextInput
              ref={inputRef}
              placeholder={
                replyingTo
                  ? `${t("postDetails.replyPlaceholder")} ${
                      replyingTo.username
                    }...`
                  : t("postDetails.commentPlaceholder")
              }
              placeholderTextColor={subTextColor}
              className="flex-1 text-sm"
              style={{ color: textColor, maxHeight: 80 }}
              value={commentText}
              onChangeText={handleTextChange}
              multiline
            />
          </View>
          <TouchableOpacity
            onPress={submitComment}
            disabled={!commentText.trim() || sending}
            className={`ml-3 w-10 h-10 rounded-full items-center justify-center ${
              commentText.trim() ? "bg-[#5E17EB]" : "bg-zinc-800"
            }`}
            style={
              !commentText.trim()
                ? { backgroundColor: isDark ? "#27272A" : "#E4E4E7" }
                : {}
            }
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons
                name="arrow-up"
                size={20}
                color={commentText.trim() ? "white" : subTextColor}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* --- MODALES --- */}

      {/* Modal de 3 puntos */}
      <OptionsModal
        isVisible={isOptionsVisible}
        onClose={() => setOptionsVisible(false)}
        onDelete={handleDeleteAction}
        onTogglePrivacy={handleTogglePrivacyAction}
        onReport={handleReportAction}
        isPrivate={post?.isPrivate || false}
        isOwner={isOwner}
      />

      {/* Modal de Compartir */}
      <ShareModal
        isVisible={isShareVisible}
        onClose={() => setShareVisible(false)}
        postId={post?.$id || ""}
      />
    </SafeAreaView>
  );
};

export default PostDetails;
