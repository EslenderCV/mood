import { View, Text, ScrollView } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import TopBar from "@/components/TopBar";
import { Image } from "react-native";

const home = () => {
  return (
    <>
      <SafeAreaView className="bg-black h-full">
        <TopBar />
        <ScrollView>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

export default home;
