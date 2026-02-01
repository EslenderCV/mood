import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

/**
 * Indicador premium y ultraligero (sin libs extra).
 * Ideal para estados "buffering" sin meter jank.
 */
const LoadingDots = ({
  size = 4,
  gap = 4,
  color = "rgba(255,255,255,0.7)",
}: {
  size?: number;
  gap?: number;
  color?: string;
}) => {
  const a1 = useRef(new Animated.Value(0.2)).current;
  const a2 = useRef(new Animated.Value(0.2)).current;
  const a3 = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    let mounted = true;

    const pulse = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: 420,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.2,
            duration: 420,
            useNativeDriver: true,
          }),
        ]),
      );

    const l1 = pulse(a1, 0);
    const l2 = pulse(a2, 140);
    const l3 = pulse(a3, 280);

    if (mounted) {
      l1.start();
      l2.start();
      l3.start();
    }

    return () => {
      mounted = false;
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, [a1, a2, a3]);

  const dotStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
  } as const;

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Animated.View style={[dotStyle, { opacity: a1 }]} />
      <View style={{ width: gap }} />
      <Animated.View style={[dotStyle, { opacity: a2 }]} />
      <View style={{ width: gap }} />
      <Animated.View style={[dotStyle, { opacity: a3 }]} />
    </View>
  );
};

export default LoadingDots;
