import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

interface PostNavbarProps {
  styles: any;
  onOptions: () => void;
}

export const PostNavbar = ({ styles, onOptions }: PostNavbarProps) => {
  return (
    <View
      className="flex-row items-center justify-between px-4 h-[50px] border-b z-10"
      style={{
        backgroundColor: styles.bgColor,
        borderColor: styles.borderColor,
      }}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        className="p-2 -ml-2 rounded-full active:bg-zinc-100 dark:active:bg-zinc-800"
      >
        <Ionicons name="arrow-back" size={24} color={styles.backIconColor} />
      </TouchableOpacity>
      <Text className="font-bold text-base" style={{ color: styles.textColor }}>
        Vibe
      </Text>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onOptions();
        }}
        className="p-2 -mr-2 rounded-full active:bg-zinc-100 dark:active:bg-zinc-800"
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={24}
          color={styles.textColor}
        />
      </TouchableOpacity>
    </View>
  );
};
