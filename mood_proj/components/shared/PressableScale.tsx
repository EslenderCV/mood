import React from "react";
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  View,
} from "react-native";

import { haptic, HapticKind } from "@/src/design/haptics";
import { motion } from "@/src/design/motion";

type Props = Omit<PressableProps, "style" | "children"> & {
  children?: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** scale value when pressed (default: motion.pressed.scaleTo) */
  scaleTo?: number;
  /** optional haptic feedback on press-in */
  hapticKind?: HapticKind;
};

/**
 * Pressable with a subtle scale-down interaction to eliminate "dead" taps.
 * This is intentionally lightweight (no reanimated) to avoid introducing perf risk.
 */
export default function PressableScale({
  children,
  className,
  style,
  scaleTo = motion.pressed.scaleTo,
  hapticKind = "none",
  onPressIn,
  disabled,
  ...rest
}: Props) {
  return (
    <Pressable
      {...rest}
      accessibilityRole={
        // Default to a button role when an onPress is provided and the caller didn't set one.
        (rest as any).accessibilityRole ?? ((rest as any).onPress ? "button" : undefined)
      }
      accessibilityState={
        (rest as any).accessibilityState ?? (disabled ? { disabled: true } : undefined)
      }
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled && hapticKind !== "none") haptic(hapticKind);
        onPressIn?.(e);
      }}
    >
      {({ pressed }) => (
        <View
          // NativeWind does NOT reliably merge className on Pressable when style is a function.
          // We keep Pressable unstyled and apply className/styles on an inner View instead.
          className={className}
          style={[
            style as any,
            {
              transform: [{ scale: pressed && !disabled ? scaleTo : 1 }],
            },
          ]}
        >
          {children}
        </View>
      )}
    </Pressable>
  );
}