import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  Platform,
  RefreshControl,
} from "react-native";
import React, {
  useCallback,
  useState,
  useMemo,
  memo,
  useEffect,
  useRef,
} from "react";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

import { useExploreLogic } from "@/hooks/useExploreLogic";
import { parseSongData, getCreatorFromPost } from "@/utils/exploreHelpers";
import { createStory, getFollowedUserIds } from "@/lib/appwrite";

import PostItem from "@/components/PostItem";
import OptionsModal from "@/components/OptionsModal";
import ShareModal from "@/components/ShareModal";
import MoodShareCard from "@/components/MoodShareCard";

import {
  ExplorePostSkeleton,
  TrendingVibeSkeleton,
  CreatorSkeleton,
  MusicSkeleton,
  ArtistSkeleton,
  ProfileSkeleton,
} from "@/components/explore/ExploreSkeletons";
import PlayerPostModal from "@/components/explore/PlayerPostModal";
import DirectShareSheet from "@/components/home/DirectShareSheet";
import StoryCreationModal from "@/components/home/StoryCreationModal";
import { useAudioContext } from "@/context/AudioContext";
import { TrackOptionsModal } from "@/components/explore/TrackOptionsModal";
import PostModal from "@/components/postModal/PostModal";
import PressableScale from "@/components/shared/PressableScale";

import { MoodSessionManager } from "@/src/brain/session/MoodSessionManager";
import { useMoodState } from "@/src/brain/session/useMoodState";
import { useFlag } from "@/src/config/flags";

const PostModalAny = PostModal as any;


const searchSongsWrapper = async (query: string) => {
  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=15`,
    );
    const data = await response.json();
    return data.data.map((track: any) => ({
      id: track.id.toString(),
      title: track.title,
      artist: track.artist.name,
      cover: track.album.cover_medium || track.album.cover_big,
      preview: track.preview,
      duration: track.duration,
    }));
  } catch (e) {
    return [];
  }
};

const CATEGORIES = [
  {
    id: "posts",
    labelKey: "explore.categories.posts",
    icon: "compass-outline",
  },
  { id: "music", labelKey: "explore.categories.music", icon: "musical-notes" },
  {
    id: "artists",
    labelKey: "explore.categories.artists",
    icon: "people-outline",
  },
  {
    id: "profiles",
    labelKey: "explore.categories.profiles",
    icon: "person-add-outline",
  },
];

// --- COMPONENTES AUXILIARES ---

const renderArtistRow = ({
  item,
  borderColor,
  textColor,
  subTextColor,
}: any) => (
  <PressableScale
    onPress={() =>
      router.push(`/artist/${encodeURIComponent(item.name)}` as any)
    }
    hapticKind="selection"
    className="flex-row items-center px-5 py-4 border-b"
    style={{ borderColor: borderColor }}
  >
    <Image
      source={{ uri: item.cover }}
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#27272A",
      }}
      contentFit="cover"
      transition={300}
    />
    <View className="flex-1 ml-4">
      <Text className="font-bold text-base" style={{ color: textColor }}>
        {item.name}
      </Text>
      <Text className="text-sm" style={{ color: subTextColor }}>
        {item.count} canciones en Mood
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={subTextColor} />
  </PressableScale>
);

const MusicListRow = ({
  item,
  index,
  accentColor,
  subTextColor,
  textColor,
  borderColor,
  isDark,
  logic,
}: any) => {
  // 🔥 Usamos AudioContext aquí también para evitar conflictos si el usuario cambia de tab
  const {
    playTrack,
    pauseTrack,
    resumeTrack,
    currentPlayingId,
    isPlaying: isGlobalPlaying,
  } = useAudioContext();

  const trackId = item.trackId || item.id;
  const isCurrentTrack = currentPlayingId === trackId;
  const isPlaying = isCurrentTrack && isGlobalPlaying;

  return (
    <PressableScale
      onPress={() => router.push(`/post/${item.postId}` as any)}
      hapticKind="selection"
      className="flex-row items-center px-5 py-4 border-b"
      style={{ borderColor: borderColor }}
    >
      <Text
        className="font-bold text-lg mr-4 w-6 text-center"
        style={{ color: index < 3 ? accentColor : subTextColor }}
      >
        {index + 1}
      </Text>
      <Image
        source={{ uri: item.cover }}
        style={{
          width: 48,
          height: 48,
          borderRadius: 8,
          backgroundColor: "#27272A",
        }}
        contentFit="cover"
        transition={300}
      />
      <View className="flex-1 ml-4">
        <Text
          className="font-bold text-base mb-0.5"
          numberOfLines={1}
          style={{ color: textColor }}
        >
          {item.title}
        </Text>
        <Text className="text-sm" style={{ color: subTextColor }}>
          {item.artist}
        </Text>
        <Text className="text-xs mt-1" style={{ color: accentColor }}>
          {item.score} likes
        </Text>
      </View>
      <PressableScale
        onPress={(e) => {
          e.stopPropagation();
          // Haptic handled by PressableScale
          if (isCurrentTrack) {
            if (isGlobalPlaying) pauseTrack();
            else resumeTrack();
          } else {
            playTrack(trackId, item.preview, {
              title: item.title,
              artist: item.artist,
              cover: item.cover,
            });
          }
        }}
        hapticKind="selection"
        className="w-10 h-10 rounded-full items-center justify-center"
        style={{
          backgroundColor: isPlaying
            ? accentColor
            : isDark
              ? "#27272A"
              : "#E5E5E5",
        }}
      >
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={20}
          color={isPlaying ? "white" : accentColor}
        />
      </PressableScale>
    </PressableScale>
  );
};

const CategoryTabs = memo(
  ({
    activeCategory,
    setActiveCategory,
    t,
    borderColor,
    subTextColor,
    accentColor,
    bgColor,
  }: any) => (
    <View style={{ height: 50, marginBottom: 10, backgroundColor: bgColor }}>
      <FlatList
        horizontal
        data={CATEGORIES}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingRight: 40,
          alignItems: "center",
        }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isActive = activeCategory === item.id;
          return (
            <PressableScale
              onPress={() => {
                setActiveCategory(item.id);
              }}
              hapticKind="selection"
              style={{
                marginRight: 12,
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderRadius: 20,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isActive ? accentColor : "rgba(255,255,255,0.04)",
                borderWidth: 1,
                borderColor: isActive ? accentColor : "rgba(255,255,255,0.10)",
              }}
            >
              <Ionicons
                name={item.icon as any}
                size={16}
                color={isActive ? "white" : subTextColor}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  fontWeight: isActive ? "bold" : "500",
                  fontSize: 14,
                  color: isActive ? "white" : subTextColor,
                }}
              >
                {t(item.labelKey)}
              </Text>
            </PressableScale>
          );
        }}
      />
    </View>
  ),
);

CategoryTabs.displayName = "CategoryTabs";

// --- HEADER CON MOOD DAILY PICKS (AUDIO CONTEXT AQUI) ---
const ExploreHeader = memo(
  ({
    logic,
    dailyVibes,
    t,
    textColor,
    subTextColor,
    borderColor,
    accentColor,
    isDark,
  }: any) => {
    // 🔥 1. Hook del contexto para los Daily Picks
    const {
      playTrack,
      pauseTrack,
      resumeTrack,
      currentPlayingId,
      isPlaying: isGlobalPlaying,
      prefetchTrack,
    } = useAudioContext();

    const picks = Array.isArray(dailyVibes) ? dailyVibes : logic?.dailyVibes || [];

    useEffect(() => {
      const first = picks?.[0];
      const preview = first?.preview;
      if (typeof preview === "string" && preview.startsWith("http")) {
        prefetchTrack(preview);
      }
    }, [picks, prefetchTrack]);

    return (
      <View>
        {logic.activeCategory === "posts" && (
          <View>
            <View className="mb-8 mt-2">
              <Text
                className="text-lg font-bold mb-3 ml-5 tracking-tight"
                style={{ color: textColor }}
              >
                {`Mood's Daily Top Picks`}
              </Text>
              {logic.isLoading ? (
                <View>
                  {[1, 2, 3].map((i) => (
                    <TrendingVibeSkeleton key={i} isDark={isDark} />
                  ))}
                </View>
              ) : (
                picks.map((item: any) => {
                  const trackId = item.trackId || item.id;
                  const isCurrentTrack = currentPlayingId === trackId;
                  const isPlaying = isCurrentTrack && isGlobalPlaying;

                  return (
                    <PressableScale
                      key={item.id}
                      onPress={() => {
                        // 🔥 Lógica Global para Daily Picks
                        if (isCurrentTrack) {
                          if (isGlobalPlaying) pauseTrack();
                          else resumeTrack();
                        } else {
                          playTrack(trackId, item.preview, {
                            title: item.title,
                            artist: item.artist,
                            cover: item.cover,
                          });
                        }
                      }}
                      hapticKind="selection"
                      className="flex-row items-center px-5 py-3 mb-2 mx-2 rounded-2xl bg-surface2 border border-border"
                    >
                      <View className="relative">
                        <Image
                          source={{ uri: item.cover }}
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 12,
                            backgroundColor: "#27272A",
                          }}
                          contentFit="cover"
                          transition={200}
                        />
                        {isCurrentTrack && (
                          <View className="absolute inset-0 bg-black/40 items-center justify-center rounded-xl">
                            <Ionicons
                              name="stats-chart"
                              size={16}
                              color={accentColor}
                            />
                          </View>
                        )}
                      </View>
                      <View className="flex-1 justify-center ml-4 mr-2">
                        <Text
                          className={`font-bold text-[15px] mb-1 ${
                            isCurrentTrack ? "text-[#5E17EB]" : ""
                          }`}
                          numberOfLines={1}
                          style={{
                            color: isCurrentTrack ? accentColor : textColor,
                          }}
                        >
                          {item.title}
                        </Text>
                        <Text
                          className="text-xs font-medium"
                          numberOfLines={1}
                          style={{ color: subTextColor }}
                        >
                          {item.artist}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <TouchableOpacity
                          disabled={true}
                          style={{ marginRight: 12 }}
                          className="w-8 h-8 rounded-full items-center justify-center border border-zinc-200 dark:border-zinc-800"
                        >
                          <Ionicons
                            name={isPlaying ? "pause" : "play"}
                            size={16}
                            color={isCurrentTrack ? accentColor : subTextColor}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light,
                            );
                            logic.openTrackOptions(item);
                          }}
                          className="w-8 h-8 rounded-full items-center justify-center bg-[#5E17EB]"
                        >
                          <Ionicons name="add" size={20} color="white" />
                        </TouchableOpacity>
                      </View>
                    </PressableScale>
                  );
                })
              )}
            </View>
          </View>
        )}
      </View>
    );
  },
);

ExploreHeader.displayName = "ExploreHeader";

const SearchResultsView = memo(
  ({
    logic,
    user,
    t,
    textColor,
    subTextColor,
    borderColor,
    accentColor,
    onFollowOptimistic,
  }: any) => {
    if (logic.searchResults.isLoading)
      return (
        <View className="pt-20">
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      );
    const hasResults =
      logic.searchResults.users.length > 0 ||
      logic.searchResults.posts.length > 0;
    if (!hasResults && logic.searchText.trim().length > 0)
      return (
        <View className="py-20 items-center opacity-50">
          <Text style={{ color: subTextColor }}>
            {t("explore.search.noResults")}
          </Text>
        </View>
      );
    return (
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {logic.searchResults.users.length > 0 && (
          <View className="mb-6 mt-4">
            <Text
              className="px-5 py-3 font-bold text-lg opacity-80"
              style={{ color: textColor }}
            >
              {t("explore.search.people")}
            </Text>
            {logic.searchResults.users.map((u: any) => (
              <View key={u.id}>
                {renderProfileRow({
                  item: u,
                  logic,
                  textColor,
                  subTextColor,
                  accentColor,
                  borderColor,
                  onFollowOptimistic,
                })}
              </View>
            ))}
          </View>
        )}
        {logic.searchResults.posts.length > 0 && (
          <View className="pb-10">
            <Text
              className="px-5 py-3 font-bold text-lg opacity-80"
              style={{ color: textColor }}
            >
              {t("explore.search.posts")}
            </Text>
            {logic.searchResults.posts.map((post: any) => (
              <View
                key={post.$id}
                className="py-4 border-b"
                style={{ borderColor: borderColor }}
              >
                <PostItem
                  post={post}
                  currentUserId={user?.$id || ""}
                  onProfilePress={(id) => router.push(`/user/${id}` as any)}
                  onCommentPress={(id) => router.push(`/post/${id}` as any)}
                  onOptionsPress={() => logic.handleOpenOptions(post)}
                  onSharePress={() => logic.openShare(post)}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  },
);

SearchResultsView.displayName = "SearchResultsView";

const renderProfileRow = ({
  item,
  logic,
  textColor,
  subTextColor,
  accentColor,
  borderColor,
  onFollowOptimistic,
}: any) => (
  <TouchableOpacity
    onPress={() => router.push(`/user/${item.$id || item.id}` as any)}
    className="flex-row items-center px-5 py-4 border-b active:opacity-70 justify-between"
    style={{ borderColor: borderColor }}
  >
    <View className="flex-row items-center flex-1 mr-4">
      <Image
        source={
          item.pfp || item.avatar
            ? { uri: item.pfp || item.avatar }
            : require("@/assets/noPfp.jpg")
        }
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: "#27272A",
          borderColor: "#3F3F46",
          borderWidth: 1,
        }}
        contentFit="cover"
        transition={200}
      />
      <View className="ml-4 flex-1">
        <View className="flex-row items-center">
          <Text
            className="font-bold text-base mr-1"
            numberOfLines={1}
            style={{ color: textColor }}
          >
            {item.name || item.username}
          </Text>
          {item.isVerified && (
            <MaterialIcons name="verified" size={14} color={accentColor} />
          )}
        </View>
        <Text
          className="text-sm"
          numberOfLines={1}
          style={{ color: subTextColor }}
        >
          @{item.username}
        </Text>
      </View>
    </View>
    <TouchableOpacity
      onPress={(e) => {
        e.stopPropagation();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        logic.handleFollowUser(item.$id || item.id);
        if (onFollowOptimistic) onFollowOptimistic(item.$id || item.id);
      }}
      className="bg-[#5E17EB] px-5 py-2.5 rounded-full shadow-sm"
      style={{ minWidth: 80, alignItems: "center" }}
    >
      <Text className="text-white font-bold text-xs">Seguir</Text>
    </TouchableOpacity>
  </TouchableOpacity>
);

const Explore = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const logic = useExploreLogic();
  const enableExploreRanking = useFlag("brainRankingExplore");

  // Personalization signal (music-first): use the brain's short-term memory
  // to rank music/artist lists in Explore without extra network calls.
  const { vector } = useMoodState();
  const brain = useMemo(() => MoodSessionManager.getInstance(), []);
  const onPullToRefresh = useCallback(() => {
    if (logic.isRefreshing) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logic.onRefresh();
  }, [logic.isRefreshing, logic.onRefresh]);

  const { t, user } = logic;
  const [localSearchText, setLocalSearchText] = useState(logic.searchText);
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  useEffect(() => {
    if (localSearchText === logic.searchText) return;
    const delayDebounceFn = setTimeout(() => {
      logic.setSearchText(localSearchText);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [localSearchText]);
  useEffect(() => {
    setLocalSearchText(logic.searchText);
  }, [logic.searchText]);
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const refreshData = async () => {
        if (user?.$id) {
          try {
            const ids = await getFollowedUserIds(user.$id);
            if (isActive) setFollowedIds(ids);
          } catch (e) {
            console.log("Error silent fetch:", e);
          }
        }
      };
      refreshData();
      return () => {
        isActive = false;
      };
    }, [user?.$id]),
  );
  const handleFollowOptimistic = (id: string) =>
    setFollowedIds((prev) => [...prev, id]);
  const filteredProfiles = useMemo(() => {
    if (!logic.users) return [];
    return logic.users.filter((u: any) => {
      const userId = u.$id || u.id;
      return userId !== user?.$id && !followedIds.includes(userId);
    });
  }, [logic.users, followedIds, user?.$id]);

  // --- Personalization (rank without mutating source arrays) ---
  const getArtistName = (it: any): string => {
    const a = it?.artist;
    if (typeof a === "string") return a;
    if (a && typeof a === "object") return a.name || a.title || "";
    return it?.name || "";
  };

  const personalizedDailyVibes = useMemo(() => {
    const list = Array.isArray(logic.dailyVibes) ? logic.dailyVibes : [];
    if (!enableExploreRanking || list.length <= 1) return list;
    return [...list]
      .map((it: any, idx: number) => ({ it, idx, score: brain.getArtistAffinity(getArtistName(it)) }))
      .sort((a, b) => b.score - a.score || a.idx - b.idx)
      .map((x) => x.it);
  }, [enableExploreRanking, logic.dailyVibes, vector.energy, vector.valence]);

  const personalizedTopSongs = useMemo(() => {
    const list = Array.isArray(logic.topSongs) ? logic.topSongs : [];
    if (!enableExploreRanking || list.length <= 1) return list;
    return [...list]
      .map((it: any, idx: number) => ({ it, idx, score: brain.getArtistAffinity(getArtistName(it)) }))
      .sort((a, b) => b.score - a.score || a.idx - b.idx)
      .map((x) => x.it);
  }, [enableExploreRanking, logic.topSongs, vector.energy, vector.valence]);

  const personalizedArtists = useMemo(() => {
    const list = Array.isArray(logic.artists) ? logic.artists : [];
    if (!enableExploreRanking || list.length <= 1) return list;
    return [...list]
      .map((it: any, idx: number) => ({ it, idx, score: brain.getArtistAffinity(it?.name || it?.title || "") }))
      .sort((a, b) => b.score - a.score || a.idx - b.idx)
      .map((x) => x.it);
  }, [enableExploreRanking, logic.artists, vector.energy, vector.valence]);

  const personalizedProfiles = useMemo(() => {
    const list = Array.isArray(filteredProfiles) ? filteredProfiles : [];
    if (!enableExploreRanking || list.length <= 1) return list;
    return [...list]
      .map((it: any, idx: number) => ({ it, idx, score: brain.getCreatorAffinity(it.$id || it.id || "") }))
      .sort((a, b) => b.score - a.score || a.idx - b.idx)
      .map((x) => x.it);
  }, [enableExploreRanking, filteredProfiles, vector.energy, vector.valence]);

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  // Premium glass-ish input: subtle surface + subtle border
  const inputBg = isDark ? "rgba(18,18,26,0.85)" : "#F3F4F6";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "#E5E5E5";
  const accentColor = "#5E17EB";
  const showResults = logic.searchText.trim().length > 0;
  const handleClearSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalSearchText("");
    logic.setSearchText("");
    logic.setIsSearchActive(false);
    Keyboard.dismiss();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bgColor }}>
      <View style={{ flex: 1 }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <SafeAreaView className="flex-1" edges={["top"]}>
          {/* SEARCH */}
          <View
            className="px-5 pt-2 pb-4"
            style={{ backgroundColor: bgColor, zIndex: 10 }}
          >
            <View
              className="flex-row items-center h-12 rounded-2xl px-4 border"
              style={{ backgroundColor: inputBg, borderColor: borderColor }}
            >
              <Ionicons name="search" size={20} color={subTextColor} />
              <TextInput
                value={localSearchText}
                onChangeText={setLocalSearchText}
                onFocus={() => {
                  logic.setIsSearchActive(true);
                  Haptics.selectionAsync();
                }}
                placeholder={t("explore.searchPlaceholder")}
                placeholderTextColor={subTextColor}
                className="flex-1 ml-3 font-medium text-base"
                style={{ color: textColor }}
                returnKeyType="search"
              />
              {(localSearchText.length > 0 || logic.isSearchActive) && (
                <PressableScale
                  onPress={handleClearSearch}
                  hapticKind="light"
                  hitSlop={10}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={subTextColor}
                  />
                </PressableScale>
              )}
            </View>
          </View>

          {showResults ? (
            <SearchResultsView
              logic={logic}
              user={user}
              t={t}
              textColor={textColor}
              subTextColor={subTextColor}
              borderColor={borderColor}
              accentColor={accentColor}
              onFollowOptimistic={handleFollowOptimistic}
            />
          ) : (
            <FlatList
              data={
                logic.isLoading
                  ? Array.from({ length: 6 })
                  : logic.activeCategory === "posts"
                    ? logic.posts
                    : logic.activeCategory === "music"
                      ? personalizedTopSongs
                      : logic.activeCategory === "artists"
                        ? personalizedArtists
                        : personalizedProfiles
              }
              keyExtractor={(item, index) =>
                item?.$id || item?.id || index.toString()
              }
              refreshControl={
                <RefreshControl
                  refreshing={logic.isRefreshing}
                  onRefresh={onPullToRefresh}
                  tintColor="#5E17EB"
                  colors={["#5E17EB"]}
                  progressBackgroundColor={isDark ? "#0B0B0F" : "#FFFFFF"}
                />
              }
              ListHeaderComponent={
                <View style={{ backgroundColor: bgColor }}>
                  <CategoryTabs
                    activeCategory={logic.activeCategory}
                    setActiveCategory={logic.setActiveCategory}
                    t={t}
                    borderColor={borderColor}
                    subTextColor={subTextColor}
                    accentColor={accentColor}
                    bgColor={bgColor}
                  />
                  {logic.activeCategory === "posts" && (
                    <ExploreHeader
                      logic={logic}
                      dailyVibes={personalizedDailyVibes}
                      t={t}
                      textColor={textColor}
                      subTextColor={subTextColor}
                      borderColor={borderColor}
                      accentColor={accentColor}
                      isDark={isDark}
                    />
                  )}
                </View>
              }
              key={logic.activeCategory === "posts" ? "grid-3" : "list-1"}
              numColumns={logic.activeCategory === "posts" ? 3 : 1}
              renderItem={({ item, index }) => {
                if (logic.isLoading) {
                  switch (logic.activeCategory) {
                    case "music":
                      return <MusicSkeleton isDark={isDark} />;
                    case "artists":
                      return <ArtistSkeleton isDark={isDark} />;
                    case "profiles":
                      return <ProfileSkeleton isDark={isDark} />;
                    default:
                      return <ExplorePostSkeleton isDark={isDark} />;
                  }
                }
                if (logic.activeCategory === "posts") {
                  const song = parseSongData(item.songData);
                  if (!song) return null;
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.selectionAsync();
                        logic.setPlayerPostsList(logic.posts);
                        logic.setPlayerInitialIndex(index);
                        logic.setIsPlayerModalVisible(true);
                      }}
                      className="flex-1 m-[1px] aspect-square relative"
                      style={{ maxWidth: "33.33%" }}
                    >
                      <Image
                        source={{ uri: song.cover }}
                        style={{
                          width: "100%",
                          height: "100%",
                          backgroundColor: "#27272A",
                        }}
                        contentFit="cover"
                        transition={200}
                      />
                      <View className="absolute top-1 right-1 bg-black/40 rounded-full p-1">
                        <Ionicons
                          name="musical-notes"
                          size={10}
                          color="white"
                        />
                      </View>
                    </TouchableOpacity>
                  );
                }
                if (logic.activeCategory === "music")
                  // Usamos MusicListRow que ahora es un componente independiente
                  return (
                    <MusicListRow
                      item={item}
                      index={index}
                      accentColor={accentColor}
                      subTextColor={subTextColor}
                      textColor={textColor}
                      borderColor={borderColor}
                      isDark={isDark}
                      logic={logic}
                    />
                  );
                if (logic.activeCategory === "artists")
                  return renderArtistRow({
                    item,
                    borderColor,
                    textColor,
                    subTextColor,
                  });
                return renderProfileRow({
                  item,
                  logic,
                  textColor,
                  subTextColor,
                  accentColor,
                  borderColor,
                  onFollowOptimistic: handleFollowOptimistic,
                });
              }}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* 🔥 MODALES */}
          <PlayerPostModal
            visible={logic.isPlayerModalVisible}
            onClose={() => logic.setIsPlayerModalVisible(false)}
            initialIndex={logic.playerInitialIndex}
            postsList={logic.playerPostsList}
            currentUser={user}
            onOption={logic.handleOpenOptions}
          />
          <DirectShareSheet
            visible={logic.isShareSelectorVisible}
            onClose={() => logic.setShareSelectorVisible(false)}
            contacts={logic.shareContacts}
            isDark={isDark}
            isLoadingContacts={logic.isLoadingContacts}
            onSearch={logic.handleShareSearch}
            onSend={logic.handleSendShare}
            onAddToStory={() => {}}
            onViralCard={() => {
              logic.setShareSelectorVisible(false);
              setTimeout(() => logic.setViralModalVisible(true), 300);
            }}
            onSystemShare={() => {}}
            onCopyLink={logic.handleCopyLink}
          />
          <StoryCreationModal
            visible={logic.isCreationVisible}
            onClose={() => logic.setCreationVisible(false)}
            currentUser={user}
            onSuccess={() => logic.setCreationVisible(false)}
            initialSongData={logic.storyInitialSongData}
            createStory={createStory}
            searchSongsWrapper={searchSongsWrapper}
            RANDOM_SEARCH_TERMS={[]}
          />
          <MoodShareCard
            isVisible={logic.isViralModalVisible}
            onClose={() => logic.setViralModalVisible(false)}
            post={logic.getViralPostData()}
          />
          <ShareModal
            isVisible={logic.isShareVisible}
            onClose={() => logic.setShareVisible(false)}
            postId={logic.sharePostId}
          />
          <OptionsModal
            isVisible={logic.isOptionsVisible}
            onClose={() => logic.setOptionsVisible(false)}
            onDelete={() => {}}
            onReport={() => {}}
            isOwner={
              user?.$id && logic.selectedPost
                ? (logic.selectedPost.postedBy?.$id ||
                    getCreatorFromPost(logic.selectedPost).id) === user.$id
                : false
            }
          />

          <TrackOptionsModal
            visible={logic.isTrackOptionsVisible}
            onClose={() => logic.setTrackOptionsVisible(false)}
            track={logic.selectedTrackForAction}
            onCreateStory={logic.handleStartStory}
            onCreatePost={logic.handleStartPost}
          />

          <PostModalAny
            visible={logic.isPostModalVisible}
            isVisible={logic.isPostModalVisible}
            onClose={() => logic.setIsPostModalVisible(false)}
            prefillData={{ song: logic.selectedTrackForAction }}
          />
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
};

export default Explore;
