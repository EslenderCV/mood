import {
  Image,
  View,
  StyleSheet,
  Pressable,
  Animated,
  Text,
  TouchableOpacity,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import { Link, Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGlobalContext } from "@/context/GlobalProvider";
import { useModal } from "@/context/ModalContext";
import { useAudio } from "@/context/AudioContext";
import PostModal from "@/components/PostModal";

// --- COMPONENTE INTERNO PARA LAS OPCIONES (Icono a la derecha) ---
const MenuOption = ({
  label,
  iconName,
  onPress,
  color = "#5E17EB",
  isDestructive = false,
}: {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  isDestructive?: boolean;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className="flex-row items-center justify-between py-3.5"
  >
    <Text
      className={`text-[15px] font-medium ${
        isDestructive ? "text-red-500" : "text-zinc-200"
      }`}
    >
      {label}
    </Text>
    <View className="bg-zinc-800/50 p-1.5 rounded-lg">
      <Ionicons
        name={iconName}
        size={18}
        color={isDestructive ? "#EF4444" : color}
      />
    </View>
  </TouchableOpacity>
);

const TabsLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useGlobalContext();
  const { setPostModalVisible } = useModal();
  const { currentSong } = useAudio();

  const TAB_ICON_SIZE = 26;
  const TAB_BAR_HEIGHT = 85;
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
              <View className="bg-[#5E17EB] p-3 rounded-full shadow-lg shadow-[#5E17EB]/40 -mt-6 border-4 border-black">
                <Image
                  source={require("../../assets/mood.png")}
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
            tabBarIcon: ({ focused }) => (
              <View
                className={`rounded-full border-2 ${
                  focused ? "border-[#5E17EB]" : "border-transparent"
                }`}
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

      {/* --- MENÚ LATERAL REDISEÑADO --- */}
      {menuOpen && (
        <View style={StyleSheet.absoluteFill} className="z-[60]">
          {/* Fondo oscuro para cerrar */}
          <Pressable
            style={StyleSheet.absoluteFill}
            className="bg-black/60 backdrop-blur-sm"
            onPress={() => setMenuOpen(false)}
          />

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            }}
            className="bg-[#121212] w-[300px] absolute right-4 bottom-[100px] rounded-[28px] border border-zinc-800 shadow-2xl shadow-black overflow-hidden"
          >
            {/* HEADER PERFIL */}
            <Link href="/profile" asChild onPress={() => setMenuOpen(false)}>
              <Pressable className="p-5 bg-zinc-900/50 flex-row items-center justify-between border-b border-zinc-800">
                <View className="flex-row items-center flex-1">
                  <Image
                    source={
                      user?.pfp
                        ? { uri: user.pfp }
                        : require("@/assets/noPfp.jpg")
                    }
                    className="w-12 h-12 rounded-full border-2 border-zinc-800"
                  />
                  <View className="ml-3 flex-1">
                    <Text
                      className="text-white font-bold text-[17px] leading-tight"
                      numberOfLines={1}
                    >
                      {user?.name || "Usuario"}
                    </Text>
                    <Text className="text-[#5E17EB] text-xs font-medium mt-0.5">
                      Ver Perfil
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#52525B" />
              </Pressable>
            </Link>

            {/* LISTA DE OPCIONES */}
            <View className="p-5">
              <View className="gap-y-1">
                <MenuOption
                  label="Get Plus"
                  iconName="diamond"
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/plus");
                  }}
                />
                <MenuOption
                  label="Notifications"
                  iconName="notifications-outline"
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/notifications");
                  }}
                />
                <MenuOption
                  label="Privacy"
                  iconName="lock-closed-outline"
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/privacy" as any);
                  }}
                />
                <MenuOption
                  label="Security"
                  iconName="shield-checkmark-outline"
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/security" as any);
                  }}
                />
                <MenuOption
                  label="Settings"
                  iconName="settings-outline"
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/settings" as any);
                  }}
                />
              </View>

              <View className="h-[1px] w-full bg-zinc-800 my-4" />

              <MenuOption
                label="Help Center"
                iconName="help-circle-outline"
                color="#A1A1AA"
                onPress={() => {
                  setMenuOpen(false);
                  router.push("/help" as any);
                }}
              />
            </View>
          </Animated.View>
        </View>
      )}

      {/* MODAL */}
      <PostModal />
    </View>
  );
};

export default TabsLayout;
