import React from "react";
import { TouchableOpacity, Text } from "react-native";

interface FollowButtonProps {
  isFollowing: boolean; // ¿Yo lo sigo?
  isFollower: boolean; // ¿Él me sigue?
  onPress: () => void;
}

export const FollowButton = ({
  isFollowing,
  isFollower,
  onPress,
}: FollowButtonProps) => {
  const getLabel = () => {
    if (isFollowing) return "Siguiendo";
    if (isFollower) return "Seguir también"; // O "Follow Back"
    return "Seguir";
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`h-9 px-5 rounded-full flex-row items-center justify-center ${
        isFollowing
          ? "bg-transparent border border-zinc-300 dark:border-zinc-700"
          : "bg-[#5E17EB]"
      }`}
    >
      <Text
        className={`font-semibold text-sm ${
          isFollowing ? "text-zinc-900 dark:text-white" : "text-white"
        }`}
      >
        {getLabel()}
      </Text>
    </TouchableOpacity>
  );
};
