import React from "react";
import { ScrollView, View } from "react-native";

interface FeedSkeletonProps {
  isDark: boolean;
}

const FeedSkeleton = ({ isDark }: FeedSkeletonProps) => {
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-200";

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View className="animate-pulse">
          {/* StoriesRail */}
          <View className="flex-row px-4 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} className="items-center mr-4">
                <View className={`w-16 h-16 rounded-full ${elementBg}`} />
                <View className={`w-12 h-3 rounded-md mt-2 ${elementBg}`} />
              </View>
            ))}
          </View>

          {/* WeeklyVibeBanner */}
          <View className="mx-4 mt-4 mb-6">
            <View className={`w-full h-[130px] rounded-3xl ${elementBg}`} />
          </View>

          {/* MoodGenreRecommendations */}
          <View className="mx-4 mb-6">
            {/* Section header (mirrors the loaded UI) */}
            <View className="flex-row items-center justify-between mb-2">
              <View className={`w-44 h-6 rounded-md ${elementBg}`} />
              <View className={`w-16 h-4 rounded-md ${elementBg}`} />
            </View>
            <View className={`w-56 h-3 rounded-md mb-4 ${elementBg}`} />

            {/* Chips (wrap like the real layout) */}
            <View className="flex-row flex-wrap gap-2 mb-4">
              {[104, 112, 96, 124, 92, 108, 84, 116].map((w, i) => (
                <View
                  key={i}
                  style={{ width: w }}
                  className={`h-9 rounded-full ${elementBg}`}
                />
              ))}
            </View>

            {/* Selected category title */}
            <View className={`w-28 h-5 rounded-md mb-3 ${elementBg}`} />

            {/* Horizontal song rail */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              <View className="flex-row gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <View key={i} className="w-[158px]">
                    <View className="relative">
                      <View className={`w-[158px] h-[158px] rounded-3xl ${elementBg}`} />
                      <View
                        className={`w-9 h-9 rounded-full ${elementBg} absolute bottom-3 right-3`}
                      />
                    </View>

                    <View className="mt-3">
                      <View className={`w-28 h-4 rounded-md ${elementBg}`} />
                      <View className={`w-24 h-3 rounded-md mt-2 ${elementBg}`} />
                      <View className={`w-28 h-9 rounded-full mt-3 ${elementBg}`} />
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Feed posts */}
          {Array.from({ length: 2 }).map((_, i) => (
            <View key={i} className="mx-4 mb-8">
              {/* Header */}
              <View className="flex-row items-center mb-3">
                <View className={`w-10 h-10 rounded-full ${elementBg}`} />
                <View className="ml-3 flex-1">
                  <View className={`w-36 h-4 rounded-md ${elementBg}`} />
                  <View className={`w-24 h-3 rounded-md mt-2 ${elementBg}`} />
                </View>
                <View className={`w-8 h-8 rounded-full ${elementBg}`} />
              </View>

              {/* Caption */}
              <View className={`w-full h-4 rounded-md mb-2 ${elementBg}`} />
              <View className={`w-3/4 h-4 rounded-md mb-3 ${elementBg}`} />

              {/* Media */}
              <View className={`w-full aspect-[4/3] rounded-3xl ${elementBg}`} />

              {/* Actions */}
              <View className="flex-row justify-between mt-4 px-2">
                <View className={`w-12 h-4 rounded-md ${elementBg}`} />
                <View className={`w-12 h-4 rounded-md ${elementBg}`} />
                <View className={`w-12 h-4 rounded-md ${elementBg}`} />
                <View className={`w-12 h-4 rounded-md ${elementBg}`} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default FeedSkeleton;
