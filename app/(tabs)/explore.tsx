import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  // RefreshControl, // 🗑 Eliminado
  ScrollView,
  Keyboard,
  Animated, // ✨ Nuevo
  Platform, // ✨ Nuevo
  LayoutAnimation, // ✨ Nuevo
  UIManager, // ✨ Nuevo
  useWindowDimensions, // ✨ Nuevo
} from "react-native";
import React, { useCallback, useState, useMemo, memo, useEffect, useRef } from "react";
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

// Habilitar animaciones de Layout en Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- CONSTANTES DE UX ---
const PULL_THRESHOLD = -80;
const VISIBLE_THRESHOLD = -40;
const SPINNER_HEIGHT = 60;

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

// --- COMPONENTES UI EXTERNOS ---

const CategoryTabs = memo(
  ({
    activeCategory,
    setActiveCategory,
    t,
    borderColor,
    subTextColor,
    accentColor,
  }: any) => (
    <View style={{ height: 50, marginBottom: 10 }}>
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
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setActiveCategory(item.id);
              }}
              style={{
                marginRight: 12,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 999,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isActive ? accentColor : "transparent",
                borderWidth: 1,
                borderColor: isActive ? accentColor : borderColor,
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
                  fontSize: 15,
                  color: isActive ? "white" : subTextColor,
                }}
              >
                {t(item.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  ),
);

const ExploreHeader = memo(
  ({
    logic,
    t,
    textColor,
    subTextColor,
    borderColor,
    accentColor,
    isDark,
  }: any) => {
    return (
      <View>
        <CategoryTabs
          activeCategory={logic.activeCategory}
          setActiveCategory={logic.setActiveCategory}
          t={t}
          borderColor={borderColor}
          subTextColor={subTextColor}
          accentColor={accentColor}
        />

        {logic.activeCategory === "posts" && (
          <View>
            <View className="mb-6 mt-2">
              <Text
                className="text-lg font-bold mb-3 ml-5"
                style={{ color: textColor }}
              >
                Mood's Daily Top Picks
              </Text>
              {logic.isLoading ? (
                <View>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TrendingVibeSkeleton key={i} isDark={isDark} />
                  ))}
                </View>
              ) : (
                logic.dailyVibes.map((item: any) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      const fakePost = {
                        $id: item.postId,
                        songData: JSON.stringify(item),
                        likedBy: [],
                        savedBy: [],
                      };
                      logic.setPlayerPostsList([fakePost]);
                      logic.setPlayerInitialIndex(0);
                      logic.setIsPlayerModalVisible(true);
                    }}
                    className="flex-row items-center px-5 py-3 mb-2 mx-2 active:opacity-70"
                  >
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
                    <View className="flex-1 justify-center ml-4 mr-2">
                      <Text
                        className="font-bold text-[15px] mb-1"
                        numberOfLines={1}
                        style={{ color: textColor }}
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
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        Haptics.selectionAsync();
                        logic.playPreview(
                          item.preview,
                          item.trackId || item.id,
                        );
                      }}
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{
                        backgroundColor:
                          logic.playingPreviewId === (item.trackId || item.id)
                            ? accentColor
                            : isDark
                              ? "#27272A"
                              : "#F3F4F6",
                      }}
                    >
                      <Ionicons
                        name={
                          logic.playingPreviewId === (item.trackId || item.id)
                            ? "pause"
                            : "play"
                        }
                        size={18}
                        color={
                          logic.playingPreviewId === (item.trackId || item.id)
                            ? "white"
                            : subTextColor
                        }
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View className="mb-8">
              <Text
                className="text-lg font-bold mb-3 ml-5"
                style={{ color: textColor }}
              >
                Discover Creators
              </Text>
              {logic.isLoading ? (
                <FlatList
                  horizontal
                  data={[1, 2, 3, 4, 5]}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                  keyExtractor={(i) => i.toString()}
                  renderItem={() => <CreatorSkeleton isDark={isDark} />}
                />
              ) : (
                <FlatList
                  horizontal
                  data={logic.trendingPeople}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                  keyExtractor={(item) => item.$id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => router.push(`/user/${item.$id}` as any)}
                      className="mr-5 items-center w-20"
                    >
                      <Image
                        source={
                          item.pfp
                            ? { uri: item.pfp }
                            : require("@/assets/noPfp.jpg")
                        }
                        style={{
                          width: 68,
                          height: 68,
                          borderRadius: 34,
                          borderColor: borderColor,
                          borderWidth: 2,
                          backgroundColor: "#27272A",
                        }}
                        contentFit="cover"
                        transition={200}
                      />
                      <Text
                        className="text-xs font-medium mt-2 text-center"
                        numberOfLines={1}
                        style={{ color: textColor }}
                      >
                        {item.name || item.username}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
            <Text
              className="font-bold text-xl px-5 mb-4"
              style={{ color: textColor }}
            >
              Explore More
            </Text>
          </View>
        )}
      </View>
    );
  },
);

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
    if (!hasResults && logic.searchText.trim().length > 0) {
      return (
        <View className="py-20 items-center opacity-50">
          <Text style={{ color: subTextColor }}>
            {t("explore.search.noResults")}
          </Text>
        </View>
      );
    }
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
  const { t, user } = logic;

  const [localSearchText, setLocalSearchText] = useState(logic.searchText);
  const [followedIds, setFollowedIds] = useState<string[]>([]);

  // 🔥 CUSTOM REFRESH STATE
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(0);
  const [showSpinner, setShowSpinner] = useState(false);

  // --- ANIMACIONES & SCROLL ---
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (!logic.isRefreshing) {
      setShowSpinner(false);
    }
  }, [logic.isRefreshing]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        scrollRef.current = offsetY;

        // Lógica reactiva de visibilidad
        if (offsetY < VISIBLE_THRESHOLD) {
           if (!showSpinner) setShowSpinner(true);
        } else if (!logic.isRefreshing) {
           if (showSpinner) setShowSpinner(false);
        }
      },
    }
  );

  const handleScrollEndDrag = () => {
    const offsetY = scrollRef.current;
    if (offsetY < PULL_THRESHOLD && !logic.isRefreshing) {
      setShowSpinner(true); 
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      logic.onRefresh();
    }
  };

  const spinnerScale = scrollY.interpolate({
    inputRange: [PULL_THRESHOLD * 1.5, PULL_THRESHOLD, 0],
    outputRange: [1.3, 1, 0],
    extrapolate: "clamp",
  });

  const spinnerRotate = scrollY.interpolate({
    inputRange: [PULL_THRESHOLD * 2, 0],
    outputRange: ["360deg", "0deg"],
    extrapolate: "clamp",
  });

  // 🔥 DEBOUNCE LOGIC
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

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const inputBg = isDark ? "#18181B" : "#F3F4F6";
  const borderColor = isDark ? "#27272A" : "#E5E5E5";
  const accentColor = "#5E17EB";

  const showResults = logic.searchText.trim().length > 0;

  const handleClearSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalSearchText("");
    logic.setSearchText("");
    logic.setIsSearchActive(false);
    Keyboard.dismiss();
  };

  const renderMusicRow = ({ item, index }: any) => {
    const isPlaying = logic.playingPreviewId === (item.trackId || item.id);
    return (
      <TouchableOpacity
        onPress={() => router.push(`/post/${item.postId}` as any)}
        className="flex-row items-center px-5 py-4 border-b active:opacity-70"
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
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            Haptics.selectionAsync();
            logic.playPreview(item.preview, item.trackId || item.id);
          }}
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
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderArtistRow = ({ item }: any) => (
    <TouchableOpacity
      onPress={() =>
        router.push(`/artist/${encodeURIComponent(item.name)}` as any)
      }
      className="flex-row items-center px-5 py-4 border-b active:opacity-70"
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
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bgColor }}>
      <View style={{ flex: 1 }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <SafeAreaView className="flex-1" edges={["top"]}>
          {/* BARRA DE BÚSQUEDA */}
          <View className="px-5 pt-2 pb-4" style={{ backgroundColor: bgColor, zIndex: 10 }}>
            <View
              className="flex-row items-center h-12 rounded-2xl px-4 border"
              style={{ backgroundColor: inputBg, borderColor: "transparent" }}
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
                <TouchableOpacity onPress={handleClearSearch}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={subTextColor}
                  />
                </TouchableOpacity>
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
            <Animated.FlatList
              data={
                logic.isLoading
                  ? Array.from({ length: 6 })
                  : logic.activeCategory === "posts"
                    ? logic.posts
                    : logic.activeCategory === "music"
                      ? logic.topSongs
                      : logic.activeCategory === "artists"
                        ? logic.artists
                        : filteredProfiles
              }
              keyExtractor={(item, index) =>
                item?.$id || item?.id || index.toString()
              }
              // 🔥 HANDLERS PARA REFRESH
              onScroll={handleScroll}
              onScrollEndDrag={handleScrollEndDrag}
              scrollEventThrottle={16}
              
              ListHeaderComponent={
                <View>
                  {/* Contenedor del Spinner Animado */}
                  <Animated.View
                    style={{
                      height: (showSpinner || logic.isRefreshing) ? SPINNER_HEIGHT : 0,
                      opacity: (showSpinner || logic.isRefreshing) ? 1 : 0,
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      transform: [
                        { scale: logic.isRefreshing ? 1 : spinnerScale },
                        { rotate: logic.isRefreshing ? "0deg" : spinnerRotate },
                      ],
                    }}
                  >
                    <ActivityIndicator size="small" color="#5E17EB" />
                  </Animated.View>

                  <ExploreHeader
                    logic={logic}
                    t={t}
                    textColor={textColor}
                    subTextColor={subTextColor}
                    borderColor={borderColor}
                    accentColor={accentColor}
                    isDark={isDark}
                  />
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
                  return renderMusicRow({ item, index });
                if (logic.activeCategory === "artists")
                  return renderArtistRow({ item });
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
              // refreshControl eliminado
            />
          )}

          {/* MODALES */}
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
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
};

export default Explore;