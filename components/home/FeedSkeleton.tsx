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
            <View className={`w-48 h-6 rounded-md mb-4 ${elementBg}`} />
            <View className="flex-row gap-2 mb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <View
                  key={i}
                  className={`h-9 w-20 rounded-full ${elementBg}`}
                />
              ))}
            </View>

            <View className="gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <View
                  key={i}
                  className="flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1">
                    <View className={`w-14 h-14 rounded-2xl ${elementBg}`} />
                    <View className="ml-3 flex-1">
                      <View className={`w-2/3 h-4 rounded-md ${elementBg}`} />
                      <View
                        className={`w-1/2 h-3 rounded-md mt-2 ${elementBg}`}
                      />
                    </View>
                  </View>
                  <View className={`w-10 h-10 rounded-full ${elementBg}`} />
                </View>
              ))}
            </View>
          </View>

          {/* Feed posts */}
          {Array.from({ length: 4 }).map((_, i) => (
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
