import {
  Image,
  TouchableOpacity,
  View,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
} from "react-native";
import React, { useState } from "react";
import { Link, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";
import { useGlobalContext } from "@/context/GlobalProvider";
import SettOption from "@/components/settOption";
import { useRef, useEffect } from "react";

const TabsLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useGlobalContext();

  const TAB_ICON_SIZE = 26;
  const TAB_BAR_HEIGHT = 85;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // 2. Control Animation Speed
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: menuOpen ? 1 : 0,
        duration: 150, // Ultra-fast (standard is 300ms)
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: menuOpen ? 0 : 20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [menuOpen]);
  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: "#121212", // Professional deep charcoal
            borderTopWidth: 0,
            height: TAB_BAR_HEIGHT,
            width: "83%",
            position: "absolute",
            bottom: 0,
            left: 0,
            elevation: 0,
            paddingTop: 12,
          },
          tabBarActiveTintColor: "#5E17EB",
          tabBarInactiveTintColor: "#71717a", // Zinc-500 for better contrast
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={TAB_ICON_SIZE}
                color={color}
              />
            ),
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "compass" : "compass-outline"}
                size={29}
                color={color}
              />
            ),
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="mood"
          options={{
            title: "",
            tabBarIcon: () => (
              <View className="bg-primaryy p-2 rounded-full shadow-lg shadow-primaryy/40">
                <Image
                  source={require("../../assets/mood.png")}
                  resizeMode="contain"
                  style={{ width: 22, height: 22, tintColor: "white" }}
                />
              </View>
            ),
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "albums" : "albums-outline"}
                size={TAB_ICON_SIZE}
                color={color}
              />
            ),
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{ href: null, headerShown: false }}
        />
      </Tabs>
      {menuOpen && (
        <View style={StyleSheet.absoluteFill} className="z-[50]">
          <Pressable
            style={StyleSheet.absoluteFill}
            className="bg-black/40"
            onPress={() => setMenuOpen(false)}
          />

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
            className="bg-zinc-900 w-[280px] absolute right-4 bottom-[100px] rounded-[32px] border border-white/10 shadow-2xl"
          >
            <View className="p-6">
              <View className="p-6">
                {/* User Header Section */}
                <Link
                  href="/profile"
                  asChild
                  onPress={() => setMenuOpen(false)}
                >
                  <TouchableOpacity className="flex-row items-center mb-6">
                    <View className="p-1 rounded-full border-2 border-[#5E17EB]">
                      <Image
                        source={
                          user?.pfp
                            ? { uri: user.pfp }
                            : require("@/assets/noPfp.jpg")
                        }
                        className="w-12 h-12 rounded-full"
                      />
                    </View>
                    <View className="ml-3">
                      <Text className="text-white font-bold text-lg leading-tight">
                        {user?.name}
                      </Text>
                      <Text className="text-zinc-500 text-xs mt-1">
                        View Profile
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Link>

                <View className="h-[1px] w-full bg-white/5 mb-6" />

                {/* Settings Options List */}
                <View className="gap-y-5">
                  <SettOption
                    name="Get Plus"
                    icon={<Ionicons name="diamond" color="#5E17EB" size={20} />}
                  />
                  <SettOption
                    name="Notifications"
                    icon={
                      <Ionicons
                        name="notifications-outline"
                        color="#5E17EB"
                        size={20}
                      />
                    }
                  />
                  <SettOption
                    name="Security"
                    icon={
                      <Ionicons
                        name="shield-checkmark-outline"
                        color="#5E17EB"
                        size={20}
                      />
                    }
                  />
                  <SettOption
                    name="Privacy"
                    icon={
                      <Ionicons
                        name="lock-closed-outline"
                        color="#5E17EB"
                        size={20}
                      />
                    }
                  />
                  <SettOption
                    name="Settings"
                    icon={
                      <Ionicons
                        name="settings-outline"
                        color="#5E17EB"
                        size={20}
                      />
                    }
                  />
                </View>

                <View className="h-[1px] w-full bg-white/5 my-6" />

                <SettOption
                  name="Help Center"
                  icon={
                    <Ionicons
                      name="help-circle-outline"
                      color="#5E17EB"
                      size={20}
                    />
                  }
                />
              </View>
            </View>
          </Animated.View>
        </View>
      )}
      {/* Menu Toggle Button - Integrated into the bar visually */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setMenuOpen(!menuOpen)}
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          backgroundColor: "#121212",
          width: "17%",
          height: TAB_BAR_HEIGHT,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          paddingBottom: 23,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setMenuOpen(!menuOpen)}
          className="absolute bottom-0 right-0 bg-[#121212] w-[17%] h-0 align-center justify-center z-1000 border-l-1 border-l-[#27272a]"
        >
          <Ionicons
            name={menuOpen ? "close" : "grid-outline"}
            size={28}
            color="#5E17EB"
          />
        </TouchableOpacity>
        <Ionicons name={"grid-outline"} size={24} color="#666666" />
      </TouchableOpacity>
    </View>
  );
};

// const styles = StyleSheet.create({
//   menuButton: {
//     position: "absolute",
//     bottom: 0,
//     right: 0,
//     backgroundColor: "#121212",
//     width: "17%",
//     height: 85,
//     alignItems: "center",
//     justifyContent: "center",
//     zIndex: 1000,
//     borderLeftWidth: 1,
//     borderLeftColor: "#27272a",
//   },
// });

export default TabsLayout;
