import React, { useRef, useState } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  Animated,
  useWindowDimensions,
  Image,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { router } from "expo-router";

// --- HOOK ---
import { useHomeLogic } from "@/hooks/useHomeLogic";
import { FeedProvider, FeedItem } from "@/context/FeedProvider";

// --- IMPORTS DE COMPONENTES ---
import StoriesRail from "@/components/home/StoriesRail";
import StoryViewer from "@/components/home/StoryViewer";
import CreatorModal from "@/components/home/CreatorModal";
import StoryCreationModal from "@/components/home/StoryCreationModal";
import DirectShareSheet from "@/components/home/DirectShareSheet";
import FeedSkeleton from "@/components/home/FeedSkeleton";
import EmptyStateWithSuggestions from "@/components/home/EmptyStateWithSuggestions";
import PostItem from "@/components/PostItem";
import PostModal from "@/components/PostModal";
import OptionsModal from "@/components/OptionsModal";
import MoodShareCard from "@/components/MoodShareCard";
import ShareModal from "@/components/ShareModal";
import ChatsList from "../chats";
import SuggestedUsersCarousel from "@/components/SuggestedUsersCarousel";
import TrendingSongCard from "@/components/TrendingSongCard";

import { createStory, deletePost, client } from "@/lib/appwrite";

// Wrapper local para búsqueda
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

// --- CONTENIDO PRINCIPAL ---
const HomeContent = () => {
  const { width, height } = useWindowDimensions();
  const chatTranslateX = useRef(new Animated.Value(width)).current;
  const [isChatOpen, setIsChatOpen] = useState(false);
  const isDark = true;

  const logic = useHomeLogic();

  const openChat = () => {
    setIsChatOpen(true);
    Animated.spring(chatTranslateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 14,
    }).start();
  };
  const closeChat = () => {
    setIsChatOpen(false);
    Animated.timing(chatTranslateX, {
      toValue: width,
      duration: 300,
      easing: require("react-native").Easing.out(
        require("react-native").Easing.cubic,
      ),
      useNativeDriver: true,
    }).start();
  };

  const handleAddStoryPress = () => {
    if (logic.user?.$id === logic.MOOD_OFFICIAL_ID) {
      logic.toggleModal("isCreator", true);
    } else {
      logic.setStoryInitialSongData(null);
      logic.toggleModal("isCreation", true);
    }
  };

  const renderFeedItem = ({ item }: { item: FeedItem }) => {
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
              onProfilePress={(userId) => router.push(`/user/${userId}` as any)}
              onCommentPress={(postId) => router.push(`/post/${postId}` as any)}
              onOptionsPress={() => {
                logic.setSelectedPost(item.data);
                logic.toggleModal("isOptions", true);
              }}
              onSharePress={() => {
                logic.setPostToShareData(item.data);
                logic.setSharePostId(item.data.$id);
                logic.toggleModal("isShareSelector", true);
              }}
            />
          </View>
        );
      case "suggested_users":
        return <SuggestedUsersCarousel users={item.data} />;
      case "trending_song":
        return <TrendingSongCard song={item.data} />;
      default:
        return null;
    }
  };

  const handleDeleteAction = () => {
    if (logic.selectedPost) {
      deletePost(logic.selectedPost.$id).then(() => logic.onRefresh());
      logic.toggleModal("isOptions", false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#000" : "#fff" }}>
      <SafeAreaView
        edges={["top"]}
        style={{ flex: 1, backgroundColor: isDark ? "#000000" : "#FFFFFF" }}
      >
        {/* HEADER */}
        <View className="flex-row justify-between items-center px-5 py-3 border-b border-transparent">
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
            <TouchableOpacity onPress={openChat} className="relative">
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
          <FlatList
            ref={logic.flatListRef}
            data={logic.sortedFeed}
            keyExtractor={(item) => item._id}
            renderItem={renderFeedItem}
            // --- SCROLL INFINITO Y OPTIMIZACIÓN ---
            onEndReached={() => logic.handleLoadMore()}
            onEndReachedThreshold={0.5}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews={true}
            // --------------------------------------

            ListHeaderComponent={
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
            }
            refreshControl={
              <RefreshControl
                refreshing={logic.isRefreshing}
                onRefresh={logic.onRefresh}
                tintColor="#5E17EB"
              />
            }
            ListEmptyComponent={
              <EmptyStateWithSuggestions
                suggestions={[]}
                onGoToExplore={() => router.push("/explore" as any)}
              />
            }
          />
        )}

        {/* --- MODALES --- */}
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
            if (logic.handleMoodMediaPick) {
              logic.handleMoodMediaPick();
            }
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
          onSearch={(q) => {
            /* lógica búsqueda contactos */
          }}
          onSend={(ids, msg) => {
            /* lógica enviar */ logic.toggleModal("isShareSelector", false);
          }}
          onAddToStory={() => {
            /* lógica... */
          }}
          onViralCard={() => {
            logic.toggleModal("isShareSelector", false);
            setTimeout(() => logic.toggleModal("isViral", true), 300);
          }}
          onSystemShare={() => {
            /* lógica... */
          }}
          onCopyLink={() => {
            /* lógica... */
          }}
        />

        <MoodShareCard
          isVisible={logic.modals.isViral}
          onClose={() => logic.toggleModal("isViral", false)}
          post={logic.postToShareData}
        />

        <OptionsModal
          isVisible={logic.modals.isOptions}
          onClose={() => logic.toggleModal("isOptions", false)}
          onDelete={handleDeleteAction}
          onReport={() => {
            logic.toggleModal("isOptions", false);
          }}
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

      {/* CHATS OVERLAY */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width,
          height,
          zIndex: 100,
          backgroundColor: isDark ? "#000" : "#fff",
          transform: [{ translateX: chatTranslateX }],
        }}
      >
        <ChatsList onBackPress={closeChat} />
      </Animated.View>
    </View>
  );
};

// --- WRAPPER FINAL ---
const HomeWithProvider = () => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <FeedProvider>
      <HomeContent />
    </FeedProvider>
  </GestureHandlerRootView>
);

export default HomeWithProvider;
