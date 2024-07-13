import { View, Text, ScrollView, Image, TouchableOpacity } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobalContext } from "@/context/GlobalProvider";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "@/lib/appwrite";
import { router } from "expo-router";
import { useState } from "react";

const profile = () => {
  const { setUser, setLoggedIn } = useGlobalContext();
  const [focused, setFocused] = useState({
    post: true,
    music: false,
  });
  const { user } = useGlobalContext();
  const logOut = async () => {
    await signOut();
    setUser(null);
    setLoggedIn(false);

    router.replace("/signIn");
  };

  return (
    <SafeAreaView className="h-full w-full bg-black">
      <ScrollView className="p-5 gap-5">
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
        <View className="flex-row justify-between top-0 absolute w-full">
          <TouchableOpacity onPress={() => {}} activeOpacity={0.7}>
            <Ionicons name="create-outline" color="#5E17EB" size={24} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => logOut()} activeOpacity={0.7}>
            <Ionicons name="exit-outline" color="#5E17EB" size={24} />
          </TouchableOpacity>
        </View>
        <View className="flex-row justify-around">
          <Text className="text-white">
            Followers{" "}
            <Text className="text-white font-bold">{user?.followers}</Text>
          </Text>
          <Text className="text-white">
            Moods <Text className="text-white font-bold">1</Text>
          </Text>
          <Text className="text-white">
            Following{" "}
            <Text className="text-white font-bold">{user?.following}</Text>
          </Text>
        </View>
        <View className="w-full items-center">
          <View className="w-[60%] flex-row justify-around">
            <TouchableOpacity
              onPress={() => setFocused({ post: true, music: false })}
              activeOpacity={0.7}
            >
              <Ionicons
                name="library-outline"
                color={focused.post ? "white" : "#6D6D6D"}
                size={25}
              />
            </TouchableOpacity>
            <View className="h-[31px] w-[1px] bg-white"></View>
            <TouchableOpacity
              onPress={() => setFocused({ post: false, music: true })}
              activeOpacity={0.7}
            >
              <Ionicons
                name="musical-notes-outline"
                color={focused.music ? "white" : "#6D6D6D"}
                size={25}
              />
            </TouchableOpacity>
          </View>
          <View className="w-[300px] h-[1px] bg-white"></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default profile;
