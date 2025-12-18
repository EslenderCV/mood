import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import React, { useState } from "react";
import { useGlobalContext } from "@/context/GlobalProvider";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "@/lib/appwrite";
import { router } from "expo-router";

// Existing Components
import SongPreview from "@/components/SongPreview";
import ArtistPreview from "@/components/artistPreview";
import PostsPreview from "@/components/postsPreview";

/**
 * MUSIC COMPONENT
 * Renders the "Songs" and "Artists" sections
 */
const Music = () => {
  return (
    <View className="pb-10">
      {/* Songs Section */}
      <View className="w-full py-2 px-5 mt-3">
        <View className="w-full flex-row justify-between items-center mb-4">
          <Text className="font-black text-xl text-white">Top Songs</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            className="bg-white/10 px-3 py-1 rounded-full"
          >
            <Text className="text-gray-400 text-xs font-bold">SEE ALL</Text>
          </TouchableOpacity>
        </View>

        <View className="gap-y-2">
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
            songTitle="First Person Shooter"
            autor="Drake ft. J Cole"
            replays={15}
          />
        </View>
      </View>

      {/* Artists Section */}
      <View className="w-full p-2 mt-6">
        <View className="w-full flex-row justify-between items-center px-5 mb-4">
          <Text className="font-black text-xl text-white">
            Favorite Artists
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            className="bg-white/10 px-3 py-1 rounded-full"
          >
            <Text className="text-gray-400 text-xs font-bold">SEE ALL</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal={true}
          className="pl-4"
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
    </View>
  );
};

/**
 * POSTS COMPONENT
 * Renders a grid-like view of posts/moods
 */
const Posts = () => {
  return (
    <View className="p-4 flex-row flex-wrap justify-start gap-3">
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

/**
 * MAIN PROFILE SCREEN
 */
const Profile = () => {
  const { user, setUser, setLoggedIn } = useGlobalContext();
  const [focused, setFocused] = useState({ post: true, music: false });

  const logOut = async () => {
    try {
      await signOut();
      setUser(null);
      setLoggedIn(false);
      router.replace("/signIn");
    } catch (error) {
      Alert.alert("Error", "Failed to log out");
    }
  };

  const logOutConfirm = () => {
    Alert.alert("Sign Out", "Are you sure you want to leave?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logOut },
    ]);
  };

  return (
    <View className="flex-1 bg-black">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Top Header Bar */}
        <View className="flex-row justify-between items-center px-6 pt-14 pb-2">
          <Text className="text-white font-black text-2xl tracking-tighter">
            Profile
          </Text>
          <View className="flex-row gap-x-3">
            <TouchableOpacity
              onPress={() => router.push("/editScreen")}
              className="bg-white/10 p-2 rounded-full border border-white/5"
            >
              <Ionicons name="create-outline" color="white" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={logOutConfirm}
              className="bg-red-500/10 p-2 rounded-full border border-red-500/10"
            >
              <Ionicons name="log-out-outline" color="#ef4444" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Identity Section */}
        <View className="items-center px-5 mt-6">
          <View className="p-1.5 rounded-full border-2 border-primaryy shadow-lg shadow-primaryy/50">
            <Image
              source={
                user?.pfp ? { uri: user.pfp } : require("@/assets/noPfp.jpg")
              }
              className="w-[110px] h-[110px] rounded-full"
            />
          </View>

          <View className="items-center mt-4">
            <Text className="text-white text-2xl font-bold">{user?.name}</Text>
            <Text className="text-primaryy font-semibold text-sm">
              @{user?.username}
            </Text>
          </View>
        </View>

        {/* Stats Card */}
        <View className="flex-row justify-between px-8 mt-10 bg-white/5 mx-6 py-5 rounded-3xl border border-white/5">
          <View className="items-center flex-1">
            <Text className="text-white text-xl font-black">
              {user?.followers || 0}
            </Text>
            <Text className="text-white text-[10px] font-bold uppercase tracking-widest mt-1">
              Followers
            </Text>
          </View>
          <View className="w-[1px] h-8 bg-white/10 self-center" />
          <View className="items-center flex-1">
            <Text className="text-white text-xl font-black">1</Text>
            <Text className="text-white text-[10px] font-bold uppercase tracking-widest mt-1">
              Moods
            </Text>
          </View>
          <View className="w-[1px] h-8 bg-white/10 self-center" />
          <View className="items-center flex-1">
            <Text className="text-white text-xl font-black">
              {user?.following || 0}
            </Text>
            <Text className="text-white text-[10px] font-bold uppercase tracking-widest mt-1">
              Following
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View className="mt-10 px-6">
          <View className="flex-row bg-white/5 rounded-2xl p-1.5">
            <TouchableOpacity
              onPress={() => setFocused({ post: true, music: false })}
              className={`flex-1 flex-row gap-x-2 py-3 justify-center items-center rounded-xl ${
                focused.post ? "bg-primaryy" : ""
              }`}
            >
              <Ionicons
                name="library-outline"
                color={focused.post ? "white" : "#6b7280"}
                size={18}
              />
              <Text
                className={`font-bold text-xs ${
                  focused.post ? "text-white" : "text-gray-500"
                }`}
              >
                MOODS
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFocused({ post: false, music: true })}
              className={`flex-1 flex-row gap-x-2 py-3 justify-center items-center rounded-xl ${
                focused.music ? "bg-primaryy" : ""
              }`}
            >
              <Ionicons
                name="musical-notes-outline"
                color={focused.music ? "white" : "#6b7280"}
                size={18}
              />
              <Text
                className={`font-bold text-xs ${
                  focused.music ? "text-white" : "text-gray-500"
                }`}
              >
                MUSIC
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Content */}
        <View className="mt-2">{focused.music ? <Music /> : <Posts />}</View>
      </ScrollView>
    </View>
  );
};

export default Profile;
