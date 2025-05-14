import { View, Text, ScrollView, Image, TouchableOpacity } from "react-native";
import React from "react";
import { useGlobalContext } from "@/context/GlobalProvider";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { updateImage } from "@/lib/appwrite";

const editScreen = () => {
  const { user } = useGlobalContext();

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 4],
      quality: 1,
    });

    if (!result.canceled) updateImage(result.assets[0]);
    
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
              source={user?.pfp != null ? {uri: user.pfp} : require("@/assets/noPfp.jpg")}
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
