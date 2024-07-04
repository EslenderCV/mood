import { View, Text } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

const home = () => {
  return (
    <SafeAreaView className="bg-black flex-1">
      <Text className="text-primaryy">home</Text>
    </SafeAreaView>
  );
};

export default home;
