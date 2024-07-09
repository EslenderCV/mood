import { View, Text, Image, TouchableOpacity } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";

const TopBar = () => {
  return (
    <View className="flex-row items-center justify-between w-full px-3">
      <Image
        source={require("@/assets/fullLogo.png")}
        resizeMode="contain"
        className="w-[75px] h-[60px]"
      />
      <View className="flex-row gap-5">
        <TouchableOpacity activeOpacity={0.7}>
          <Ionicons name="notifications-outline" color="#5E17EB" size={25} />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7}>
          <Ionicons name="chatbox-outline" color="#5E17EB" size={25} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default TopBar;
