import React, { memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image"; // 🔥 Premium Image
import * as Haptics from "expo-haptics"; // 🔥 Haptics

const { width } = Dimensions.get("window");
const COLUMN_GAP = 12;
const PADDING_HORIZONTAL = 20;
export const CARD_WIDTH = (width - PADDING_HORIZONTAL * 2 - COLUMN_GAP) / 2;

// --- SKELETONS ---
export const SongSkeleton = ({ isDark }: { isDark: boolean }) => {
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-200";
  return (
    <View className="mb-6 animate-pulse" style={{ width: CARD_WIDTH }}>
      <View
        className={`w-full aspect-square rounded-[24px] mb-3 ${elementBg}`}
      />
      <View className={`w-3/4 h-4 rounded-md mb-2 ${elementBg}`} />
      <View className={`w-1/2 h-3 rounded-md ${elementBg}`} />
    </View>
  );
};

export const PlaylistSkeleton = ({ isDark }: { isDark: boolean }) => {
  const elementBg = isDark ? "bg-zinc-800" : "bg-zinc-200";
  return (
    <View className="mb-6 animate-pulse" style={{ width: CARD_WIDTH }}>
      <View
        className={`w-full aspect-square rounded-[24px] mb-3 ${elementBg}`}
      />
      <View className={`w-2/3 h-4 rounded-md mb-2 ml-1 ${elementBg}`} />
      <View className={`w-1/3 h-3 rounded-md ml-1 ${elementBg}`} />
    </View>
  );
};

// --- HELPER AUDIO VISUALIZER ---
export const AudioVisualizer = ({
  isPlaying,
  color,
}: {
  isPlaying: boolean;
  color: string;
}) => (
  <View className="flex-row items-end gap-[3px] h-3 ml-2 opacity-90">
    {[1, 2, 3].map((i) => (
      <View
        key={i}
        className={`w-[3px] rounded-full`}
        style={{
          height: isPlaying ? Math.random() * 12 + 4 : 4,
          backgroundColor: isPlaying ? "#5E17EB" : color,
        }}
      />
    ))}
  </View>
);

// --- TARJETA DE CANCIÓN (MEMOIZED) ---
export const SongCard = memo(
  ({
    item,
    playingId,
    loadingAudioId,
    isPlaying,
    textColor,
    subTextColor,
    accentColor,
    onPlay,
    onOpenOptions,
    onPressCard,
  }: any) => {
    const isThisPlaying = playingId === item.id;
    const isLoadingThis = loadingAudioId === item.id;
    const showPause = isThisPlaying && isPlaying;

    return (
      <View style={{ width: CARD_WIDTH, marginBottom: 24 }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onLongPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onOpenOptions(item);
          }}
          onPress={() => {
            void Haptics.selectionAsync();
            onPressCard(item);
          }}
          className="flex-col"
        >
          <View className="relative mb-3.5 shadow-lg shadow-black/20">
            {/* 🔥 IMAGEN OPTIMIZADA */}
            <Image
              source={{ uri: item.cover }}
              style={{
                width: "100%",
                aspectRatio: 1,
                borderRadius: 24,
                backgroundColor: "#27272A",
              }}
              contentFit="cover"
              transition={300}
            />
            <View className="absolute inset-0 rounded-[24px] bg-black/5" />

            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                void Haptics.selectionAsync();
                // ✅ Orquestador (useLibraryLogic) delega TODO al AudioContext
                // => NO overlap + aparece GlobalAudioPlayerBar
                void onPlay(item);
              }}
              className="absolute bottom-3 left-3 items-center justify-center shadow-lg shadow-black/30 z-10"
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: accentColor,
              }}
            >
              {isLoadingThis ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons
                  name={showPause ? "pause" : "play"}
                  size={18}
                  color="white"
                  style={{ marginLeft: showPause ? 0 : 2 }}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onOpenOptions(item);
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 backdrop-blur-md items-center justify-center"
            >
              <Ionicons name="ellipsis-horizontal" size={16} color="white" />
            </TouchableOpacity>
          </View>

          <View className="pl-1 pr-1">
            <View className="flex-row justify-between items-start">
              <Text
                className="font-bold text-[15px] leading-5 flex-1 mr-2"
                numberOfLines={1}
                style={{ color: isThisPlaying ? accentColor : textColor }}
              >
                {item.title}
              </Text>
            </View>
            <View className="flex-row items-center mt-0.5">
              <Text
                className="text-[13px] font-medium"
                numberOfLines={1}
                style={{ color: subTextColor, maxWidth: "90%" }}
              >
                {item.artist}
              </Text>
              {isThisPlaying && isPlaying && (
                <AudioVisualizer isPlaying={true} color={accentColor} />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  },
);

SongCard.displayName = "SongCard";

// --- TARJETA DE PLAYLIST (MEMOIZED) ---
export const PlaylistCard = memo(
  ({ item, onPress, t, textColor, subTextColor, borderColor, isDark }: any) => {
    const renderImage = (coverUrl: string | null) => {
      if (coverUrl && !coverUrl.includes("avatars/initials")) {
        return (
          <Image
            source={{ uri: coverUrl }}
            style={{
              width: "100%",
              aspectRatio: 1,
              borderRadius: 24,
              backgroundColor: isDark ? "#27272A" : "#E4E4E7",
            }}
            contentFit="cover"
            transition={300}
          />
        );
      }
      return (
        <View
          style={{
            width: "100%",
            aspectRatio: 1,
            borderRadius: 24,
            backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7",
            borderWidth: 1,
            borderColor: borderColor,
          }}
          className="items-center justify-center relative overflow-hidden"
        >
          {/* 🔥 CORRECCIÓN: Ruta de imagen corregida */}
          <Image
            source={require("@/assets/images/icon.png")}
            style={{ width: "50%", height: "50%", opacity: 0.5 }}
            contentFit="contain"
          />
        </View>
      );
    };

    return (
      <TouchableOpacity
        onPress={() => {
          Haptics.selectionAsync();
          onPress(item);
        }}
        className="mb-6"
        style={{ width: CARD_WIDTH }}
      >
        <View className="relative mb-3">
          {renderImage(item.cover)}
          {item.platform !== "mood" && (
            <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-full backdrop-blur-md">
              <Ionicons
                name={
                  item.platform === "spotify"
                    ? "logo-rss"
                    : item.platform === "apple"
                      ? "logo-apple"
                      : ("musical-notes" as any)
                }
                size={10}
                color={
                  item.platform === "spotify"
                    ? "#1DB954"
                    : item.platform === "apple"
                      ? "#FA243C"
                      : "white"
                }
              />
            </View>
          )}
        </View>
        <Text
          className="font-bold text-[15px] ml-1 mb-0.5"
          numberOfLines={1}
          style={{ color: textColor }}
        >
          {item.name}
        </Text>
        <Text
          className="text-xs ml-1 opacity-70"
          style={{ color: subTextColor }}
        >
          {item.songs?.length || 0} {t("library.songsCount")}
        </Text>
      </TouchableOpacity>
    );
  },
);

PlaylistCard.displayName = "PlaylistCard";

export const EmptyState = ({
  t,
  textColor,
  subTextColor,
  emptyIconColor,
}: any) => (
  <View className="items-center justify-center py-24 opacity-80">
    <View className="w-24 h-24 rounded-full bg-zinc-50 dark:bg-zinc-900/50 items-center justify-center mb-6 border border-zinc-100 dark:border-zinc-800">
      <Ionicons name="musical-notes" size={48} color={emptyIconColor} />
    </View>
    <Text
      className="mt-2 font-bold text-2xl text-center"
      style={{ color: textColor }}
    >
      {t("library.empty.title")}
    </Text>
    <Text
      className="text-center mt-3 px-12 leading-6 font-medium"
      style={{ color: subTextColor }}
    >
      {t("library.emptySubtitle")}
    </Text>
  </View>
);
