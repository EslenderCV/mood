import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Image } from "expo-image"; // 🔥 Premium Image
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import { tStatic, useLanguage } from "@/context/LanguageContext";
import { getPostById, getPlaylistById } from "@/lib/appwrite";
import * as Haptics from "expo-haptics";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!isValidId(postId)) {
      setError(true);
      setLoading(false);
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
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [postId]);

  if (loading)
    return (
      <View
        className="w-48 h-20 rounded-xl justify-center items-center mb-1 border"
        style={{ backgroundColor: cardBg, borderColor: borderColor }}
      >
        <ActivityIndicator color="#5E17EB" size="small" />
      </View>
    );

  if (error || !post)
    return (
      <View
        className="px-3 py-2 rounded-xl mb-1 border justify-center items-center"
        style={{
          backgroundColor: isDark ? "#3f1a1a" : "#fee2e2",
          borderColor: "#fca5a5",
          width: 200,
        }}
      >
        <Ionicons name="alert-circle" size={16} color="#EF4444" />
        <Text className="text-xs text-red-500 font-bold ml-1">{tStatic("ui.s_0cef2828")}</Text>
      </View>
    );

  const song = post.songData ? JSON.parse(post.songData) : null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/post/${postId}` as any);
      }}
      onLongPress={onLongPress}
      delayLongPress={300}
      className="rounded-[18px] overflow-hidden mb-1 border shadow-sm"
      style={{ backgroundColor: cardBg, borderColor: borderColor, width: 220 }}
    >
      <View className="w-full h-28 bg-zinc-800 relative">
        <Image
          source={
            song?.cover
              ? { uri: song.cover }
              : require("@/assets/images/icon.png")
          }
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={300}
        />
        <View className="absolute inset-0 bg-black/20 justify-center items-center">
          <Ionicons name="play-circle" size={36} color="white" />
        </View>
      </View>
      <View className="p-2.5" style={{ backgroundColor: footerBg }}>
        <Text
          className="font-bold text-xs leading-tight"
          numberOfLines={1}
          style={{ color: textColor }}
        >
          {song?.title || t("chat.song")}
        </Text>
        <Text
          className="text-[10px] mt-0.5 font-medium"
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
        className="p-2 rounded-xl justify-center items-center mb-1"
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
        className="p-2 rounded-xl mb-1 border justify-center items-center flex-row"
        style={{
          backgroundColor: isDark ? "#3f1a1a" : "#fee2e2",
          borderColor: "#fca5a5",
          width: 200,
        }}
      >
        <Ionicons name="alert-circle" size={16} color="#EF4444" />
        <Text className="text-xs text-red-500 font-bold ml-1">{tStatic("ui.s_361fee5a")}</Text>
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
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/playlist/${playlist.$id}` as any);
      }}
      className="flex-row items-center p-2 rounded-[16px] mb-1 border overflow-hidden"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
        width: 220,
        height: 64,
      }}
    >
      <View className="w-10 h-10 rounded-lg bg-zinc-800 overflow-hidden relative border border-zinc-700">
        {playlist.cover && !playlist.cover.includes("initials") ? (
          <Image
            source={{ uri: playlist.cover }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View className="w-full h-full items-center justify-center bg-zinc-800">
            <Ionicons name="musical-notes" size={18} color="#5E17EB" />
          </View>
        )}
      </View>
      <View className="ml-2.5 flex-1 justify-center">
        <Text
          numberOfLines={1}
          className="font-bold text-[13px]"
          style={{ color: textColor }}
        >
          {playlist.name}
        </Text>
        <View className="flex-row items-center mt-0.5">
          <Ionicons
            name={platformIcon as any}
            size={10}
            color={platformColor}
          />
          <Text className="text-[10px] ml-1" style={{ color: subTextColor }}>
            {playlist.songs?.length || 0} {tStatic("ui.s_aff4803f")}
          </Text>
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={subTextColor}
        style={{ opacity: 0.5 }}
      />
    </TouchableOpacity>
  );
};
