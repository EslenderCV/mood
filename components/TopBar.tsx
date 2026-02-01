import { View, Text, Image } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useGlobalContext } from "@/context/GlobalProvider";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";
import PressableScale from "@/components/shared/PressableScale";

interface TopBarProps {
  notificationCount: number;
  messageCount: number;
  onChatPress?: () => void;
}

const TopBar = ({
  notificationCount,
  messageCount,
  onChatPress,
}: TopBarProps) => {
  // Keep GlobalProvider import to preserve future extensibility;
  // TopBar currently doesn't need the user object.
  useGlobalContext();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  // Instagram-like: icons should be neutral (not accent) so the accent can be reserved for highlights.
  const iconColor = isDark ? "#E4E4E7" : "#111827";

  return (
    <View className="flex-row justify-between items-center px-5 py-2">
      <View className="h-[45px] w-[80px] justify-center">
        <Image
          source={require("@/assets/fullLogo.png")}
          resizeMode="contain"
          className="w-full h-full"
          style={{ tintColor: isDark ? undefined : "#5E17EB" }}
        />
      </View>

      <View className="flex-row">
        <PressableScale
          hapticKind="selection"
          hitSlop={10}
          onPress={() => {
            router.push("/notifications");
          }}
          style={{ marginRight: 16 }}
        >
          <View className="relative">
            <Ionicons
              name="notifications-outline"
              size={26}
              color={iconColor}
            />
            {notificationCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-danger w-4 h-4 rounded-full items-center justify-center">
                <Text className="text-white text-[10px] font-bold">
                  {notificationCount}
                </Text>
              </View>
            )}
          </View>
        </PressableScale>

        <PressableScale
          hapticKind="selection"
          hitSlop={10}
          onPress={onChatPress}
        >
          <View className="relative">
            <Ionicons name="chatbubble-outline" size={26} color={iconColor} />
            {messageCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-accent w-4 h-4 rounded-full items-center justify-center">
                <Text className="text-white text-[10px] font-bold">
                  {messageCount}
                </Text>
              </View>
            )}
          </View>
        </PressableScale>
      </View>
    </View>
  );
};

export default TopBar;
