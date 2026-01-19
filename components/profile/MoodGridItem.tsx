import React, { memo } from "react";
import { TouchableOpacity, View, Text, Dimensions } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");
const ITEM_SIZE = width / 3;

interface MoodGridItemProps {
  item: any;
  cardBg: string;
  borderColor: string;
}

const MoodGridItem = ({ item, cardBg, borderColor }: MoodGridItemProps) => {
  const songData = (() => {
    try {
      if (!item.songData) return null;
      const parsed = JSON.parse(item.songData);
      if (parsed.cover?.includes("100x100bb")) {
        parsed.cover = parsed.cover.replace("100x100bb", "600x600bb");
      }
      return parsed;
    } catch {
      return null;
    }
  })();

  const imageUrl = songData ? songData.cover : null;

  const handlePress = () => {
    Haptics.selectionAsync();
    router.push(`/post/${item.$id}` as any);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={{ width: ITEM_SIZE, height: ITEM_SIZE, padding: 0.5 }}
    >
      <Image
        source={imageUrl ? { uri: imageUrl } : require("@/assets/noPfp.jpg")}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: cardBg,
          borderColor: borderColor,
          borderWidth: 0.5,
        }}
        contentFit="cover"
        transition={200}
      />
      {item.likedBy && item.likedBy.length > 0 && (
        <View className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded flex-row items-center">
          <Ionicons name="heart" size={10} color="white" />
          <Text className="text-white text-[10px] ml-1 font-bold">
            {item.likedBy.length}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default memo(MoodGridItem);
