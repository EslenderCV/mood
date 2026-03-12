import React, { memo, useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing } from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { State } from "react-native-gesture-handler";
import { useColorScheme } from "nativewind";
import { router } from "expo-router"; // ✅ Para navegación

import {
  toggleLikePost,
  toggleSavePost,
  getDeezerTrackUrl,
} from "@/lib/appwrite";

import { tStatic, useLanguage } from "@/context/LanguageContext";
import { getRelativeTime } from "@/lib/dateUtils";
import { useAudioContext } from "@/context/AudioContext";

import { parseSongData } from "@/components/post/postUtils";
import { extractMoodEmojiFromSong } from "@/lib/postUtils";
import { PostHeader } from "@/components/post/PostHeader";
import { PostBody } from "@/components/post/PostBody";
import { PostActions } from "@/components/post/PostActions";
// ✅ IMPORTAR NUEVO COMPONENTE
import { SocialContext } from "@/components/post/SocialContext";

const MOOD_OFFICIAL_ID = "696b571b00112fd5c1e9";

export interface PostItemProps {
  post: any;
  currentUserId: string;
  onProfilePress?: (userId: string) => void;
  onCommentPress?: (postId: string) => void;
  onOptionsPress?: () => void;
  onSharePress?: () => void;
  onLike?: () => void;
  onSave?: () => void;
}

const PostItem: React.FC<PostItemProps> = ({
  post,
  currentUserId,
  onProfilePress,
  onCommentPress,
  onOptionsPress,
  onSharePress,
  onLike,
  onSave,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t, language } = useLanguage();
  const { currentPlayingId, isPlaying, playTrack, isLoading, isBuffering } =
    useAudioContext();

  const textColor = isDark ? "#FFFFFF" : "#09090B";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const accentColor = "#5E17EB";

  // ✅ CORRECCIÓN ERROR ICONCOLOR: Definimos la variable que faltaba
  const iconColor = isDark ? "#A1A1AA" : "#52525B";

  const musicCardGradient = isDark
    ? (["#18181B", "#09090B"] as const)
    : (["#FFFFFF", "#F4F4F5"] as const);

  const initialLikedBy = Array.isArray(post?.likedBy) ? post.likedBy : [];
  const initialSavedBy = Array.isArray(post?.savedBy) ? post.savedBy : [];

  const [isLiked, setIsLiked] = useState(
    initialLikedBy.includes(currentUserId),
  );
  const [isSaved, setIsSaved] = useState(
    initialSavedBy.includes(currentUserId),
  );
  const [likesCount, setLikesCount] = useState(initialLikedBy.length || 0);
  const [savesCount, setSavesCount] = useState(initialSavedBy.length || 0);

  const heartScaleAnim = useRef(new Animated.Value(0)).current;

  // Fecha (usa originalTime si existe)
  const [showNewBadge, setShowNewBadge] = useState(() => {
    if (!post?.$createdAt) return false;
    const created = new Date(post.originalTime || post.$createdAt).getTime();
    const now = Date.now();
    return now - created < 3600000;
  });

  const badgeBounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!showNewBadge) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(badgeBounceAnim, {
          toValue: -5,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(badgeBounceAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [showNewBadge, badgeBounceAnim]);

  const handleInteraction = () => {
    if (showNewBadge) setShowNewBadge(false);
  };

  if (!post) return null;

  const songData = parseSongData(post.songData);
  const hasMusic = !!(songData && songData.title);
  const mood =
    post?.emotionalTag ||
    (songData as any)?.mood ||
    extractMoodEmojiFromSong(songData) ||
    null;
  const isPlayingThis = currentPlayingId === post.$id && isPlaying;
  const isLoadingThis =
    currentPlayingId === post.$id && isLoading && !isPlaying;
  const isBufferingThis = currentPlayingId === post.$id && isBuffering;

  const getCreator = () => {
    let userObj = post.postedBy;
    if (Array.isArray(userObj) && userObj.length > 0) userObj = userObj[0];
    const defaultName = t("common.user");
    const defaultUsername = t("common.anonymous");

    if (userObj && typeof userObj === "object") {
      return {
        id: userObj.$id || userObj.accountId,
        username: userObj.username || defaultUsername,
        name: userObj.name || defaultName,
        avatar: userObj.avatar || userObj.pfp || null,
        isVerified: userObj.isVerified,
        streak: userObj.streak || 0,
      };
    }
    return {
      id: "unknown",
      username: defaultUsername,
      name: defaultName,
      avatar: null,
      isVerified: false,
      streak: 0,
    };
  };

  const creator = getCreator();
  const displayStreak =
    creator.id === currentUserId && creator.streak === 0 ? 1 : creator.streak;
  const isMoodPost =
    creator.id === MOOD_OFFICIAL_ID && !hasMusic && post.comment;

  const handlePlayPause = async () => {
    handleInteraction();
    void Haptics.selectionAsync();
    const trackId = songData?.id || songData?.spotifyId;
    if (!trackId) return;
    let previewUrl = songData?.preview;
    if (
      !previewUrl ||
      typeof previewUrl !== "string" ||
      !previewUrl.startsWith("http")
    ) {
      try {
        previewUrl = await getDeezerTrackUrl(trackId);
      } catch {
        return;
      }
    }
    if (previewUrl) {
      await playTrack(post.$id, previewUrl, {
        title: songData?.title,
        artist: songData?.artist,
        cover: songData?.cover,
      });
    }
  };

  const handleLike = async () => {
    handleInteraction();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prevLiked = isLiked;
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    if (!prevLiked) onLike?.();
    try {
      const currentLikesArray = Array.isArray(post?.likedBy)
        ? post.likedBy
        : [];
      await toggleLikePost(post.$id, currentUserId, currentLikesArray);
    } catch {
      setIsLiked(prevLiked);
      setLikesCount(likesCount);
    }
  };

  const onDoubleTap = (event: any) => {
    if (event.nativeEvent.state !== State.ACTIVE) return;
    handleInteraction();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!isLiked) void handleLike();
    heartScaleAnim.setValue(0);
    Animated.sequence([
      Animated.spring(heartScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 12,
        speed: 20,
      }),
      Animated.delay(200),
      Animated.timing(heartScaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSave = async () => {
    handleInteraction();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const prevSaved = isSaved;
    setIsSaved(!isSaved);
    setSavesCount(isSaved ? savesCount - 1 : savesCount + 1);
    if (!prevSaved) onSave?.();
    try {
      await toggleSavePost(post.$id, currentUserId);
    } catch {
      setIsSaved(prevSaved);
      setSavesCount(savesCount);
    }
  };

  return (
    <View className="px-5 mb-2 relative">
      {showNewBadge && (
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            right: 50,
            zIndex: 20,
            transform: [{ translateY: badgeBounceAnim }],
          }}
        >
          <LinearGradient
            colors={["#8B5CF6", "#EC4899"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.3)",
              shadowColor: "#EC4899",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "800",
                fontSize: 9,
                letterSpacing: 0.5,
              }}
            >{tStatic("ui.s_60829e2a")}</Text>
          </LinearGradient>
        </Animated.View>
      )}

      <PostHeader
        creator={creator}
        postCreatedAt={post.originalTime || post.$createdAt}
        language={language}
        textColor={textColor}
        subTextColor={subTextColor}
        accentColor={accentColor}
        isDark={isDark}
        mood={mood}
        isPrivate={post.isPrivate}
        displayStreak={displayStreak}
        onOptionsPress={onOptionsPress}
        onProfilePress={onProfilePress}
        onInteraction={handleInteraction}
        getRelativeTime={getRelativeTime}
      />

      <PostBody
        post={post}
        isMoodPost={!!isMoodPost}
        hasMusic={hasMusic}
        songData={songData}
        textColor={textColor}
        subTextColor={subTextColor}
        accentColor={accentColor}
        isDark={isDark}
        musicCardGradient={musicCardGradient}
        heartScaleAnim={heartScaleAnim}
        isPlayingThis={isPlayingThis}
        isLoadingThis={isLoadingThis}
        isBufferingThis={isBufferingThis}
        onPlayPause={handlePlayPause}
        onDoubleTap={onDoubleTap}
      />

      <PostActions
        postId={post.$id}
        likesCount={likesCount}
        commentsCount={post.commentsCount || 0}
        isLiked={isLiked}
        isSaved={isSaved}
        accentColor={accentColor}
        iconColor={iconColor}
        subTextColor={subTextColor}
        onLikePress={handleLike}
        onSavePress={handleSave}
        onSharePress={() => {
          handleInteraction();
          onSharePress?.();
        }}
        onCommentPress={onCommentPress}
        onInteraction={handleInteraction}
      />

      {/* ✅ COMPONENTE SOCIAL INTEGRADO */}
      <SocialContext
        likedBy={post.likedBy}
        currentUserId={currentUserId}
        onPress={() => {
          // Si no tienes una pantalla de likes, esto solo abrirá el post
          // Si tienes una, usa: router.push(`/post/${post.$id}/likes`);
          router.push(`/post/${post.$id}` as any);
        }}
      />
    </View>
  );
};

export default memo(PostItem);
