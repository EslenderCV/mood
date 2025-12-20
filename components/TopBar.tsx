import { View, Image, TouchableOpacity } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router"; // 1. Importamos router

const TopBar = () => {
  return (
    <View className="flex-row items-center justify-between w-full px-5 py-2">
      {/* Logo */}
      <View className="h-[45px] w-[80px] justify-center">
        <Image
          source={require("@/assets/fullLogo.png")}
          resizeMode="contain"
          className="w-full h-full"
        />
      </View>

      {/* Iconos Interactivos */}
      <View className="flex-row items-center gap-x-3">
        {/* 2. BOTÓN DE NOTIFICACIONES CONECTADO */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/notifications")} // <--- ESTA ES LA CLAVE
          className="bg-zinc-900/80 p-2.5 rounded-full border border-white/5"
        >
          {/* Le puse un puntito rojo para simular actividad nueva (opcional) */}
          <View className="absolute top-2 right-2.5 w-2 h-2 bg-[#FF2D55] rounded-full z-10 border border-black" />
          <Ionicons name="notifications-outline" color="#5E17EB" size={22} />
        </TouchableOpacity>

        <Link href="/chats" asChild>
          <TouchableOpacity
            activeOpacity={0.7}
            className="bg-zinc-900/80 p-2.5 rounded-full border border-white/5"
          >
            <Ionicons name="chatbubble-outline" color="#5E17EB" size={22} />
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
};

export default TopBar;
