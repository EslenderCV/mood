import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useGlobalContext } from "@/context/GlobalProvider";

// 1. Tipos para TypeScript
interface PostParams {
  id: string;
  user: string;
  username: string;
  time: string;
  avatar: string;
  content: string;
  songTitle: string;
  songArtist: string;
  songCover: string;
  likes: string;
  comments: string;
  shares: string;
}

// 2. Mock Data con FOTOS REALES
const COMMENTS = [
  {
    id: "1",
    user: "Drake",
    username: "@champagnepapi",
    text: "This flow is undeniable. Respect! 🦉",
    time: "10m",
    avatar: "https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9",
    likes: 240,
  },
  {
    id: "2",
    user: "Rosalía",
    username: "@rosalia",
    text: "La producción tiene una vibra increíble ✨",
    time: "25m",
    avatar: "https://i.scdn.co/image/ab6761610000e5eb009265f02c6b41295fc37172",
    likes: 156,
  },
  {
    id: "3",
    user: "J Balvin",
    username: "@jbalvin",
    text: "Latino Gang subiendo el nivel siempre ⚡",
    time: "1h",
    avatar: "https://i.scdn.co/image/ab67616d0000b273548f7ec527588e994965810b",
    likes: 89,
  },
  {
    id: "4",
    user: "Travis Scott",
    username: "@cactusjack",
    text: "Straight up! 🔥",
    time: "2h",
    avatar: "https://i.scdn.co/image/ab67616d0000b273881d8d8378cd01099babcd44",
    likes: 402,
  },
];

const PostDetail = () => {
  const router = useRouter();
  const { user } = useGlobalContext();
  const params = useLocalSearchParams<
    Record<string, string>
  >() as unknown as PostParams;
  const [replyText, setReplyText] = useState("");

  const post = {
    ...params,
    song: {
      title: params.songTitle,
      artist: params.songArtist,
      cover: params.songCover,
    },
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-zinc-900">
        <TouchableOpacity onPress={() => router.back()} className="mr-6 p-1">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Hilo</Text>
      </View>

      <FlatList
        data={COMMENTS}
        keyExtractor={(item) => item.id}
        // POST PRINCIPAL
        ListHeaderComponent={() => (
          <View className="border-b border-zinc-900 px-4 pt-4 pb-2 mb-2">
            <View className="flex-row items-center mb-3">
              <Image
                source={{ uri: post.avatar }}
                className="w-12 h-12 rounded-full bg-zinc-800"
              />
              <View className="ml-3">
                <Text className="text-white font-bold text-lg">
                  {post.user}
                </Text>
                <Text className="text-zinc-500">@{post.username}</Text>
              </View>
              <TouchableOpacity className="ml-auto p-2">
                <Ionicons
                  name="ellipsis-horizontal"
                  size={20}
                  color="#71717A"
                />
              </TouchableOpacity>
            </View>

            <Text className="text-white text-[17px] leading-6 mb-4">
              {post.content}
            </Text>

            <View className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800/60 flex-row items-center mb-4">
              <Image
                source={{ uri: post.song.cover }}
                className="w-14 h-14 rounded-xl bg-black"
              />
              <View className="ml-3 flex-1">
                <Text
                  className="text-white font-bold text-base"
                  numberOfLines={1}
                >
                  {post.song.title}
                </Text>
                <Text className="text-zinc-500 text-sm" numberOfLines={1}>
                  {post.song.artist}
                </Text>
              </View>
              <TouchableOpacity className="bg-[#5E17EB] w-10 h-10 rounded-full items-center justify-center">
                <Ionicons
                  name="play"
                  size={20}
                  color="white"
                  style={{ marginLeft: 2 }}
                />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center py-4 border-b border-zinc-900/50">
              <Text className="text-zinc-500 text-sm">
                {post.time} ago • Mood App for iPhone
              </Text>
            </View>

            <View className="flex-row items-center py-4 border-b border-zinc-900/50 gap-4">
              <Text className="text-white font-bold text-sm">
                {post.shares}{" "}
                <Text className="text-zinc-500 font-normal">Reposts</Text>
              </Text>
              <Text className="text-white font-bold text-sm">
                {post.likes}{" "}
                <Text className="text-zinc-500 font-normal">Likes</Text>
              </Text>
            </View>

            <View className="flex-row justify-around py-3 mt-1">
              <TouchableOpacity>
                <Ionicons name="chatbubble-outline" size={24} color="#71717A" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Ionicons name="repeat-outline" size={24} color="#71717A" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Ionicons name="heart-outline" size={24} color="#71717A" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Ionicons
                  name="share-social-outline"
                  size={24}
                  color="#71717A"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
        // COMENTARIOS
        renderItem={({ item }) => (
          <View className="flex-row px-4 py-3 border-b border-zinc-900/40">
            <Image
              source={{ uri: item.avatar }}
              className="w-10 h-10 rounded-full bg-zinc-800 mr-3"
            />
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1">
                  <Text className="text-white font-bold text-[15px]">
                    {item.user}
                  </Text>
                  <Text className="text-zinc-500 text-xs">
                    {item.username} • {item.time}
                  </Text>
                </View>
                <TouchableOpacity>
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={16}
                    color="#52525B"
                  />
                </TouchableOpacity>
              </View>

              <Text className="text-zinc-200 text-[15px] mt-1 leading-5">
                {item.text}
              </Text>

              <View className="flex-row items-center justify-between mt-3 pr-8">
                <TouchableOpacity className="flex-row items-center gap-1">
                  <Ionicons
                    name="chatbubble-outline"
                    size={16}
                    color="#71717A"
                  />
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center gap-1">
                  <Ionicons name="repeat-outline" size={18} color="#71717A" />
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center gap-1">
                  <Ionicons name="heart-outline" size={16} color="#71717A" />
                  <Text className="text-zinc-500 text-xs">{item.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Ionicons name="share-outline" size={16} color="#71717A" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      {/* INPUT CON FOTO REAL */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View className="px-4 py-3 border-t border-zinc-900 flex-row items-end bg-black">
          <Image
            source={
              user?.pfp ? { uri: user.pfp } : require("@/assets/noPfp.jpg")
            }
            className="w-9 h-9 rounded-full bg-zinc-800 mr-3 mb-1"
          />
          <View className="flex-1 bg-zinc-900 rounded-[20px] px-4 py-2 min-h-[40px] border border-zinc-800 flex-row items-center">
            <TextInput
              placeholder="Post your reply..."
              placeholderTextColor="#71717A"
              value={replyText}
              onChangeText={setReplyText}
              multiline
              className="flex-1 text-white text-[15px] max-h-24 pt-0 pb-0"
              style={{ textAlignVertical: "center" }}
            />
          </View>
          <TouchableOpacity
            disabled={!replyText}
            className={`ml-3 mb-1 p-2 rounded-full ${
              replyText ? "bg-[#5E17EB]" : "bg-zinc-800/50"
            }`}
          >
            <Ionicons
              name="send"
              size={18}
              color={replyText ? "white" : "#52525B"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PostDetail;
