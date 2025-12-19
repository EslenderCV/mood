import { View, Image, TouchableOpacity } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
const TopBar = () => {
  return (
    <View className="flex-row items-center justify-between w-full px-5 py-2">
      {/* Logo Refined */}
      <View className="h-[45px] w-[80px] justify-center">
        <Image
          source={require("@/assets/fullLogo.png")}
          resizeMode="contain"
          className="w-full h-full"
        />
      </View>

      {/* Interactive Icons */}
      <View className="flex-row items-center gap-x-3">
        <TouchableOpacity
          activeOpacity={0.7}
          className="bg-zinc-900/80 p-2.5 rounded-full border border-white/5"
        >
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
