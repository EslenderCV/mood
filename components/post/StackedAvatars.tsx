import React from "react";
import { View, Image } from "react-native";
import { useColorScheme } from "nativewind";

interface StackedAvatarsProps {
  avatars: (string | null)[];
  limit?: number;
  size?: number;
}

export const StackedAvatars: React.FC<StackedAvatarsProps> = ({
  avatars,
  limit = 3,
  size = 20, // Un poco más grandes para que se vean bien
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const borderColor = isDark ? "#000000" : "#FFFFFF";

  const validAvatars = avatars.filter((a) => !!a).slice(0, limit);

  if (validAvatars.length === 0) return null;

  return (
    <View
      className="flex-row items-center mr-2 relative"
      style={{
        width: size * 0.7 * (validAvatars.length - 1) + size, // Cálculo exacto del ancho
        height: size,
      }}
    >
      {validAvatars.map((uri, index) => (
        <Image
          key={index}
          source={{ uri: uri! }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1.5,
            borderColor: borderColor,
            position: "absolute",
            left: index * (size * 0.65), // Superposición
            zIndex: validAvatars.length - index, // El primero va arriba
          }}
        />
      ))}
    </View>
  );
};
