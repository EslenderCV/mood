import React, { useEffect, useMemo, useRef } from "react";
import { Animated, View } from "react-native";

/**
 * Visualizador de audio sin Math.random() en render.
 * - Animaciones en native driver (transform scaleY) para evitar jank en feed.
 */
export const AudioVisualizer = ({
  isPlaying,
  color,
  activeColor = "#5E17EB",
}: {
  isPlaying: boolean;
  color: string;
  activeColor?: string;
}) => {
  const bars = useMemo(() => [0, 1, 2, 3], []);
  const scalesRef = useRef(bars.map(() => new Animated.Value(0.25)));
  const loopsRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    // Stop previous loops
    loopsRef.current.forEach((a) => a.stop());
    loopsRef.current = [];

    if (!isPlaying) {
      // Reset to resting state
      scalesRef.current.forEach((v) => v.setValue(0.25));
      return;
    }

    // Start independent loops with different timings to feel "alive".
    loopsRef.current = scalesRef.current.map((v, idx) => {
      const d1 = 260 + idx * 60;
      const d2 = 320 + idx * 70;
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: d1,
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.35,
            duration: d2,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return loop;
    });

    return () => {
      loopsRef.current.forEach((a) => a.stop());
      loopsRef.current = [];
    };
  }, [isPlaying]);

  return (
    <View className="flex-row items-end gap-[3px] h-4 ml-3 opacity-90">
      {scalesRef.current.map((scale, idx) => (
        <Animated.View
          key={idx}
          className="w-[3px] rounded-full"
          style={{
            height: 14,
            backgroundColor: isPlaying ? activeColor : color,
            opacity: isPlaying ? 1 : 0.5,
            transform: [{ scaleY: scale }],
          }}
        />
      ))}
    </View>
  );
};
