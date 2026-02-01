import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { TapGestureHandler } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

import { AudioVisualizer } from "@/components/post/AudioVisualizer";
import LoadingDots from "@/components/shared/LoadingDots";

export const PostBody = ({
  post,
  isMoodPost,
  hasMusic,
  songData,
  textColor,
  subTextColor,
  accentColor,
  isDark,
  musicCardGradient,
  heartScaleAnim,
  isPlayingThis,
  isLoadingThis,
  isBufferingThis,
  onPlayPause,
  onDoubleTap,
}: {
  post: any;
  isMoodPost: boolean;
  hasMusic: boolean;
  songData: any;
  textColor: string;
  subTextColor: string;
  accentColor: string;
  isDark: boolean;
  musicCardGradient: readonly [string, string];
  heartScaleAnim: Animated.Value;
  isPlayingThis: boolean;
  isLoadingThis: boolean;
  isBufferingThis: boolean;
  onPlayPause: () => void;
  onDoubleTap: (event: any) => void;
}) => {
  return (
    <View>
      {isMoodPost ? (
        <TapGestureHandler numberOfTaps={2} onHandlerStateChange={onDoubleTap}>
          <Animated.View className="mb-4 rounded-[24px] overflow-hidden shadow-sm relative">
            <LinearGradient
              colors={["#5E17EB", "#8C52FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 24, minHeight: 110, justifyContent: "center" }}
            >
              <Text className="text-white font-bold text-[22px] text-center leading-8 tracking-tight">
                {post.comment}
              </Text>
              <Ionicons
                name="chatbubble-ellipses"
                size={100}
                color="rgba(255,255,255,0.08)"
                style={{
                  position: "absolute",
                  bottom: -20,
                  right: -20,
                  transform: [{ rotate: "-15deg" }],
                }}
              />
            </LinearGradient>

            <Animated.View
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                justifyContent: "center",
                alignItems: "center",
                zIndex: 50,
                pointerEvents: "none",
                transform: [{ scale: heartScaleAnim }],
              }}
            >
              <Ionicons name="heart" size={70} color="white" />
            </Animated.View>
          </Animated.View>
        </TapGestureHandler>
      ) : (
        !!post.comment &&
        post.comment.trim() !== "" && (
          <Text
            className="text-[16px] leading-[22px] mb-3 font-normal"
            style={{ color: textColor }}
          >
            {post.comment}
          </Text>
        )
      )}

      {hasMusic && (
        <TapGestureHandler numberOfTaps={2} onHandlerStateChange={onDoubleTap}>
          <Animated.View
            className="mb-4 rounded-[28px] overflow-hidden border"
            style={{
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.05)",
              shadowColor: isDark ? "#5E17EB" : "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.2 : 0.05,
              shadowRadius: 10,
              elevation: 5,
            }}
          >
            <LinearGradient
              colors={musicCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="p-3 flex-row items-center"
            >
              <View className="relative shadow-md">
                <Image
                  source={{ uri: songData.cover }}
                  className="w-[64px] h-[64px] rounded-[20px]"
                  contentFit="cover"
                  transition={300}
                  cachePolicy="disk"
                  recyclingKey={String(songData?.id || songData?.cover || "")}
                />
                <View className="absolute bottom-1 right-1 bg-black/40 rounded-full p-1 backdrop-blur-md">
                  <Ionicons name="musical-note" size={8} color="white" />
                </View>
              </View>

              <View className="flex-1 ml-4 justify-center mr-2">
                <Text
                  className="font-bold text-[16px] mb-1"
                  numberOfLines={1}
                  style={{ color: textColor }}
                >
                  {songData.title}
                </Text>
                <Text
                  className="text-[14px] font-medium"
                  numberOfLines={1}
                  style={{ color: subTextColor }}
                >
                  {songData.artist}
                </Text>
                <View className="mt-2 flex-row items-center">
                  {isBufferingThis ? (
                    <LoadingDots color={subTextColor} />
                  ) : (
                    <AudioVisualizer
                      isPlaying={isPlayingThis}
                      color={subTextColor}
                    />
                  )}
                </View>
              </View>

              <TouchableOpacity
                onPress={onPlayPause}
                className="w-12 h-12 rounded-full items-center justify-center shadow-lg"
                style={{ backgroundColor: accentColor }}
                activeOpacity={0.8}
              >
                {isPlayingThis ? (
                  <Ionicons
                    name="pause"
                    size={22}
                    color="white"
                    style={{ marginLeft: 0 }}
                  />
                ) : isLoadingThis ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons
                    name="play"
                    size={22}
                    color="white"
                    style={{ marginLeft: 3 }}
                  />
                )}
              </TouchableOpacity>
            </LinearGradient>

            <Animated.View
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                justifyContent: "center",
                alignItems: "center",
                zIndex: 50,
                pointerEvents: "none",
                transform: [{ scale: heartScaleAnim }],
              }}
            >
              <Ionicons
                name="heart"
                size={60}
                color="#EF4444"
                style={{ shadowOpacity: 0.5, shadowRadius: 10 }}
              />
            </Animated.View>
          </Animated.View>
        </TapGestureHandler>
      )}
    </View>
  );
};
