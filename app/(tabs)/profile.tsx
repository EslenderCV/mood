import { View, Text, ScrollView, Image } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobalContext } from "@/context/GlobalProvider";

const profile = () => {
  const { user } = useGlobalContext();

  return (
    <SafeAreaView className="h-full w-full bg-black">
      <ScrollView className="p-5">
        <View className="items-center gap-3">
          <Image
            source={{ uri: user?.pfp }}
            resizeMode="contain"
            className="w-[120px] h-[120px] rounded-full"
          />
          <View className="items-center">
            <Text className="text-white text-xl font-semibold">
              {user?.name}
            </Text>
            <Text className="text-gray text-sm -mt-2">@{user?.username}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default profile;
