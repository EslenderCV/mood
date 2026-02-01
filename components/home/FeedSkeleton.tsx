import React, { useEffect, useRef } from "react";
import { View, ScrollView, useWindowDimensions, Animated, Easing } from "react-native";

import SkeletonBlock from "@/components/shared/SkeletonBlock";
import { useFlag } from "@/src/config/flags";

interface SkeletonProps {
  isDark: boolean;
  shimmer: Animated.Value;
  enableShimmer: boolean;
}

interface FeedSkeletonProps {
  isDark: boolean;
}

const StoriesSkeleton = ({ isDark, shimmer, enableShimmer }: SkeletonProps) => {
  return (
    <View className="flex-row py-4 pl-4 border-b border-zinc-900/50 bg-black">
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} className="items-center mr-5">
          <SkeletonBlock
            isDark={isDark}
            shimmer={shimmer}
            enabled={enableShimmer}
            style={{ width: 68, height: 68, borderRadius: 34, marginBottom: 8 }}
          />
          <SkeletonBlock
            isDark={isDark}
            shimmer={shimmer}
            enabled={enableShimmer}
            style={{ width: 56, height: 10, borderRadius: 6 }}
          />
        </View>
      ))}
    </View>
  );
};

const PostSkeleton = ({ isDark, shimmer, enableShimmer }: SkeletonProps) => {
  const cardBg = isDark ? "#18181B" : "#F4F4F5";
  return (
    <View className={`py-4 px-4 mb-2 ${isDark ? "border-b border-zinc-900/50" : "border-b border-zinc-200"}`}>
      <View className="flex-row items-center mb-3">
        <SkeletonBlock
          isDark={isDark}
          shimmer={shimmer}
          enabled={enableShimmer}
          style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
        />
        <View className="space-y-1.5">
          <SkeletonBlock isDark={isDark} shimmer={shimmer} enabled={enableShimmer} style={{ width: 96, height: 14, borderRadius: 6 }} />
          <SkeletonBlock isDark={isDark} shimmer={shimmer} enabled={enableShimmer} style={{ width: 128, height: 10, borderRadius: 6, marginTop: 6 }} />
        </View>
      </View>
      <View
        style={{
          width: "100%",
          height: 100,
          borderRadius: 24,
          backgroundColor: cardBg,
          marginBottom: 16,
          flexDirection: "row",
          alignItems: "center",
          padding: 12,
          overflow: "hidden",
        }}
      >
        <SkeletonBlock
          isDark={isDark}
          shimmer={shimmer}
          enabled={enableShimmer}
          style={{ width: 76, height: 76, borderRadius: 18, marginRight: 12 }}
        />
        <View className="flex-1 justify-center space-y-2">
          <SkeletonBlock
            isDark={isDark}
            shimmer={shimmer}
            enabled={enableShimmer}
            style={{ width: "75%", height: 16, borderRadius: 6 }}
          />
          <SkeletonBlock
            isDark={isDark}
            shimmer={shimmer}
            enabled={enableShimmer}
            style={{ width: "50%", height: 12, borderRadius: 6, marginTop: 8 }}
          />
        </View>
      </View>
    </View>
  );
};

const FeedSkeleton = ({ isDark }: FeedSkeletonProps) => {
  const shimmer = useRef(new Animated.Value(0)).current;
  const enableShimmer = useFlag("shimmerSkeleton");

  useEffect(() => {
    // If shimmer is disabled, keep blocks static (no animated highlight).
    shimmer.setValue(0);
    if (!enableShimmer) return;

    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer, enableShimmer]);

  const { height } = useWindowDimensions();
  const POST_HEIGHT_ESTIMATE = 220;
  const itemCount = Math.ceil(height / POST_HEIGHT_ESTIMATE) + 1;
  return (
    <View className="flex-1">
      <StoriesSkeleton isDark={isDark} shimmer={shimmer} enableShimmer={enableShimmer} />
      <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={false}>
        {[...Array(itemCount)].map((_, i) => (
          <PostSkeleton key={i} isDark={isDark} shimmer={shimmer} enableShimmer={enableShimmer} />
        ))}
      </ScrollView>
    </View>
  );
};

export default FeedSkeleton;
