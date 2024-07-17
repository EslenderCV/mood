import { View, Text, ScrollView, Image, TouchableOpacity } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobalContext } from "@/context/GlobalProvider";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "@/lib/appwrite";
import { router } from "expo-router";
import { useState } from "react";
import SongPreview from "@/components/SongPreview";
import ArtistPreview from "@/components/artistPreview";
import PostsPreview from "@/components/postsPreview";

const Music = () => {
  return (
    <>
      <View className="w-full py-2 px-5 mt-3">
        <View className="w-full flex-row justify-between items-center">
          <Text className="font-black text-2xl text-white">Songs</Text>
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
      <View className="w-full p-2 mt-3">
        <View className="w-full flex-row justify-between items-center px-5">
          <Text className="font-black text-2xl text-white">Artists</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text className="text-gray">See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal={true}
          className="p-2"
          showsHorizontalScrollIndicator={false}
        >
          <ArtistPreview
            name="Eladio Carrion"
            action={() => {}}
            img="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR1dJHmLBtYW2bQ9O2lDuD8JPWtwuVejiTecw&s"
          />
          <ArtistPreview
            name="Kanye West"
            action={() => {}}
            img="https://hips.hearstapps.com/hmg-prod/images/kanye-west-attends-the-christian-dior-show-as-part-of-the-paris-fashion-week-womenswear-fall-winter-2015-2016-on-march-6-2015-in-paris-france-photo-by-dominique-charriau-wireimage-square.jpg"
          />
          <ArtistPreview
            name="Travis Scott"
            action={() => {}}
            img="https://media.npr.org/assets/img/2021/11/16/gettyimages-1235223332_sq-e88ad790d447bd7dfcb0c1571047db26d39a8ee0.jpg?s=1100&c=50&f=jpeg"
          />
        </ScrollView>
      </View>
    </>
  );
};

const Posts = () => {
  return (
    <View className="p-2 flex-row justify-center">
      <PostsPreview
        img="https://akamai.sscdn.co/letras/360x360/albuns/d/a/0/9/1720801679057910.jpg"
        action={() => {}}
      />
      <PostsPreview
        img="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSKEvkLFCXXu6M-wQzar-CphRcNkXE62Rao4Q&s"
        action={() => {}}
      />
      <PostsPreview
        img="https://i1.sndcdn.com/artworks-xHQ5tvnbzVooD0yz-gkzBjg-t500x500.jpg"
        action={() => {}}
      />
    </View>
  );
};

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
    <>
      <View className="h-full w-full bg-black pt-16">
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="items-center gap-3 px-5">
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
          <View className="flex-row justify-between top-0 absolute w-full px-5">
            <TouchableOpacity onPress={() => {}} activeOpacity={0.7}>
              <Ionicons name="create-outline" color="#5E17EB" size={24} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => logOut()} activeOpacity={0.7}>
              <Ionicons name="exit-outline" color="#5E17EB" size={24} />
            </TouchableOpacity>
          </View>
          <View className="flex-row justify-around px-5 mt-3">
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
          <View className="w-full items-center px-5 mt-3">
            <View className="w-full flex-row justify-around">
              <TouchableOpacity
                onPress={() => setFocused({ post: true, music: false })}
                activeOpacity={0.7}
                className="w-[50%] h-full items-center"
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
                className="w-[50%] h-full items-center"
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
          {focused.music ? <Music /> : <Posts />}
        </ScrollView>
      </View>
    </>
  );
};

export default profile;
