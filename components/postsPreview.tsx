import { Image, TouchableOpacity } from "react-native";
import React from "react";

interface Props {
  img: string;
  action: () => void;
}

const PostsPreview = ({ img, action }: Props) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={action}
      className="border border-solid border-black"
    >
      <Image source={{ uri: img }} className="w-[125px] h-[125px]" />
    </TouchableOpacity>
  );
};

export default PostsPreview;
