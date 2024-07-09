import { View, Text } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import TopBar from "@/components/TopBar";
import { ScrollView } from "react-native";

const Explore = () => {
  return (
    <>
      <SafeAreaView className="bg-black h-full">
        <ScrollView></ScrollView>
      </SafeAreaView>
    </>
  );
};

export default Explore;
