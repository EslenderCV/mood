import { View, Text, TouchableOpacity } from "react-native";
import React, { ReactNode } from "react";

interface Props {
  name: string;
  icon: ReactNode;
  onPress?: () => void;
}

const SettOption = ({ name, icon, onPress }: Props) => {
  return (
    <TouchableOpacity activeOpacity={0.7} className="w-full" onPress={onPress}>
      <View className="flex-row justify-end w-full items-center gap-2 mt-3">
        <Text className="text-white font-semibold text-lg">{name}</Text>
        <View className="w-8 items-center justify-center">{icon}</View>
      </View>
    </TouchableOpacity>
  );
};

export default SettOption;
