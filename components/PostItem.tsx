import React, { useState, useRef, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { TapGestureHandler, State } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";

import {
  toggleLikePost,
  toggleSavePost,
  getDeezerTrackUrl,
} from "@/lib/appwrite";
import { useLanguage } from "@/context/LanguageContext";
import { getRelativeTime } from "@/lib/dateUtils";
import { useAudioContext } from "@/context/AudioContext";

const MOOD_OFFICIAL_ID = "696b571b00112fd5c1e9";

// Visualizador de Audio (Barras animadas)
const AudioVisualizer = ({
  isPlaying,
  color,
}: {
  isPlaying: boolean;
  color: string;
}) => {
  return (
    <View className="flex-row items-end gap-[3px] h-4 ml-3 opacity-90">
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          className="w-[3px] rounded-full"
          style={{
            height: isPlaying ? Math.random() * 14 + 4 : 4,
            backgroundColor: isPlaying ? "#5E17EB" : color,
            opacity: isPlaying ? 1 : 0.5,
          }}
        />
      ))}
    </View>
  );
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

interface PostItemProps {
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
  if (!post) return null;

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t, language } = useLanguage();

  const { currentPlayingId, isPlaying, playTrack, isLoading } =
    useAudioContext();

  // Colores y Estilos
  const textColor = isDark ? "#FFFFFF" : "#09090B";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const accentColor = "#5E17EB";
  const iconColor = isDark ? "#A1A1AA" : "#52525B";

  // Gradiente de la tarjeta de música (Volumen)
  const musicCardGradient = isDark
    ? (["#18181B", "#09090B"] as const) // Zinc oscuro
    : (["#FFFFFF", "#F4F4F5"] as const); // Blanco suave

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

  const songData = parseSongData(post.songData);
  const hasMusic = songData && songData.title;

  const isPlayingThis = currentPlayingId === post.$id && isPlaying;
  const isLoadingThis = currentPlayingId === post.$id && isLoading;

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
        avatar: userObj.avatar || userObj.pfp,
        isVerified: userObj.isVerified,
      };
    }
    return {
      id: "unknown",
      username: defaultUsername,
      name: defaultName,
      avatar: null,
      isVerified: false,
    };
  };
  const creator = getCreator();

  const isMoodPost =
    creator.id === MOOD_OFFICIAL_ID && !hasMusic && post.comment;
  const moodStyle = songData?.moodStyle || "standard";

  const handlePlayPause = async () => {
    Haptics.selectionAsync();
    const trackId = songData?.id || songData?.spotifyId;
    if (!trackId) return;

    let previewUrl = songData.preview;
    if (!previewUrl || !previewUrl.startsWith("http")) {
      try {
        previewUrl = await getDeezerTrackUrl(trackId);
      } catch (e) {
        return;
      }
    }

    if (previewUrl) {
      await playTrack(post.$id, previewUrl, {
        title: songData.title,
        artist: songData.artist,
        cover: songData.cover,
      });
    }
  };

  const handleLike = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prevLiked = isLiked;
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    if (!prevLiked) onLike?.();

    try {
      const currentLikesArray = Array.isArray(post?.likedBy)
        ? post.likedBy
        : [];
      await toggleLikePost(post.$id, currentUserId, currentLikesArray);
    } catch (error) {
      setIsLiked(prevLiked);
      setLikesCount(isLiked ? likesCount : likesCount);
    }
  };

  const onDoubleTap = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!isLiked) handleLike();

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
    }
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const prevSaved = isSaved;
    setIsSaved(!isSaved);
    setSavesCount(isSaved ? savesCount - 1 : savesCount + 1);
    if (!prevSaved) onSave?.();

    try {
      await toggleSavePost(post.$id, currentUserId);
    } catch {
      setIsSaved(prevSaved);
      setSavesCount(isSaved ? savesCount : savesCount);
    }
  };

  return (
    <View className="px-5 mb-2">
      {/* --- HEADER (AVATAR + NOMBRE) --- */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={() =>
              onProfilePress
                ? onProfilePress(creator.id)
                : router.push(`/user/${creator.id}` as any)
            }
            activeOpacity={0.8}
          >
            {/* Anillo de Avatar */}
            <View
              className={`p-[2px] rounded-full border ${isDark ? "border-zinc-800" : "border-zinc-200"}`}
            >
              <Image
                source={
                  creator.avatar
                    ? { uri: creator.avatar }
                    : require("@/assets/noPfp.jpg")
                }
                className="w-10 h-10 rounded-full"
                contentFit="cover"
                transition={200}
              />
            </View>
          </TouchableOpacity>

          <View className="ml-3 flex-1">
            <View className="flex-row items-center">
              <Text
                className="font-bold text-[15px] leading-5 mr-1"
                style={{ color: textColor }}
              >
                {creator.name}
              </Text>
              {creator.isVerified && (
                <MaterialIcons name="verified" size={14} color={accentColor} />
              )}
              {!!post.isPrivate && (
                <Ionicons
                  name="lock-closed"
                  size={12}
                  color={subTextColor}
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
            <Text
              className="text-[13px] font-medium"
              style={{ color: subTextColor }}
            >
              @{creator.username} · {getRelativeTime(post.$createdAt, language)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onOptionsPress}
          className="p-2 -mr-2 opacity-60"
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={subTextColor} />
        </TouchableOpacity>
      </View>

      {/* --- LÍNEA DE CONTENIDO --- */}
      <View className="pl-[52px]">
        {/* TEXTO / MOOD CARD */}
        {isMoodPost ? (
          <TapGestureHandler
            numberOfTaps={2}
            onHandlerStateChange={onDoubleTap}
          >
            <Animated.View className="mb-4 rounded-[24px] overflow-hidden shadow-sm relative">
              <LinearGradient
                colors={["#5E17EB", "#8C52FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  padding: 24,
                  minHeight: 110,
                  justifyContent: "center",
                }}
              >
                <Text className="text-white font-bold text-[22px] text-center leading-8 tracking-tight">
                  {post.comment}
                </Text>
                {/* Elemento decorativo de fondo */}
                <Ionicons
                  name="chatbubble-ellipses"
                  size={100}
                  color="rgba(255,255,255,0.08)"
                  style={{
                    position: "absolute",
                    bottom: -20,
                    right: -20,
                    transform: [{ rotate: "-15deg" }],
                  }}
                />
              </LinearGradient>
              {/* Animación Corazón */}
              <Animated.View
                style={[
                  styles.heartOverlay,
                  { transform: [{ scale: heartScaleAnim }] },
                ]}
              >
                <Ionicons name="heart" size={70} color="white" />
              </Animated.View>
            </Animated.View>
          </TapGestureHandler>
        ) : (
          !!post.comment &&
          post.comment.trim() !== "" && (
            <Text
              className="text-[16px] leading-[22px] mb-3 font-normal"
              style={{ color: textColor }}
            >
              {post.comment}
            </Text>
          )
        )}

        {/* REPRODUCTOR DE MÚSICA PREMIUM */}
        {hasMusic && (
          <TapGestureHandler
            numberOfTaps={2}
            onHandlerStateChange={onDoubleTap}
          >
            <Animated.View
              className="mb-4 rounded-[28px] overflow-hidden border"
              style={{
                borderColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.05)",
                // Sombra de color para darle vida
                shadowColor: isDark ? "#5E17EB" : "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.2 : 0.05,
                shadowRadius: 10,
                elevation: 5,
              }}
            >
              <LinearGradient
                colors={musicCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="p-3 flex-row items-center"
              >
                {/* Portada */}
                <View className="relative shadow-md">
                  <Image
                    source={{ uri: songData.cover }}
                    className="w-[64px] h-[64px] rounded-[20px]"
                    contentFit="cover"
                    transition={300}
                  />
                  {/* Pequeño icono de app sobre la portada */}
                  <View className="absolute bottom-1 right-1 bg-black/40 rounded-full p-1 backdrop-blur-md">
                    <Ionicons name="musical-note" size={8} color="white" />
                  </View>
                </View>

                {/* Info Central */}
                <View className="flex-1 ml-4 justify-center mr-2">
                  <Text
                    className="font-bold text-[16px] mb-1"
                    numberOfLines={1}
                    style={{ color: textColor }}
                  >
                    {songData.title}
                  </Text>
                  <Text
                    className="text-[14px] font-medium"
                    numberOfLines={1}
                    style={{ color: subTextColor }}
                  >
                    {songData.artist}
                  </Text>

                  {/* Visualizador de Audio Integrado */}
                  <View className="mt-2 flex-row items-center">
                    <AudioVisualizer
                      isPlaying={isPlayingThis}
                      color={subTextColor}
                    />
                  </View>
                </View>

                {/* Botón Play Flotante */}
                <TouchableOpacity
                  onPress={handlePlayPause}
                  className="w-12 h-12 rounded-full items-center justify-center shadow-lg"
                  style={{ backgroundColor: accentColor }}
                  activeOpacity={0.8}
                >
                  {isLoadingThis ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons
                      name={isPlayingThis ? "pause" : "play"}
                      size={22}
                      color="white"
                      style={{ marginLeft: isPlayingThis ? 0 : 3 }}
                    />
                  )}
                </TouchableOpacity>
              </LinearGradient>

              <Animated.View
                style={[
                  styles.heartOverlay,
                  { transform: [{ scale: heartScaleAnim }] },
                ]}
              >
                <Ionicons
                  name="heart"
                  size={60}
                  color="#EF4444"
                  style={{ shadowOpacity: 0.5, shadowRadius: 10 }}
                />
              </Animated.View>
            </Animated.View>
          </TapGestureHandler>
        )}

        {/* --- BARRA DE ACCIONES (Limpia y espaciada) --- */}
        <View className="flex-row justify-between items-center pr-1 mt-1">
          {/* 🔥 CORRECCIÓN: Agregado 'items-center' para alinear verticalmente el botón de guardar */}
          <View className="flex-row gap-6 items-center">
            <TouchableOpacity
              className="flex-row items-center gap-1.5"
              onPress={handleLike}
              activeOpacity={0.6}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={24}
                color={isLiked ? "#EF4444" : iconColor}
              />
              {likesCount > 0 && (
                <Text
                  className="text-[13px] font-semibold"
                  style={{ color: isLiked ? "#EF4444" : subTextColor }}
                >
                  {likesCount}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center gap-1.5"
              onPress={() =>
                onCommentPress
                  ? onCommentPress(post.$id)
                  : router.push(`/post/${post.$id}` as any)
              }
              activeOpacity={0.6}
            >
              <Ionicons name="chatbubble-outline" size={23} color={iconColor} />
              {(post.commentsCount || 0) > 0 && (
                <Text
                  className="text-[13px] font-semibold"
                  style={{ color: subTextColor }}
                >
                  {post.commentsCount}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSave} activeOpacity={0.6}>
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={23}
                color={isSaved ? accentColor : iconColor}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onSharePress} activeOpacity={0.6}>
            <Ionicons name="share-social-outline" size={23} color={iconColor} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heartOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
    pointerEvents: "none",
  },
});

export default memo(PostItem);
