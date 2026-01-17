import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";
import { getPostById, getPlaylistById } from "@/lib/appwrite";

const isValidId = (id: string | null | undefined) => {
  if (!id) return false;
  if (id.length > 36) return false;
  const validChars = /^[a-zA-Z0-9_.-]+$/;
  return validChars.test(id);
};

// --- BURBUJA DE POST COMPARTIDO ---
export const PostPreviewBubble = ({
  postId,
  onLongPress,
}: {
  postId: string;
  onLongPress?: () => void;
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();

  const cardBg = isDark ? "#262626" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A8A8A8" : "#737373";
  const borderColor = isDark ? "#363636" : "#E5E5E5";
  const footerBg = isDark ? "rgba(255,255,255,0.03)" : "#FAFAFA";

  const [post, setPost] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!isValidId(postId)) {
      setError(true);
      return;
    }
    getPostById(postId)
      .then((data) => {
        if (isMounted) {
          if (data) setPost(data);
          else setError(true);
        }
      })
      .catch(() => {
        if (isMounted) setError(true);
      });
    return () => {
      isMounted = false;
    };
  }, [postId]);

  if (error) return null;
  if (!post)
    return (
      <View
        className="w-48 h-20 rounded-xl justify-center items-center mb-1 border"
        style={{ backgroundColor: cardBg, borderColor: borderColor }}
      >
        <ActivityIndicator color="#5E17EB" size="small" />
      </View>
    );

  const song = post.songData ? JSON.parse(post.songData) : null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/post/${postId}` as any)}
      onLongPress={onLongPress}
      delayLongPress={300}
      className="rounded-[22px] overflow-hidden mb-1 border shadow-sm"
      style={{ backgroundColor: cardBg, borderColor: borderColor, width: 240 }}
    >
      <View className="w-full h-32 bg-zinc-800 relative">
        <Image
          source={
            song?.cover
              ? { uri: song.cover }
              : require("@/assets/images/icon.png")
          }
          className="w-full h-full"
          resizeMode="cover"
        />
        <View className="absolute inset-0 bg-black/20 justify-center items-center">
          <Ionicons name="play-circle" size={40} color="white" />
        </View>
      </View>
      <View className="p-3" style={{ backgroundColor: footerBg }}>
        <Text
          className="font-bold text-sm leading-tight"
          numberOfLines={1}
          style={{ color: textColor }}
        >
          {song?.title || t("chat.song")}
        </Text>
        <Text
          className="text-xs mt-0.5 font-medium"
          numberOfLines={1}
          style={{ color: subTextColor }}
        >
          {song?.artist || t("chat.artist")}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// --- BURBUJA DE PLAYLIST COMPARTIDA ---
export const ChatPlaylistCard = ({
  playlistId,
  isMyMessage,
}: {
  playlistId: string;
  isMyMessage: boolean;
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const cardBg = isDark ? "#262626" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A8A8A8" : "#737373";
  const borderColor = isDark ? "#363636" : "#E5E5E5";

  useEffect(() => {
    let isMounted = true;
    if (!isValidId(playlistId)) {
      setLoading(false);
      setError(true);
      return;
    }
    getPlaylistById(playlistId)
      .then((data) => {
        if (isMounted) {
          if (data) setPlaylist(data);
          else setError(true);
        }
      })
      .catch(() => {
        if (isMounted) setError(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [playlistId]);

  if (loading)
    return (
      <View
        className="p-3 rounded-xl justify-center items-center mb-1"
        style={{
          backgroundColor: isMyMessage
            ? "rgba(255,255,255,0.2)"
            : "rgba(0,0,0,0.1)",
          width: 200,
          height: 60,
        }}
      >
        <ActivityIndicator
          size="small"
          color={isMyMessage ? "white" : "#5E17EB"}
        />
      </View>
    );

  if (error || !playlist)
    return (
      <View
        className="p-3 rounded-xl mb-1 border justify-center"
        style={{
          backgroundColor: isDark ? "#3f1a1a" : "#fee2e2",
          borderColor: "#fca5a5",
          width: 200,
        }}
      >
        <Text className="text-xs text-red-500 font-bold">
          Playlist no disponible
        </Text>
      </View>
    );

  const platformIcon =
    playlist.platform === "apple"
      ? "logo-apple"
      : playlist.platform === "spotify"
        ? "logo-spotify"
        : "musical-notes";
  const platformColor =
    playlist.platform === "apple"
      ? "#FA243C"
      : playlist.platform === "spotify"
        ? "#1DB954"
        : subTextColor;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/playlist/${playlist.$id}` as any)}
      className="flex-row items-center p-2 rounded-[18px] mb-1 border overflow-hidden"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
        width: 240,
        height: 70,
      }}
    >
      <View className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden relative border border-zinc-700">
        {playlist.cover && !playlist.cover.includes("initials") ? (
          <Image
            source={{ uri: playlist.cover }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center bg-zinc-800">
            <Ionicons name="musical-notes" size={20} color="#5E17EB" />
          </View>
        )}
      </View>
      <View className="ml-3 flex-1 justify-center">
        <Text
          numberOfLines={1}
          className="font-bold text-[14px]"
          style={{ color: textColor }}
        >
          {playlist.name}
        </Text>
        <View className="flex-row items-center mt-1">
          <Ionicons
            name={platformIcon as any}
            size={12}
            color={platformColor}
          />
          <Text className="text-[11px] ml-1.5" style={{ color: subTextColor }}>
            {playlist.songs?.length || 0} canciones
          </Text>
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={subTextColor}
        style={{ opacity: 0.5 }}
      />
    </TouchableOpacity>
  );
};
