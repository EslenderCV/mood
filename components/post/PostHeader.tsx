import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import PressableScale from "@/components/shared/PressableScale";

import { MoodTag } from "@/components/posts/MoodTag";
import StreakBadge from "@/components/StreakBadge";

type Creator = {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  isVerified?: boolean;
  streak?: number;
};

export const PostHeader = ({
  creator,
  postCreatedAt,
  language,
  textColor,
  subTextColor,
  accentColor,
  isDark,
  mood,
  isPrivate,
  displayStreak,
  onOptionsPress,
  onProfilePress,
  onInteraction,
  getRelativeTime,
}: {
  creator: Creator;
  postCreatedAt: string;
  language: string;
  textColor: string;
  subTextColor: string;
  accentColor: string;
  isDark: boolean;
  mood?: string;
  isPrivate?: boolean;
  displayStreak: number;
  onOptionsPress?: () => void;
  onProfilePress?: (userId: string) => void;
  onInteraction: () => void;
  getRelativeTime: (iso: string, language: string) => string;
}) => {
  const moodObj = React.useMemo(() => {
    if (!mood) return undefined;
    const trimmed = String(mood).trim();
    if (!trimmed) return undefined;

    // If mood was persisted as JSON string, prefer that.
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed?.emoji && parsed?.text) {
          return { emoji: String(parsed.emoji), text: String(parsed.text) };
        }
      } catch {
        // ignore
      }
    }

    // Common format: "😀 Happy".
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2 && parts[0].length <= 4) {
      return { emoji: parts[0], text: parts.slice(1).join(" ") };
    }

    // Fallback: treat the entire string as the mood text.
    return { emoji: "🙂", text: trimmed };
  }, [mood]);

  return (
    <View className="flex-row items-start justify-between mb-3">
      <View className="flex-row items-start flex-1">
        <PressableScale
          onPress={() => {
            onInteraction();
            onProfilePress ? onProfilePress(creator.id) : router.push(`/user/${creator.id}` as any);
          }}
          hapticKind="selection"
          hitSlop={10}
          accessibilityLabel={`Abrir perfil de @${creator.username}`}
          accessibilityHint="Ver el perfil del creador"
        >
          <View
            className={`p-[2px] rounded-full border ${isDark ? "border-zinc-800" : "border-zinc-200"}`}
          >
            <Image
              source={
                creator.avatar
                  ? { uri: creator.avatar }
                  : require("@/assets/noPfp.jpg")
              }
              className="w-10 h-10 rounded-full"
              contentFit="cover"
              transition={200}
              cachePolicy="disk"
              recyclingKey={creator.id}
              priority="high"
            />
          </View>
        </PressableScale>

        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text
              className="font-bold text-[15px] leading-5 mr-1"
              style={{ color: textColor }}
            >
              {creator.name}
            </Text>
            {!!creator.isVerified && (
              <MaterialIcons name="verified" size={14} color={accentColor} />
            )}

            <StreakBadge days={displayStreak} />

            {!!isPrivate && (
              <Ionicons
                name="lock-closed"
                size={12}
                color={subTextColor}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>

          <Text className="text-[13px] font-medium" style={{ color: subTextColor }}>
            @{creator.username} · {getRelativeTime(postCreatedAt, language)}
          </Text>

          {!!mood && (
            <View className="mt-1.5">
              <View
                style={{
                  transform: [{ scale: 0.85 }],
                  alignSelf: "flex-start",
                  marginLeft: -8,
                  marginTop: -2,
                }}
              >
                <MoodTag mood={moodObj} />
              </View>
            </View>
          )}
        </View>
      </View>

      <PressableScale
        onPress={onOptionsPress}
        hapticKind="selection"
        hitSlop={10}
        className="p-2 -mr-2 opacity-60"
        accessibilityLabel="Opciones del post"
        accessibilityHint="Abre el menú de opciones"
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={subTextColor} />
      </PressableScale>
    </View>
  );
};