import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAudioPlayer } from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
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
  const textColor = isDark ? "#FFFFFF" : "#09090B";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const cardBg = isDark ? "#1C1C1E" : "#F4F4F5";
  const cardBorder = isDark ? "#27272A" : "transparent";
  const iconColor = isDark ? "#A1A1AA" : "#52525B";

  const { t, language } = useLanguage();
  const { currentPlayingId, setPlayingId } = useAudioContext();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(
    post?.likedBy?.includes(currentUserId) || false
  );
  const [isSaved, setIsSaved] = useState(
    post?.savedBy?.includes(currentUserId) || false
  );
  const [likesCount, setLikesCount] = useState(post?.likedBy?.length || 0);
  const [savesCount, setSavesCount] = useState(post?.savedBy?.length || 0);

  const songData = parseSongData(post.songData);

  const getCreator = () => {
    let userObj = post.creator || post.postedBy || post.users || post.user;
    if (Array.isArray(userObj) && userObj.length > 0) userObj = userObj[0];
    if (userObj && typeof userObj === "object") {
      return {
        id: userObj.$id || userObj.accountId,
        username: userObj.username || "anon",
        name: userObj.name || "Usuario",
        avatar: userObj.avatar || userObj.pfp,
      };
    }
    return { id: "unknown", username: "anon", name: "Usuario", avatar: null };
  };
  const creator = getCreator();

  const player = useAudioPlayer(currentUrl);

  useEffect(() => {
    if (
      currentPlayingId &&
      currentPlayingId !== post.$id &&
      isPlaying &&
      player
    ) {
      player.pause();
      setIsPlaying(false);
    }
  }, [currentPlayingId, isPlaying, player, post.$id]);

  useEffect(() => {
    if (currentUrl && player) {
      if (!player.playing && currentPlayingId === post.$id) {
        player.play();
        setIsPlaying(true);
      }

      const statusListener = (status: any) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          player.seekTo(0);
          player.pause();
          if (currentPlayingId === post.$id) {
            setPlayingId(null);
          }
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
  }, [currentUrl, player, currentPlayingId, post.$id, setPlayingId]);

  const handlePlayPause = async () => {
    if (currentUrl && player) {
      if (player.playing) {
        player.pause();
        setIsPlaying(false);
        setPlayingId(null);
      } else {
        if (player.currentTime >= player.duration) {
          player.seekTo(0);
        }
        setPlayingId(post.$id);
        player.play();
        setIsPlaying(true);
      }
      return;
    }

    try {
      setIsLoadingAudio(true);
      setPlayingId(post.$id);

      const trackId = songData?.id || songData?.spotifyId;

      if (!trackId) {
        Alert.alert("Error", "No se encontró un ID válido.");
        setIsLoadingAudio(false);
        return;
      }

      const previewUrl = await getDeezerTrackUrl(trackId);

      if (!previewUrl) {
        Alert.alert("Error", "No se pudo generar el audio.");
        setIsLoadingAudio(false);
        setPlayingId(null);
        return;
      }

      setCurrentUrl(previewUrl);
      setIsLoadingAudio(false);
    } catch (error) {
      console.error(error);
      setIsLoadingAudio(false);
      setPlayingId(null);
    }
  };

  const handleLike = async () => {
    const prevLiked = isLiked;
    const prevCount = likesCount;
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    try {
      await toggleLikePost(post.$id, currentUserId, post.likedBy || []);
    } catch {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    }
  };

  const handleSave = async () => {
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

  if (!songData) return null;

  return (
    <View className="flex-row px-4">
      <View className="items-center mr-3">
        <TouchableOpacity
          className="z-10"
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
            style={{
              borderColor: isDark ? "#000" : "#F4F4F5",
              borderWidth: 2,
            }}
            className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800"
          />
        </TouchableOpacity>
      </View>
      <View className="flex-1 pb-6">
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center flex-1 flex-wrap">
            <Text
              className="font-bold text-[15px] mr-1"
              style={{ color: textColor }}
            >
              {creator.name}
            </Text>

            {!!post.isPrivate && (
              <Ionicons
                name="lock-closed"
                size={12}
                color={subTextColor}
                style={{ marginRight: 4 }}
              />
            )}

            <Text className="text-[13px]" style={{ color: subTextColor }}>
              @{creator.username} · {getRelativeTime(post.$createdAt, language)}
            </Text>
          </View>

          <TouchableOpacity onPress={onOptionsPress} className="p-2 -mr-2">
            <Ionicons
              name="ellipsis-horizontal"
              size={18}
              color={subTextColor}
            />
          </TouchableOpacity>
        </View>

        {!!post.comment && post.comment.trim() !== "" && (
          <Text
            className="text-[15px] mb-3 leading-5"
            style={{ color: textColor }}
          >
            {post.comment}
          </Text>
        )}
        <View
          className="rounded-2xl p-3 flex-row items-center mb-3"
          style={{
            backgroundColor: cardBg,
            borderWidth: isDark ? 1 : 0,
            borderColor: cardBorder,
            marginTop: post.comment ? 0 : 4,
          }}
        >
          <Image
            source={{ uri: songData.cover }}
            className="w-12 h-12 rounded-lg bg-zinc-300 dark:bg-zinc-800"
          />
          <View className="flex-1 ml-3 mr-2">
            <Text
              className="font-bold text-sm"
              numberOfLines={1}
              style={{ color: textColor }}
            >
              {songData.title}
            </Text>
            <Text
              className="text-xs mt-0.5"
              numberOfLines={1}
              style={{ color: subTextColor }}
            >
              {songData.artist}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handlePlayPause}
            className="w-10 h-10 rounded-full bg-[#5E17EB] items-center justify-center shadow-sm"
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
        </View>

        {/* FOOTER */}
        <View className="flex-row justify-between items-center mt-1 pr-2">
          <TouchableOpacity
            className="flex-row items-center py-1"
            onPress={() =>
              onCommentPress
                ? onCommentPress(post.$id)
                : router.push(`/post/${post.$id}` as any)
            }
          >
            <Ionicons name="chatbubble-outline" size={20} color={iconColor} />
            {(post.commentsCount || 0) > 0 && (
              <Text
                className="text-xs ml-1.5 font-medium"
                style={{ color: subTextColor }}
              >
                {post.commentsCount}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLike}
            className="flex-row items-center py-1"
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={22}
              color={isLiked ? "#EF4444" : iconColor}
            />
            {likesCount > 0 && (
              <Text
                className="text-xs ml-1.5 font-medium"
                style={{ color: isLiked ? "#EF4444" : subTextColor }}
              >
                {likesCount}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            className="flex-row items-center py-1"
          >
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={22}
              color={isSaved ? "#5E17EB" : iconColor}
            />
            {savesCount > 0 && (
              <Text
                className="text-xs ml-1.5 font-medium"
                style={{ color: isSaved ? "#5E17EB" : subTextColor }}
              >
                {savesCount}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSharePress}
            className="flex-row items-center py-1"
          >
            <Ionicons
              name="paper-plane-outline"
              size={22}
              color={iconColor}
              style={{ transform: [{ rotate: "-10deg" }], marginTop: -2 }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default PostItem;
