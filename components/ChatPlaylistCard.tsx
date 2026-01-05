import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getPlaylistById } from "@/lib/appwrite";

interface ChatPlaylistCardProps {
  playlistId: string;
  isMyMessage: boolean;
}

const ChatPlaylistCard = ({
  playlistId,
  isMyMessage,
}: ChatPlaylistCardProps) => {
  const router = useRouter();
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlaylist = async () => {
      const data = await getPlaylistById(playlistId);
      setPlaylist(data);
      setLoading(false);
    };
    loadPlaylist();
  }, [playlistId]);

  if (loading)
    return (
      <ActivityIndicator
        size="small"
        color={isMyMessage ? "white" : "#5E17EB"}
      />
    );
  if (!playlist)
    return <Text className="text-xs text-red-400">Playlist no disponible</Text>;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/playlist/${playlist.$id}` as any)}
      className="flex-row items-center p-2 rounded-xl mt-1 overflow-hidden"
      style={{
        backgroundColor: isMyMessage
          ? "rgba(255,255,255,0.2)"
          : "rgba(0,0,0,0.05)",
        maxWidth: 240,
      }}
    >
      <View className="relative">
        <Image
          source={{ uri: playlist.cover }}
          className="w-14 h-14 rounded-lg bg-zinc-800"
          resizeMode="cover"
        />
        <View className="absolute inset-0 items-center justify-center bg-black/20 rounded-lg">
          <Ionicons name="play-circle" size={20} color="white" />
        </View>
      </View>
      <View className="ml-3 flex-1">
        <Text
          numberOfLines={1}
          className={`font-bold text-sm ${
            isMyMessage ? "text-white" : "text-black dark:text-white"
          }`}
        >
          {playlist.name}
        </Text>
        <View className="flex-row items-center mt-0.5">
          <FontAwesome5
            name={
              playlist.platform === "spotify"
                ? "logo-spotify"
                : playlist.platform === "apple"
                ? "logo-apple"
                : "musical-notes"
            }
            size={10}
            color={isMyMessage ? "rgba(255,255,255,0.8)" : "#A1A1AA"}
          />
          <Text
            className={`text-[10px] ml-1 ${
              isMyMessage ? "text-zinc-200" : "text-zinc-500"
            }`}
          >
            Playlist • {playlist.songs?.length || 0} canciones
          </Text>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={16}
        color={isMyMessage ? "white" : "#A1A1AA"}
      />
    </TouchableOpacity>
  );
};

export default ChatPlaylistCard;
