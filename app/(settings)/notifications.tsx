import { View, Text, SectionList, Image, TouchableOpacity } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const NOTIFICATIONS = [
  {
    title: "Nuevas",
    data: [
      {
        id: "1",
        type: "like",
        user: "Rosalía",
        avatar:
          "https://i.scdn.co/image/ab6761610000e5eb009265f02c6b41295fc37172",
        text: "le gustó tu mood.",
        time: "2 min",
        content: "Vibra Nocturna 🌙",
      },
      {
        id: "2",
        type: "follow",
        user: "Bad Bunny",
        avatar:
          "https://i.scdn.co/image/ab6761610000e5eb9ad50e564cc8b7dc5da82c50",
        text: "empezó a seguirte.",
        time: "15 min",
      },
    ],
  },
  {
    title: "Hoy",
    data: [
      {
        id: "3",
        type: "mention",
        user: "El Alfa",
        avatar:
          "https://i.scdn.co/image/ab6761610000e5ebf8697e555476a6d68205cd9c",
        text: "te mencionó en un comentario.",
        time: "4h",
        content: "@angel dale play a esto 🔥",
      },
    ],
  },
  {
    title: "Esta semana",
    data: [
      {
        id: "4",
        type: "like",
        user: "Drake",
        avatar:
          "https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9",
        text: "le gustó tu playlist.",
        time: "2d",
        content: "Gym Motivation",
      },
    ],
  },
];

const Notifications = () => {
  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-6 py-4 flex-row items-center border-b border-zinc-900 justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-4 p-2 bg-zinc-900 rounded-full"
          >
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Actividad</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={22} color="white" />
        </TouchableOpacity>
      </View>
      <SectionList
        sections={NOTIFICATIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 50 }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section: { title } }) => (
          <Text className="text-zinc-500 font-bold text-xs uppercase tracking-widest mt-8 mb-4">
            {title}
          </Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row items-start mb-6"
          >
            <View className="relative mr-4">
              <Image
                source={{ uri: item.avatar }}
                className="w-12 h-12 rounded-full bg-zinc-800 border border-white/10"
              />
              <View
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full items-center justify-center border border-black ${
                  item.type === "like"
                    ? "bg-[#FF2D55]"
                    : item.type === "follow"
                    ? "bg-[#5E17EB]"
                    : "bg-blue-500"
                }`}
              >
                <Ionicons
                  name={
                    item.type === "like"
                      ? "heart"
                      : item.type === "follow"
                      ? "person-add"
                      : "at"
                  }
                  size={10}
                  color="white"
                />
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-white text-[15px] leading-5">
                <Text className="font-bold">{item.user}</Text>{" "}
                <Text className="text-zinc-300">{item.text}</Text>
              </Text>
              {item.content && (
                <Text
                  className="text-zinc-500 text-sm mt-0.5 font-medium"
                  numberOfLines={1}
                >
                  "{item.content}"
                </Text>
              )}
              <Text className="text-zinc-600 text-xs mt-1">{item.time}</Text>
            </View>
            {item.type === "follow" ? (
              <TouchableOpacity className="bg-[#5E17EB] px-4 py-1.5 rounded-lg ml-2">
                <Text className="text-white text-xs font-bold">Seguir</Text>
              </TouchableOpacity>
            ) : (
              <View className="w-10 h-10 bg-zinc-800 rounded-lg ml-2 border border-white/5" />
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center mt-32">
            <Ionicons
              name="notifications-off-outline"
              size={48}
              color="#3F3F46"
            />
            <Text className="text-zinc-500 mt-4">
              No tienes notificaciones nuevas.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default Notifications;
