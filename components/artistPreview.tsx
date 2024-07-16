import { Text, TouchableOpacity, Image } from "react-native";
import React from "react";

interface Props {
  name: string;
  img: string;
  action: () => void;
}

const ArtistPreview = ({ name, img, action }: Props) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={action}
      className="items-center mx-3 gap-2"
    >
      <Image
        source={{ uri: img }}
        resizeMode="contain"
        className="w-[120px] h-[120px] rounded-full"
      />
      <Text className="text-white">{name}</Text>
    </TouchableOpacity>
  );
};

export default ArtistPreview;
