import React from "react";
import { View, Image, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

interface HomeHeaderProps {
  isDark: boolean;
  notiCount: number;
  msgCount: number;
}

const HomeHeader = ({ isDark, notiCount, msgCount }: HomeHeaderProps) => {
  return (
    <View className="flex-row justify-between items-center px-5 py-3 border-b border-transparent z-50 bg-black">
      {/* LOGO */}
      <View className="h-[40px] w-[80px] justify-center">
        <Image
          source={require("@/assets/fullLogo.png")}
          resizeMode="contain"
          className="w-full h-full"
          style={{ tintColor: isDark ? undefined : "#5E17EB" }}
        />
      </View>

      {/* ICONOS DERECHA */}
      <View className="flex-row items-center gap-4">
        {/* Notificaciones */}
        <TouchableOpacity onPress={() => router.push("/notifications" as any)}>
          <Ionicons
            name="notifications-outline"
            size={26}
            color={isDark ? "#5E17EB" : "black"}
          />
          {notiCount > 0 && (
            <View className="absolute top-0 right-0 bg-red-500 w-3 h-3 rounded-full border border-black" />
          )}
        </TouchableOpacity>

        {/* Chats */}
        <TouchableOpacity
          onPress={() => router.push("/chatshome")}
          className="relative"
        >
          <Ionicons
            name="chatbubble-outline"
            size={26}
            color={isDark ? "#5E17EB" : "black"}
          />
          {msgCount > 0 && (
            <View className="absolute top-[-2px] right-[-2px] bg-red-500 w-4 h-4 rounded-full items-center justify-center border border-black">
              <Text className="text-white text-[9px] font-bold">
                {msgCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default HomeHeader;
