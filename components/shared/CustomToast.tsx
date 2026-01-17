import React from "react";
import { View, Text, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CustomToastProps {
  visible: boolean;
  type: "success" | "error";
  title: string;
  message: string;
  translateY: any;
}

const CustomToast = ({
  visible,
  type,
  title,
  message,
  translateY,
}: CustomToastProps) => {
  if (!visible) return null;
  const isSuccess = type === "success";
  const iconName = isSuccess ? "checkmark-circle" : "alert-circle";
  const iconColor = isSuccess ? "#5E17EB" : "#EF4444";
  const bgColor = "rgba(20, 20, 23, 0.95)";

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        position: "absolute",
        top: Platform.OS === "ios" ? 60 : 40,
        left: 20,
        right: 20,
        zIndex: 9999,
        backgroundColor: bgColor,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: isSuccess
            ? "rgba(94, 23, 235, 0.15)"
            : "rgba(239, 68, 68, 0.15)",
          justifyContent: "center",
          alignItems: "center",
          marginRight: 14,
        }}
      >
        <Ionicons name={iconName} size={28} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: "white",
            fontWeight: "bold",
            fontSize: 16,
            marginBottom: 2,
          }}
        >
          {title}
        </Text>
        <Text style={{ color: "#A1A1AA", fontSize: 13, fontWeight: "500" }}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};

export default CustomToast;
