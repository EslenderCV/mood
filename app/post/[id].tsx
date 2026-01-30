import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Alert,
  Clipboard,
  Share as SystemShare,
  Keyboard,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Databases, Query, ID } from "react-native-appwrite";
import * as Haptics from "expo-haptics";

import { useGlobalContext } from "@/context/GlobalProvider";
import {
  getPostById,
  createComment,
  getPostComments,
  toggleLikePost,
  toggleSavePost,
  searchUsers,
  deletePost,
  reportPost,
  getDeezerTrackUrl,
  client,
  appwriteConfig,
  getFollowedUserIds,
  getUser,
  createStory,
  uploadVoiceNote,
  deleteComment,
} from "@/lib/appwrite";
import { parseSongData, sendReplyNotification } from "@/lib/postUtils";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";

// Componentes UI Básicos
import CommentItem from "@/components/CommentItem";
import PostDetailSkeleton from "@/components/PostDetailSkeleton";
import PostHeader from "@/components/PostHeader";
import { MoodTag } from "@/components/posts/MoodTag";

// Componentes Modulares
import { PostNavbar } from "@/components/post/PostNavbar";
import { UserSuggestions } from "@/components/post/UserSuggestions";
import { CommentComposer } from "@/components/post/CommentComposer";
import { PostModals } from "@/components/post/PostModals";
import { EmptyComments } from "@/components/post/EmptyComments";

// 🔥 1. IMPORTAR CONTEXTO DE AUDIO
import { useAudioContext } from "@/context/AudioContext";

const databases = new Databases(client);

const RANDOM_SEARCH_TERMS = [
  "global top 50",
  "viral hits",
  "pop hits",
  "lo-fi beats",
  "rock classics",
];

const searchSongsWrapper = async (query: string) => {
  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=15`,
    );
    const data = await response.json();
    return data.data.map((track: any) => ({
      id: track.id.toString(),
      title: track.title,
      artist: track.artist.name,
      cover: track.album.cover_medium || track.album.cover_big,
      preview: track.preview,
      duration: track.duration,
    }));
  } catch (e) {
    return [];
  }
};

const PostDetails = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

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

  // 🔥 2. USAR EL CONTEXTO GLOBAL
  const {
    playTrack,
    pauseTrack,
    resumeTrack,
    currentPlayingId,
    isPlaying,
    isLoading: isGlobalLoading,
  } = useAudioContext();

  // Estados de Datos
  const [post, setPost] = useState<any>(null);
  const [allComments, setAllComments] = useState<any[]>([]);
  const [rootComments, setRootComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Estados de Visibilidad Modales
  const [visibilities, setVisibilities] = useState({
    isOptions: false,
    isShare: false,
    isViral: false,
    isShareSelector: false,
    isCreation: false,
  });

  const toggleModal = (key: keyof typeof visibilities, value: boolean) => {
    setVisibilities((prev) => ({ ...prev, [key]: value }));
  };

  // Estados Auxiliares
  const [storyInitialSongData, setStoryInitialSongData] = useState<any>(null);
  const [shareContacts, setShareContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  // Comentarios y Voz
  const [replyingTo, setReplyingTo] = useState<{
    rootId: string;
    username: string;
    userId: string;
  } | null>(null);
  const [commentText, setCommentText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isRecordingMode, setIsRecordingMode] = useState(false);

  // 🔥 3. ESTADOS DERIVADOS (Ya no usamos estados locales de audio)
  const isThisPostPlaying = currentPlayingId === postId && isPlaying;
  const isThisPostLoading = currentPlayingId === postId && isGlobalLoading;

  const inputRef = useRef<any>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // --- EFECTOS ---
  useEffect(() => {
    fetchData();
  }, [postId]);

  useEffect(() => {
    if (allComments.length > 0) {
      const roots = allComments.filter((c) => !c.parentId);
      setRootComments(roots);
    } else {
      setRootComments([]);
    }
  }, [allComments]);

  // --- LOGICA DE DATOS ---
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

  const songData = post ? parseSongData(post.songData) : null;
  const mood = songData?.mood;
  const activeSongPreview = songData?.preview || null;

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

  // --- LOGICA DE AUDIO GLOBAL ---
  const handlePlayPause = async () => {
    Haptics.selectionAsync();

    // Si ya es el track actual, alternamos play/pause
    if (currentPlayingId === postId) {
      if (isPlaying) {
        await pauseTrack();
      } else {
        await resumeTrack();
      }
      return;
    }

    // Si no es el actual, cargamos y reproducimos
    try {
      const trackId = songData?.id || songData?.spotifyId;
      if (!trackId) return;

      let previewUrl = activeSongPreview;
      if (!previewUrl) {
        // Intentamos buscarlo si no viene en el post
        try {
          previewUrl = await getDeezerTrackUrl(trackId);
        } catch (e) {
          Alert.alert("Error", "URL no disponible");
          return;
        }
      }

      if (previewUrl) {
        await playTrack(postId, previewUrl, {
          title: songData?.title || "Música",
          artist: songData?.artist || "Artista",
          cover: songData?.cover,
        });
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo reproducir el audio.");
    }
  };

  // --- LOGICA DE COMENTARIOS ---
  const handleTextChange = (text: string) => {
    setCommentText(text);
    const words = text.split(" ");
    const lastWord = words[words.length - 1];
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (lastWord && lastWord.startsWith("@") && lastWord.length > 1) {
      const query = lastWord.substring(1);
      searchTimeout.current = setTimeout(async () => {
        try {
          const results = await searchUsersInAppwrite(query);
          const filtered = results.filter((u: any) => u.$id !== user?.$id);
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
    Haptics.selectionAsync();
    const words = commentText.split(" ");
    words.pop();
    setCommentText(`${words.join(" ")} @${username} `);
    setShowSuggestions(false);
  };

  const handleReply = (targetComment: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const rootId = targetComment.parentId
      ? targetComment.parentId
      : targetComment.$id;
    setReplyingTo({
      rootId,
      username: targetComment.user?.username || targetComment.username,
      userId: targetComment.userId,
    });
    setCommentText(
      `@${targetComment.user?.username || targetComment.username} `,
    );
    inputRef.current?.focus();
  };

  const handleDeleteComment = async (commentId: string) => {
    const previousComments = [...allComments];
    setAllComments((prev) => prev.filter((c) => c.$id !== commentId));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await deleteComment(commentId);
    } catch (error) {
      Alert.alert("Error", "No se pudo eliminar el comentario.");
      setAllComments(previousComments);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);
    try {
      const newComment = await createComment(
        postId,
        {
          content: commentText,
          userId: user?.$id,
          username: user?.name || user?.username,
          avatar: user?.pfp,
          isVerified: (user as any)?.isVerified,
        },
        replyingTo ? replyingTo.rootId : null,
      );
      await sendReplyNotification(
        post,
        user,
        replyingTo ? { $id: replyingTo.userId } : null,
      );
      setAllComments((prev) => [newComment, ...prev]);
      setCommentText("");
      setReplyingTo(null);
      setShowSuggestions(false);
    } catch (error) {
    } finally {
      setSending(false);
    }
  };

  const handleVoiceUpload = async (uri: string, duration: number) => {
    if (!user || !post) return;
    setIsRecordingMode(false);
    setSending(true);
    try {
      const fileUrl = await uploadVoiceNote(uri);
      const voicePayload = JSON.stringify({
        audioUrl: fileUrl,
        duration: duration,
        songContext: activeSongPreview,
        type: "voice_vibe",
      });
      const newComment = await createComment(
        postId,
        {
          content: voicePayload,
          userId: user.$id,
          username: user?.name || user?.username,
          avatar: user.pfp,
          isVerified: (user as any)?.isVerified,
        },
        replyingTo ? replyingTo.rootId : null,
      );
      setAllComments((prev) => [newComment, ...prev]);
    } catch (e) {
      Alert.alert("Error", "No se pudo subir el audio.");
    } finally {
      setSending(false);
    }
  };

  // --- ACTIONS Y MODALES ---
  const handleDeleteAction = () => {
    toggleModal("isOptions", false);
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
    toggleModal("isOptions", false);
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
      Alert.alert("Reporte enviado", "Gracias.");
    } catch (e) {
      Alert.alert("Error", "Error al reportar.");
    }
  };
  const handleLike = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!post || !user) return;
    const original = { ...post };
    const likes = post.likedBy || [];
    const newLikes = likes.includes(user.$id)
      ? likes.filter((id: string) => id !== user.$id)
      : [...likes, user.$id];
    setPost({ ...post, likedBy: newLikes });
    try {
      await toggleLikePost(post.$id, user.$id, likes);
    } catch (error) {
      setPost(original);
    }
  };
  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!post || !user) return;
    const saved = post.savedBy || [];
    const newSaved = saved.includes(user.$id)
      ? saved.filter((id: string) => id !== user.$id)
      : [...saved, user.$id];
    setPost({ ...post, savedBy: newSaved });
    try {
      await toggleSavePost(post.$id, user.$id);
    } catch (e) {}
  };
  const searchUsersInAppwrite = async (query: string) => {
    try {
      const res = await databases.listDocuments(
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
      return res.documents;
    } catch (error) {
      return [];
    }
  };
  const fetchFollowedUsers = async (userId: string) => {
    try {
      const ids = await getFollowedUserIds(userId);
      if (ids.length > 0) {
        const users = await Promise.all(ids.map((id) => getUser(id)));
        return users.filter((u) => u !== null);
      }
    } catch (error) {}
    return [];
  };
  const openShare = async () => {
    Haptics.selectionAsync();
    toggleModal("isShareSelector", true);
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
      const res = await searchUsersInAppwrite(text);
      setShareContacts(res);
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
      Alert.alert("Enviado", "Compartido correctamente.");
    } catch (error) {
      Alert.alert("Error", "No se pudo compartir.");
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
      toggleModal("isShareSelector", false);
      setTimeout(() => toggleModal("isCreation", true), 300);
    }
  };
  const handleSystemShare = async () => {
    if (!post) return;
    const link = `https://moodapp.com/post/${post.$id}`;
    try {
      await SystemShare.share({
        message: `¡Mira esta canción en Mood! ${link}`,
        url: link,
      });
    } catch (error) {}
    toggleModal("isShareSelector", false);
  };
  const handleCopyLink = () => {
    if (!post) return;
    const link = `https://moodapp.com/post/${post.$id}`;
    Clipboard.setString(link);
    Alert.alert("Copiado", "Enlace en portapapeles.");
    toggleModal("isShareSelector", false);
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: styles.bgColor,
          paddingTop: insets.top,
        }}
      >
        <PostNavbar styles={styles} onOptions={() => {}} />
        <PostDetailSkeleton isDark={isDark} />
      </View>
    );
  }

  const isOwner = user?.$id === (post?.postedBy?.$id || post?.creator?.$id);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: styles.bgColor,
        paddingTop: insets.top,
      }}
    >
      {/* 1. NAVBAR */}
      <PostNavbar
        styles={styles}
        onOptions={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          toggleModal("isOptions", true);
        }}
      />

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
              onDelete={handleDeleteComment}
              allComments={allComments}
            />
          )}
          ListHeaderComponent={
            <View>
              <PostHeader
                post={post}
                user={user}
                // 🔥 4. PASAR ESTADOS GLOBALES AL HEADER
                isPlaying={isThisPostPlaying}
                isLoadingAudio={isThisPostLoading}
                onPlayPause={handlePlayPause}
                onLike={handleLike}
                onSave={handleSave}
                onOpenShare={openShare}
                t={t}
                allCommentsCount={allComments.length}
                styles={styles}
              />
              {mood && (
                <View className="px-5 mb-4 flex-row items-center">
                  <MoodTag mood={mood} />
                </View>
              )}
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          ListEmptyComponent={<EmptyComments t={t} styles={styles} />}
        />

        <View style={{ backgroundColor: styles.bgColor }}>
          {showSuggestions && (
            <UserSuggestions
              suggestions={suggestions}
              onSelectUser={handleSelectUser}
              styles={styles}
            />
          )}

          <CommentComposer
            user={user}
            text={commentText}
            setText={handleTextChange}
            onSubmit={submitComment}
            isSending={sending}
            replyingTo={replyingTo}
            onCancelReply={() => {
              setReplyingTo(null);
              setCommentText("");
            }}
            isRecordingMode={isRecordingMode}
            setRecordingMode={setIsRecordingMode}
            onVoiceUpload={handleVoiceUpload}
            activeSongPreview={activeSongPreview}
            styles={styles}
            inputRef={inputRef}
          />
        </View>
      </KeyboardAvoidingView>

      <PostModals
        visibilities={visibilities}
        onClose={{
          shareSelector: () => toggleModal("isShareSelector", false),
          creation: () => toggleModal("isCreation", false),
          options: () => toggleModal("isOptions", false),
          share: () => toggleModal("isShare", false),
          viral: () => toggleModal("isViral", false),
        }}
        shareContacts={shareContacts}
        isDark={isDark}
        isLoadingContacts={isLoadingContacts}
        onSearchContacts={handleShareSearch}
        onSendShare={handleSendShare}
        onAddToStory={handleAddToStoryFromPost}
        onViralCardOpen={() => {
          toggleModal("isShareSelector", false);
          setTimeout(() => toggleModal("isViral", true), 300);
        }}
        onSystemShare={handleSystemShare}
        onCopyLink={handleCopyLink}
        currentUser={user}
        storyInitialSongData={storyInitialSongData}
        createStory={createStory}
        searchSongsWrapper={searchSongsWrapper}
        RANDOM_SEARCH_TERMS={RANDOM_SEARCH_TERMS}
        onDelete={handleDeleteAction}
        onReport={handleReportAction}
        isOwner={isOwner}
        postId={post?.$id || ""}
        viralPostData={getViralPostData()}
      />
    </View>
  );
};

export default PostDetails;
