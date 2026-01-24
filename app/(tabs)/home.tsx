import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Animated,
  Image,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
  LayoutAnimation,
  UIManager,
  ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { router, useNavigation } from "expo-router";
import * as Haptics from "expo-haptics";

// --- HOOK ---
import { useHomeLogic, EnrichedFeedItem } from "@/hooks/useHomeLogic";
import { FeedItem } from "@/context/FeedProvider";

// --- IMPORTS DE COMPONENTES ---
import StoriesRail from "@/components/home/StoriesRail";
import StoryViewer from "@/components/home/StoryViewer";
import CreatorModal from "@/components/home/CreatorModal";
import StoryCreationModal from "@/components/home/StoryCreationModal";
import DirectShareSheet from "@/components/home/DirectShareSheet";
import FeedSkeleton from "@/components/home/FeedSkeleton";
import EmptyStateWithSuggestions from "@/components/home/EmptyStateWithSuggestions";
import PostItem from "@/components/PostItem";
import PostModal from "@/components/postModal/PostModal";
import OptionsModal from "@/components/OptionsModal";
import MoodShareCard from "@/components/MoodShareCard";
import ShareModal from "@/components/ShareModal";
import SuggestedUsersCarousel from "@/components/SuggestedUsersCarousel";
import TrendingSongCard from "@/components/TrendingSongCard";

// IMPORTS DE ADS
import AdItem from "@/components/AdItem";
import { injectAdsInFeed } from "@/lib/mockAds";

import { createStory, deletePost } from "@/lib/appwrite";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SPINNER_HEIGHT = 60;
const PULL_THRESHOLD = -80;
const VISIBLE_THRESHOLD = -40;
const RANDOM_SEARCH_TERMS = [
  "global top 50",
  "viral hits",
  "pop hits",
  "lo-fi beats",
  "rock classics",
];

// Helper dummy
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

const Home = () => {
  const isDark = true;
  const logic = useHomeLogic();
  const navigation = useNavigation<any>();

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(0);
  const [showSpinner, setShowSpinner] = useState(false);

  // ADS INJECTION
  const feedWithAds = useMemo(() => {
    return injectAdsInFeed(logic.sortedFeed);
  }, [logic.sortedFeed]);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [showSpinner, logic.isRefreshing]);

  useEffect(() => {
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

        if (offsetY < VISIBLE_THRESHOLD) {
          if (!showSpinner) setShowSpinner(true);
        } else if (!logic.isRefreshing) {
          if (showSpinner) setShowSpinner(false);
        }
      },
    },
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

  const handleAddStoryPress = () => {
    if (logic.user?.$id === logic.MOOD_OFFICIAL_ID) {
      logic.toggleModal("isCreator", true);
    } else {
      logic.setStoryInitialSongData(null);
      logic.toggleModal("isCreation", true);
    }
  };

  const renderFeedItem = useCallback(
    ({ item }: { item: any }) => {
      switch (item.type) {
        case "post":
          return (
            <View
              className={`py-4 border-b ${isDark ? "border-zinc-800" : "border-zinc-200"}`}
            >
              {item.status === "uploading" && (
                <View className="px-5 mb-2 flex-row items-center">
                  <ActivityIndicator size="small" color="#5E17EB" />
                  <Text className="ml-2 text-xs text-zinc-400">
                    Publicando...
                  </Text>
                </View>
              )}
              <PostItem
                post={item.data}
                currentUserId={logic.user?.$id || ""}
                onProfilePress={(userId) => {
                  logic.trackOpenProfile(item.data.$id, item.id, userId);
                  router.push(`/user/${userId}` as any);
                }}
                onCommentPress={(postId) => {
                  logic.trackOpenComments(postId, item.id);
                  router.push(`/post/${postId}` as any);
                }}
                onOptionsPress={() => {
                  logic.setSelectedPost(item.data);
                  logic.toggleModal("isOptions", true);
                }}
                onSharePress={() => {
                  logic.openShareSelector(item.data);
                  logic.setSharePostId(item.data.$id);
                }}
                onLike={() => logic.trackLike(item.data.$id, item.id)}
                onSave={() => logic.trackSave(item.data.$id, item.id)}
              />
            </View>
          );

        case "ad":
          return <AdItem ad={item} />;

        case "suggested_users":
          return (
            <SuggestedUsersCarousel
              users={item.data}
              currentUserId={logic.user?.$id || ""}
            />
          );

        case "trending_song":
          return <TrendingSongCard song={item.data} />;

        default:
          return null;
      }
    },
    [logic, isDark],
  );

  const handleDeleteAction = () => {
    if (logic.selectedPost) {
      deletePost(logic.selectedPost.$id).then(() => logic.onRefresh());
      logic.toggleModal("isOptions", false);
    }
  };

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 250,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const validItems = viewableItems.filter(
        (v) => v.isViewable && v.index !== null,
      );
      if (validItems.length === 0) return;

      const indices = validItems.map((v) => v.index as number);
      if (indices.length > 0) {
        const minIndex = Math.min(...indices);
        logic.updateViewableIndex(minIndex);
      }
    },
  ).current;

  useEffect(() => {
    // @ts-ignore
    const unsubscribe = navigation.addListener("tabPress", (e: any) => {
      if (logic.isFeedLoading || logic.isRefreshing) {
        e.preventDefault();
        return;
      }
      if (navigation.isFocused()) {
        e.preventDefault();
        if (logic.flatListRef.current) {
          logic.flatListRef.current.scrollToOffset({
            offset: 0,
            animated: true,
          });
        }
        setTimeout(() => {
          logic.onRefresh();
        }, 250);
      }
    });
    return unsubscribe;
  }, [navigation, logic.onRefresh, logic.isFeedLoading, logic.isRefreshing]);

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: isDark ? "#000" : "#fff" }}
    >
      <SafeAreaView
        edges={["top"]}
        style={{
          flex: 1,
          backgroundColor: isDark ? "#000000" : "#FFFFFF",
        }}
      >
        <View className="flex-row justify-between items-center px-5 py-3 border-b border-transparent z-50 bg-black">
          <View className="h-[40px] w-[80px] justify-center">
            <Image
              source={require("@/assets/fullLogo.png")}
              resizeMode="contain"
              className="w-full h-full"
              style={{ tintColor: isDark ? undefined : "#5E17EB" }}
            />
          </View>
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => router.push("/notifications" as any)}
            >
              <Ionicons
                name="notifications-outline"
                size={26}
                color={isDark ? "#5E17EB" : "black"}
              />
              {logic.notiCount > 0 && (
                <View className="absolute top-0 right-0 bg-red-500 w-3 h-3 rounded-full border border-black" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/chatshome")}
              className="relative"
            >
              <Ionicons
                name="chatbubble-outline"
                size={26}
                color={isDark ? "#5E17EB" : "black"}
              />
              {logic.msgCount > 0 && (
                <View className="absolute top-[-2px] right-[-2px] bg-red-500 w-4 h-4 rounded-full items-center justify-center border border-black">
                  <Text className="text-white text-[9px] font-bold">
                    {logic.msgCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {logic.isFeedLoading ? (
          <FeedSkeleton isDark={isDark} />
        ) : (
          <Animated.FlatList
            ref={logic.flatListRef}
            data={feedWithAds}
            keyExtractor={(item) => item.id}
            renderItem={renderFeedItem}
            onScroll={handleScroll}
            onScrollEndDrag={handleScrollEndDrag}
            scrollEventThrottle={16}
            style={{ backgroundColor: "transparent", zIndex: 1 }}
            // 🔥 AQUÍ ESTÁ EL CAMBIO PARA QUITAR LA BARRA DE SCROLL
            showsVerticalScrollIndicator={false}
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
            // Configuración de rendimiento optimizada
            windowSize={15}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            removeClippedSubviews={Platform.OS === "android"}
            updateCellsBatchingPeriod={50}
            ListHeaderComponent={
              <View>
                <Animated.View
                  style={{
                    height:
                      showSpinner || logic.isRefreshing ? SPINNER_HEIGHT : 0,
                    opacity: showSpinner || logic.isRefreshing ? 1 : 0,
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
                <StoriesRail
                  currentUser={logic.user}
                  groupedStories={logic.localData.groupedStories}
                  onPressStoryGroup={(g) => {
                    logic.setActiveStoryGroup(g);
                    logic.toggleModal("isStoryViewer", true);
                  }}
                  onAddStory={handleAddStoryPress}
                  moodOfficialId={logic.MOOD_OFFICIAL_ID}
                />
              </View>
            }
            onEndReached={() => logic.handleLoadMore()}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <EmptyStateWithSuggestions
                suggestions={[]}
                onGoToExplore={() => router.push("/explore" as any)}
              />
            }
          />
        )}

        <PostModal />
        <CreatorModal
          visible={logic.modals.isCreator}
          onClose={() => logic.toggleModal("isCreator", false)}
          onMusic={() => {
            logic.toggleModal("isCreator", false);
            setTimeout(() => {
              logic.setStoryInitialSongData(null);
              logic.toggleModal("isCreation", true);
            }, 300);
          }}
          onGallery={() => {
            if (logic.handleMoodMediaPick) logic.handleMoodMediaPick();
          }}
        />
        <StoryCreationModal
          visible={logic.modals.isCreation}
          onClose={() => logic.toggleModal("isCreation", false)}
          currentUser={logic.user}
          onSuccess={() => logic.fetchAuxiliaryData()}
          initialSongData={logic.storyInitialSongData}
          createStory={createStory}
          searchSongsWrapper={searchSongsWrapper}
          RANDOM_SEARCH_TERMS={RANDOM_SEARCH_TERMS}
        />
        <StoryViewer
          visible={logic.modals.isStoryViewer}
          onClose={() => {
            logic.toggleModal("isStoryViewer", false);
            logic.fetchAuxiliaryData();
          }}
          group={logic.activeStoryGroup}
          currentUserId={logic.user?.$id}
          onAddMore={() => {
            logic.setStoryInitialSongData(null);
            logic.toggleModal("isCreation", true);
          }}
          onRefreshFeed={() => logic.fetchAuxiliaryData()}
          moodOfficialId={logic.MOOD_OFFICIAL_ID}
        />
        <DirectShareSheet
          visible={logic.modals.isShareSelector}
          onClose={() => logic.toggleModal("isShareSelector", false)}
          contacts={logic.shareContacts}
          isDark={isDark}
          isLoadingContacts={logic.isLoadingContacts}
          onSearch={logic.handleShareSearch}
          onSend={logic.handleSendShare}
          onAddToStory={logic.handleAddStoryFromPost}
          onViralCard={() => {
            logic.toggleModal("isShareSelector", false);
            setTimeout(() => logic.toggleModal("isViral", true), 300);
          }}
          onSystemShare={logic.handleSystemShare}
          onCopyLink={logic.handleCopyLink}
        />
        <MoodShareCard
          isVisible={logic.modals.isViral}
          onClose={() => logic.toggleModal("isViral", false)}
          post={logic.getViralPostData()}
        />
        <OptionsModal
          isVisible={logic.modals.isOptions}
          onClose={() => logic.toggleModal("isOptions", false)}
          onDelete={handleDeleteAction}
          onReport={() => logic.toggleModal("isOptions", false)}
          isOwner={
            logic.user?.$id ===
            (logic.selectedPost?.postedBy?.$id ||
              logic.selectedPost?.creator?.$id)
          }
        />
        <ShareModal
          isVisible={logic.modals.isShare}
          onClose={() => logic.toggleModal("isShare", false)}
          postId={logic.sharePostId}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default Home;
