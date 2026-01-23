import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";

import { FollowButton } from "@/components/FollowButton";

import { followUser, unfollowUser, checkFollowStatus } from "@/lib/appwrite";

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

  const bg = isDark ? "#09090B" : "#FFFFFF";
  const cardBg = isDark ? "#18181B" : "#F4F4F5";
  const textColor = isDark ? "#FAFAFA" : "#18181B";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";

  const safeUsers = useMemo(() => (Array.isArray(users) ? users : []), [users]);

  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [isFollowingMap, setIsFollowingMap] = useState<Record<string, boolean>>(
    {},
  );
  const [isFollowerMap, setIsFollowerMap] = useState<Record<string, boolean>>(
    {},
  );

  // Load follow status for each user (best-effort)
  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!currentUserId || safeUsers.length === 0) return;

      const entries = await Promise.all(
        safeUsers.map(async (u) => {
          const targetId = getUserId(u);
          if (!targetId || targetId === currentUserId) return null;

          try {
            const status = await checkFollowStatus(currentUserId, targetId);
            const isFollowing = !!(status as any)?.isFollowing;
            const isFollower = !!(status as any)?.isFollower;
            return { targetId, isFollowing, isFollower };
          } catch {
            return { targetId, isFollowing: false, isFollower: false };
          }
        }),
      );

      if (!alive) return;

      const nextFollowing: Record<string, boolean> = {};
      const nextFollower: Record<string, boolean> = {};

      entries.forEach((e) => {
        if (!e) return;
        nextFollowing[e.targetId] = e.isFollowing;
        nextFollower[e.targetId] = e.isFollower;
      });

      setIsFollowingMap((prev) => ({ ...prev, ...nextFollowing }));
      setIsFollowerMap((prev) => ({ ...prev, ...nextFollower }));
    };

    void run();
    return () => {
      alive = false;
    };
  }, [currentUserId, safeUsers]);

  const toggleFollow = useCallback(
    async (targetId: string) => {
      if (!currentUserId) {
        Alert.alert("Error", "No se detectó el usuario actual.");
        return;
      }
      if (!targetId || targetId === currentUserId) return;

      const currentlyFollowing = !!isFollowingMap[targetId];

      setLoadingMap((p) => ({ ...p, [targetId]: true }));
      setIsFollowingMap((p) => ({ ...p, [targetId]: !currentlyFollowing }));

      try {
        if (currentlyFollowing) {
          await unfollowUser(currentUserId, targetId);
        } else {
          await followUser(currentUserId, targetId);
        }
      } catch {
        setIsFollowingMap((p) => ({ ...p, [targetId]: currentlyFollowing }));
        Alert.alert("Error", "No se pudo actualizar el follow. Intenta de nuevo.");
      } finally {
        setLoadingMap((p) => ({ ...p, [targetId]: false }));
      }
    },
    [currentUserId, isFollowingMap],
  );

  const renderItem = ({ item }: { item: SuggestedUser }) => {
    const id = getUserId(item);
    if (!id || id === currentUserId) return null;

    const avatar = getAvatar(item);
    const name = getName(item);
    const username = getUsername(item);

    const isFollowing = !!isFollowingMap[id];
    const isFollower = !!isFollowerMap[id];
    const isLoading = !!loadingMap[id];

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push(`/user/${id}` as any)}
        className="mr-3"
      >
        <View
          className="w-[170px] rounded-2xl p-3"
          style={{ backgroundColor: cardBg, borderWidth: 1, borderColor }}
        >
          <View className="flex-row items-center">
            <Image
              source={avatar ? { uri: avatar } : require("@/assets/noPfp.jpg")}
              className="w-12 h-12 rounded-full"
              contentFit="cover"
              transition={200}
              style={{ backgroundColor: isDark ? "#27272A" : "#E4E4E7" }}
            />
            <View className="ml-3 flex-1">
              <Text
                numberOfLines={1}
                className="font-bold text-[14px]"
                style={{ color: textColor }}
              >
                {name}
              </Text>
              <Text
                numberOfLines={1}
                className="text-[12px]"
                style={{ color: subTextColor }}
              >
                @{username}
              </Text>
            </View>
          </View>

          <View className="mt-3">
            <FollowButton
              isFollowing={isFollowing}
              isFollower={isFollower}
              onPress={() => toggleFollow(id)}
            />
            {isLoading && (
              <View className="absolute right-3 top-3">
                <ActivityIndicator size="small" />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ✅ Evita render si no hay data o no hay usuario actual aún
  if (!safeUsers.length || !currentUserId) return null;

  return (
    <View style={{ backgroundColor: bg }}>
      <FlatList
        horizontal
        data={safeUsers}
        keyExtractor={(item, index) => String(getUserId(item) ?? `idx_${index}`)}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10 }}
      />
    </View>
  );
}
