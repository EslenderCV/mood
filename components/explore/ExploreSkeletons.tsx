import React from "react";
import { View } from "react-native";

export const ExplorePostSkeleton = ({ isDark }: { isDark: boolean }) => {
  const cardBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  return (
    <View className={`flex-1 m-[1px] aspect-square ${cardBg} opacity-50`} />
  );
};

export const TrendingVibeSkeleton = ({ isDark }: { isDark: boolean }) => {
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  return (
    <View className="flex-row items-center px-5 py-3 mb-2 mx-2">
      <View className={`w-14 h-14 rounded-xl ${elementBg} mr-4`} />
      <View className="flex-1 justify-center mr-2 space-y-2">
        <View className={`w-32 h-4 rounded ${elementBg}`} />
        <View className={`w-20 h-3 rounded ${elementBg}`} />
      </View>
      <View className={`w-10 h-10 rounded-full ${elementBg}`} />
    </View>
  );
};

export const CreatorSkeleton = ({ isDark }: { isDark: boolean }) => {
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  return (
    <View className="mr-5 items-center w-20">
      <View
        className={`w-[68px] h-[68px] rounded-full ${elementBg} border-2 border-transparent`}
      />
      <View className={`mt-2 w-16 h-3 rounded ${elementBg}`} />
    </View>
  );
};

export const MusicSkeleton = ({ isDark }: { isDark: boolean }) => {
  const cardBg = isDark ? "bg-zinc-900" : "bg-zinc-100";
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  const borderColor = isDark ? "border-zinc-800" : "border-zinc-200";
  return (
    <View
      className={`flex-row items-center px-4 py-4 border-b ${borderColor} ${cardBg}`}
    >
      <View className={`w-8 h-6 rounded ${elementBg} mr-4`} />
      <View className={`w-12 h-12 rounded-lg ${elementBg} mr-4`} />
      <View className="flex-1 space-y-2">
        <View className={`w-32 h-4 rounded ${elementBg}`} />
        <View className={`w-20 h-3 rounded ${elementBg}`} />
      </View>
      <View className={`w-10 h-10 rounded-full ${elementBg}`} />
    </View>
  );
};

export const ArtistSkeleton = ({ isDark }: { isDark: boolean }) => {
  const cardBg = isDark ? "bg-zinc-900" : "bg-zinc-100";
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  const borderColor = isDark ? "border-zinc-800" : "border-zinc-200";
  return (
    <View
      className={`flex-row items-center px-5 py-4 border-b ${borderColor} ${cardBg}`}
    >
      <View className={`w-14 h-14 rounded-full ${elementBg} mr-4`} />
      <View className="flex-1 space-y-2">
        <View className={`w-24 h-4 rounded ${elementBg}`} />
        <View className={`w-16 h-3 rounded ${elementBg}`} />
      </View>
    </View>
  );
};

export const ProfileSkeleton = ({ isDark }: { isDark: boolean }) => {
  const cardBg = isDark ? "bg-zinc-900" : "bg-zinc-100";
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  const borderColor = isDark ? "border-zinc-800" : "border-zinc-200";
  return (
    <View
      className={`flex-row items-center px-5 py-4 border-b ${borderColor} ${cardBg}`}
    >
      <View className={`w-14 h-14 rounded-full ${elementBg}`} />
      <View className="ml-4 flex-1 space-y-2">
        <View className={`w-32 h-4 rounded ${elementBg}`} />
        <View className={`w-20 h-3 rounded ${elementBg}`} />
      </View>
      <View className={`w-16 h-8 rounded-full ${elementBg}`} />
    </View>
  );
};
