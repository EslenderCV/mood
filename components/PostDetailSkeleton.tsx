import React from "react";
import { View } from "react-native";

const PostDetailSkeleton = ({ isDark }: { isDark: boolean }) => {
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  const cardBg = isDark ? "bg-zinc-800" : "bg-zinc-200";
  return (
    <View className="flex-1 animate-pulse">
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center mb-6">
          <View className={`w-12 h-12 rounded-full ${elementBg} mr-3`} />
          <View className="space-y-2">
            <View className={`w-32 h-4 rounded ${elementBg}`} />
            <View className={`w-24 h-3 rounded ${elementBg}`} />
          </View>
        </View>
        <View className={`w-3/4 h-4 rounded ${elementBg} mb-2`} />
        <View className={`w-1/2 h-4 rounded ${elementBg} mb-6`} />
        <View
          className={`w-full h-28 rounded-[24px] ${cardBg} p-4 flex-row items-center mb-6`}
        >
          <View className={`w-20 h-20 rounded-2xl ${elementBg} mr-4`} />
          <View className="flex-1 space-y-3">
            <View className={`w-40 h-5 rounded ${elementBg}`} />
            <View className={`w-24 h-4 rounded ${elementBg}`} />
          </View>
          <View className={`w-12 h-12 rounded-full ${elementBg}`} />
        </View>
        <View className={`h-[1px] w-full ${elementBg} mb-6`} />
      </View>
      <View className="px-5">
        {[1, 2, 3].map((i) => (
          <View key={i} className="flex-row mb-6">
            <View className={`w-8 h-8 rounded-full ${elementBg} mr-3`} />
            <View className="flex-1 space-y-2">
              <View className={`w-20 h-3 rounded ${elementBg}`} />
              <View className={`w-full h-10 rounded-xl ${elementBg}`} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};
export default PostDetailSkeleton;
