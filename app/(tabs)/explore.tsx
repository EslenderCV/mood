import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  Modal,
  Keyboard,
} from "react-native";
import React from "react";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useExploreLogic } from "@/hooks/useExploreLogic";
import { parseSongData, getCreatorFromPost } from "@/utils/exploreHelpers";
import { createStory } from "@/lib/appwrite";

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

// --- CONSTANTES ---
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
const RANDOM_SEARCH_TERMS = [
  "global top 50",
  "viral hits",
  "pop hits",
  "lo-fi beats",
  "rock classics",
];

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

const CategoryTabs = ({
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
            onPress={() => setActiveCategory(item.id)}
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
);

const SearchResultsView = ({
  logic,
  user,
  t,
  textColor,
  subTextColor,
  borderColor,
  accentColor,
  isDark,
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
                onProfilePress={(id) => {
                  router.push(`/user/${id}` as any);
                }}
                onCommentPress={(id) => {
                  router.push(`/post/${id}` as any);
                }}
                onOptionsPress={() => logic.handleOpenOptions(post)}
                onSharePress={() => logic.openShare(post)}
              />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const renderProfileRow = ({
  item,
  logic,
  textColor,
  subTextColor,
  accentColor,
  borderColor,
}: any) => (
  <TouchableOpacity
    onPress={() => {
      router.push(`/user/${item.$id || item.id}` as any);
    }}
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
        className="w-12 h-12 rounded-full bg-zinc-800 mr-4 border border-zinc-700"
      />
      <View className="flex-1">
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
        logic.handleFollowUser(item.$id || item.id);
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

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const inputBg = isDark ? "#18181B" : "#F3F4F6";
  const borderColor = isDark ? "#27272A" : "#E5E5E5";
  const accentColor = "#5E17EB";

  const showResults = logic.searchText.trim().length > 0;

  // --- RENDERS DE ITEMS DE LISTA ---
  const renderGridItem = ({ item, index }: { item: any; index: number }) => {
    const song = parseSongData(item.songData);
    if (!song) return null;
    return (
      <TouchableOpacity
        onPress={() => {
          logic.setPlayerPostsList(logic.posts);
          logic.setPlayerInitialIndex(index);
          logic.setIsPlayerModalVisible(true);
        }}
        className="flex-1 m-[1px] aspect-square relative"
        style={{ maxWidth: "33.33%" }}
      >
        <Image
          source={{ uri: song.cover }}
          className="w-full h-full bg-zinc-800"
        />
        <View className="absolute top-1 right-1 bg-black/40 rounded-full p-1">
          <Ionicons name="musical-notes" size={10} color="white" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderMusicRow = ({ item, index }: { item: any; index: number }) => {
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
          className="w-12 h-12 rounded-lg bg-zinc-800 mr-4"
        />
        <View className="flex-1">
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
            style={{ marginLeft: isPlaying ? 0 : 2 }}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderArtistRow = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() =>
        router.push(`/artist/${encodeURIComponent(item.name)}` as any)
      }
      className="flex-row items-center px-5 py-4 border-b active:opacity-70"
      style={{ borderColor: borderColor }}
    >
      <Image
        source={{ uri: item.cover }}
        className="w-14 h-14 rounded-full bg-zinc-800 mr-4"
      />
      <View className="flex-1">
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

  // --- HEADER UNIFICADO (SOLUCIÓN SCROLL) ---
  // Ahora el CategoryTabs está DENTRO de este header, que será parte del scroll.
  const MainListHeader = () => {
    return (
      <View>
        {/* 1. BARRA DE CATEGORÍAS (Ahora scrollea) */}
        <CategoryTabs
          activeCategory={logic.activeCategory}
          setActiveCategory={logic.setActiveCategory}
          t={t}
          borderColor={borderColor}
          subTextColor={subTextColor}
          accentColor={accentColor}
        />

        {/* 2. CONTENIDO ESPECÍFICO DE CADA SECCIÓN */}
        {logic.activeCategory === "posts" ? (
          <View>
            <View className="mb-6 mt-2">
              <Text
                className="text-lg font-bold mb-3 ml-5"
                style={{ color: textColor }}
              >
                Trending Vibes
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
                      className="w-14 h-14 rounded-xl bg-zinc-800 mr-4"
                    />
                    <View className="flex-1 justify-center mr-2">
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
                        style={{
                          marginLeft:
                            logic.playingPreviewId === (item.trackId || item.id)
                              ? 0
                              : 2,
                        }}
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
                      <View className="relative">
                        <Image
                          source={
                            item.pfp
                              ? { uri: item.pfp }
                              : require("@/assets/noPfp.jpg")
                          }
                          className="w-[68px] h-[68px] rounded-full bg-zinc-800 border-2"
                          style={{ borderColor: borderColor }}
                        />
                      </View>
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
        ) : (
          <View className="px-5 mt-4 mb-4">
            <Text className="font-bold text-xl" style={{ color: textColor }}>
              {logic.activeCategory === "music"
                ? "Top Global Charts"
                : logic.activeCategory === "artists"
                  ? "Top Artistas"
                  : "Descubrir Perfiles"}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bgColor }}>
      <View style={{ flex: 1 }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <SafeAreaView className="flex-1" edges={["top"]}>
          {/* HEADER FIJO (Título y Buscador) */}
          <View className="px-5 pt-2 pb-2" style={{ backgroundColor: bgColor }}>
            {!logic.isSearchActive && (
              <Text
                className="text-3xl font-bold mb-4"
                style={{ color: textColor }}
              >
                {t("explore.title")}
              </Text>
            )}
            <View
              className="flex-row items-center h-12 rounded-2xl px-4 border"
              style={{ backgroundColor: inputBg, borderColor: "transparent" }}
            >
              <Ionicons name="search" size={20} color={subTextColor} />
              <TextInput
                value={logic.searchText}
                onChangeText={logic.setSearchText}
                onFocus={() => logic.setIsSearchActive(true)}
                placeholder={t("explore.searchPlaceholder")}
                placeholderTextColor={subTextColor}
                className="flex-1 ml-3 font-medium text-base"
                style={{ color: textColor }}
                returnKeyType="search"
              />
              {logic.searchText.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    logic.setSearchText("");
                    Keyboard.dismiss();
                  }}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={subTextColor}
                  />
                </TouchableOpacity>
              )}
            </View>
            {logic.isSearchActive && (
              <TouchableOpacity
                onPress={() => {
                  logic.setIsSearchActive(false);
                  logic.setSearchText("");
                }}
                className="mt-3 self-end"
              >
                <Text className="text-[#5E17EB] font-bold text-base">
                  Cancelar
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* LISTA PRINCIPAL (Ahora contiene CategoryTabs en el Header) */}
          {showResults ? (
            <SearchResultsView
              logic={logic}
              user={user}
              t={t}
              textColor={textColor}
              subTextColor={subTextColor}
              borderColor={borderColor}
              accentColor={accentColor}
              isDark={isDark}
            />
          ) : (
            <FlatList
              data={
                logic.isLoading
                  ? Array.from({ length: 6 })
                  : logic.activeCategory === "posts"
                    ? logic.posts
                    : logic.activeCategory === "music"
                      ? logic.topSongs
                      : logic.activeCategory === "artists"
                        ? logic.artists
                        : logic.users
              }
              keyExtractor={(item, index) =>
                item?.$id || item?.id || index.toString()
              }
              // EL CAMBIO ESTÁ AQUÍ: MainListHeader incluye CategoryTabs
              ListHeaderComponent={MainListHeader}
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
                switch (logic.activeCategory) {
                  case "posts":
                    return renderGridItem({ item, index });
                  case "music":
                    return renderMusicRow({ item, index });
                  case "artists":
                    return renderArtistRow({ item });
                  case "profiles":
                    return renderProfileRow({
                      item,
                      logic,
                      textColor,
                      subTextColor,
                      accentColor,
                      borderColor,
                    });
                  default:
                    return null;
                }
              }}
              showsVerticalScrollIndicator={false}
              columnWrapperStyle={
                logic.activeCategory === "posts"
                  ? { paddingHorizontal: 0 }
                  : undefined
              }
              refreshControl={
                <RefreshControl
                  refreshing={logic.isRefreshing}
                  onRefresh={logic.onRefresh}
                  tintColor="#5E17EB"
                />
              }
              ListEmptyComponent={
                !logic.isLoading ? (
                  <View className="py-20 items-center opacity-50">
                    <Text style={{ color: subTextColor }}>
                      No hay sugerencias por ahora.
                    </Text>
                  </View>
                ) : null
              }
            />
          )}

          {/* Modales */}
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
            RANDOM_SEARCH_TERMS={RANDOM_SEARCH_TERMS}
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
            onDelete={() => logic.setOptionsVisible(false)}
            onReport={() => logic.setOptionsVisible(false)}
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
