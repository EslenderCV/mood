import { TouchableOpacity, Text } from "react-native";
import React from "react";

interface Props {
  text: string;
  containerStyles: string;
  handlePress: () => void;
  textStyles: string;
}

const CustomButtom = ({
  text,
  containerStyles,
  handlePress,
  textStyles,
}: Props) => {
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className={`border-solid border border-primaryy rounded min-h-[40px] justify-center items-center ${containerStyles}`}
    >
      <Text className={`text-primaryy text-lg ${textStyles}`}>{text}</Text>
    </TouchableOpacity>
  );
};

export default CustomButtom;
