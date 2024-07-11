import { View, Text } from "react-native";
import React, { ReactNode } from "react";
import { TouchableOpacity } from "react-native";

interface Props {
  name: string;
  icon: ReactNode;
}

const SettOption = ({ name, icon }: Props) => {
  return (
    <TouchableOpacity activeOpacity={0.7} className="w-full">
      <View className="flex-row justify-end w-full items-center gap-2 mt-3">
        <Text className="text-white font-semibold text-lg">{name}</Text>
        {icon}
      </View>
    </TouchableOpacity>
  );
};

export default SettOption;
