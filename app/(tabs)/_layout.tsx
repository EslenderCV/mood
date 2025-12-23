import {
  Image,
  View,
  StyleSheet,
  Pressable,
  Animated,
  Text,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import { Link, Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGlobalContext } from "@/context/GlobalProvider";
import { useModal } from "@/context/ModalContext";
import { useAudio } from "@/context/AudioContext";

import SettOption from "@/components/settOption";
// 1. IMPORTAMOS EL MODAL QUE FALTABA
import PostModal from "@/components/PostModal";

const TabsLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useGlobalContext();
  const { setPostModalVisible } = useModal();
  const { currentSong } = useAudio();

  const TAB_ICON_SIZE = 26;
  const TAB_BAR_HEIGHT = 85;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: menuOpen ? 1 : 0,
        duration: 150,
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
            backgroundColor: "#121212",
            borderTopWidth: 0,
            height: TAB_BAR_HEIGHT,
            width: "100%",
            position: "absolute",
            bottom: 0,
            left: 0,
            elevation: 0,
            paddingTop: 12,
          },
          tabBarActiveTintColor: "#5E17EB",
          tabBarInactiveTintColor: "#71717a",
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
                size={TAB_ICON_SIZE}
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

        {/* Botón Central (Mood) */}
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
              <View className="bg-primaryy p-2 rounded-full shadow-lg shadow-primaryy/40">
                <Image
                  source={require("../../assets/mood.png")}
                  resizeMode="contain"
                  style={{ width: 22, height: 22, tintColor: "white" }}
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
                size={TAB_ICON_SIZE}
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
            tabBarIcon: () => (
              <Ionicons
                name={"grid-outline"}
                size={TAB_ICON_SIZE}
                color={"#71717a"}
              />
            ),
          }}
        />
      </Tabs>

      {/* --- MENÚ LATERAL (OVERLAY) --- */}
      {menuOpen && (
        <View style={StyleSheet.absoluteFill} className="z-[60]">
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
                <Link
                  href="/profile"
                  asChild
                  onPress={() => setMenuOpen(false)}
                >
                  <Pressable className="flex-row items-center mb-6">
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
                        {user?.name || "Usuario"}
                      </Text>
                      <Text className="text-zinc-500 text-xs mt-1">
                        Ver Perfil
                      </Text>
                    </View>
                  </Pressable>
                </Link>

                <View className="h-[1px] w-full bg-white/5 mb-6" />

                <View className="gap-y-5">
                  <SettOption
                    name="Get Plus"
                    icon={<Ionicons name="diamond" color="#5E17EB" size={20} />}
                    onPress={() => {
                      setMenuOpen(false);
                      router.push("/plus");
                    }}
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
                    onPress={() => {
                      setMenuOpen(false);
                      router.push("/notifications");
                    }}
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
                    onPress={() => {
                      setMenuOpen(false);
                      router.push("/security" as any);
                    }}
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
                    onPress={() => {
                      setMenuOpen(false);
                      router.push("/privacy" as any);
                    }}
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
                    onPress={() => {
                      setMenuOpen(false);
                      router.push("/settings" as any);
                    }}
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
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/help" as any);
                  }}
                />
              </View>
            </View>
          </Animated.View>
        </View>
      )}

      {/* 2. AQUÍ ESTÁ EL MODAL: Ahora sí funcionará el botón */}
      <PostModal />
    </View>
  );
};

export default TabsLayout;
