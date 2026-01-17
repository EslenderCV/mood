import React from "react";
import { View } from "react-native";

export const ChatListSkeleton = ({ isDark }: { isDark: boolean }) => {
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  return (
    <View className="flex-row items-center px-5 py-3.5 animate-pulse w-full">
      <View className={`w-[52px] h-[52px] rounded-full ${elementBg}`} />
      <View className="ml-4 flex-1 justify-center space-y-2">
        <View className="flex-row justify-between items-center w-full">
          <View className={`w-32 h-4 rounded ${elementBg}`} />
          <View className={`w-10 h-3 rounded ${elementBg}`} />
        </View>
        <View className={`w-48 h-3 rounded ${elementBg}`} />
      </View>
    </View>
  );
};
