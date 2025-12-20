import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
} from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

const Library = () => {
  // Opciones rápidas de la librería
  const sections = [
    {
      id: "1",
      title: "Tus Subidas",
      icon: "cloud-upload-outline",
      color: "#5E17EB",
      route: "/my-uploads",
    },
    {
      id: "2",
      title: "Favoritos",
      icon: "heart-outline",
      color: "#FF2D55",
      route: "/favorites",
    },
    {
      id: "3",
      title: "Playlists",
      icon: "book",
      color: "#007AFF",
      route: "/playlists",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />

      <View className="px-6 py-4">
        <Text className="text-white text-3xl font-bold mb-8">Librería</Text>

        {/* --- SECCIONES PRINCIPALES --- */}
        <View className="gap-y-4">
          {sections.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => router.push(item.route as any)}
              className="flex-row items-center bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800"
            >
              <View
                style={{ backgroundColor: `${item.color}20` }}
                className="w-12 h-12 rounded-xl items-center justify-center"
              >
                {item.id === "3" ? (
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={26}
                    color={item.color}
                  />
                ) : (
                  <Ionicons
                    name={item.icon as any}
                    size={26}
                    color={item.color}
                  />
                )}
              </View>
              <Text className="text-white text-lg font-semibold ml-4 flex-1">
                {item.title}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#71717A" />
            </TouchableOpacity>
          ))}
        </View>

        {/* --- RECIENTES (Opcional) --- */}
        <View className="mt-12">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-xl font-bold">
              Escuchado recientemente
            </Text>
          </View>

          {/* Aquí iría una lista de las últimas canciones */}
          <View className="items-center justify-center py-10">
            <Ionicons name="time-outline" size={40} color="#27272A" />
            <Text className="text-zinc-500 mt-2">
              No hay actividad reciente
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Library;
