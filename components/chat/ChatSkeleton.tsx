import React from "react";
import { View } from "react-native";

export const ChatRoomSkeleton = ({ isDark }: { isDark: boolean }) => {
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  const myBubbleBg = isDark ? "bg-zinc-700" : "bg-zinc-400";
  const otherBubbleBg = isDark ? "bg-zinc-800" : "bg-zinc-200";

  return (
    <View className="flex-1 animate-pulse">
      {/* Header Skeleton */}
      <View
        className={`flex-row items-center px-2 py-2 border-b ${isDark ? "border-zinc-800" : "border-zinc-200"}`}
      >
        <View className={`w-10 h-10 rounded-full ${elementBg} m-2`} />
        <View className={`w-9 h-9 rounded-full ${elementBg}`} />
        <View className="ml-3 flex-1">
          <View className={`w-32 h-4 rounded ${elementBg} mb-1`} />
        </View>
      </View>

      {/* Messages Skeleton */}
      <View className="flex-1 px-4 py-4 justify-end">
        <View className="flex-row items-end mb-6">
          <View className={`w-7 h-7 rounded-full ${elementBg} mr-2 mb-1`} />
          <View
            className={`w-48 h-12 rounded-[18px] rounded-tl-none ${otherBubbleBg}`}
          />
        </View>
        <View className="flex-row justify-end items-end mb-6">
          <View
            className={`w-64 h-20 rounded-[18px] rounded-tr-none ${myBubbleBg}`}
          />
        </View>
        <View className="flex-row items-end mb-6">
          <View className={`w-7 h-7 rounded-full ${elementBg} mr-2 mb-1`} />
          <View
            className={`w-32 h-10 rounded-[18px] rounded-tl-none ${otherBubbleBg}`}
          />
        </View>
        <View className="flex-row justify-end items-end mb-6">
          <View
            className={`w-40 h-10 rounded-[18px] rounded-tr-none ${myBubbleBg}`}
          />
        </View>
      </View>

      {/* Input Skeleton */}
      <View
        className={`px-3 py-3 border-t ${isDark ? "border-zinc-800" : "border-zinc-200"}`}
      >
        <View className={`h-[45px] rounded-3xl ${elementBg}`} />
      </View>
    </View>
  );
};
