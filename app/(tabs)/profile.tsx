import { View, Text, ScrollView, Image, TouchableOpacity } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobalContext } from "@/context/GlobalProvider";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "@/lib/appwrite";
import { router } from "expo-router";
import { useState } from "react";
import SongPreview from "@/components/SongPreview";

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
        <View className="w-full p-2">
          <View className="w-full flex-row justify-between items-center">
            <Text className="font-bold text-2xl text-white">Songs</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text className="text-gray">See All</Text>
            </TouchableOpacity>
          </View>
          <SongPreview
            img="https://i.scdn.co/image/ab67616d0000b273d28d2ebdedb220e479743797"
            songTitle="Money Trees"
            autor="Kendrick Lamar"
            replays={31}
          />
          <SongPreview
            img="https://upload.wikimedia.org/wikipedia/en/6/61/Kendrick_Lamar_-_Not_Like_Us.png"
            songTitle="Not Like Us"
            autor="Kendrick Lamar"
            replays={23}
          />
          <SongPreview
            img="https://images.genius.com/bc3bc77f6ba7f01baf80a8ab795f9760.1000x1000x1.jpg"
            songTitle="First Person Shooter (ft. J Cole)"
            autor="Drake"
            replays={15}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default profile;
