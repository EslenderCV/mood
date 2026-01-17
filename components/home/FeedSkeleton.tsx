import React from "react";
import { View, ScrollView, useWindowDimensions } from "react-native";

interface SkeletonProps {
  isDark: boolean;
}

const StoriesSkeleton = ({ isDark }: SkeletonProps) => {
  const bg = isDark ? "bg-zinc-800" : "bg-zinc-200";
  return (
    <View className="flex-row py-4 pl-4 border-b border-zinc-900/50 bg-black">
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} className="items-center mr-5">
          <View
            className={`w-[68px] h-[68px] rounded-full ${bg} mb-2 animate-pulse`}
          />
          <View className={`w-14 h-2.5 rounded-md ${bg} animate-pulse`} />
        </View>
      ))}
    </View>
  );
};

const PostSkeleton = ({ isDark }: SkeletonProps) => {
  const cardBg = isDark ? "bg-zinc-900" : "bg-zinc-100";
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-300";
  return (
    <View
      className={`py-4 px-4 mb-2 animate-pulse ${isDark ? "border-b border-zinc-900/50" : "border-b border-zinc-200"}`}
    >
      <View className="flex-row items-center mb-3">
        <View className={`w-10 h-10 rounded-full ${elementBg} mr-3`} />
        <View className="space-y-1.5">
          <View className={`w-24 h-3.5 rounded ${elementBg}`} />
          <View className={`w-32 h-2.5 rounded ${elementBg}`} />
        </View>
      </View>
      <View
        className={`w-full h-[100px] rounded-[24px] ${cardBg} mb-4 flex-row items-center p-3 overflow-hidden`}
      >
        <View
          className={`w-[76px] h-[76px] rounded-[18px] ${elementBg} mr-3`}
        />
        <View className="flex-1 justify-center space-y-2">
          <View className={`w-3/4 h-4 rounded ${elementBg}`} />
          <View className={`w-1/2 h-3 rounded ${elementBg}`} />
        </View>
      </View>
    </View>
  );
};

const FeedSkeleton = ({ isDark }: SkeletonProps) => {
  const { height } = useWindowDimensions();
  const POST_HEIGHT_ESTIMATE = 220;
  const itemCount = Math.ceil(height / POST_HEIGHT_ESTIMATE) + 1;
  return (
    <View className="flex-1">
      <StoriesSkeleton isDark={isDark} />
      <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={false}>
        {[...Array(itemCount)].map((_, i) => (
          <PostSkeleton key={i} isDark={isDark} />
        ))}
      </ScrollView>
    </View>
  );
};

export default FeedSkeleton;
