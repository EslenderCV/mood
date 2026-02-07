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
  FlatList,
  ActivityIndicator,
  Platform,
  RefreshControl,
  ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { router, useNavigation, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { AudioActions } from "@/context/AudioContext";

import { tStatic } from "@/context/LanguageContext";
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
import MoodGenreRecommendations from "@/components/home/MoodGenreRecommendations";

// 🔥 MODALES IMPORTS
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
import StreakSuccessModal from "@/components/StreakSuccessModal";

import { injectAdsInFeed } from "@/lib/mockAds";
import { createStory, deletePost } from "@/lib/appwrite";


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
  } catch {
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
  const logicRef = useRef(logic);
  const params = useLocalSearchParams();
  const wantsWeeklyVibeOpen = params?.weeklyVibe === "1";
  const [weeklyVibeAutoOpen, setWeeklyVibeAutoOpen] = useState<boolean>(!!wantsWeeklyVibeOpen);

  useEffect(() => {
    if (wantsWeeklyVibeOpen) {
      setWeeklyVibeAutoOpen(true);
      const t = setTimeout(() => setWeeklyVibeAutoOpen(false), 1500);
      return () => clearTimeout(t);
    }
  }, [wantsWeeklyVibeOpen]);

  useEffect(() => { logicRef.current = logic; }, [logic]);
  const navigation = useNavigation<any>();

  // 🔥 ESTADOS PARA RACHAS
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);

  const feedWithAds = useMemo(() => {
    return injectAdsInFeed(logic.sortedFeed);
  }, [logic.sortedFeed]);

  // ✅ Para callbacks (viewability) sin capturar closures pesadas:
  const feedWithAdsRef = useRef<any[]>([]);
  useEffect(() => {
    feedWithAdsRef.current = feedWithAds;
  }, [feedWithAds]);



  const onPullToRefresh = useCallback(() => {
    if (logicRef.current.isRefreshing) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logicRef.current.onRefresh();
  }, []);


  const keyExtractor = useCallback((item: any) => item.id, []);

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
                  <Text className="ml-2 text-xs text-zinc-400">{tStatic("ui.s_db931740")}</Text>
                </View>
              )}
              <PostItem
                post={item.data}
                currentUserId={logicRef.current.user?.$id || ""}
                onProfilePress={(userId) => {
                  logicRef.current.trackOpenProfile(item.data.$id, item.id, userId);
                  router.push(`/user/${userId}` as any);
                }}
                onCommentPress={(postId) => {
                  logicRef.current.trackOpenComments(postId, item.id);
                  router.push(`/post/${postId}` as any);
                }}
                onOptionsPress={() => {
                  logicRef.current.setSelectedPost(item.data);
                  logicRef.current.toggleModal("isOptions", true);
                }}
                onSharePress={() => {
                  logicRef.current.openShareSelector(item.data);
                  logicRef.current.setSharePostId(item.data.$id);
                }}
                onLike={() => logicRef.current.trackLike(item.data.$id, item.id)}
                onSave={() => logicRef.current.trackSave(item.data.$id, item.id)}
              />
            </View>
          );
        case "ad":
          return <AdItem ad={item} />;
        case "suggested_users":
          return (
            <SuggestedUsersCarousel
              users={item.data}
              currentUserId={logicRef.current.user?.$id || ""}
            />
          );
        case "trending_song":
          return <TrendingSongCard song={item.data} />;
        default:
          return null;
      }
    },
    [isDark],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 250,
  }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const validItems = viewableItems
        .filter((v) => v.isViewable && v.index !== null)
        .sort((a, b) => (a.index as number) - (b.index as number));

      // When viewability briefly drops to 0 (fast fling, transition), force-close
      // the open anchor so we don't lose durationMs and so we can classify skip_fast.
      if (validItems.length === 0) {
        try {
          (logicRef.current as any).closeTelemetryAnchor?.("no_viewables");
        } catch {}
        return;
      }

      const firstPostToken = validItems.find((v) => {
        const it: any = v.item as any;
        return it && it.type === "post" && typeof it.id === "string";
      });

      const anchorIndex = ((firstPostToken?.index ?? validItems[0].index) as number);

      // ✅ Anchor by FEED ITEM ID (stable even with injected ads/modules)
      if (firstPostToken?.item && typeof (firstPostToken.item as any).id === "string" && (logicRef.current as any).updateViewableItem) {
        (logicRef.current as any).updateViewableItem((firstPostToken.item as any).id);
      } else {
        logicRef.current.updateViewableIndex(anchorIndex);
      }

// 🎧 Prefetch del próximo preview (UX: play instantáneo)
      try {
        const items = feedWithAdsRef.current || [];
        const uris: string[] = [];
        for (let i = anchorIndex; i < items.length && uris.length < 2; i++) {
          const it = items[i];
          if (!it || it.type !== "post") continue;
          const raw = it.data?.songData;
          let sd: any = raw;
          if (typeof raw === "string") {
            try { sd = JSON.parse(raw); } catch {}
          }
          const preview = sd?.preview;
          if (typeof preview === "string" && preview.startsWith("http")) {
            uris.push(preview);
          }
        }
        uris.forEach((u) => AudioActions.prefetchTrack(u));
      } catch {}

    },
  ).current;

  useEffect(() => {
    // @ts-ignore
    const unsubscribe = navigation.addListener("tabPress", (e: any) => {
      const l = logicRef.current;
      if (l.isFeedLoading || l.isRefreshing) {
        e.preventDefault();
        return;
      }
      if (navigation.isFocused()) {
        e.preventDefault();
        if (l.flatListRef.current) {
          l.flatListRef.current.scrollToOffset({
            offset: 0,
            animated: true,
          });
        }
        setTimeout(() => {
          l.onRefresh();
        }, 250);
      }
    });
    return unsubscribe;
  }, [navigation]);

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

  // 🔥 NUEVA FUNCIÓN: Solo se dispara si hay un nuevo streak válido
  const handlePostCreated = (newStreakVal?: number | null) => {
    logic.fetchAuxiliaryData(); // Refrescar feed

    // Si newStreakVal es null o undefined, significa que posteó el mismo día
    // y la racha no cambió -> NO mostramos animación.
    if (!newStreakVal) return;

    // Si hay nueva racha, actualizamos estado y mostramos fuego
    setCurrentStreak(newStreakVal);

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
          <FlatList
            ref={logic.flatListRef}
            data={feedWithAds}
            keyExtractor={keyExtractor}
            renderItem={renderFeedItem}
            refreshControl={
              <RefreshControl
                refreshing={logic.isRefreshing}
                onRefresh={onPullToRefresh}
                tintColor="#5E17EB"
                colors={["#5E17EB"]}
                progressBackgroundColor={isDark ? "#0B0B0F" : "#FFFFFF"}
              />
            }
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
                  autoOpen={weeklyVibeAutoOpen}
                />

                {/* 🎶 Recomendaciones rápidas por ánimo / género (MVP) */}
                <MoodGenreRecommendations />
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