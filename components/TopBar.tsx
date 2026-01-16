import { View, Text, TouchableOpacity, Image } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useGlobalContext } from "@/context/GlobalProvider";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";

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
  const { user } = useGlobalContext();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? "#5E17EB" : "#000000";

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

      <View className="flex-row gap-4">
        <TouchableOpacity
          onPress={() => {
            router.push("/notifications");
          }}
        >
          <View className="relative">
            <Ionicons
              name="notifications-outline"
              size={26}
              color={iconColor}
            />
            {notificationCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full items-center justify-center">
                <Text className="text-white text-[10px] font-bold">
                  {notificationCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={onChatPress}>
          <View className="relative">
            <Ionicons name="chatbubble-outline" size={26} color={iconColor} />
            {messageCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-[#5E17EB] w-4 h-4 rounded-full items-center justify-center">
                <Text className="text-white text-[10px] font-bold">
                  {messageCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default TopBar;
