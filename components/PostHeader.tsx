import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { parseSongData, formatTimeAgo } from "@/lib/postUtils";

const AudioVisualizer = ({
  isPlaying,
  color,
}: {
  isPlaying: boolean;
  color: string;
}) => (
  <View className="flex-row items-end gap-[3px] h-4 ml-2 opacity-80">
    {[1, 2, 3, 4].map((i) => (
      <View
        key={i}
        className="w-[3px] rounded-full"
        style={{
          height: isPlaying ? Math.random() * 14 + 4 : 4,
          backgroundColor: isPlaying ? "#5E17EB" : color,
        }}
      />
    ))}
  </View>
);

const PostHeader = ({
  post,
  user,
  isPlaying,
  isLoadingAudio,
  onPlayPause,
  onLike,
  onSave,
  onOpenShare,
  t,
  allCommentsCount,
  styles,
}: any) => {
  if (!post) return null;
  const songData = parseSongData(post.songData);
  const creator = post.postedBy || {};
  const likedBy = post.likedBy || [];
  const isLiked = user ? likedBy.includes(user.$id) : false;
  const savedBy = post.savedBy || [];
  const isSaved = user ? savedBy.includes(user.$id) : false;

  return (
    <View
      className="px-5 pt-2 pb-2 mb-2"
      style={{ backgroundColor: styles.bgColor }}
    >
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity
          className="flex-row items-center flex-1"
          onPress={() => {
            if (creator.$id) router.push(`/user/${creator.$id}` as any);
          }}
        >
          <Image
            source={
              creator.pfp ? { uri: creator.pfp } : require("@/assets/noPfp.jpg")
            }
            className="w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-800"
          />
          <View className="ml-3 flex-1">
            <View className="flex-row items-center">
              <Text
                className="font-bold text-[17px] leading-5"
                style={{ color: styles.textColor }}
              >
                {creator.name}
              </Text>
              {creator.isVerified && (
                <MaterialIcons
                  name="verified"
                  size={14}
                  color="#5E17EB"
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
            <Text
              className="text-xs font-medium mt-0.5"
              style={{ color: styles.subTextColor }}
            >
              @{creator.username} · {formatTimeAgo(post.$createdAt, t)}
            </Text>
          </View>
        </TouchableOpacity>
        {post.isPrivate && (
          <View className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full">
            <Ionicons
              name="lock-closed"
              size={14}
              color={styles.subTextColor}
            />
          </View>
        )}
      </View>

      {post.comment && (
        <Text
          className="text-[17px] leading-7 font-normal mb-5 px-1"
          style={{ color: styles.textColor }}
        >
          {post.comment}
        </Text>
      )}

      {songData && (
        <View
          className="rounded-[24px] p-4 flex-row items-center mb-6 border relative overflow-hidden"
          style={{
            backgroundColor: styles.songCardBg,
            borderColor: styles.borderColor,
          }}
        >
          {isPlaying && (
            <View className="absolute inset-0 bg-[#5E17EB] opacity-5" />
          )}
          <Image
            source={{ uri: songData.cover }}
            className="w-20 h-20 rounded-2xl"
            style={{ backgroundColor: styles.isDark ? "#27272A" : "#E4E4E7" }}
          />
          <View className="flex-1 ml-4 mr-2 justify-center">
            <Text
              className="font-black text-[18px] mb-1 tracking-tight"
              numberOfLines={1}
              style={{ color: styles.textColor }}
            >
              {songData.title}
            </Text>
            <Text
              className="text-sm font-medium mb-2 opacity-80"
              numberOfLines={1}
              style={{ color: styles.subTextColor }}
            >
              {songData.artist}
            </Text>
            <View className="flex-row items-center">
              <Ionicons
                name="musical-notes"
                size={12}
                color={styles.accentColor}
              />
              <Text className="text-[10px] ml-1 font-bold text-[#5E17EB]">
                MOOD PREVIEW
              </Text>
              {isPlaying && (
                <AudioVisualizer
                  isPlaying={isPlaying}
                  color={styles.subTextColor}
                />
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={onPlayPause}
            className="w-14 h-14 rounded-full items-center justify-center shadow-md"
            style={{ backgroundColor: styles.accentColor }}
            activeOpacity={0.8}
          >
            {isLoadingAudio ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={24}
                color="white"
                style={{ marginLeft: isPlaying ? 0 : 3 }}
              />
            )}
          </TouchableOpacity>
        </View>
      )}

      <View className="flex-row justify-between items-center mt-2 px-4 pb-2">
        <View className="flex-row gap-8">
          <TouchableOpacity
            onPress={onLike}
            className="flex-row items-center gap-2"
            activeOpacity={0.6}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={26}
              color={isLiked ? "#EF4444" : styles.subTextColor}
            />
            {likedBy.length > 0 && (
              <Text
                className="font-semibold text-base"
                style={{ color: isLiked ? "#EF4444" : styles.subTextColor }}
              >
                {likedBy.length}
              </Text>
            )}
          </TouchableOpacity>
          <View className="flex-row items-center gap-2">
            <Ionicons
              name="chatbubble-outline"
              size={24}
              color={styles.subTextColor}
            />
            {allCommentsCount > 0 && (
              <Text
                className="font-semibold text-base"
                style={{ color: styles.subTextColor }}
              >
                {allCommentsCount}
              </Text>
            )}
          </View>
        </View>
        <View className="flex-row gap-6">
          <TouchableOpacity onPress={onOpenShare}>
            <Ionicons
              name="share-social-outline"
              size={24}
              color={styles.subTextColor}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onSave}>
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={24}
              color={isSaved ? styles.accentColor : styles.subTextColor}
            />
          </TouchableOpacity>
        </View>
      </View>
      <View
        className="h-[1px] w-full mt-4 opacity-30"
        style={{ backgroundColor: styles.borderColor }}
      />
    </View>
  );
};
export default PostHeader;
