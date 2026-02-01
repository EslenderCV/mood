import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import PressableScale from "@/components/shared/PressableScale";
import { useMoodState } from "@/src/brain/session/useMoodState";
import { colors } from "@/src/design/tokens";

type Props = {
  /** Optional: render smaller pill (default false). */
  compact?: boolean;
  onPress?: () => void;
};

const labelFromVector = (energy: number, valence: number) => {
  const e = energy;
  const v = valence;

  if (e >= 0.65 && v >= 0.6) return { label: "Hype", icon: "flash-outline" as const };
  if (e <= 0.35 && v >= 0.6) return { label: "Chill", icon: "moon-outline" as const };
  if (e >= 0.65 && v <= 0.4) return { label: "Rage", icon: "flame-outline" as const };
  if (e <= 0.35 && v <= 0.4) return { label: "Sad", icon: "rainy-outline" as const };
  if (v >= 0.62) return { label: "Good Vibes", icon: "happy-outline" as const };
  if (v <= 0.38) return { label: "Moody", icon: "sad-outline" as const };
  return { label: "Balanced", icon: "pulse-outline" as const };
};

/**
 * A lightweight, music-first “session vibe” indicator.
 * It updates as the user scrolls/listens/likes — and becomes the basis for personalization.
 */
export default function VibePill({ compact = false, onPress }: Props) {
  const { vector } = useMoodState();

  const model = useMemo(
    () => labelFromVector(vector.energy ?? 0.5, vector.valence ?? 0.5),
    [vector.energy, vector.valence],
  );

  const padX = compact ? "px-3" : "px-4";
  const padY = compact ? "py-2" : "py-2.5";
  const txt = compact ? "text-[12px]" : "text-[13px]";

  return (
    <View className="px-5 pt-3">
      <PressableScale
        hapticKind="light"
        onPress={onPress}
        className="self-start"
        accessibilityRole="button"
        accessibilityLabel={`Your vibe: ${model.label}`}
      >
        <LinearGradient
          colors={["rgba(94,23,235,0.35)", "rgba(236,72,153,0.18)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className={`rounded-full ${padX} ${padY} flex-row items-center border`}
          style={{ borderColor: "rgba(255,255,255,0.10)" }}
        >
          <Ionicons name={model.icon} size={16} color={colors.textPrimary} />
          <Text className={`ml-2 ${txt} text-white font-semibold`}>
            {model.label}
          </Text>
          <Text className={`ml-2 ${txt} text-white/60`}>
            {Math.round((vector.energy ?? 0.5) * 100)}%
          </Text>
        </LinearGradient>
      </PressableScale>
    </View>
  );
}
