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
  Clipboard,
  Share as SystemShare,
  Keyboard,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { Databases, Query, ID } from "react-native-appwrite";

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
  client,
  appwriteConfig,
  getFollowedUserIds,
  getUser,
} from "@/lib/appwrite";
import { parseSongData, sendReplyNotification } from "@/lib/postUtils";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";

// Componentes importados
import ShareModal from "@/components/ShareModal";
import OptionsModal from "@/components/OptionsModal";
import MoodShareCard from "@/components/MoodShareCard";
import CommentItem from "@/components/CommentItem";
import PostDetailSkeleton from "@/components/PostDetailSkeleton";
import PostHeader from "@/components/PostHeader";
import DirectShareSheet from "@/components/DirectShareSheet";
import StoryCreationModal from "@/components/StoryCreationModal";

const databases = new Databases(client);

const PostDetails = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();

  const styles = {
    bgColor: isDark ? "#000000" : "#FFFFFF",
    textColor: isDark ? "#FAFAFA" : "#18181B",
    subTextColor: isDark ? "#A1A1AA" : "#71717A",
    borderColor: isDark ? "#27272A" : "#E4E4E7",
    songCardBg: isDark ? "#18181B" : "#F8FAFC",
    inputBg: isDark ? "#27272A" : "#F3F4F6",
    backIconColor: isDark ? "#FFFFFF" : "#000000",
    suggestionBg: isDark ? "#18181B" : "#FFFFFF",
    accentColor: "#5E17EB",
    isDark,
  };

  const { id } = useLocalSearchParams();
  const { user } = useGlobalContext();
  const postId = Array.isArray(id) ? id[0] : id;

  const [post, setPost] = useState<any>(null);
  const [allComments, setAllComments] = useState<any[]>([]);
  const [rootComments, setRootComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Modales
  const [isOptionsVisible, setOptionsVisible] = useState(false);
  const [isShareVisible, setShareVisible] = useState(false);
  const [isViralModalVisible, setViralModalVisible] = useState(false);
  const [isShareSelectorVisible, setShareSelectorVisible] = useState(false);
  const [isCreationVisible, setCreationVisible] = useState(false);
  const [storyInitialSongData, setStoryInitialSongData] = useState<any>(null);

  // Compartir
  const [shareContacts, setShareContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  // Comentarios
  const [replyingTo, setReplyingTo] = useState<{
    rootId: string;
    username: string;
    userId: string;
  } | null>(null);
  const [commentText, setCommentText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Audio
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [currentSongUrl, setCurrentSongUrl] = useState<string | null>(null);

  const player = useAudioPlayer(currentSongUrl);
  const inputRef = useRef<TextInput>(null);

  // 🔥 CORRECCIÓN 2: Ref para el debounce de búsqueda
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

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
      if (player.addListener)
        player.addListener("playbackStatusUpdate", statusListener);
      else if ((player as any).setOnPlaybackStatusUpdate)
        (player as any).setOnPlaybackStatusUpdate(statusListener);
      return () => {
        if (player.removeListener)
          player.removeListener("playbackStatusUpdate", statusListener);
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
        if (player.currentTime >= player.duration) player.seekTo(0);
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

  // 🔥 CORRECCIÓN 2: Debounce en la búsqueda de usuarios
  const handleTextChange = (text: string) => {
    setCommentText(text);
    const words = text.split(" ");
    const lastWord = words[words.length - 1];

    // Limpiamos el timer anterior si existe
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (lastWord && lastWord.startsWith("@") && lastWord.length > 1) {
      const query = lastWord.substring(1);
      // Esperamos 500ms antes de buscar
      searchTimeout.current = setTimeout(async () => {
        try {
          const results = await searchUsers(query);
          const filtered = results.filter((u) => u.$id !== user?.$id);
          setSuggestions(filtered);
          setShowSuggestions(filtered.length > 0);
        } catch (error) {
          console.log(error);
        }
      }, 500);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectUser = (username: string) => {
    const words = commentText.split(" ");
    words.pop();
    setCommentText(`${words.join(" ")} @${username} `);
    setShowSuggestions(false);
  };

  const processMentions = async (content: string, postId: string) => {
    if (!user) return;
    const matches = content.match(/@(\w+)/g);
    if (!matches) return;
    [...new Set(matches)].forEach(async (mention) => {
      const username = mention.substring(1);
      const users = await searchUsers(username);
      const targetUser = users.find((u) => u.username === username);
      if (targetUser)
        await sendTagNotification(user.$id, targetUser.$id, postId);
    });
  };

  const handleReply = (targetComment: any) => {
    const rootId = targetComment.parentId
      ? targetComment.parentId
      : targetComment.$id;
    const replyName = targetComment.user?.username || targetComment.username;
    setReplyingTo({
      rootId,
      username: replyName,
      userId: targetComment.userId,
    });
    setCommentText(`@${replyName} `);
    inputRef.current?.focus();
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);
    try {
      const displayName = user?.name || user?.username;
      const isUserVerified = (user as any)?.isVerified;
      const newComment = await createComment(
        postId,
        {
          content: commentText,
          userId: user?.$id,
          username: displayName,
          avatar: user?.pfp,
          isVerified: isUserVerified,
        },
        replyingTo ? replyingTo.rootId : null,
      );
      await sendReplyNotification(
        post,
        user,
        replyingTo ? { $id: replyingTo.userId } : null,
      );
      await processMentions(commentText, postId);
      setAllComments((prev) => [newComment, ...prev]);
      setCommentText("");
      setReplyingTo(null);
      setShowSuggestions(false);
    } catch (error) {
    } finally {
      setSending(false);
    }
  };

  const handleLike = async () => {
    if (!post || !user) return;
    const originalPost = { ...post };
    const originalLikes = post.likedBy || [];
    const newLikes = originalLikes.includes(user.$id)
      ? originalLikes.filter((id: string) => id !== user.$id)
      : [...originalLikes, user.$id];
    setPost({ ...post, likedBy: newLikes });
    try {
      await toggleLikePost(post.$id, user.$id, originalLikes);
    } catch (error) {
      setPost(originalPost);
    }
  };

  const handleSave = async () => {
    if (!post || !user) return;
    const originalSaved = post.savedBy || [];
    const newSaved = originalSaved.includes(user.$id)
      ? originalSaved.filter((id: string) => id !== user.$id)
      : [...originalSaved, user.$id];
    setPost({ ...post, savedBy: newSaved });
    try {
      await toggleSavePost(post.$id, user.$id);
    } catch (e) {}
  };

  const fetchFollowedUsers = async (userId: string) => {
    try {
      const followedIds = await getFollowedUserIds(userId);
      if (followedIds.length > 0) {
        const promises = followedIds.map((id) => getUser(id));
        const users = await Promise.all(promises);
        return users.filter((u) => u !== null);
      }
    } catch (error) {}
    return [];
  };

  const searchUsersInAppwrite = async (query: string) => {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        [
          Query.or([
            Query.search("username", query),
            Query.search("name", query),
          ]),
          Query.limit(10),
        ],
      );
      return response.documents;
    } catch (error) {
      return [];
    }
  };

  const openShare = async () => {
    setShareSelectorVisible(true);
    if (user?.$id && shareContacts.length === 0) {
      setIsLoadingContacts(true);
      const contacts = await fetchFollowedUsers(user.$id);
      setShareContacts(contacts);
      setIsLoadingContacts(false);
    }
  };

  const handleShareSearch = async (text: string) => {
    setIsLoadingContacts(true);
    if (text.length > 0) {
      const results = await searchUsersInAppwrite(text);
      setShareContacts(results);
    } else if (user?.$id) {
      const contacts = await fetchFollowedUsers(user.$id);
      setShareContacts(contacts);
    }
    setIsLoadingContacts(false);
  };

  const handleSendShare = async (userIds: string[], message: string) => {
    if (!user?.$id || !post) return;
    try {
      const promises = userIds.map((targetId) =>
        databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.messagesCollectionId,
          ID.unique(),
          {
            senderId: user.$id,
            receiverId: targetId,
            content: message || "Compartió una publicación",
            sharedPostId: post.$id,
            createdAt: new Date().toISOString(),
          },
        ),
      );
      await Promise.all(promises);
      Alert.alert("Enviado", "El post se ha compartido correctamente.");
    } catch (error) {
      Alert.alert("Error", "No se pudo compartir el post.");
    }
  };

  const handleAddToStoryFromPost = async () => {
    if (!post) return;
    const songData = parseSongData(post.songData);
    if (songData) {
      let freshPreview = songData.preview;
      const trackId = songData.id || songData.spotifyId;
      if (trackId) {
        try {
          const freshUrl = await getDeezerTrackUrl(trackId);
          if (freshUrl) freshPreview = freshUrl;
        } catch (e) {}
      }
      setStoryInitialSongData({ ...songData, preview: freshPreview });
      setShareSelectorVisible(false);
      setTimeout(() => setCreationVisible(true), 300);
    }
  };

  const handleSystemShare = async () => {
    if (!post) return;
    const link = `https://moodapp.com/post/${post.$id}`;
    try {
      await SystemShare.share({
        message: `¡Mira esta canción en Mood! ${link}`,
        url: link,
        title: "Compartir desde Mood",
      });
    } catch (error) {}
    setShareSelectorVisible(false);
  };

  const handleCopyLink = () => {
    if (!post) return;
    const link = `https://moodapp.com/post/${post.$id}`;
    Clipboard.setString(link);
    Alert.alert("Enlace copiado", "Enlace copiado al portapapeles.");
    setShareSelectorVisible(false);
  };

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1"
        edges={["top"]}
        style={{ backgroundColor: styles.bgColor }}
      >
        <View
          className="flex-row items-center justify-between px-4 h-[50px] border-b"
          style={{
            backgroundColor: styles.bgColor,
            borderColor: styles.borderColor,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-2 rounded-full"
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={styles.backIconColor}
            />
          </TouchableOpacity>
          <Text
            className="font-bold text-base"
            style={{ color: styles.textColor }}
          >
            Vibe
          </Text>
          <View className="w-10" />
        </View>
        <PostDetailSkeleton isDark={isDark} />
      </SafeAreaView>
    );
  }

  const isOwner = user?.$id === (post?.postedBy?.$id || post?.creator?.$id);

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: styles.bgColor }}
    >
      <View
        className="flex-row items-center justify-between px-4 h-[50px] border-b z-10"
        style={{
          backgroundColor: styles.bgColor,
          borderColor: styles.borderColor,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 rounded-full active:bg-zinc-100 dark:active:bg-zinc-800"
        >
          <Ionicons name="arrow-back" size={24} color={styles.backIconColor} />
        </TouchableOpacity>
        <Text
          className="font-bold text-base"
          style={{ color: styles.textColor }}
        >
          Vibe
        </Text>
        <TouchableOpacity
          onPress={() => setOptionsVisible(true)}
          className="p-2 -mr-2 rounded-full active:bg-zinc-100 dark:active:bg-zinc-800"
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={24}
            color={styles.textColor}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
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
          ListHeaderComponent={
            <PostHeader
              post={post}
              user={user}
              isPlaying={isPlaying}
              isLoadingAudio={isLoadingAudio}
              onPlayPause={handlePlayPause}
              onLike={handleLike}
              onSave={handleSave}
              onOpenShare={openShare}
              t={t}
              allCommentsCount={allComments.length}
              styles={styles}
            />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss} // 🔥 CORRECCIÓN 3: Cerrar teclado al scroll
          ListEmptyComponent={
            <View className="items-center justify-center py-10 opacity-60">
              <Text
                className="text-center font-medium"
                style={{ color: styles.subTextColor }}
              >
                {t("postDetails.emptyComments")}
              </Text>
              <Text
                className="text-center text-xs mt-2 opacity-60"
                style={{ color: styles.subTextColor }}
              >
                Sé el primero en opinar sobre este Vibe.
              </Text>
            </View>
          }
        />

        <View style={{ backgroundColor: styles.bgColor }}>
          {showSuggestions && (
            <View
              className="w-full border-t border-b"
              style={{
                backgroundColor: styles.suggestionBg,
                borderColor: styles.borderColor,
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
                    style={{ borderColor: styles.borderColor }}
                  >
                    <Image
                      source={{ uri: item.pfp }}
                      className="w-8 h-8 rounded-full mr-3 bg-zinc-800"
                    />
                    <Text
                      className="font-bold text-sm"
                      style={{ color: styles.textColor }}
                    >
                      {item.username}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          <View
            className="border-t pt-2 px-2"
            style={{
              backgroundColor: styles.bgColor,
              borderColor: styles.borderColor,
              paddingBottom: Platform.OS === "ios" ? 10 : 0,
            }}
          >
            {replyingTo && (
              <View className="flex-row items-center justify-between px-4 pb-2 mb-1">
                <Text
                  className="text-xs font-medium"
                  style={{ color: styles.subTextColor }}
                >
                  Respondiendo a{" "}
                  <Text style={{ color: styles.accentColor }}>
                    @{replyingTo.username}
                  </Text>
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setReplyingTo(null);
                    setCommentText("");
                  }}
                  className="p-1"
                >
                  <Ionicons
                    name="close"
                    size={16}
                    color={styles.subTextColor}
                  />
                </TouchableOpacity>
              </View>
            )}

            <View className="flex-row items-end gap-3 px-2 mb-2">
              <Image
                source={{
                  uri:
                    user?.pfp ||
                    "https://cloud.appwrite.io/v1/avatars/initials?name=Me",
                }}
                className="w-10 h-10 rounded-full mb-1"
                style={{ backgroundColor: styles.inputBg }}
              />
              <View
                className="flex-1 rounded-3xl flex-row items-center px-5 py-1 border"
                style={{
                  backgroundColor: styles.inputBg,
                  borderColor: isDark ? "transparent" : styles.borderColor,
                }}
              >
                <TextInput
                  ref={inputRef}
                  placeholder={
                    replyingTo
                      ? `Responde a ${replyingTo.username}...`
                      : "Escribe un comentario..."
                  }
                  placeholderTextColor={styles.subTextColor}
                  className="flex-1 text-[16px] py-3"
                  style={{ color: styles.textColor, maxHeight: 100 }}
                  value={commentText}
                  onChangeText={handleTextChange}
                  multiline
                />
              </View>
              <TouchableOpacity
                onPress={submitComment}
                disabled={!commentText.trim() || sending}
                className={`w-11 h-11 rounded-full items-center justify-center mb-0.5 ${commentText.trim() ? "opacity-100 scale-100 shadow-md" : "opacity-60 scale-95"}`}
                style={{
                  backgroundColor: commentText.trim()
                    ? styles.accentColor
                    : styles.inputBg,
                }}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons
                    name="arrow-up"
                    size={24}
                    color={commentText.trim() ? "white" : styles.subTextColor}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <DirectShareSheet
        visible={isShareSelectorVisible}
        onClose={() => setShareSelectorVisible(false)}
        contacts={shareContacts}
        isDark={isDark}
        isLoadingContacts={isLoadingContacts}
        onSearch={handleShareSearch}
        onSend={handleSendShare}
        onAddToStory={handleAddToStoryFromPost}
        onViralCard={() => {
          setShareSelectorVisible(false);
          setTimeout(() => setViralModalVisible(true), 300);
        }}
        onSystemShare={handleSystemShare}
        onCopyLink={handleCopyLink}
      />
      <StoryCreationModal
        visible={isCreationVisible}
        onClose={() => setCreationVisible(false)}
        currentUser={user}
        onSuccess={() => setCreationVisible(false)}
        initialSongData={storyInitialSongData}
      />
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
