import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";
import * as Haptics from "expo-haptics";

interface PostModalHeaderProps {
  onClose: () => void;
  onPublish: () => void;
  canPublish: boolean;
}

const PostModalHeader = React.memo(
  ({ onClose, onPublish, canPublish }: PostModalHeaderProps) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";
    const { t } = useLanguage();
    const subTextColor = isDark ? "#A1A1AA" : "#71717A";

    // Animación del botón Publicar
    const scaleAnim = useRef(new Animated.Value(canPublish ? 1 : 0.95)).current;
    const opacityAnim = useRef(
      new Animated.Value(canPublish ? 1 : 0.6),
    ).current;

    useEffect(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: canPublish ? 1 : 0.95,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: canPublish ? 1 : 0.6,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, [canPublish]);

    return (
      <View className="flex-row justify-between items-center mb-6 mt-2">
        <TouchableOpacity
          onPress={onClose}
          className="p-1"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text
            className="text-base font-medium"
            style={{ color: subTextColor }}
          >
            {t("post.cancel")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (canPublish) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onPublish();
            }
          }}
          disabled={!canPublish}
          activeOpacity={0.8}
        >
          <Animated.View
            style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}
            className={`px-6 py-2 rounded-full ${canPublish ? "bg-[#5E17EB]" : "bg-zinc-700"}`}
          >
            <Text className="text-white font-bold text-base">
              {t("post.publish")}
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  },
);


PostModalHeader.displayName = "PostModalHeader";

export default PostModalHeader;
