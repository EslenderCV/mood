import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import TopBar from "@/components/TopBar";
import { useAudio } from "@/context/AudioContext";

// --- DATOS MOCKUP (FOTOS REALES) ---
const POSTS = [
  {
    id: "1",
    user: "Eslender Cruz",
    username: "@eslendercruz",
    time: "2h",
    avatar: "https://i.scdn.co/image/ab6761610000e5eb437b9e2a82505b3d93ff1022", // Kendrick Avatar
    content:
      "This Kendrick Lamar track is literally on repeat all day. The production is insane. 🎧",
    song: {
      title: "Money Trees",
      artist: "Kendrick Lamar",
      cover: "https://i.scdn.co/image/ab67616d0000b2731ea0c62b2339cbf493a999ad",
    },
    likes: 24,
    comments: 5,
    shares: 12,
  },
  {
    id: "2",
    user: "Bad Bunny",
    username: "@sanbenito",
    time: "4h",
    avatar: "https://i.scdn.co/image/ab6761610000e5eb9ad50e564cc8b7dc5da82c50",
    content: "Nadie sabe lo que va a pasar mañana... 👁️",
    song: {
      title: "MONACO",
      artist: "Bad Bunny",
      cover: "https://i.scdn.co/image/ab67616d0000b2737b1fc51ff32b312d4363c288",
    },
    likes: 1200,
    comments: 15000,
    shares: 50000,
  },
  {
    id: "3",
    user: "El Alfa",
    username: "@elalfaeljefe",
    time: "6h",
    avatar: "https://i.scdn.co/image/ab6761610000e5ebf8697e555476a6d68205cd9c",
    content: "La mamá de la mamá de la mamá. En alta siempre! 🇩🇴🔥",
    song: {
      title: "Gogo Dance",
      artist: "El Alfa",
      cover: "https://i.scdn.co/image/ab67616d0000b273f5507e7d6928e190dc450422",
    },
    likes: 500000,
    comments: 8000,
    shares: 20000,
  },
  {
    id: "4",
    user: "The Weeknd",
    username: "@abel",
    time: "1d",
    avatar: "https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26ffbb",
    content: "Late night drives require this mood.",
    song: {
      title: "Starboy",
      artist: "The Weeknd",
      cover: "https://i.scdn.co/image/ab67616d0000b2734718e28d24527d9774635ded",
    },
    likes: 800000,
    comments: 12000,
    shares: 35000,
  },
];

const Home = () => {
  const { playSong } = useAudio();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  const renderPost = ({ item }: { item: (typeof POSTS)[0] }) => {
    // DESGLOSE PARA EVITAR ERRORES DE NAVEGACIÓN
    const { song, ...postData } = item;

    return (
      <View className="mb-6 border-b border-zinc-900 pb-4 px-4">
        {/* Header Post */}
        <View className="flex-row justify-between items-start mb-2">
          {/* CORRECCIÓN APLICADA: Ahora es un TouchableOpacity que lleva al Perfil Público */}
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/user/[id]",
                params: {
                  id: item.id,
                  user: item.user,
                  avatar: item.avatar,
                },
              })
            }
            className="flex-row"
          >
            <Image
              source={{ uri: item.avatar }}
              className="w-10 h-10 rounded-full bg-zinc-800"
            />
            <View className="ml-3">
              <View className="flex-row items-center">
                <Text className="text-white font-bold text-[15px] mr-1">
                  {item.user}
                </Text>
                <Text className="text-zinc-500 text-xs">
                  {item.username} • {item.time}
                </Text>
              </View>
              {/* Nota: Dejamos el texto fuera del Touchable para que al leer no se active el perfil por error, 
                  pero si prefieres que todo sea clickeable, muévelo adentro */}
            </View>
          </TouchableOpacity>

          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={20} color="#71717A" />
          </TouchableOpacity>
        </View>

        {/* Content Text (Fuera del link de perfil) */}
        <Text className="text-zinc-300 text-[15px] mt-1 leading-5 pr-2 ml-[52px]">
          {item.content}
        </Text>

        {/* Music Card */}
        <View className="ml-[52px] mt-2 bg-zinc-900 rounded-xl p-3 flex-row items-center border border-zinc-800/50">
          <Image
            source={{ uri: item.song.cover }}
            className="w-12 h-12 rounded-lg bg-black"
          />
          <View className="flex-1 ml-3">
            <Text className="text-white font-bold text-sm" numberOfLines={1}>
              {item.song.title}
            </Text>
            <Text className="text-zinc-400 text-xs" numberOfLines={1}>
              {item.song.artist}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => playSong(item.song)}
            className="w-8 h-8 rounded-full bg-[#5E17EB]/20 items-center justify-center border border-[#5E17EB]/50"
          >
            <Ionicons
              name="play"
              size={16}
              color="#5E17EB"
              style={{ marginLeft: 2 }}
            />
          </TouchableOpacity>
        </View>

        {/* Actions Bar */}
        <View className="flex-row justify-between items-center mt-4 ml-[52px] pr-4">
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/post/[id]",
                params: {
                  ...postData,
                  songTitle: item.song.title,
                  songArtist: item.song.artist,
                  songCover: item.song.cover,
                } as any,
              })
            }
            className="flex-row items-center gap-1"
          >
            <Ionicons name="chatbubble-outline" size={18} color="#71717A" />
            <Text className="text-zinc-500 text-xs">{item.comments}</Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center gap-1">
            <Ionicons name="repeat-outline" size={20} color="#71717A" />
            <Text className="text-zinc-500 text-xs">{item.shares}</Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center gap-1">
            <Ionicons name="heart-outline" size={20} color="#71717A" />
            <Text className="text-zinc-500 text-xs">{item.likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity>
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
      <FlatList
        data={POSTS}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5E17EB"
          />
        }
      />
    </SafeAreaView>
  );
};

export default Home;
