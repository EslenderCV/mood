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
import PostModal from "@/components/PostModal";
import { useColorScheme } from "nativewind";

// --- MEJORA: Componente optimizado para alineación vertical ---
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
    style={{ minHeight: 48 }} // Altura mínima táctil estándar
  >
    <Text
      className="text-[15px] font-medium"
      style={{
        color: isDestructive ? "#EF4444" : textColor,
        includeFontPadding: false, // CLAVE: Evita desalineación en Android
        textAlignVertical: "center",
      }}
    >
      {label}
    </Text>
    {/* Contenedor fijo de 24px para el icono -> asegura centro perfecto */}
    <View className="w-6 h-6 items-center justify-center opacity-90">
      <Ionicons
        name={iconName}
        size={20}
        color={isDestructive ? "#EF4444" : color}
      />
    </View>
  </TouchableOpacity>
);

const TabsLayout = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const menuBg = isDark ? "#18181B" : "#FFFFFF";
  const menuText = isDark ? "#FFFFFF" : "#000000";
  const menuSubText = isDark ? "#A1A1AA" : "#52525B";
  const menuBorder = isDark ? "#27272A" : "#E4E4E7";
  const menuHeader = isDark ? "rgba(39, 39, 42, 0.5)" : "#F4F4F5";

  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useGlobalContext();

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
          headerShown: false,
          tabBarStyle: { display: "none" },
        }}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="explore" />
        <Tabs.Screen name="mood" />
        <Tabs.Screen name="library" />
        <Tabs.Screen name="profile" />
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
                <View className="w-6 h-6 items-center justify-center">
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={menuSubText}
                  />
                </View>
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
