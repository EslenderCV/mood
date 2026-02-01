import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useColorScheme } from "nativewind";

const NetworkBanner = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [isOffline, setIsOffline] = useState(false);
  const translateY = useRef(new Animated.Value(-48)).current;

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false;
      setIsOffline(offline);
    });

    return () => {
      sub();
    };
  }, []);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isOffline ? 0 : -48,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
      mass: 0.6,
    }).start();
  }, [isOffline, translateY]);

  const bg = isDark ? "rgba(39,39,42,0.92)" : "rgba(17,24,39,0.92)";

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        transform: [{ translateY }],
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999999,
      }}
    >
      <View
        style={{
          height: 48,
          paddingHorizontal: 16,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.06)",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>
          Sin conexión · Algunas acciones pueden fallar
        </Text>
      </View>
    </Animated.View>
  );
};

export default NetworkBanner;
