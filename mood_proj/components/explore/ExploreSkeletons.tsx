import React from "react";
import { View } from "react-native";

type SkeletonProps = {
  isDark: boolean;
};

const getElementBg = (isDark: boolean) => (isDark ? "bg-zinc-800" : "bg-zinc-200");
const getBorderColor = (isDark: boolean) => (isDark ? "#27272A" : "#E5E5E5");

export const TrendingVibeSkeleton = ({ isDark }: SkeletonProps) => {
  const elementBg = getElementBg(isDark);
  const borderColor = getBorderColor(isDark);

  // Matches the Daily Picks card layout in ExploreHeader.
  return (
    <View
      className="animate-pulse flex-row items-center px-5 py-3 mb-2 mx-2 rounded-2xl bg-surface2 border"
      style={{ borderColor }}
    >
      <View className={`w-14 h-14 rounded-xl ${elementBg}`} />
      <View className="flex-1 ml-4">
        <View className={`w-2/3 h-4 rounded-md ${elementBg}`} />
        <View className={`w-1/2 h-3 rounded-md mt-2 ${elementBg}`} />
      </View>
      <View className="flex-row items-center">
        <View className={`w-8 h-8 rounded-full mr-3 ${elementBg}`} />
        <View className={`w-8 h-8 rounded-full ${elementBg}`} />
      </View>
    </View>
  );
};

export const ExplorePostSkeleton = ({ isDark }: SkeletonProps) => {
  const elementBg = getElementBg(isDark);
  return (
    <View className="animate-pulse flex-1 aspect-square m-[1px]">
      <View className={`flex-1 ${elementBg}`} />
    </View>
  );
};

export const MusicSkeleton = ({ isDark }: SkeletonProps) => {
  const elementBg = getElementBg(isDark);
  const borderColor = getBorderColor(isDark);

  // Matches MusicListRow layout in ExploreScreen.
  return (
    <View
      className="animate-pulse flex-row items-center px-5 py-4 border-b"
      style={{ borderColor }}
    >
      <View className={`h-5 w-6 rounded-md mr-4 ${elementBg}`} />
      <View className={`w-12 h-12 rounded-lg ${elementBg}`} />
      <View className="flex-1 mx-3">
        <View className={`h-4 w-2/3 rounded-md ${elementBg}`} />
        <View className={`h-3 w-1/2 rounded-md mt-2 ${elementBg}`} />
      </View>
      <View className={`w-10 h-10 rounded-full ${elementBg}`} />
    </View>
  );
};

export const ArtistSkeleton = ({ isDark }: SkeletonProps) => {
  const elementBg = getElementBg(isDark);
  const borderColor = getBorderColor(isDark);

  // Matches renderArtistRow layout in ExploreScreen.
  return (
    <View
      className="animate-pulse flex-row items-center justify-between px-5 py-4 border-b"
      style={{ borderColor }}
    >
      <View className="flex-row items-center flex-1">
        <View className={`w-14 h-14 rounded-full ${elementBg}`} />
        <View className="ml-4 flex-1">
          <View className={`h-4 w-1/2 rounded-md ${elementBg}`} />
          <View className={`h-3 w-1/3 rounded-md mt-2 ${elementBg}`} />
        </View>
      </View>
      <View className={`w-5 h-5 rounded-md ${elementBg}`} />
    </View>
  );
};

export const ProfileSkeleton = ({ isDark }: SkeletonProps) => {
  const elementBg = getElementBg(isDark);
  const borderColor = getBorderColor(isDark);

  // Matches renderProfileRow layout in ExploreScreen.
  return (
    <View
      className="animate-pulse flex-row items-center justify-between px-5 py-4 border-b"
      style={{ borderColor }}
    >
      <View className="flex-row items-center flex-1">
        <View className={`w-12 h-12 rounded-full ${elementBg}`} />
        <View className="ml-4 flex-1">
          <View className={`h-4 w-1/2 rounded-md ${elementBg}`} />
          <View className={`h-3 w-1/3 rounded-md mt-2 ${elementBg}`} />
        </View>
      </View>
      <View className={`h-9 w-24 rounded-full ${elementBg}`} />
    </View>
  );
};
