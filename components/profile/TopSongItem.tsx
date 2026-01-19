import React, { memo } from "react";
import { TouchableOpacity, View, Text } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

interface TopSongItemProps {
  item: any;
  index: number;
  textColor: string;
  subTextColor: string;
  cardBg: string;
  borderColor: string;
  activeColor: string;
  isDark: boolean;
}

const TopSongItem = ({
  item,
  index,
  textColor,
  subTextColor,
  cardBg,
  borderColor,
  activeColor,
  isDark,
}: TopSongItemProps) => {
  const handlePress = () => {
    Haptics.selectionAsync();
    router.push(`/post/${item.postId}` as any);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="flex-row items-center px-6 py-3 border-b w-full"
      style={{ borderColor: borderColor }}
    >
      <Text
        className="font-bold text-lg mr-4 w-6 text-center"
        style={{ color: activeColor }}
      >
        {index + 1}
      </Text>
      <Image
        source={{ uri: item.cover }}
        className="w-14 h-14 rounded-xl mr-4"
        style={{ backgroundColor: cardBg }}
        contentFit="cover"
        transition={300}
      />
      <View className="flex-1">
        <Text
          className="font-bold text-base"
          numberOfLines={1}
          style={{ color: textColor }}
        >
          {item.title}
        </Text>
        <Text
          className="text-sm"
          numberOfLines={1}
          style={{ color: subTextColor }}
        >
          {item.artist}
        </Text>
      </View>
      <View
        className="flex-row items-center px-2 py-1 rounded-lg"
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F4F4F5",
        }}
      >
        <Ionicons
          name="heart"
          size={12}
          color="#EF4444"
          style={{ marginRight: 4 }}
        />
        <Text className="text-xs font-bold" style={{ color: textColor }}>
          {item.likes}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default memo(TopSongItem);
