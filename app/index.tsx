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
          <View className="-mt-6 items-center">
            <Text className="text-2xl text-white text-center">
              Listen, Share,{" "}
              <Text className="text-primaryy font-bold">Enjoy!</Text>
            </Text>
            <CustomButtom
              text="SIGN IN"
              containerStyles="w-[200px] mt-20"
              handlePress={() => router.push("/signIn")}
              textStyles=""
            />
            <View className="flex-row gap-2 mt-4 justify-center items-center">
              <Text className="text-white text-sm">Dont have an account?</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push("/signUp")}
              >
                <Text className="text-primaryy font-bold">Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default index;
