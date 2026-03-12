import React from "react";
import { View, FlatList, TouchableOpacity, Image, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useLanguage } from "@/context/LanguageContext";

// Props
interface StoriesRailProps {
  currentUser: any;
  groupedStories: any[];
  onPressStoryGroup: (group: any) => void;
  onAddStory: () => void;
  moodOfficialId: string;
}

const StoriesRail = ({
  currentUser,
  groupedStories,
  onPressStoryGroup,
  onAddStory,
  moodOfficialId,
}: StoriesRailProps) => {
  const { t } = useLanguage();

  const myStoriesGroup = groupedStories.find(
    (g) => g.userId === currentUser?.$id,
  );
  const friendsStories = groupedStories.filter(
    (g) => g.userId !== currentUser?.$id,
  );

  const AddStoryButton = () => (
    <TouchableOpacity
      onPress={onAddStory}
      className="items-center mr-5"
      activeOpacity={0.9}
    >
      <View className="relative">
        <View className="w-[68px] h-[68px] rounded-full bg-black border border-zinc-800 items-center justify-center">
          <Image
            source={
              currentUser?.pfp
                ? { uri: currentUser.pfp }
                : require("@/assets/noPfp.jpg")
            }
            className="w-[62px] h-[62px] rounded-full opacity-60"
          />
          <View className="absolute inset-0 items-center justify-center bg-black/20 rounded-full">
            <Ionicons name="add" size={28} color="white" />
          </View>
        </View>
        <View className="absolute bottom-0 right-0 bg-[#5E17EB] rounded-full w-6 h-6 items-center justify-center border-[3px] border-black">
          <Ionicons name="add" size={14} color="white" />
        </View>
      </View>
      <Text className="text-[11px] mt-1.5 font-medium text-white text-center">
        {t("story.yourStory")}
      </Text>
    </TouchableOpacity>
  );

  const MyStoryCircle = ({
    group,
    colors,
  }: {
    group: any;
    colors: string[];
  }) => (
    <TouchableOpacity
      onPress={() => onPressStoryGroup(group)}
      className="items-center mr-5"
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={colors as any}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 1, y: 1 }}
        className="rounded-full p-[2.5px]"
      >
        <View className="bg-black rounded-full p-[2.5px]">
          <Image
            source={
              group.user?.pfp
                ? { uri: group.user?.pfp }
                : require("@/assets/noPfp.jpg")
            }
            className="w-[64px] h-[64px] rounded-full bg-zinc-800"
          />
        </View>
      </LinearGradient>
      <Text
        className="text-[11px] mt-1.5 font-medium text-white w-20 text-center"
        numberOfLines={1}
      >
        {t("story.yourStory")}
      </Text>
    </TouchableOpacity>
  );

  const railData = [
    "add-button",
    ...(myStoriesGroup ? [myStoriesGroup] : []),
    ...friendsStories,
  ];

  return (
    <View className="py-4 border-b border-zinc-900 bg-black">
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        data={railData}
        keyExtractor={(item: any) =>
          typeof item === "string" ? item : item.userId
        }
        renderItem={({ item }) => {
          if (item === "add-button") return <AddStoryButton />;

          let isSeen = false;
          if (item.stories && item.stories.length > 0) {
            isSeen = item.stories.every(
              (s: any) => s.viewers && s.viewers.includes(currentUser?.$id),
            );
          }

          const borderColors = isSeen
            ? ["#3F3F46", "#3F3F46", "#3F3F46"]
            : ["#5E17EB", "#9333EA", "#5E17EB"];

          if (item.userId === currentUser?.$id)
            return <MyStoryCircle group={item} colors={borderColors} />;

          const isOfficialMood = item.userId === moodOfficialId;
          const isVerified = item.user?.isVerified || isOfficialMood;

          return (
            <TouchableOpacity
              onPress={() => onPressStoryGroup(item)}
              className="items-center mr-5"
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={borderColors as any}
                start={{ x: 0.1, y: 0.1 }}
                end={{ x: 1, y: 1 }}
                className="rounded-full p-[2.5px]"
              >
                <View className="bg-black rounded-full p-[2.5px]">
                  {isOfficialMood ? (
                    <Image
                      source={require("@/assets/images/icon.png")}
                      className="w-[64px] h-[64px] rounded-full bg-black"
                      resizeMode="cover"
                    />
                  ) : (
                    <Image
                      source={
                        item.user?.pfp
                          ? { uri: item.user?.pfp }
                          : require("@/assets/noPfp.jpg")
                      }
                      className="w-[64px] h-[64px] rounded-full bg-zinc-800"
                    />
                  )}
                </View>
              </LinearGradient>
              <View className="flex-row items-center justify-center mt-1.5 w-20">
                <Text
                  className="text-[11px] font-medium text-white text-center mr-0.5"
                  numberOfLines={1}
                >
                  {item.user?.name || item.user?.username || "Usuario"}
                </Text>
                {isVerified && (
                  <MaterialIcons
                    name="verified"
                    size={12}
                    color="#5E17EB"
                    style={{ marginLeft: 2 }}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

export default StoriesRail;
