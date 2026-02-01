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
import PostModal from "@/components/postModal/PostModal";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

// 🔥 IMPORTACIÓN DEL NUEVO MODAL DE CUENTAS
import AccountSelectorModal from "@/components/profile/AccountSelectorModal";

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
    style={{ minHeight: 48 }}
  >
    <Text
      className="text-[15px] font-medium"
      style={{
        color: isDestructive ? "#EF4444" : textColor,
        includeFontPadding: false,
        textAlignVertical: "center",
      }}
    >
      {label}
    </Text>
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
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const tabBarBg = isDark ? "#000000" : "#FFFFFF";
  const borderColor = isDark ? "#27272A" : "#F4F4F5";

  const menuBg = isDark ? "#18181B" : "#FFFFFF";
  const menuText = isDark ? "#FFFFFF" : "#000000";
  const menuSubText = isDark ? "#A1A1AA" : "#52525B";
  const menuBorder = isDark ? "#27272A" : "#E4E4E7";
  const menuHeader = isDark ? "rgba(39, 39, 42, 0.5)" : "#F4F4F5";

  const [menuOpen, setMenuOpen] = useState(false);
  const [isAccountModalVisible, setIsAccountModalVisible] = useState(false);

  const { user } = useGlobalContext();
  const { setPostModalVisible } = useModal();

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

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: tabBarBg,
            borderTopColor: borderColor,
            borderTopWidth: 1,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom - 5 : 10,
            paddingTop: 10,
          },
          tabBarActiveTintColor: "#5E17EB",
          tabBarInactiveTintColor: isDark ? "#71717A" : "#9CA3AF",
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: t("tabs.home"),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={26}
                color={color}
              />
            ),
          }}
          listeners={{
            tabPress: () => triggerHaptic(),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: t("tabs.search"),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "compass" : "compass-outline"}
                size={26}
                color={color}
              />
            ),
          }}
          listeners={{
            tabPress: () => triggerHaptic(),
          }}
        />

        <Tabs.Screen
          name="mood"
          listeners={() => ({
            tabPress: (e) => {
              e.preventDefault();
              triggerHaptic();
              setPostModalVisible(true);
            },
          })}
          options={{
            title: "",
            tabBarIcon: () => (
              <View
                className="bg-[#5E17EB] p-3 rounded-full shadow-lg shadow-[#5E17EB]/40"
                style={{
                  marginBottom: Platform.OS === "ios" ? 15 : 15,
                  borderWidth: 4,
                  borderColor: tabBarBg,
                }}
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
            title: t("tabs.library"),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "albums" : "albums-outline"}
                size={26}
                color={color}
              />
            ),
          }}
          listeners={{
            tabPress: () => triggerHaptic(),
          }}
        />

        <Tabs.Screen
          name="profile"
          listeners={() => ({
            tabPress: (e) => {
              e.preventDefault();
              triggerHaptic();
              setMenuOpen(!menuOpen);
            },
          })}
          options={{
            title: t("tabs.profile"),
            tabBarIcon: ({ focused }) => (
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  setMenuOpen(!menuOpen);
                }}
                onLongPress={() => {
                  triggerHaptic();
                  setIsAccountModalVisible(true);
                }}
                delayLongPress={350}
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    borderWidth: 2,
                    borderColor: focused ? "#5E17EB" : "transparent",
                    borderRadius: 9999,
                    padding: 1,
                  }}
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
              </Pressable>
            ),
          }}
        />
      </Tabs>

      <AccountSelectorModal
        visible={isAccountModalVisible}
        onClose={() => setIsAccountModalVisible(false)}
      />

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
              bottom: 90 + insets.bottom,
            }}
            className="w-[300px] absolute right-4 rounded-[28px] shadow-2xl overflow-hidden"
          >
            <Link href="/profile" asChild onPress={() => setMenuOpen(false)}>
              <Pressable
                className="p-5 flex-row items-center justify-between border-b"
                style={{
                  backgroundColor: menuHeader,
                  borderColor: menuBorder,
                }}
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
                      {t("menu.viewProfile")}
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
                  label={t("menu.plus")}
                  iconName="diamond"
                  textColor={menuText}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/plus");
                  }}
                />
                <MenuOption
                  label={t("menu.notifications")}
                  iconName="notifications-outline"
                  textColor={menuText}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/notifications");
                  }}
                />
                <MenuOption
                  label={t("menu.privacy")}
                  iconName="lock-closed-outline"
                  textColor={menuText}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/privacy" as any);
                  }}
                />
                <MenuOption
                  label={t("menu.security")}
                  iconName="shield-checkmark-outline"
                  textColor={menuText}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push("/security" as any);
                  }}
                />
                <MenuOption
                  label={t("settings.title")}
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
                label={t("menu.help")}
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
