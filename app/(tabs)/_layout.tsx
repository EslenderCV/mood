import {
  Image,
  View,
  StyleSheet,
  Pressable,
  Animated,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import { Link, Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGlobalContext } from "@/context/GlobalProvider";
import { useModal } from "@/context/ModalContext";
import { useAudio } from "@/context/AudioContext";
import PostModal from "@/components/PostModal";
import { useColorScheme } from "nativewind";

const MenuOption = ({
  label,
  iconName,
  onPress,
  color = "#5E17EB",
  textColor,
  isDestructive = false,
}: any) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className="flex-row items-center justify-between py-3.5"
  >
    <Text
      className="text-[15px] font-medium"
      style={{ color: isDestructive ? "#EF4444" : textColor }}
    >
      {label}
    </Text>
    <View className="opacity-90">
      <Ionicons
        name={iconName}
        size={18}
        color={isDestructive ? "#EF4444" : color}
      />
    </View>
  </TouchableOpacity>
);

const TabsLayout = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Colores pulidos
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const tabBarBg = isDark ? "#121212" : "#FFFFFF";
  const borderColor = isDark ? "#27272A" : "#F4F4F5";
  const inactiveColor = isDark ? "#71717A" : "#9CA3AF";

  const menuBg = isDark ? "#18181B" : "#FFFFFF";
  const menuText = isDark ? "#FFFFFF" : "#000000";
  const menuSubText = isDark ? "#A1A1AA" : "#52525B";
  const menuBorder = isDark ? "#27272A" : "#E4E4E7";
  const menuHeader = isDark ? "rgba(39, 39, 42, 0.5)" : "#F4F4F5";

  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useGlobalContext();
  const { setPostModalVisible } = useModal();
  const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 85 : 70;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: menuOpen ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: menuOpen ? 0 : 20,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: menuOpen ? 1 : 0.95,
        useNativeDriver: true,
      }),
    ]).start();
  }, [menuOpen]);

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: tabBarBg,
            borderTopColor: borderColor,
            borderTopWidth: 1,
            height: TAB_BAR_HEIGHT,
            paddingTop: 12,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarActiveTintColor: "#5E17EB",
          tabBarInactiveTintColor: inactiveColor,
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={26}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "compass" : "compass-outline"}
                size={30}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="mood"
          listeners={() => ({
            tabPress: (e: any) => {
              e.preventDefault();
              setPostModalVisible(true);
            },
          })}
          options={{
            title: "",
            headerShown: false,
            tabBarIcon: () => (
              <View
                className="bg-[#5E17EB] p-3 rounded-full shadow-lg shadow-[#5E17EB]/40 -mt-6"
                style={{ borderWidth: 4, borderColor: tabBarBg }} // Se fusiona con la barra
              >
                <Image
                  source={require("@/assets/mood.png")}
                  resizeMode="contain"
                  style={{ width: 24, height: 24, tintColor: "white" }}
                />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="library"
          options={{
            title: "",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "albums" : "albums-outline"}
                size={26}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          listeners={() => ({
            tabPress: (e: any) => {
              e.preventDefault();
              setMenuOpen(!menuOpen);
            },
          })}
          options={{
            title: "",
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <View
                className="rounded-full border-2"
                style={{ borderColor: focused ? "#5E17EB" : "transparent" }}
              >
                <Image
                  source={
                    user?.pfp
                      ? { uri: user.pfp }
                      : require("@/assets/noPfp.jpg")
                  }
                  className="w-7 h-7 rounded-full"
                />
              </View>
            ),
          }}
        />
      </Tabs>

      {menuOpen && (
        <View style={StyleSheet.absoluteFill} className="z-[60]">
          <Pressable
            style={StyleSheet.absoluteFill}
            className="bg-black/40 backdrop-blur-sm"
            onPress={() => setMenuOpen(false)}
          />
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              backgroundColor: menuBg,
              borderColor: menuBorder,
              borderWidth: 1,
            }}
            className="w-[300px] absolute right-4 bottom-[100px] rounded-[28px] shadow-2xl overflow-hidden"
          >
            <Link href="/profile" asChild onPress={() => setMenuOpen(false)}>
              <Pressable
                className="p-5 flex-row items-center justify-between border-b"
                style={{ backgroundColor: menuHeader, borderColor: menuBorder }}
              >
                <View className="flex-row items-center flex-1">
                  <Image
                    source={
                      user?.pfp
                        ? { uri: user.pfp }
                        : require("@/assets/noPfp.jpg")
                    }
                    className="w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-800"
                  />
                  <View className="ml-3 flex-1">
                    <Text
                      className="font-bold text-[17px] leading-tight"
                      numberOfLines={1}
                      style={{ color: menuText }}
                    >
                      {user?.name || "Usuario"}
                    </Text>
                    <Text className="text-[#5E17EB] text-xs font-medium mt-0.5">
                      Ver Perfil
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={menuSubText}
                />
              </Pressable>
            </Link>
            <View className="p-5">
              <View className="gap-y-1">
                <MenuOption
                  label="Get Plus"
                  iconName="diamond"
                  textColor={menuText}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/plus");
                  }}
                />
                <MenuOption
                  label="Notifications"
                  iconName="notifications-outline"
                  textColor={menuText}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/notifications");
                  }}
                />
                <MenuOption
                  label="Privacy"
                  iconName="lock-closed-outline"
                  textColor={menuText}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/privacy" as any);
                  }}
                />
                <MenuOption
                  label="Security"
                  iconName="shield-checkmark-outline"
                  textColor={menuText}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/security" as any);
                  }}
                />
                <MenuOption
                  label="Settings"
                  iconName="settings-outline"
                  textColor={menuText}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/settings" as any);
                  }}
                />
              </View>
              <View
                className="h-[1px] w-full my-4"
                style={{ backgroundColor: menuBorder }}
              />
              <MenuOption
                label="Help Center"
                iconName="help-circle-outline"
                color={menuSubText}
                textColor={menuSubText}
                onPress={() => {
                  setMenuOpen(false);
                  router.push("/help" as any);
                }}
              />
            </View>
          </Animated.View>
        </View>
      )}
      <PostModal />
    </View>
  );
};

export default TabsLayout;
