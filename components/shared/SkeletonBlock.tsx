import React, { useMemo, useState } from "react";
import { Animated, StyleProp, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  isDark: boolean;
  shimmer: Animated.Value; // 0..1
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

/**
 * Premium shimmer skeleton block.
 * Uses a shared Animated.Value so we don't spin up per-item animations.
 */
export default function SkeletonBlock({ isDark, shimmer, style, className, enabled = true }: Props) {
  const [width, setWidth] = useState(0);

  const baseColor = isDark ? "#27272A" : "#E5E7EB"; // zinc-800 / gray-200
  const highlight = isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.75)";

  const translateX = useMemo(() => {
    // Move highlight across the element width.
    return shimmer.interpolate({
      inputRange: [0, 1],
      outputRange: [-width, width],
    });
  }, [shimmer, width]);

  return (
    <View
      className={className}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w && w !== width) setWidth(w);
      }}
      style={[
        {
          backgroundColor: baseColor,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {enabled && width > 0 && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: -width,
            width: width * 2,
            transform: [{ translateX }],
          }}
        >
          <LinearGradient
            colors={["transparent", highlight, "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      )}
    </View>
  );
}
