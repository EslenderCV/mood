import React, { useState, useEffect, useRef, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { Audio } from "expo-av";
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

// ID OFICIAL DE MOOD
const MOOD_OFFICIAL_ID = "696b571b00112fd5c1e9";

const AudioVisualizer = ({
  isPlaying,
  color,
}: {
  isPlaying: boolean;
  color: string;
}) => {
  return (
    <View className="flex-row items-end gap-[3px] h-3 ml-2 opacity-80">
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          className={`w-[3px] rounded-full`}
          style={{
            height: isPlaying ? Math.random() * 12 + 4 : 4,
            backgroundColor: isPlaying ? "#5E17EB" : color,
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
}

const PostItem: React.FC<PostItemProps> = ({
  post,
  currentUserId,
  onProfilePress,
  onCommentPress,
  onOptionsPress,
  onSharePress,
}) => {
  if (!post) return null;

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const textColor = isDark ? "#FAFAFA" : "#18181B";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const songCardBg = isDark ? "#18181B" : "#F4F4F5";
  const iconColor = isDark ? "#A1A1AA" : "#52525B";
  const accentColor = "#5E17EB";

  const { t, language } = useLanguage();
  const { currentPlayingId, setPlayingId } = useAudioContext();

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const [isLiked, setIsLiked] = useState(post.likedBy.includes(currentUserId));
  const [isSaved, setIsSaved] = useState(
    post?.savedBy?.includes(currentUserId) || false,
  );
  const [likesCount, setLikesCount] = useState(post?.likedBy?.length || 0);
  const [savesCount, setSavesCount] = useState(post?.savedBy?.length || 0);

  const heartScaleAnim = useRef(new Animated.Value(0)).current;

  const songData = parseSongData(post.songData);
  const hasMusic = songData && songData.title;

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

  // 🔥 DETECCIÓN DE ESTILO MOOD
  const isMoodPost =
    creator.id === MOOD_OFFICIAL_ID && !hasMusic && post.comment;
  const moodStyle = songData?.moodStyle || "standard"; // 'standard' o 'card'

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  useEffect(() => {
    const manageGlobalAudio = async () => {
      if (currentPlayingId && currentPlayingId !== post.$id && sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        }
      }
    };
    manageGlobalAudio();
  }, [currentPlayingId, post.$id, sound]);

  const handlePlayPause = async () => {
    Haptics.selectionAsync();

    try {
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
            setPlayingId(null);
          } else {
            if (status.positionMillis >= status.durationMillis!) {
              await sound.replayAsync();
            } else {
              await sound.playAsync();
            }
            setPlayingId(post.$id);
            setIsPlaying(true);
          }
        }
        return;
      }

      setIsLoadingAudio(true);
      const trackId = songData?.id || songData?.spotifyId;
      if (!trackId) {
        setIsLoadingAudio(false);
        return;
      }

      const previewUrl = await getDeezerTrackUrl(trackId);
      if (!previewUrl) {
        setIsLoadingAudio(false);
        return;
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: previewUrl },
        { shouldPlay: true },
      );

      setSound(newSound);
      setIsPlaying(true);
      setPlayingId(post.$id);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPlayingId(null);
          }
        }
      });

      setIsLoadingAudio(false);
    } catch (error) {
      console.log("Error playing audio:", error);
      setIsLoadingAudio(false);
      setPlayingId(null);
    }
  };

  const handleLike = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const prevLiked = isLiked;
    const prevCount = likesCount;

    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

    try {
      const currentLikesArray = post.likedBy || [];
      await toggleLikePost(post.$id, currentUserId, currentLikesArray);
    } catch (error) {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    }
  };

  const onDoubleTap = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!isLiked) {
        handleLike();
      }
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
    const prevCount = savesCount;
    setIsSaved(!isSaved);
    setSavesCount(isSaved ? savesCount - 1 : savesCount + 1);
    try {
      await toggleSavePost(post.$id, currentUserId);
    } catch {
      setIsSaved(prevSaved);
      setSavesCount(prevCount);
    }
  };

  return (
    <View className="px-5">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={() =>
              onProfilePress
                ? onProfilePress(creator.id)
                : router.push(`/user/${creator.id}` as any)
            }
          >
            <Image
              source={
                creator.avatar
                  ? { uri: creator.avatar }
                  : require("@/assets/noPfp.jpg")
              }
              className="w-10 h-10 rounded-full"
              style={{
                backgroundColor: isDark ? "#27272A" : "#E4E4E7",
              }}
              contentFit="cover"
              transition={200}
            />
          </TouchableOpacity>

          <View className="ml-3 flex-1">
            <View className="flex-row items-center">
              <Text
                className="font-bold text-[15px] leading-5"
                style={{ color: textColor }}
              >
                {creator.name}
              </Text>
              {creator.isVerified && (
                <MaterialIcons
                  name="verified"
                  size={14}
                  color={accentColor}
                  style={{ marginLeft: 4 }}
                />
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

        <TouchableOpacity onPress={onOptionsPress} className="p-2 -mr-2">
          <Ionicons name="ellipsis-horizontal" size={20} color={subTextColor} />
        </TouchableOpacity>
      </View>

      <View className="pl-[52px]">
        {/* 🔥 LÓGICA DE RENDERIZADO SEGÚN ESTILO MOOD */}
        {isMoodPost ? (
          moodStyle === "card" ? (
            // --- ESTILO 1: TARJETA GRADIENTE (CARD) ---
            <TapGestureHandler
              numberOfTaps={2}
              onHandlerStateChange={onDoubleTap}
            >
              <Animated.View className="mb-3 rounded-2xl overflow-hidden shadow-sm relative">
                <LinearGradient
                  colors={["#5E17EB", "#8C52FF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    padding: 20,
                    minHeight: 100,
                    justifyContent: "center",
                  }}
                >
                  <Text
                    className="text-white font-bold text-xl text-center leading-7"
                    style={{
                      textShadowColor: "rgba(0,0,0,0.1)",
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 2,
                    }}
                  >
                    {post.comment}
                  </Text>
                  <Ionicons
                    name="chatbubble-ellipses"
                    size={80}
                    color="rgba(255,255,255,0.1)"
                    style={{
                      position: "absolute",
                      bottom: -10,
                      right: -10,
                      transform: [{ rotate: "-15deg" }],
                    }}
                  />
                </LinearGradient>
                <Animated.View
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 50,
                    pointerEvents: "none",
                    transform: [{ scale: heartScaleAnim }],
                  }}
                >
                  <Ionicons name="heart" size={60} color="white" />
                </Animated.View>
              </Animated.View>
            </TapGestureHandler>
          ) : (
            // --- ESTILO 2: CAJA DECORADA "CASUAL" (CLEAN BOX) ---
            <TapGestureHandler
              numberOfTaps={2}
              onHandlerStateChange={onDoubleTap}
            >
              <Animated.View
                className="mb-3 p-4 rounded-r-xl rounded-bl-xl border-l-4"
                style={{
                  backgroundColor: isDark ? "rgba(39, 39, 42, 0.5)" : "#F4F4F5",
                  borderLeftColor: "#5E17EB",
                }}
              >
                <Text
                  className="text-[16px] leading-6 font-medium"
                  style={{ color: textColor }}
                >
                  {post.comment}
                </Text>

                {/* Animación Corazón (Igual para todos) */}
                <Animated.View
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 50,
                    pointerEvents: "none",
                    transform: [{ scale: heartScaleAnim }],
                  }}
                >
                  <Ionicons name="heart" size={50} color="#EF4444" />
                </Animated.View>
              </Animated.View>
            </TapGestureHandler>
          )
        ) : (
          /* Renderizado Normal para el resto de mortales */
          !!post.comment &&
          post.comment.trim() !== "" && (
            <Text
              className="text-[15px] leading-6 mb-3 font-normal"
              style={{ color: textColor }}
            >
              {post.comment}
            </Text>
          )
        )}

        {hasMusic && (
          <TapGestureHandler
            numberOfTaps={2}
            onHandlerStateChange={onDoubleTap}
          >
            <Animated.View
              className="rounded-2xl p-3 flex-row items-center mb-4 relative"
              style={{ backgroundColor: songCardBg }}
            >
              <Image
                source={{ uri: songData.cover }}
                className="w-14 h-14 rounded-xl shadow-sm"
                style={{ backgroundColor: isDark ? "#27272A" : "#E4E4E7" }}
                contentFit="cover"
                transition={300}
              />
              <View className="flex-1 ml-3 mr-2 justify-center">
                <Text
                  className="font-bold text-[15px] mb-0.5"
                  numberOfLines={1}
                  style={{ color: textColor }}
                >
                  {songData.title}
                </Text>
                <Text
                  className="text-[13px]"
                  numberOfLines={1}
                  style={{ color: subTextColor }}
                >
                  {songData.artist}
                </Text>
                <View className="mt-1 flex-row items-center">
                  <Ionicons
                    name="musical-notes"
                    size={10}
                    color={accentColor}
                  />
                  <AudioVisualizer isPlaying={isPlaying} color={subTextColor} />
                </View>
              </View>

              <TouchableOpacity
                onPress={handlePlayPause}
                className="w-10 h-10 rounded-full items-center justify-center shadow-md"
                style={{ backgroundColor: accentColor }}
                activeOpacity={0.8}
              >
                {isLoadingAudio ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={20}
                    color="white"
                    style={{ marginLeft: isPlaying ? 0 : 2 }}
                  />
                )}
              </TouchableOpacity>

              <Animated.View
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  right: 0,
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 50,
                  pointerEvents: "none",
                  transform: [{ scale: heartScaleAnim }],
                }}
              >
                <Ionicons
                  name="heart"
                  size={50}
                  color="#EF4444"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 5,
                  }}
                />
              </Animated.View>
            </Animated.View>
          </TapGestureHandler>
        )}

        <View className="flex-row justify-between items-center pr-2">
          <TouchableOpacity
            className="flex-row items-center gap-2"
            onPress={() =>
              onCommentPress
                ? onCommentPress(post.$id)
                : router.push(`/post/${post.$id}` as any)
            }
          >
            <Ionicons name="chatbubble-outline" size={20} color={iconColor} />
            {(post.commentsCount || 0) > 0 && (
              <Text
                className="text-xs font-medium"
                style={{ color: subTextColor }}
              >
                {post.commentsCount}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLike}
            className="flex-row items-center gap-2"
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={22}
              color={isLiked ? "#EF4444" : iconColor}
            />
            {likesCount > 0 && (
              <Text
                className="text-xs font-medium"
                style={{ color: isLiked ? "#EF4444" : subTextColor }}
              >
                {likesCount}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            className="flex-row items-center gap-2"
          >
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={22}
              color={isSaved ? accentColor : iconColor}
            />
            {savesCount > 0 && (
              <Text
                className="text-xs font-medium"
                style={{ color: isSaved ? accentColor : subTextColor }}
              >
                {savesCount}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onSharePress}>
            <Ionicons name="share-social-outline" size={22} color={iconColor} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default memo(PostItem);
