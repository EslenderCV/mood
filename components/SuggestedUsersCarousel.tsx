import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { followUser, unfollowUser, checkFollowStatus } from "@/lib/appwrite";
import { BrainEmitter } from "@/src/brain/signals/emitters";
import { InteractionType } from "@/src/brain/signals/InteractionSignals";

type SuggestedUser = any;

interface SuggestedUsersCarouselProps {
  users: SuggestedUser[];
  currentUserId: string;
}

const getUserId = (u: SuggestedUser) => u?.$id || u?.accountId || u?.id;
const getAvatar = (u: SuggestedUser) => u?.avatar || u?.pfp || u?.imageUrl;
const getName = (u: SuggestedUser) =>
  u?.name || u?.fullName || u?.username || "Usuario";
const getUsername = (u: SuggestedUser) => u?.username || u?.handle || "user";

export default function SuggestedUsersCarousel({
  users,
  currentUserId,
}: SuggestedUsersCarouselProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // --- PALETA MOOD MODERNA ---
  // Coincide con TrendingSongCard
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const cardBg = isDark ? "#121212" : "#F4F4F5"; // Un poco más claro que el fondo negro total
  const borderColor = isDark ? "#27272A" : "#E4E4E7";

  const [visibleUsers, setVisibleUsers] = useState<SuggestedUser[]>([]);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [isFollowingMap, setIsFollowingMap] = useState<Record<string, boolean>>(
    {},
  );
  const isFollowingMapRef = useRef(isFollowingMap);
  useEffect(() => {
    isFollowingMapRef.current = isFollowingMap;
  }, [isFollowingMap]);

  useEffect(() => {
    if (Array.isArray(users)) {
      const filtered = users.filter((u) => getUserId(u) !== currentUserId && u);
      setVisibleUsers(filtered);
      setLoadingMap({});
      setIsFollowingMap({});
    }
  }, [users, currentUserId]);

  // Carga optimizada (igual que antes)
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      const run = async () => {
        if (!currentUserId || visibleUsers.length === 0) return;
        const usersToCheck = visibleUsers
          .filter((u) => isFollowingMapRef.current[getUserId(u)] === undefined)
          .slice(0, 3);

        if (usersToCheck.length === 0) return;

        const results = await Promise.all(
          usersToCheck.map(async (u) => {
            const targetId = getUserId(u);
            try {
              const status = await checkFollowStatus(currentUserId, targetId);
              return { targetId, isFollowing: !!(status as any)?.isFollowing };
            } catch {
              return { targetId, isFollowing: false };
            }
          }),
        );

        if (!alive) return;
        setIsFollowingMap((prev) => {
          const next = { ...prev };
          results.forEach((r) => {
            if (r.targetId) next[r.targetId] = r.isFollowing;
          });
          return next;
        });
      };
      run();
    }, 1000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [currentUserId, visibleUsers]);

  // --- ACTIONS ---
  const handleDismiss = useCallback((targetId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVisibleUsers((prev) => prev.filter((u) => getUserId(u) !== targetId));
    BrainEmitter.interaction(InteractionType.SKIP, {
      postId: `profile_${targetId}`,
      creatorId: targetId,
      emotionalTag: "discovery_skip",
    });
  }, []);

  const handleProfilePress = useCallback((targetId: string) => {
    BrainEmitter.interaction(InteractionType.OPEN_PROFILE, {
      postId: `profile_${targetId}`,
      creatorId: targetId,
      emotionalTag: "discovery_click",
    });
    router.push(`/user/${targetId}` as any);
  }, []);

  const toggleFollow = useCallback(async (targetId: string) => {
      if (!currentUserId) return;
      Haptics.selectionAsync();
      const currentlyFollowing = !!isFollowingMapRef.current[targetId];

      setIsFollowingMap((p) => ({ ...p, [targetId]: !currentlyFollowing }));
      setLoadingMap((p) => ({ ...p, [targetId]: true }));

      try {
        if (currentlyFollowing) {
          await unfollowUser(currentUserId, targetId);
        } else {
          await followUser(currentUserId, targetId);
          BrainEmitter.interaction(InteractionType.FOLLOW, {
            postId: `profile_${targetId}`,
            creatorId: targetId,
            emotionalTag: "discovery_follow",
          });
        }
      } catch {
        setIsFollowingMap((p) => ({ ...p, [targetId]: currentlyFollowing }));
      } finally {
        setLoadingMap((p) => ({ ...p, [targetId]: false }));
      }
  }, [currentUserId]);

  const renderItem = useCallback(
    ({ item }: { item: SuggestedUser }) => {
      const id = getUserId(item);
      if (!id) return null;

      const avatar = getAvatar(item);
      const name = getName(item);
      const username = getUsername(item);
      const isFollowing = !!isFollowingMap[id];
      const isLoading = !!loadingMap[id];

      return (
        <View
          className="w-[150px] mr-3 rounded-[24px] p-4 flex-col items-center relative"
          style={{
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : borderColor,
            // Sombra sutil para dar profundidad en el feed
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.4 : 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          {/* Botón de cerrar (X) sutil y elegante */}
          <TouchableOpacity
            onPress={() => handleDismiss(id)}
            className="absolute top-2 right-2 w-6 h-6 rounded-full items-center justify-center z-10"
            style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="close"
              size={12}
              color="#fff"
              style={{ opacity: 0.8 }}
            />
          </TouchableOpacity>

          {/* Avatar con anillo de "vibe" */}
          <TouchableOpacity
            onPress={() => handleProfilePress(id)}
            activeOpacity={0.9}
            className="mb-3 mt-1 shadow-md"
          >
            <View
              className="rounded-full p-[2px]"
              style={{
                // Anillo sutil estilo Instagram/Mood
                backgroundColor: isFollowing ? "transparent" : "#5E17EB",
              }}
            >
              <Image
                source={
                  avatar ? { uri: avatar } : require("@/assets/noPfp.jpg")
                }
                className="w-[72px] h-[72px] rounded-full"
                contentFit="cover"
                transition={200}
                style={{
                  backgroundColor: "#18181B",
                  borderWidth: 2,
                  borderColor: cardBg, // Mismo color que la tarjeta para efecto "cutout"
                }}
              />
            </View>
          </TouchableOpacity>

          {/* Info del usuario */}
          <View className="items-center mb-4 w-full px-1">
            <Text
              numberOfLines={1}
              className="font-bold text-[14px] text-center w-full mb-0.5"
              style={{ color: textColor }}
            >
              {name}
            </Text>
            <Text
              numberOfLines={1}
              className="text-[11px] text-center w-full font-medium"
              style={{ color: subTextColor }}
            >
              @{username}
            </Text>
          </View>

          {/* Botón de acción: Gradiente Mood */}
          <TouchableOpacity
            onPress={() => toggleFollow(id)}
            activeOpacity={0.8}
            disabled={isLoading}
            className="w-full h-9 rounded-full overflow-hidden shadow-sm"
          >
            {isFollowing ? (
              // Estado: Siguiendo (Borde, fondo transparente)
              <View
                className="w-full h-full items-center justify-center rounded-full border"
                style={{ borderColor: subTextColor }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={textColor} />
                ) : (
                  <Text
                    className="text-[12px] font-bold"
                    style={{ color: textColor }}
                  >
                    Siguiendo
                  </Text>
                )}
              </View>
            ) : (
              // Estado: Seguir (Gradiente Completo)
              <LinearGradient
                colors={["#5E17EB", "#8C52FF"]} // Gradiente Púrpura Mood
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="w-full h-full items-center justify-center flex-row"
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Text className="text-white text-[12px] font-bold tracking-wide mr-1">
                      Seguir
                    </Text>
                    {/* Pequeño icono para invitar a la acción */}
                    <Ionicons name="add" size={12} color="white" />
                  </>
                )}
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [
      handleDismiss,
      handleProfilePress,
      toggleFollow,
      isFollowingMap,
      loadingMap,
      isDark,
      cardBg,
      textColor,
      subTextColor,
      borderColor,
    ],
  );

  if (visibleUsers.length < 3 || !currentUserId) return null;

  return (
    // 🔥 ESTRUCTURA IDÉNTICA A TrendingSongCard: py-6 + border-b
    <View
      className={`py-6 border-b ${
        isDark ? "border-zinc-800" : "border-zinc-200"
      }`}
    >
      {/* Header con padding horizontal (px-5) igual que TrendingSongCard */}
      <View className="flex-row items-center mb-4 px-5">
        <Ionicons
          name="flash" // Icono "Energy" que va más con "Descubre"
          size={18}
          color="#5E17EB"
          style={{ marginRight: 6 }}
        />
        <Text
          className={`text-base font-bold ${
            isDark ? "text-white" : "text-black"
          }`}
        >
          You Might Know
        </Text>
      </View>

      {/* Lista Horizontal */}
      <FlatList
        horizontal
        data={visibleUsers}
        keyExtractor={(item) => String(getUserId(item))}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        // contentContainerStyle maneja el padding interno para que el primer item
        // se alinee con el header (20px ≈ px-5)
        contentContainerStyle={{ paddingHorizontal: 20 }}
        removeClippedSubviews={true}
        initialNumToRender={4}
        decelerationRate="fast"
        snapToInterval={150 + 12} // Ancho tarjeta + margen derecho
      />
    </View>
  );
}
