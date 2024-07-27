import { View, Text, ScrollView, Image, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import { useGlobalContext } from "@/context/GlobalProvider";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { StyleSheet } from "react-native";

const editScreen = () => {
  const { user } = useGlobalContext();
  const [image, setImage] = useState<any>(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 4],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) setImage(result.assets[0].uri);
  };

  return (
    <SafeAreaView>
      <ScrollView>
        <View className="items-center">
          <View className="relative w-[110px] h-[110px]">
            <TouchableOpacity
              activeOpacity={0.9}
              className="bg-black/70 absolute w-full h-full z-10 items-center justify-center rounded-full"
              onPress={pickImage}
            >
              <Ionicons name="camera-outline" color="#6D6D6D" size={34} />
            </TouchableOpacity>
            <Image
              source={{ uri: user?.pfp }}
              resizeMode="contain"
              className="w-[110px] h-[110px] rounded-full"
            />
          </View>
          <Text className="text-white mt-5">Change photo</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
export default editScreen;
