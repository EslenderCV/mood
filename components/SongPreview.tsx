import { View, Text, TouchableOpacity, Image } from "react-native";
import React from "react";

interface Props {
  img: string;
  songTitle: string;
  autor: string;
  replays: number;
}

const SongPreview = ({ img, songTitle, autor, replays }: Props) => {
  return (
    <TouchableOpacity activeOpacity={0.7} className="mt-2">
      <View className="flex-row items-center gap-2">
        <Image
          source={{ uri: img }}
          className="w-[50px] h-[50px]"
          resizeMode="contain"
        />
        <View>
          <Text className="text-white">{songTitle}</Text>
          <Text className="text-gray">{`${autor} \u2022 ${replays}`} </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default SongPreview;
