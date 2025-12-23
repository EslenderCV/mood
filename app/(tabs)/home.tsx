import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAudioPlayer } from "expo-audio";

import TopBar from "@/components/TopBar";
import { getAllPosts, toggleLikePost, getCurrentUser } from "@/lib/appwrite";
import ShareModal from "@/components/ShareModal"; // <--- IMPORTAR MODAL

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

const Home = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Estados Share
  const [isShareVisible, setShareVisible] = useState(false);
  const [postToShare, setPostToShare] = useState<string>("");

  const [currentSongUrl, setCurrentSongUrl] = useState<string | null>(null);
  const [playingPostId, setPlayingPostId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useAudioPlayer(currentSongUrl);

  useEffect(() => {
    if (currentSongUrl && player) {
      player.play();
      setIsPlaying(true);
    }
  }, [currentSongUrl, player]);

  const handlePlayPreview = (previewUrl: string, postId: string) => {
    if (playingPostId === postId) {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
      return;
    }
    setIsPlaying(false);
    setPlayingPostId(postId);
    setCurrentSongUrl(previewUrl);
  };

  const fetchData = async () => {
    try {
      const user = await getCurrentUser();
      if (user) setCurrentUserId(user.$id);
      const result = await getAllPosts();
      setPosts(result);
    } catch (error) {
      console.log("Error:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    if (player && isPlaying) {
      player.pause();
      setIsPlaying(false);
    }
    setPlayingPostId(null);
    setCurrentSongUrl(null);
    await fetchData();
  };

  const handleLike = async (post: any) => {
    if (!currentUserId) return;
    const originalLikes = post.likedBy || [];
    const isLiked = originalLikes.includes(currentUserId);
    let newLikes = isLiked
      ? originalLikes.filter((id: string) => id !== currentUserId)
      : [...originalLikes, currentUserId];

    const updatedPosts = posts.map((p) =>
      p.$id === post.$id ? { ...p, likedBy: newLikes } : p
    );
    setPosts(updatedPosts);

    try {
      await toggleLikePost(post.$id, currentUserId, originalLikes);
    } catch (error) {
      setPosts(posts);
    }
  };

  // --- FUNCIÓN PARA ABRIR MODAL ---
  const handleOpenShare = (postId: string) => {
    setPostToShare(postId);
    setShareVisible(true);
  };

  const renderPost = ({ item }: { item: any }) => {
    const songData = parseSongData(item.songData);
    const creator = item.postedBy || {};
    if (!songData) return null;

    const isActive = playingPostId === item.$id;
    const showPauseIcon = isActive && isPlaying;
    const likedBy = item.likedBy || [];
    const isLiked = currentUserId ? likedBy.includes(currentUserId) : false;

    return (
      <View className="mb-6 border-b border-zinc-900 pb-4 px-4">
        <View className="flex-row justify-between items-start mb-2">
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/user/[id]",
                params: {
                  id: creator.$id || creator.accId,
                  username: creator.username,
                  avatar: creator.pfp,
                  name: creator.name,
                },
              })
            }
            className="flex-row"
          >
            <Image
              source={{ uri: creator.pfp }}
              className="w-10 h-10 rounded-full bg-zinc-800"
            />
            <View className="ml-3">
              <View className="flex-row items-center">
                <Text className="text-white font-bold text-[15px] mr-1">
                  {creator.name}
                </Text>
                <Text className="text-zinc-500 text-xs">
                  @{creator.username} •{" "}
                  {new Date(item.$createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text className="text-zinc-300 text-[15px] mt-1 leading-5 pr-2">
                {item.comment}
              </Text>
            </View>
          </TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={20} color="#71717A" />
        </View>

        <View className="ml-[52px] mt-2 bg-zinc-900 rounded-xl p-3 flex-row items-center border border-zinc-800/50">
          <Image
            source={{ uri: songData.cover }}
            className="w-12 h-12 rounded-lg bg-zinc-800"
          />
          <View className="flex-1 ml-3">
            <Text className="text-white font-bold text-sm" numberOfLines={1}>
              {songData.title}
            </Text>
            <Text className="text-zinc-400 text-xs" numberOfLines={1}>
              {songData.artist}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handlePlayPreview(songData.preview, item.$id)}
            className={`w-8 h-8 rounded-full items-center justify-center border ${
              showPauseIcon
                ? "bg-[#5E17EB] border-[#5E17EB]"
                : "bg-[#5E17EB]/20 border-[#5E17EB]/50"
            }`}
          >
            <Ionicons
              name={showPauseIcon ? "pause" : "play"}
              size={16}
              color={showPauseIcon ? "white" : "#5E17EB"}
              style={showPauseIcon ? {} : { marginLeft: 2 }}
            />
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between items-center mt-4 ml-[52px] pr-4">
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/post/[id]",
                params: {
                  id: item.$id,
                  content: item.comment,
                  username: creator.username,
                  name: creator.name,
                  avatar: creator.pfp,
                  createdAt: item.$createdAt,
                  songTitle: songData.title,
                  songArtist: songData.artist,
                  songCover: songData.cover,
                  preview: songData.preview,
                  likedBy: JSON.stringify(likedBy),
                },
              })
            }
            className="flex-row items-center gap-1"
          >
            <Ionicons name="chatbubble-outline" size={18} color="#71717A" />
            <Text className="text-zinc-500 text-xs">Comentar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleLike(item)}
            className="flex-row items-center gap-1"
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={20}
              color={isLiked ? "#EF4444" : "#71717A"}
            />
            <Text
              className={`text-xs ${
                isLiked ? "text-red-500" : "text-zinc-500"
              }`}
            >
              {likedBy.length > 0 ? likedBy.length : ""}
            </Text>
          </TouchableOpacity>

          {/* ✅ BOTÓN DE COMPARTIR CONECTADO AL MODAL */}
          <TouchableOpacity onPress={() => handleOpenShare(item.$id)}>
            <Ionicons name="share-social-outline" size={20} color="#71717A" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      <StatusBar style="light" />
      <TopBar />
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#5E17EB" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.$id}
          renderItem={renderPost}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#5E17EB"
            />
          }
          ListEmptyComponent={() => (
            <View className="flex-1 justify-center items-center mt-20">
              <Text className="text-zinc-500 text-lg">No hay posts aún</Text>
            </View>
          )}
        />
      )}

      {/* ✅ RENDERIZAR EL MODAL */}
      <ShareModal
        isVisible={isShareVisible}
        onClose={() => setShareVisible(false)}
        postId={postToShare}
      />
    </SafeAreaView>
  );
};

export default Home;
