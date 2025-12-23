import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";

import {
  getPostComments,
  createComment as apiCreateComment,
  getCurrentUser,
  toggleLikePost,
  getPostById,
} from "@/lib/appwrite";

import ShareModal from "@/components/ShareModal";

// Helper para parsear la canción
const parseSongData = (songDataString: string) => {
  try {
    return songDataString ? JSON.parse(songDataString) : null;
  } catch (e) {
    return null;
  }
};

const PostDetail = () => {
  const params = useLocalSearchParams();
  // Aseguramos que postId sea string
  const postId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [postData, setPostData] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [postLikedBy, setPostLikedBy] = useState<string[]>([]);
  const [isShareVisible, setShareVisible] = useState(false);

  // Audio
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const player = useAudioPlayer(currentPreview);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [postId]);

  const loadAllData = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);

      // 1. Cargar Post
      // ⚠️ CORRECCIÓN CLAVE: Usamos 'any' para que acepte tanto el Documento de Appwrite como nuestro objeto manual
      let post: any = await getPostById(postId);

      // Fallback si venimos de la home y falla la carga (o para carga instantánea desde params)
      if (!post && params.content) {
        post = {
          $id: postId,
          comment: params.content as string, // Cast as string para evitar error TS
          postedBy: {
            name: params.name as string,
            username: params.username as string,
            pfp: params.avatar as string,
          },
          songData: JSON.stringify({
            title: params.songTitle as string,
            artist: params.songArtist as string,
            cover: params.songCover as string,
            preview: params.preview as string,
          }),
          $createdAt: params.createdAt as string,
          likedBy: params.likedBy ? JSON.parse(params.likedBy as string) : [],
        };
      }

      if (post) {
        setPostData(post);
        setPostLikedBy(post.likedBy || []);
        const song = parseSongData(post.songData);
        if (song && song.preview) setCurrentPreview(song.preview);
      }

      // 2. Cargar Comentarios
      if (postId) {
        const result = await getPostComments(postId);
        setComments(result);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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

  const handleTogglePostLike = async () => {
    if (!currentUser || !postData) return;
    const userId = currentUser.$id;
    const isLiked = postLikedBy.includes(userId);

    // Actualización optimista (instantánea)
    let newLikes = isLiked
      ? postLikedBy.filter((id) => id !== userId)
      : [...postLikedBy, userId];
    setPostLikedBy(newLikes);

    try {
      await toggleLikePost(postData.$id, userId, postLikedBy);
    } catch (error) {
      setPostLikedBy(postLikedBy); // Revertir si falla
    }
  };

  const handleSendComment = async () => {
    if (!newCommentText.trim() || !currentUser || !postData) return;

    // Crear comentario temporal para mostrarlo ya
    const tempComment = {
      $id: "temp-" + Date.now(),
      content: newCommentText,
      username: currentUser.username,
      avatar: currentUser.pfp,
      createdAt: new Date().toISOString(),
    };

    setComments([tempComment, ...comments]);
    setNewCommentText("");

    try {
      await apiCreateComment(postData.$id, {
        content: tempComment.content,
        userId: currentUser.$id,
        username: currentUser.username,
        avatar: currentUser.pfp,
      });
    } catch (e) {
      // Si falla, lo quitamos
      setComments(comments.filter((c) => c.$id !== tempComment.$id));
      Alert.alert("Error", "No se pudo enviar el comentario.");
    }
  };

  if (loading)
    return (
      <SafeAreaView className="flex-1 bg-black justify-center">
        <ActivityIndicator color="#5E17EB" />
      </SafeAreaView>
    );
  if (!postData) return null;

  const songInfo = parseSongData(postData.songData);
  const creator = postData.postedBy || {};
  const isPostLiked = currentUser && postLikedBy.includes(currentUser?.$id);

  const renderHeader = () => (
    <View className="px-4 pt-2 pb-4 border-b border-zinc-900 bg-black">
      {/* Info Usuario */}
      <View className="flex-row items-center mb-4 mt-2">
        <Image
          source={{
            uri:
              creator.pfp ||
              params.avatar ||
              "https://cloud.appwrite.io/v1/avatars/initials?name=User",
          }}
          className="w-12 h-12 rounded-full bg-zinc-800"
        />
        <View className="ml-3">
          <Text className="text-white font-bold text-[16px]">
            {creator.name}
          </Text>
          <Text className="text-zinc-500 text-[14px]">@{creator.username}</Text>
        </View>
      </View>

      {/* Texto del Post */}
      <Text className="text-white text-[18px] leading-7 mb-4 font-normal">
        {postData.comment}
      </Text>

      {/* Tarjeta de Canción */}
      {songInfo && (
        <View className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 mb-4 flex-row items-center">
          <Image
            source={{ uri: songInfo.cover }}
            className="w-14 h-14 rounded-lg bg-zinc-800"
          />
          <View className="flex-1 ml-3 mr-2 justify-center">
            <Text
              className="text-white font-bold text-[15px] mb-0.5"
              numberOfLines={1}
            >
              {songInfo.title}
            </Text>
            <Text className="text-zinc-400 text-[13px]" numberOfLines={1}>
              {songInfo.artist}
            </Text>
          </View>
          <TouchableOpacity
            onPress={togglePlayback}
            className="w-10 h-10 rounded-full bg-[#5E17EB] items-center justify-center"
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={20}
              color="white"
              style={isPlaying ? {} : { marginLeft: 2 }}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Botones de Acción */}
      <View className="flex-row justify-around items-center pt-1 mt-2 border-t border-zinc-900/50">
        <TouchableOpacity
          onPress={handleTogglePostLike}
          className="p-2 flex-row items-center gap-2"
        >
          <Ionicons
            name={isPostLiked ? "heart" : "heart-outline"}
            size={26}
            color={isPostLiked ? "#EF4444" : "#A1A1AA"}
          />
          {postLikedBy.length > 0 && (
            <Text className={isPostLiked ? "text-[#EF4444]" : "text-zinc-500"}>
              {postLikedBy.length}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity className="p-2 flex-row items-center gap-2">
          <Ionicons name="chatbubble-outline" size={26} color="#A1A1AA" />
          {comments.length > 0 && (
            <Text className="text-zinc-500">{comments.length}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShareVisible(true)} className="p-2">
          <Ionicons name="share-social-outline" size={26} color="#A1A1AA" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Barra Superior */}
      <View className="flex-row items-center px-2 h-[50px] border-b border-zinc-900 bg-black z-10">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-[18px] ml-4">Hilo</Text>
      </View>

      {/* Lista de Comentarios */}
      <FlatList
        data={comments}
        keyExtractor={(item) => item.$id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <View className="px-4 py-4 border-b border-zinc-900 flex-row bg-black">
            <Image
              source={{
                uri:
                  item.avatar ||
                  "https://cloud.appwrite.io/v1/avatars/initials?name=User",
              }}
              className="w-9 h-9 rounded-full bg-zinc-800 mr-3 mt-1"
            />
            <View className="flex-1">
              <View className="flex-row justify-between mb-1">
                <Text className="text-white font-bold text-[14px]">
                  {item.username}
                </Text>
                <Text className="text-zinc-600 text-xs">
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString()
                    : ""}
                </Text>
              </View>
              <Text className="text-zinc-300 text-[15px]">{item.content}</Text>
            </View>
          </View>
        )}
        // Espacio abajo para que el input no tape el último comentario
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* Input de Comentario */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        className="absolute bottom-0 w-full bg-black border-t border-zinc-900"
      >
        <View className="px-4 py-3 flex-row items-end pb-5">
          <Image
            source={{
              uri:
                currentUser?.pfp ||
                "https://cloud.appwrite.io/v1/avatars/initials?name=Me",
            }}
            className="w-8 h-8 rounded-full bg-zinc-800 mr-3 mb-2"
          />
          <View className="flex-1 bg-zinc-900 rounded-[22px] px-4 py-2 border border-zinc-800 flex-row items-center min-h-[44px]">
            <TextInput
              placeholder="Post your reply..."
              placeholderTextColor="#71717A"
              className="flex-1 text-white text-[16px] pt-1 pb-1 max-h-24"
              multiline
              value={newCommentText}
              onChangeText={setNewCommentText}
            />
          </View>
          {newCommentText.trim().length > 0 && (
            <TouchableOpacity onPress={handleSendComment} className="ml-3 mb-1">
              <Ionicons name="arrow-up-circle" size={38} color="#5E17EB" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Modal de Compartir */}
      {postData && (
        <ShareModal
          isVisible={isShareVisible}
          onClose={() => setShareVisible(false)}
          postId={postData.$id}
        />
      )}
    </SafeAreaView>
  );
};

export default PostDetail;
