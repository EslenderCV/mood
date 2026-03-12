import { Text } from "react-native";
import React from "react";
import PressableScale from "@/components/shared/PressableScale";

interface Props {
  text: string;
  containerStyles: string;
  handlePress: () => void;
  textStyles: string;
  loading: boolean;
}

const CustomButtom = ({
  text,
  containerStyles,
  handlePress,
  textStyles,
  loading,
}: Props) => {
  return (
    <PressableScale
      onPress={handlePress}
      disabled={loading}
      hapticKind="selection"
      className={`border-solid border border-accent rounded-xl min-h-[44px] justify-center items-center ${containerStyles} ${
        loading ? "opacity-70" : ""
      }`}
    >
      <Text className={`text-accent text-lg font-semibold ${textStyles}`}>
        {text}
      </Text>
    </PressableScale>
  );
};

export default CustomButtom;
