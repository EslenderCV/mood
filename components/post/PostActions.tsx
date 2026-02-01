import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import PressableScale from "@/components/shared/PressableScale";

export const PostActions = ({
  postId,
  likesCount,
  isLiked,
  isSaved,
  accentColor,
  iconColor,
  subTextColor,
  commentsCount,
  onLikePress,
  onSavePress,
  onSharePress,
  onCommentPress,
  onInteraction,
}: {
  postId: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  accentColor: string;
  iconColor: string;
  subTextColor: string;
  onLikePress: () => void;
  onSavePress: () => void;
  onSharePress: () => void;
  onCommentPress?: (postId: string) => void;
  onInteraction: () => void;
}) => {
  // Important: keep hit areas generous but NOT overlapping.
  // We avoid `gap-*` here to keep spacing consistent across NativeWind/RN versions.
  const hit = { top: 8, bottom: 8, left: 8, right: 8 };

  return (
    <View className="flex-row justify-between items-center pr-1 mt-1">
      <View className="flex-row items-center">
        <PressableScale
          className="flex-row items-center"
          onPress={onLikePress}
          hapticKind="light"
          hitSlop={hit}
          accessibilityLabel={isLiked ? "Quitar like" : "Dar like"}
          accessibilityHint="Marca este post como que te gusta"
          // ensure the touch target is confined to its own bounds
          style={{ paddingHorizontal: 2, paddingVertical: 2 }}
        >
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={24}
            color={isLiked ? "#EF4444" : iconColor}
          />
          {likesCount > 0 && (
            <Text
              className="text-[13px] font-semibold"
              style={{
                color: isLiked ? "#EF4444" : subTextColor,
                marginLeft: 6,
              }}
            >
              {likesCount}
            </Text>
          )}
        </PressableScale>

        <View className="w-6" />

        <PressableScale
          className="flex-row items-center"
          onPress={() => {
            onInteraction();
            onCommentPress
              ? onCommentPress(postId)
              : router.push(`/post/${postId}` as any);
          }}
          hapticKind="selection"
          hitSlop={hit}
          accessibilityLabel="Abrir comentarios"
          accessibilityHint="Ver y escribir comentarios"
          style={{ paddingHorizontal: 2, paddingVertical: 2 }}
        >
          <Ionicons name="chatbubble-outline" size={24} color={iconColor} />
          {commentsCount > 0 && (
            <Text
              className="text-[13px] font-semibold"
              style={{ color: subTextColor, marginLeft: 6 }}
            >
              {commentsCount}
            </Text>
          )}
        </PressableScale>

        <View className="w-6" />

        <PressableScale
          onPress={onSavePress}
          hapticKind="selection"
          hitSlop={hit}
          accessibilityLabel={isSaved ? "Quitar guardado" : "Guardar"}
          accessibilityHint="Guarda este post para verlo luego"
          style={{ paddingHorizontal: 2, paddingVertical: 2 }}
        >
          <Ionicons
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={24}
            color={isSaved ? accentColor : iconColor}
          />
        </PressableScale>
      </View>

      <PressableScale
        onPress={() => {
          onInteraction();
          onSharePress();
        }}
        hapticKind="selection"
        hitSlop={hit}
        accessibilityLabel="Compartir"
        accessibilityHint="Comparte este post"
        style={{ paddingHorizontal: 2, paddingVertical: 2 }}
      >
        <Ionicons name="share-social-outline" size={24} color={iconColor} />
      </PressableScale>
    </View>
  );
};
