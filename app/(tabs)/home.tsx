import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  Animated,
  ActivityIndicator,
  Platform,
  LayoutAnimation,
  UIManager,
  ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { router, useNavigation } from "expo-router";
import * as Haptics from "expo-haptics";

// --- HOOK ---
import { useHomeLogic } from "@/hooks/useHomeLogic";

// --- COMPONENTES ---
import StoriesRail from "@/components/home/StoriesRail";
import FeedSkeleton from "@/components/home/FeedSkeleton";
import EmptyStateWithSuggestions from "@/components/home/EmptyStateWithSuggestions";
import PostItem from "@/components/PostItem";
import AdItem from "@/components/AdItem";
import SuggestedUsersCarousel from "@/components/SuggestedUsersCarousel";
import TrendingSongCard from "@/components/TrendingSongCard";
import WeeklyVibeBanner from "@/components/vibe/WeeklyVibeBanner";

// 🔥 MODALES IMPORTS (Restaurados)
import CreatorModal from "@/components/home/CreatorModal";
import StoryCreationModal from "@/components/home/StoryCreationModal";
import StoryViewer from "@/components/home/StoryViewer";
import DirectShareSheet from "@/components/home/DirectShareSheet";
import MoodShareCard from "@/components/MoodShareCard";
import OptionsModal from "@/components/OptionsModal";
import ShareModal from "@/components/ShareModal";
import PostModal from "@/components/postModal/PostModal";

// 🔥 COMPONENTES ORGANIZADOS
import HomeHeader from "@/components/home/HomeHeader";
import HomeModals from "@/components/home/HomeModals";
import StreakSuccessModal from "@/components/StreakSuccessModal";

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

const Home = () => {
  const isDark = true;
  const logic = useHomeLogic();
  const navigation = useNavigation<any>();

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(0);
  const [showSpinner, setShowSpinner] = useState(false);

  // 🔥 ESTADOS PARA RACHAS
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);

  const feedWithAds = useMemo(() => {
    return injectAdsInFeed(logic.sortedFeed);
  }, [logic.sortedFeed]);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [showSpinner, logic.isRefreshing]);

  useEffect(() => {
    if (!logic.isRefreshing) setShowSpinner(false);
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
      const minIndex = Math.min(...validItems.map((v) => v.index as number));
      logic.updateViewableIndex(minIndex);
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

  const handleAddStoryPress = () => {
    if (logic.user?.$id === logic.MOOD_OFFICIAL_ID) {
      logic.toggleModal("isCreator", true);
    } else {
      logic.setStoryInitialSongData(null);
      logic.toggleModal("isCreation", true);
    }
  };

  const handleDeleteAction = () => {
    if (logic.selectedPost) {
      deletePost(logic.selectedPost.$id).then(() => logic.onRefresh());
      logic.toggleModal("isOptions", false);
    }
  };

  // 🔥 NUEVA FUNCIÓN: Se ejecuta cuando PostModal termina de crear un post exitosamente
  const handlePostCreated = () => {
    logic.fetchAuxiliaryData(); // Refrescar feed

    // Simular incremento (mientras backend no lo haga)
    const currentStreakVal = (logic.user as any)?.streak || 0;
    const simulatedNewStreak = currentStreakVal + 1;
    setCurrentStreak(simulatedNewStreak);

    // Lanzar el modal de fuego
    setTimeout(() => {
      setShowStreakModal(true);
    }, 500);
  };

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: isDark ? "#000" : "#fff" }}
    >
      <SafeAreaView
        edges={["top"]}
        style={{ flex: 1, backgroundColor: isDark ? "#000000" : "#FFFFFF" }}
      >
        <HomeHeader
          isDark={isDark}
          notiCount={logic.notiCount}
          msgCount={logic.msgCount}
        />

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
            showsVerticalScrollIndicator={false}
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
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

                <WeeklyVibeBanner
                  userId={logic.user?.$id}
                  onCreatePost={handleAddStoryPress}
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

        {/* --- MODALES MANUALES PARA CONTROLAR SUCCESS --- */}

        <StoryCreationModal
          visible={logic.modals.isCreation}
          onClose={() => logic.toggleModal("isCreation", false)}
          currentUser={logic.user}
          onSuccess={() => {
            // 🔙 Restaurado: Solo refresca feed, no lanza racha
            logic.fetchAuxiliaryData();
            logic.toggleModal("isCreation", false);
          }}
          initialSongData={logic.storyInitialSongData}
          createStory={createStory}
          searchSongsWrapper={searchSongsWrapper}
          RANDOM_SEARCH_TERMS={RANDOM_SEARCH_TERMS}
        />

        <StreakSuccessModal
          visible={showStreakModal}
          days={currentStreak}
          onClose={() => setShowStreakModal(false)}
        />

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

        {/* 🔥 AQUÍ CONECTAMOS EL POST MODAL CON LA RACHA */}
        <PostModal onPostCreated={handlePostCreated} />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default Home;
