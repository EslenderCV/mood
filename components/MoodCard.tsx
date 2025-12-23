import { View, Text, Image, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { getCurrentUser, toggleLikePost } from "@/lib/appwrite";
import { router } from "expo-router";

// TIPOS: Agregamos onSharePress
type MoodCardProps = {
  item: any;
  currentUser: any;
  onSharePress: (postId: string) => void; // <--- NUEVO PROP
};

const MoodCard = ({ item, currentUser, onSharePress }: MoodCardProps) => {
  const [likes, setLikes] = useState<string[]>(item.likedBy || []);

  // Parsear datos de la canción
  let songData = null;
  try {
    songData = JSON.parse(item.songData);
  } catch (e) {}

  const player = useAudioPlayer(songData?.preview);
  const [isPlaying, setIsPlaying] = useState(false);

  const isLiked = currentUser && likes.includes(currentUser.$id);

  const handleLike = async () => {
    if (!currentUser) return;
    const userId = currentUser.$id;
    let newLikes = isLiked
      ? likes.filter((id) => id !== userId)
      : [...likes, userId];
    setLikes(newLikes);
    try {
      await toggleLikePost(item.$id, userId, likes);
    } catch (e) {
      setLikes(likes);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  const goToDetail = () => {
    router.push({
      pathname: "/post/[id]",
      params: {
        id: item.$id,
        // Pasamos datos para carga instantánea
        content: item.comment,
        name: item.postedBy?.name,
        username: item.postedBy?.username,
        avatar: item.postedBy?.pfp,
        songTitle: songData?.title,
        songArtist: songData?.artist,
        songCover: songData?.cover,
        preview: songData?.preview,
        createdAt: item.$createdAt,
        likedBy: JSON.stringify(likes),
      },
    });
  };

  return (
    <View className="mb-4 border-b border-zinc-900 pb-4">
      {/* Header Card */}
      <View className="flex-row items-start">
        <Image
          source={{ uri: item.postedBy?.pfp }}
          className="w-10 h-10 rounded-full bg-zinc-800 mr-3"
        />
        <View className="flex-1">
          <View className="flex-row justify-between">
            <View>
              <Text className="text-white font-bold text-[15px]">
                {item.postedBy?.name}
              </Text>
              <Text className="text-zinc-500 text-xs">
                @{item.postedBy?.username}
              </Text>
            </View>
            <Text className="text-zinc-600 text-xs">
              {new Date(item.$createdAt).toLocaleDateString()}
            </Text>
          </View>

          {/* Contenido Clickable */}
          <TouchableOpacity onPress={goToDetail} activeOpacity={0.8}>
            <Text className="text-zinc-200 text-[15px] mt-1 mb-2 leading-5">
              {item.comment}
            </Text>
          </TouchableOpacity>

          {/* Tarjeta de Música */}
          {songData && (
            <View className="bg-zinc-900 rounded-xl p-2 flex-row items-center border border-zinc-800/50 mt-1">
              <Image
                source={{ uri: songData.cover }}
                className="w-10 h-10 rounded-lg bg-zinc-800"
              />
              <View className="flex-1 ml-3 mr-2">
                <Text
                  className="text-white font-bold text-xs"
                  numberOfLines={1}
                >
                  {songData.title}
                </Text>
                <Text className="text-zinc-500 text-[10px]" numberOfLines={1}>
                  {songData.artist}
                </Text>
              </View>
              <TouchableOpacity
                onPress={togglePlayback}
                className="w-8 h-8 rounded-full bg-[#5E17EB] items-center justify-center"
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={14}
                  color="white"
                  style={isPlaying ? {} : { marginLeft: 1 }}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Acciones */}
          <View className="flex-row justify-between mt-3 pr-4">
            <TouchableOpacity
              onPress={handleLike}
              className="flex-row items-center gap-1"
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={20}
                color={isLiked ? "#EF4444" : "#71717A"}
              />
              {likes.length > 0 && (
                <Text
                  className={`text-xs ${
                    isLiked ? "text-red-500" : "text-zinc-500"
                  }`}
                >
                  {likes.length}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={goToDetail}
              className="flex-row items-center gap-1"
            >
              <Ionicons name="chatbubble-outline" size={20} color="#71717A" />
            </TouchableOpacity>

            {/* BOTÓN COMPARTIR CONECTADO */}
            <TouchableOpacity
              onPress={() => onSharePress(item.$id)}
              className="flex-row items-center gap-1"
            >
              <Ionicons name="share-social-outline" size={20} color="#71717A" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

export default MoodCard;
