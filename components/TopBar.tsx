import { View, Image, TouchableOpacity, Text } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useColorScheme } from "nativewind";

// Definimos las "props" que el componente espera recibir
interface TopBarProps {
  notificationCount?: number;
  messageCount?: number;
}

const TopBar = ({ notificationCount = 0, messageCount = 0 }: TopBarProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const borderColor = isDark ? "#27272A" : "#F4F4F5";
  const btnBg = isDark ? "#18181B" : "#F4F4F5";
  const iconColor = isDark ? "#5E17EB" : "#000000";

  return (
    <View
      className="flex-row items-center justify-between w-full px-5 py-2 border-b"
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderBottomWidth: isDark ? 1 : 0,
      }}
    >
      {/* LOGO */}
      <View className="h-[45px] w-[80px] justify-center">
        <Image
          source={require("@/assets/fullLogo.png")}
          resizeMode="contain"
          className="w-full h-full"
          style={{ tintColor: isDark ? undefined : "#5E17EB" }}
        />
      </View>

      {/* ICONOS */}
      <View className="flex-row items-center gap-x-3">
        {/* BOTÓN DE NOTIFICACIONES */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            router.push("/notifications");
          }}
          className="p-2.5 rounded-full relative"
          style={{
            backgroundColor: btnBg,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0 : 0.05,
            shadowRadius: 4,
            elevation: isDark ? 0 : 2,
          }}
        >
          {notificationCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-[#FF2D55] rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 z-10 border border-white dark:border-black">
              <Text className="text-[10px] text-white font-bold leading-none">
                {notificationCount > 99 ? "99+" : notificationCount}
              </Text>
            </View>
          )}
          <Ionicons name="notifications-outline" color={iconColor} size={22} />
        </TouchableOpacity>

        {/* BOTÓN DE CHATS (Mensajes) */}
        <Link href="/chats" asChild>
          <TouchableOpacity
            activeOpacity={0.7}
            className="p-2.5 rounded-full relative"
            style={{
              backgroundColor: btnBg,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0 : 0.05,
              shadowRadius: 4,
              elevation: isDark ? 0 : 2,
            }}
          >
            {messageCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-[#5E17EB] rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 z-10 border border-white dark:border-black">
                <Text className="text-[10px] text-white font-bold leading-none">
                  {messageCount > 99 ? "99+" : messageCount}
                </Text>
              </View>
            )}
            <Ionicons name="chatbubble-outline" color={iconColor} size={22} />
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
};

export default TopBar;
