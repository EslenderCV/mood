import React from "react";
import { View, Text, TouchableOpacity, FlatList, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

interface EmptyStateProps {
  suggestions: any[];
  onGoToExplore: () => void;
}

const EmptyStateWithSuggestions = ({
  suggestions,
  onGoToExplore,
}: EmptyStateProps) => {
  return (
    <View className="px-4 py-12 items-center justify-center">
      <View className="items-center mb-10">
        <View className="relative">
          <LinearGradient
            colors={["rgba(94, 23, 235, 0.3)", "transparent"] as const}
            className="w-32 h-32 rounded-full items-center justify-center absolute -top-4 -left-4"
          />
          <View className="w-24 h-24 bg-zinc-900 rounded-full items-center justify-center border border-zinc-800 shadow-xl shadow-[#5E17EB]/20 z-10">
            <Ionicons name="musical-notes" size={42} color="#5E17EB" />
          </View>
        </View>
        <Text className="text-white text-2xl font-bold text-center mt-6 mb-2 tracking-tight">
          Tu feed está muy callado...
        </Text>
        <Text className="text-zinc-400 text-center text-base px-6 leading-6">
          Sigue a creadores y artistas para llenar tu inicio con la mejor
          música.
        </Text>
      </View>
      {suggestions.length > 0 && (
        <View className="w-full mb-10">
          <View className="flex-row items-center justify-between px-2 mb-4">
            <Text className="text-white font-bold text-lg">
              Sugerencias para ti
            </Text>
            <TouchableOpacity onPress={onGoToExplore}>
              <Text className="text-[#5E17EB] font-bold text-xs">Ver más</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={suggestions}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4 }}
            keyExtractor={(item: any) => item.$id || item.accountId}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  router.push(`/user/${item.$id || item.accountId}` as any)
                }
                className="mr-3 bg-[#18181B] p-4 rounded-[24px] border border-white/5 w-36 items-center shadow-lg"
              >
                <Image
                  source={
                    item.pfp || item.avatar
                      ? { uri: item.pfp || item.avatar }
                      : require("@/assets/noPfp.jpg")
                  }
                  className="w-16 h-16 rounded-full bg-zinc-800 mb-3 border border-white/10"
                />
                <Text
                  className="text-white font-bold text-sm text-center mb-0.5"
                  numberOfLines={1}
                >
                  {item.name || item.username}
                </Text>
                <Text className="text-zinc-500 text-xs mb-3" numberOfLines={1}>
                  @{item.username}
                </Text>
                <View className="w-full h-8 rounded-full overflow-hidden">
                  <LinearGradient
                    colors={["#5E17EB", "#7C3AED"] as const}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="w-full h-full items-center justify-center"
                  >
                    <Text className="text-white font-bold text-[10px] uppercase tracking-wide">
                      Ver Perfil
                    </Text>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
      <TouchableOpacity
        onPress={onGoToExplore}
        activeOpacity={0.9}
        className="w-full shadow-lg shadow-[#5E17EB]/40 rounded-full overflow-hidden"
      >
        <LinearGradient
          colors={["#5E17EB", "#9333EA"] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="w-full py-4 flex-row items-center justify-center"
        >
          <Ionicons
            name="compass"
            size={22}
            color="white"
            style={{ marginRight: 8 }}
          />
          <Text className="text-white font-bold text-lg">
            Explorar Comunidad
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default EmptyStateWithSuggestions;
