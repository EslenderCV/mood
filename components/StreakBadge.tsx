import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface StreakBadgeProps {
  days: number;
  size?: "small" | "large";
}

const StreakBadge = ({ days, size = "small" }: StreakBadgeProps) => {
  if (days < 1) return null;

  // Lógica de Evolución del Fuego
  let iconName: keyof typeof Ionicons.glyphMap = "flame-outline";
  let colors = ["#A78BFA", "#5E17EB"]; // Morado suave

  if (days >= 3 && days < 10) {
    iconName = "flame"; // Fuego lleno
    colors = ["#C084FC", "#7C3AED"]; // Violeta intenso
  } else if (days >= 10 && days < 30) {
    iconName = "bonfire"; // Fogata
    colors = ["#E879F9", "#D946EF", "#5E17EB"]; // Magenta a Morado (Místico)
  } else if (days >= 30) {
    iconName = "flash"; // Rayo/Dios del fuego
    colors = ["#F472B6", "#C084FC", "#4F46E5"]; // Fuego cósmico
  }

  const iconSize = size === "small" ? 12 : 60;
  const fontSize = size === "small" ? 10 : 32;
  const paddingVertical = size === "small" ? 2 : 10;
  const paddingHorizontal = size === "small" ? 6 : 20;

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: paddingVertical,
        paddingHorizontal: paddingHorizontal,
        borderRadius: 100,
        gap: size === "small" ? 2 : 8,
        marginLeft: 4,
      }}
    >
      <Ionicons name={iconName} size={iconSize} color="white" />
      <Text
        style={{
          color: "white",
          fontWeight: "900",
          fontSize: fontSize,
          fontStyle: "italic",
        }}
      >
        {days}
      </Text>
    </LinearGradient>
  );
};

export default StreakBadge;
