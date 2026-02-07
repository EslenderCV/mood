import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getActiveWeeklyVibe,
  WeeklyVibe,
  markWeeklyVibeSeen,
  consumeWeeklyVibe,
} from "@/lib/appwrite";
import WeeklyVibeModal from "./WeeklyVibeModal";

import { tStatic } from "@/context/LanguageContext";
interface WeeklyVibeBannerProps {
  userId?: string;
  onCreatePost?: () => void;

  /**
   * Si viene desde push notification, puedes pasar autoOpen para abrir el modal automáticamente.
   * Por ejemplo: /home?weeklyVibe=1
   */
  autoOpen?: boolean;
}

const LAST_SEEN_KEY = "last_seen_vibe_id";

const WeeklyVibeBanner = ({
  userId,
  onCreatePost,
  autoOpen = false,
}: WeeklyVibeBannerProps) => {
  const [weeklyVibe, setWeeklyVibe] = useState<WeeklyVibe | null>(null);
  const [showVibeModal, setShowVibeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isNew, setIsNew] = useState(false);

  const [didAutoOpen, setDidAutoOpen] = useState(false);

  // Animación para el badge "NEW" (más suave)
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const startBounceAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [bounceAnim]);

  const refreshActiveVibe = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const vibe = await getActiveWeeklyVibe(userId);
      setWeeklyVibe(vibe);

      if (vibe) {
        // NEW badge: si el server aún no marca visto, usamos un fallback local para UX
        const lastSeenId = await AsyncStorage.getItem(LAST_SEEN_KEY);
        const serverSeen = Boolean(vibe.seenAt);
        if (!serverSeen && lastSeenId !== vibe.$id) {
          setIsNew(true);
          startBounceAnimation();
        } else {
          setIsNew(false);
        }
      } else {
        setIsNew(false);
      }
    } catch (error) {
      console.log("Error loading vibe:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, startBounceAnimation]);

  useEffect(() => {
    refreshActiveVibe();
  }, [refreshActiveVibe]);

  const markSeenIfNeeded = useCallback(async (vibe: WeeklyVibe) => {
    try {
      if (!vibe.seenAt) {
        await markWeeklyVibeSeen(vibe.$id);
        setWeeklyVibe((prev) => (prev ? { ...prev, seenAt: new Date().toISOString() } : prev));
      }
      await AsyncStorage.setItem(LAST_SEEN_KEY, vibe.$id);
    } catch (e) {
      // best-effort
    }
  }, []);

  const handleOpenVibe = useCallback(async () => {
    if (!weeklyVibe) return;
    setShowVibeModal(true);

    // Al abrir: lo marcamos como visto (para la notificación de 16h)
    if (isNew) setIsNew(false);
    await markSeenIfNeeded(weeklyVibe);
  }, [weeklyVibe, isNew, markSeenIfNeeded]);

  // Auto-open cuando vienes desde notificación
  useEffect(() => {
    if (!autoOpen) return;
    if (didAutoOpen) return;
    if (!weeklyVibe) return;

    setDidAutoOpen(true);
    handleOpenVibe();
  }, [autoOpen, didAutoOpen, weeklyVibe, handleOpenVibe]);

  const handleConsume = useCallback(
    async (action: "posted" | "discarded") => {
      if (!weeklyVibe) return;

      // 1) Persistir en backend
      await consumeWeeklyVibe(weeklyVibe.$id, action);

      // 2) Ocultar del Home hasta el próximo vibe
      setWeeklyVibe((prev) =>
        prev ? { ...prev, consumedAt: new Date().toISOString(), consumedAction: action } : prev,
      );

      // 3) Cerrar modal
      setShowVibeModal(false);

      // Opcional: refresh por si hay lógica server side adicional
      // await refreshActiveVibe();
    },
    [weeklyVibe],
  );

  if (isLoading) return null;

  // Si no hay vibe activo, NO mostramos nada (según tu nuevo comportamiento)
  if (!weeklyVibe) return null;

  return (
    <>
      <TouchableOpacity
        onPress={handleOpenVibe}
        activeOpacity={0.9}
        className="mx-4 mt-4 mb-6 relative"
      >
        {/* 🔥 BADGE "NEW" (Paleta Mood) */}
        {isNew && (
          <Animated.View
            style={{
              position: "absolute",
              top: -14,
              right: 10,
              zIndex: 50,
              transform: [{ translateY: bounceAnim }],
            }}
          >
            <LinearGradient
              colors={["#8B5CF6", "#EC4899"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 30,
                borderWidth: 1.5,
                borderColor: "rgba(255, 255, 255, 0.3)",
                shadowColor: "#EC4899",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.9,
                shadowRadius: 12,
                elevation: 15,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "900",
                  fontSize: 11,
                  letterSpacing: 0.5,
                }}
              >{tStatic("ui.s_60829e2a")}</Text>
            </LinearGradient>
          </Animated.View>
        )}

        <View
          style={{
            shadowColor: "#5E17EB",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.6,
            shadowRadius: 16,
            elevation: 10,
          }}
        >
          <LinearGradient
            colors={["#121212", "#000000"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-3xl border border-white/10 overflow-hidden relative"
          >
            <LinearGradient
              colors={["rgba(94, 23, 235, 0.45)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.7, y: 0.7 }}
              style={{ position: "absolute", width: "100%", height: "100%" }}
            />
            <View
              className="absolute -right-8 -bottom-8 w-40 h-40 bg-[#5E17EB] rounded-full opacity-20"
              style={{ transform: [{ scale: 1.5 }] }}
            />

            <View className="p-5 flex-row items-center justify-between z-10">
              <View className="flex-row items-center flex-1">
                <View className="w-16 h-16 bg-white/5 rounded-2xl items-center justify-center border border-white/10 mr-4 shadow-sm">
                  <Text style={{ fontSize: 32 }}>{weeklyVibe.topMood}</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <Ionicons
                      name="sparkles"
                      size={12}
                      color="#A78BFA"
                      style={{ marginRight: 4 }}
                    />
                    <Text className="text-[#A78BFA] font-bold text-[10px] tracking-[2px] uppercase">{tStatic("ui.s_ee1d951d")}</Text>
                  </View>
                  <Text className="text-white font-black text-xl italic tracking-tighter shadow-black shadow-lg">{tStatic("ui.s_b81d61fc")}</Text>
                  <Text
                    className="text-zinc-400 text-xs font-medium mt-0.5"
                    numberOfLines={1}
                  >{tStatic("ui.s_3fab5c57")}</Text>
                </View>
              </View>

              <LinearGradient
                colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]}
                className="w-10 h-10 rounded-full items-center justify-center pl-0.5 border border-white/20"
              >
                <Ionicons name="play" size={18} color="white" />
              </LinearGradient>
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>

      <WeeklyVibeModal
        visible={showVibeModal}
        onClose={() => setShowVibeModal(false)}
        vibeData={weeklyVibe}
        onConsume={handleConsume}
      />
    </>
  );
};

export default WeeklyVibeBanner;