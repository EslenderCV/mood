import React from "react";
import { Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface MoodTagProps {
  mood?: {
    emoji: string;
    text: string;
  };
}

// 🔥 IMPORTANTE: Debe ser "export const", NO "export default"
export const MoodTag = ({ mood }: MoodTagProps) => {
  if (!mood || !mood.emoji) return null;

  return (
    <LinearGradient
      colors={["rgba(94, 23, 235, 0.15)", "rgba(94, 23, 235, 0.05)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: "rgba(94, 23, 235, 0.3)",
        marginBottom: 8,
        marginTop: 4,
        gap: 5,
      }}
    >
      <Text style={{ fontSize: 14 }}>{mood.emoji}</Text>
      {mood.text && (
        <Text
          style={{
            color: "#5E17EB",
            fontWeight: "700",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {mood.text}
        </Text>
      )}
    </LinearGradient>
  );
};
