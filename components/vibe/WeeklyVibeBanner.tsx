import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLatestWeeklyVibe, WeeklyVibe } from "@/lib/appwrite";
import WeeklyVibeModal from "./WeeklyVibeModal";

interface WeeklyVibeBannerProps {
  userId?: string;
  onCreatePost?: () => void;
}

const WeeklyVibeBanner = ({ userId, onCreatePost }: WeeklyVibeBannerProps) => {
  const [weeklyVibe, setWeeklyVibe] = useState<WeeklyVibe | null>(null);
  const [showVibeModal, setShowVibeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isNew, setIsNew] = useState(false);

  // Animación para el badge "NEW" (más suave)
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkVibe = async () => {
      if (userId) {
        setIsLoading(true);
        try {
          const vibe = await getLatestWeeklyVibe(userId);
          setWeeklyVibe(vibe);

          if (vibe) {
            const lastSeenId = await AsyncStorage.getItem("last_seen_vibe_id");
            if (lastSeenId !== vibe.$id) {
              setIsNew(true);
              startBounceAnimation();
            }
          }
        } catch (error) {
          console.log("Error loading vibe:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    checkVibe();
  }, [userId]);

  const startBounceAnimation = () => {
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
  };

  const handleOpenVibe = async () => {
    setShowVibeModal(true);
    if (isNew && weeklyVibe) {
      setIsNew(false);
      await AsyncStorage.setItem("last_seen_vibe_id", weeklyVibe.$id);
    }
  };

  if (isLoading) return null;

  // --- CASO 1: NO HAY VIBE (Banner Cyan) ---
  if (!weeklyVibe) {
    return (
      <TouchableOpacity
        onPress={onCreatePost}
        activeOpacity={0.9}
        className="mx-4 mt-4 mb-6"
      >
        <View
          style={{
            shadowColor: "#06b6d4",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 10,
          }}
        >
          <LinearGradient
            colors={["#0f172a", "#000000"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-3xl border border-white/10 overflow-hidden relative"
          >
            <LinearGradient
              colors={["rgba(6, 182, 212, 0.25)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.6, y: 0.6 }}
              style={{ position: "absolute", width: "100%", height: "100%" }}
            />
            <View className="p-5 flex-row items-center justify-between z-10">
              <View className="flex-row items-center flex-1">
                <View className="w-16 h-16 bg-cyan-900/20 rounded-2xl items-center justify-center border border-cyan-500/30 mr-4">
                  <Ionicons name="pulse" size={32} color="#22d3ee" />
                </View>
                <View className="flex-1 pr-2">
                  <Text className="text-cyan-400 font-bold text-[10px] tracking-[2px] uppercase mb-1">
                    No Vibe Detected
                  </Text>
                  <Text className="text-white font-black text-xl italic tracking-tighter shadow-black shadow-lg">
                    UNLOCK YOUR VIBE
                  </Text>
                  <Text className="text-zinc-400 text-xs font-medium mt-1">
                    Post a mood to see your stats
                  </Text>
                </View>
              </View>
              <LinearGradient
                colors={["rgba(34, 211, 238, 0.2)", "rgba(34, 211, 238, 0.1)"]}
                className="w-10 h-10 rounded-full items-center justify-center border border-cyan-500/30"
              >
                <Ionicons name="add" size={24} color="#22d3ee" />
              </LinearGradient>
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    );
  }

  // --- CASO 2: HAY VIBE (Banner Premium Purple) ---
  return (
    <>
      <TouchableOpacity
        onPress={handleOpenVibe}
        activeOpacity={0.9}
        className="mx-4 mt-4 mb-6 relative"
      >
        {/* 🔥 BADGE "NEW" REDISEÑADO (Paleta Mood) */}
        {isNew && (
          <Animated.View
            style={{
              position: "absolute",
              top: -14, // Un poco más alto
              right: 10,
              zIndex: 50,
              transform: [{ translateY: bounceAnim }],
            }}
          >
            <LinearGradient
              // 🔥 NUEVA PALETA: Violeta Eléctrico a Magenta Vibrante
              colors={["#8B5CF6", "#EC4899"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 30, // Forma de píldora completa
                borderWidth: 1.5,
                borderColor: "rgba(255, 255, 255, 0.3)", // Borde semitransparente "glassy"
                // 🔥 NUEVO GLOW: A juego con el gradiente
                shadowColor: "#EC4899",
                shadowOffset: { width: 0, height: 0 }, // Glow centrado
                shadowOpacity: 0.9, // Muy brillante
                shadowRadius: 12, // Difuminado suave
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
              >
                NEW ✨
              </Text>
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
                    <Text className="text-[#A78BFA] font-bold text-[10px] tracking-[2px] uppercase">
                      Ready Now
                    </Text>
                  </View>
                  <Text className="text-white font-black text-xl italic tracking-tighter shadow-black shadow-lg">
                    WEEKLY VIBE
                  </Text>
                  <Text
                    className="text-zinc-400 text-xs font-medium mt-0.5"
                    numberOfLines={1}
                  >
                    Your music summary is here
                  </Text>
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
      />
    </>
  );
};

export default WeeklyVibeBanner;
