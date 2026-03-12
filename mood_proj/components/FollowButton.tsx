import React from "react";
import { Text } from "react-native";
import PressableScale from "@/components/shared/PressableScale";
import { useLanguage } from "@/context/LanguageContext";

interface FollowButtonProps {
  isFollowing: boolean;
  isFollower: boolean;
  onPress: () => void;
}

export const FollowButton = ({
  isFollowing,
  isFollower,
  onPress,
}: FollowButtonProps) => {
  const { t } = useLanguage();
  const getLabel = () => {
    if (isFollowing) return t("common.following");
    if (isFollower) return t("common.followBack");
    return t("common.follow");
  };

  return (
    <PressableScale
      onPress={onPress}
      hapticKind="light"
      className={`h-10 px-5 rounded-full flex-row items-center justify-center ${
        isFollowing
          ? "bg-transparent border border-border"
          : "bg-accent"
      }`}
    >
      <Text
        className={`font-semibold text-sm ${
          isFollowing ? "text-zinc-900 dark:text-white" : "text-white"
        }`}
      >
        {getLabel()}
      </Text>
    </PressableScale>
  );
};
