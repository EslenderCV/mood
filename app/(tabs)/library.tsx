import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const Library = () => {
  return (
    <>
      <SafeAreaView className="bg-black h-full">
        <ScrollView className="p-5 gap-3">
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row items-center gap-2"
          >
            <Ionicons name="bookmark-outline" size={32} color="#5E17EB" />
            <Text className="text-white ">Moods</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row items-center gap-2"
          >
            <Ionicons name="musical-notes-outline" size={32} color="#5E17EB" />
            <Text className="text-white">Songs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row items-center gap-2"
          >
            <Ionicons name="list-outline" size={32} color="#5E17EB" />
            <Text className="text-white">Playlists</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

export default Library;
