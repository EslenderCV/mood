import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  LogBox,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useGlobalContext } from "@/context/GlobalProvider";
import { Audio } from "expo-av";

// Ignoramos warnings de expo-av
LogBox.ignoreLogs(["Expo AV has been deprecated"]);

// --- 1. DATOS DE AUDIO (Pixabay - Estables) ---
const MUSIC_DATA = [
  {
    cover: "https://i.scdn.co/image/ab67616d0000b273d9985092cd88bffd97653b58",
    audio: "https://cdn.pixabay.com/audio/2022/10/18/audio_31c2730e64.mp3",
    track: "Money Trees",
    artist: "Kendrick Lamar",
  },
  {
    cover: "https://i.scdn.co/image/ab67616d0000b27371d62ea7ea8a5be92d3c1f62",
    audio: "https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3",
    track: "LUNCH",
    artist: "Billie Eilish",
  },
  {
    cover: "https://i.scdn.co/image/ab67616d0000b273881d8d8378cd01099babcd44",
    audio: "https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3",
    track: "FE!N",
    artist: "Travis Scott",
  },
  {
    cover: "https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96",
    audio: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
    track: "Normal",
    artist: "Feid",
  },
  {
    cover: "https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1",
    audio: "https://cdn.pixabay.com/audio/2022/03/24/audio_07823d067c.mp3",
    track: "Take Care",
    artist: "Drake",
  },
];

// Generamos los posts
const FULL_POSTS = MUSIC_DATA.map((music, i) => ({
  id: `mood-${i}`,
  user: "Eslender Cruz",
  avatar:
    "https://ui-avatars.com/api/?name=Eslender+Cruz&background=random&bold=true",
  image: music.cover,
  audioUrl: music.audio,
  trackInfo: { title: music.track, artist: music.artist },
  caption: `Vibing to ${music.track} 🎵`,
  likes: 120 + i * 15,
  comments: 5 + i,
  time: `${i + 2}h`,
}));

// --- 2. COMPONENTE DE REPRODUCTOR (Minimalista) ---
const MusicPostItem = ({
  item,
  user,
}: {
  item: (typeof FULL_POSTS)[0];
  user: any;
}) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handlePlayPause() {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } else {
      setIsLoading(true);
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: item.audioUrl },
          { shouldPlay: true }
        );
        setSound(newSound);
        setIsPlaying(true);

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            newSound.setPositionAsync(0);
          }
        });
      } catch (error) {
        console.error("Error audio:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  return (
    <View className="mb-8 border-b border-white/5 pb-6">
      {/* Header Post */}
      <View className="flex-row items-center justify-between px-4 mb-3">
        <View className="flex-row items-center">
          <Image
            source={{ uri: user?.pfp || item.avatar }}
            className="w-10 h-10 rounded-full bg-zinc-800"
          />
          <Text className="text-white font-bold ml-3 text-base">
            {user?.name || "Eslender Cruz"}
          </Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* --- PLAYER INTERACTIVO --- */}
      <View className="relative justify-center items-center">
        <Image
          source={{ uri: item.image }}
          className={`w-full h-[400px] bg-zinc-900 ${
            isPlaying ? "opacity-60" : "opacity-100"
          }`}
          resizeMode="cover"
        />

        {!isPlaying && <View className="absolute w-full h-full bg-black/10" />}

        <TouchableOpacity
          onPress={handlePlayPause}
          activeOpacity={0.7}
          className="absolute bg-black/40 p-5 rounded-full backdrop-blur-md border border-white/20"
        >
          {isLoading ? (
            <ActivityIndicator size="large" color="#5E17EB" />
          ) : (
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={48}
              color="white"
              style={{ marginLeft: isPlaying ? 0 : 4 }}
            />
          )}
        </TouchableOpacity>

        {/* Track Info Overlay */}
        <View className="absolute bottom-4 left-4 right-4 flex-row items-center bg-black/60 p-3 rounded-xl backdrop-blur-md border border-white/5">
          <View className="bg-[#5E17EB] p-2 rounded-full">
            <Ionicons name="musical-notes" size={16} color="white" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-white font-bold text-sm">
              {item.trackInfo.title}
            </Text>
            <Text className="text-zinc-300 text-xs">
              {item.trackInfo.artist}
            </Text>
          </View>
          {isPlaying && <Ionicons name="bar-chart" size={16} color="#5E17EB" />}
        </View>
      </View>

      {/* --- INFO (SIN BOTONES) --- */}
      <View className="px-4 mt-4">
        {/* Contador de Likes */}
        <Text className="text-white font-bold text-sm mb-1">
          {item.likes} likes
        </Text>

        {/* Caption */}
        <Text className="text-white leading-5">
          <Text className="font-bold">{user?.username || "eslendercruz"} </Text>
          {item.caption}
        </Text>

        {/* Tiempo */}
        <Text className="text-zinc-600 text-xs mt-2 uppercase">
          {item.time} ago
        </Text>
      </View>
    </View>
  );
};

// --- 3. PANTALLA PRINCIPAL ---
const PostDetail = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const listRef = useRef<FlatList>(null);
  const { user } = useGlobalContext();

  const initialIndex = FULL_POSTS.findIndex((item) => item.id === id);

  useEffect(() => {
    if (initialIndex !== -1 && listRef.current) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      }, 100);
    }
  }, [initialIndex]);

  const onScrollToIndexFailed = (info: {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
  }) => {
    const wait = new Promise((resolve) => setTimeout(resolve, 500));
    wait.then(() => {
      listRef.current?.scrollToIndex({ index: info.index, animated: false });
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <View className="flex-row items-center px-4 py-3 border-b border-white/10 z-10 bg-black">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">Music Feed</Text>
      </View>
      <FlatList
        ref={listRef}
        data={FULL_POSTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MusicPostItem item={item} user={user} />}
        showsVerticalScrollIndicator={false}
        initialScrollIndex={initialIndex !== -1 ? initialIndex : 0}
        onScrollToIndexFailed={onScrollToIndexFailed}
      />
    </SafeAreaView>
  );
};

export default PostDetail;
