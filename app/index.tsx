import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import CustomButtom from "@/components/CustomButtom";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";

const index = () => {
  return (
    <SafeAreaView className="bg-black flex-1">
      <ScrollView contentContainerStyle={{ height: "100%" }}>
        <View className="w-full justify-center items-center min-h-[90vh] px-4">
          <Image
            source={require("../assets/fullLogo.png")}
            className="w-[170px] h-[170px]"
            resizeMode="contain"
          />
          <View className="-mt-6 w-full items-center">
            <Text className="text-2xl text-white text-center">
              Listen, Share,{" "}
              <Text className="text-primaryy font-bold">Enjoy!</Text>
            </Text>
            <CustomButtom
              text="Continue with Email"
              containerStyles="w-[80%] mt-20"
              handlePress={() => router.push("/signIn")}
              textStyles=""
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default index;
