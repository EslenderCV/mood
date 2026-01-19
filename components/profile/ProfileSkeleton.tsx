import React from "react";
import { View, useWindowDimensions } from "react-native";

const ProfileSkeleton = ({ isDark }: { isDark: boolean }) => {
  const bg = isDark ? "bg-zinc-900" : "bg-zinc-100";
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  const { width } = useWindowDimensions();
  const itemSize = width / 3;

  return (
    <View className="flex-1 animate-pulse">
      <View className="flex-row justify-between items-center px-6 py-2 mb-6">
        <View className={`w-32 h-8 rounded ${elementBg}`} />
        <View className={`w-10 h-10 rounded-2xl ${elementBg}`} />
      </View>
      <View className="items-center mb-8">
        <View className={`w-32 h-32 rounded-full ${elementBg} mb-4`} />
        <View className={`w-40 h-6 rounded ${elementBg} mb-2`} />
        <View className={`w-24 h-4 rounded ${elementBg}`} />
      </View>
      <View
        className={`mx-4 h-[70px] mb-6 rounded-3xl ${bg} flex-row items-center justify-between px-6`}
      >
        <View className={`w-full h-full rounded-3xl ${elementBg} opacity-20`} />
      </View>
      <View className="flex-row px-4 mb-4 gap-4">
        <View className={`flex-1 h-10 rounded-xl ${elementBg}`} />
        <View className={`flex-1 h-10 rounded-xl ${bg}`} />
      </View>
      <View className="flex-row flex-wrap">
        {[...Array(9)].map((_, i) => (
          <View
            key={i}
            style={{ width: itemSize, height: itemSize, padding: 1 }}
          >
            <View className={`w-full h-full ${elementBg}`} />
          </View>
        ))}
      </View>
    </View>
  );
};

export default ProfileSkeleton;
