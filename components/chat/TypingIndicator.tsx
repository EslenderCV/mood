import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { useColorScheme } from "nativewind";

const Dot = ({ delay }: { delay: number }) => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 400 }), // Sube
          withTiming(0, { duration: 400 }), // Baja
        ),
        -1, // Infinito
        true, // Reverse (no necesario aquí por sequence, pero por si acaso)
      ),
    );
  }, [delay, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Animated.View
      style={[
        styles.dot,
        animatedStyle,
        { backgroundColor: isDark ? "#A1A1AA" : "#71717A" },
      ]}
    />
  );
};

export const TypingIndicator = ({ isVisible }: { isVisible: boolean }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  if (!isVisible) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "#27272A" : "#E5E5EA", // Gris burbuja
          borderBottomLeftRadius: 4,
        },
      ]}
    >
      <Dot delay={0} />
      <Dot delay={200} />
      <Dot delay={400} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 18,
    alignSelf: "flex-start",
    marginLeft: 12,
    marginBottom: 8,
    marginTop: 4,
    gap: 4,
    minWidth: 50,
    height: 38,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
