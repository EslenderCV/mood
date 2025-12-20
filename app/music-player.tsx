import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAudio } from "@/context/AudioContext";

const { width } = Dimensions.get("window");

// Mock de Letras (Simulación)
const MOCK_LYRICS = [
  "It go Halle Berry or Hallelujah",
  "Pick your poison tell me what you doing",
  "Everybody gon' respect the shooter",
  "But the one in front of the gun lives forever",
  "(The one in front of the gun lives forever)",
  "And I been hustling all day, this a way, that a way",
  "Through canals and alleyways, just to say",
  "Money trees is the perfect place for shade",
  "And that's just how I feel.",
  "Nah, nah... a dollar might just fuck your main bitch",
  "That's just how I feel.",
  "A dollar might say fuck them niggas that you came with",
  "That's just how I feel.",
  "Somethin' in the water...",
  "(And I been hustling all day...)",
];

const MusicPlayer = () => {
  const router = useRouter();
  const { currentSong, isPlaying, togglePlay } = useAudio();
  const [isLiked, setIsLiked] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false); // Estado para activar letras

  useEffect(() => {
    if (!currentSong) {
      router.back();
    }
  }, [currentSong]);

  if (!currentSong) return null;

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      {/* Header */}
      <View className="px-6 py-4 flex-row justify-between items-center z-10">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={32} color="white" />
        </TouchableOpacity>
        <Text className="text-zinc-400 font-bold text-xs tracking-widest uppercase">
          {showLyrics ? "LETRAS" : "REPRODUCIENDO"}
        </Text>
        <TouchableOpacity onPress={() => setShowLyrics(!showLyrics)}>
          <MaterialIcons
            name="lyrics"
            size={24}
            color={showLyrics ? "#5E17EB" : "white"}
          />
        </TouchableOpacity>
      </View>

      {/* CONTENIDO PRINCIPAL (Switch entre Carátula y Letras) */}
      <View className="flex-1 justify-center mt-4">
        {showLyrics ? (
          // VISTA DE LETRAS
          <ScrollView
            className="flex-1 px-8"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            <View className="items-center py-10">
              {MOCK_LYRICS.map((line, index) => (
                <Text
                  key={index}
                  className={`text-2xl font-bold text-center mb-6 ${
                    index === 3 ? "text-white" : "text-zinc-600"
                  }`}
                >
                  {line}
                </Text>
              ))}
            </View>
          </ScrollView>
        ) : (
          // VISTA NORMAL (CARÁTULA)
          <View className="items-center px-8">
            <View className="shadow-2xl shadow-[#5E17EB]/40 mb-10">
              <Image
                source={{ uri: currentSong.cover }}
                style={{ width: width - 80, height: width - 80 }}
                className="rounded-3xl"
              />
            </View>

            <View className="flex-row items-center justify-between w-full mb-2">
              <View className="flex-1 mr-4">
                <Text
                  className="text-white text-2xl font-bold mb-1"
                  numberOfLines={1}
                >
                  {currentSong.title}
                </Text>
                <Text
                  className="text-zinc-400 text-lg font-medium"
                  numberOfLines={1}
                >
                  {currentSong.artist}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsLiked(!isLiked)}>
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={32}
                  color={isLiked ? "#5E17EB" : "white"}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Controles y Slider (Siempre visibles abajo) */}
      <View className="px-6 pb-12 pt-6 bg-[#09090b]">
        {/* Slider */}
        <View className="w-full h-1 bg-zinc-800 rounded-full mb-3">
          <View className="w-[35%] h-full bg-[#5E17EB] rounded-full relative">
            <View className="absolute right-0 top-[-4px] w-3 h-3 bg-white rounded-full shadow-sm" />
          </View>
        </View>
        <View className="flex-row justify-between mb-6">
          <Text className="text-zinc-500 text-xs">1:24</Text>
          <Text className="text-zinc-500 text-xs">3:45</Text>
        </View>

        {/* Botones */}
        <View className="flex-row items-center justify-between px-4">
          <TouchableOpacity>
            <Ionicons
              name="shuffle"
              size={28}
              color={showLyrics ? "#52525B" : "#5E17EB"}
            />
          </TouchableOpacity>

          <TouchableOpacity>
            <Ionicons name="play-skip-back" size={36} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={togglePlay}
            className="w-20 h-20 bg-[#5E17EB] rounded-full items-center justify-center shadow-lg shadow-[#5E17EB]/30"
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={40}
              color="white"
              style={{ marginLeft: isPlaying ? 0 : 4 }}
            />
          </TouchableOpacity>

          <TouchableOpacity>
            <Ionicons name="play-skip-forward" size={36} color="white" />
          </TouchableOpacity>

          <TouchableOpacity>
            <Ionicons name="repeat" size={28} color="#71717A" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default MusicPlayer;
