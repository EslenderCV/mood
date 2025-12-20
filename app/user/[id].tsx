import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import React, { useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

const { width } = Dimensions.get("window");
const ITEM_SIZE = width / 3;

// Mock Data para el perfil visitado
const USER_MOODS = [
  {
    id: "1",
    image: "https://i.scdn.co/image/ab67616d0000b2731ea0c62b2339cbf493a999ad",
  },
  {
    id: "2",
    image: "https://i.scdn.co/image/ab6761610000e5eb437b9e2a82505b3d93ff1022",
  },
  {
    id: "3",
    image: "https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96",
  },
  {
    id: "4",
    image: "https://i.scdn.co/image/ab6761610000e5eb9ad50e564cc8b7dc5da82c50",
  },
  {
    id: "5",
    image: "https://i.scdn.co/image/ab6761610000e5ebf8697e555476a6d68205cd9c",
  },
];

const PublicProfile = () => {
  const router = useRouter();
  const { id, user, avatar } = useLocalSearchParams(); // Recibimos datos básicos
  const [isFollowing, setIsFollowing] = useState(false);

  // Generamos un % de compatibilidad aleatorio para simular el algoritmo
  const matchScore = 87;

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      <StatusBar style="light" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Navegación */}
        <View className="flex-row justify-between items-center px-6 py-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-zinc-900 p-2 rounded-full"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity className="bg-zinc-900 p-2 rounded-full">
            <Ionicons name="ellipsis-horizontal" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* INFO USUARIO */}
        <View className="items-center mt-4">
          <View className="p-1 rounded-full border-2 border-[#5E17EB] shadow-lg shadow-[#5E17EB]/40 relative">
            <Image
              source={{
                uri: (avatar as string) || "https://i.pravatar.cc/300",
              }}
              className="w-32 h-32 rounded-full"
            />
            {/* Bandera / Ubicación Global */}
            <View className="absolute bottom-0 right-0 bg-zinc-900 px-2 py-1 rounded-full border border-zinc-700">
              <Text>🇩🇴</Text>
            </View>
          </View>

          <Text className="text-white text-2xl font-bold mt-4">
            {user || "Usuario"}
          </Text>
          <Text className="text-zinc-500 font-medium">
            @{user?.toString().toLowerCase().replace(" ", "")}
          </Text>

          {/* BADGE: MUSIC MATCH (Global Feature) */}
          <View className="flex-row items-center bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full mt-4">
            <FontAwesome5 name="fire" size={14} color="#F59E0B" />
            <Text className="text-white font-bold ml-2">
              {matchScore}% Match
            </Text>
            <Text className="text-zinc-500 text-xs ml-1">
              • Gustos similares
            </Text>
          </View>

          {/* Estadísticas */}
          <View className="flex-row items-center gap-8 mt-6">
            <View className="items-center">
              <Text className="text-white font-bold text-lg">1.2M</Text>
              <Text className="text-zinc-600 text-[10px] font-bold">
                SEGUIDORES
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-white font-bold text-lg">45</Text>
              <Text className="text-zinc-600 text-[10px] font-bold">MOODS</Text>
            </View>
            <View className="items-center">
              <Text className="text-white font-bold text-lg">120</Text>
              <Text className="text-zinc-600 text-[10px] font-bold">
                SEGUIDOS
              </Text>
            </View>
          </View>

          {/* Botones de Acción */}
          <View className="flex-row gap-3 mt-6 px-6 w-full">
            <TouchableOpacity
              onPress={() => setIsFollowing(!isFollowing)}
              className={`flex-1 py-3.5 rounded-xl items-center justify-center ${
                isFollowing
                  ? "bg-zinc-800 border border-zinc-700"
                  : "bg-[#5E17EB]"
              }`}
            >
              <Text
                className={`font-bold ${
                  isFollowing ? "text-white" : "text-white"
                }`}
              >
                {isFollowing ? "Siguiendo" : "Seguir"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity className="flex-1 bg-zinc-900 border border-zinc-800 py-3.5 rounded-xl items-center justify-center">
              <Text className="text-white font-bold">Mensaje</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CONTENIDO (MOODS GRID) */}
        <View className="mt-8 border-t border-zinc-900">
          <View className="flex-row flex-wrap">
            {USER_MOODS.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => router.push(`/post/${item.id}` as any)}
                style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
                className="border-[0.5px] border-black/40"
              >
                <Image
                  source={{ uri: item.image }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
            {/* Rellenar para demo */}
            <View
              style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
              className="bg-zinc-900 items-center justify-center border-[0.5px] border-black/40"
            >
              <Ionicons name="musical-notes" size={24} color="#3F3F46" />
            </View>
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PublicProfile;
