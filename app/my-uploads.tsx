import { View, Text, FlatList, Image, TouchableOpacity } from "react-native";
import React from "react";
import { Ionicons, Feather } from "@expo/vector-icons";

interface MusicListProps {
  data: any[];
}

const MusicList = ({ data }: MusicListProps) => {
  return (
    <View className="px-4">
      {data.map((item, index) => (
        <View
          key={item.id}
          className="flex-row items-center mb-4 bg-zinc-900/40 p-3 rounded-2xl border border-white/5"
        >
          {/* Portada */}
          <Image
            source={
              item.cover ? { uri: item.cover } : require("../assets/mood.png") // Asegúrate de tener una imagen por defecto o usa un color
            }
            className="w-14 h-14 rounded-xl bg-zinc-800"
          />

          {/* Info Canción */}
          <View className="flex-1 ml-3">
            <Text className="text-white font-bold text-base" numberOfLines={1}>
              {item.title}
            </Text>
            <View className="flex-row items-center mt-1">
              <Text className="text-zinc-400 text-xs mr-3">{item.artist}</Text>

              {/* Stats Pequeños */}
              <View className="flex-row items-center bg-zinc-800/50 px-1.5 py-0.5 rounded text-xs">
                <Ionicons name="play" size={10} color="#71717A" />
                <Text className="text-zinc-500 text-[10px] ml-1">
                  {item.plays}
                </Text>
              </View>
            </View>
          </View>

          {/* Botones de Acción */}
          <View className="flex-row gap-3">
            <TouchableOpacity>
              <Feather name="bar-chart-2" size={20} color="#71717A" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="ellipsis-vertical" size={20} color="#71717A" />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {data.length === 0 && (
        <Text className="text-zinc-500 text-center mt-10">
          No hay canciones subidas aún.
        </Text>
      )}
    </View>
  );
};

export default MusicList;
