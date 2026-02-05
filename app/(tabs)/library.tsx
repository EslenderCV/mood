import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import * as Haptics from "expo-haptics";

import { useLanguage } from "@/context/LanguageContext";
import { useLibraryLogic } from "@/hooks/useLibraryLogic";
import {
  SongCard,
  PlaylistCard,
  EmptyState,
  SongSkeleton,
  PlaylistSkeleton,
} from "@/components/library/LibraryCards";
import {
  SongOptionsModal,
  CreatePlaylistModal,
  AddToPlaylistModal,
} from "@/components/library/LibraryModals";

const PADDING_HORIZONTAL = 20;

const Library = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();
  const logic = useLibraryLogic();
  const logicRef = useRef(logic);
  useEffect(() => {
    logicRef.current = logic;
  }, [logic]);
  const onPullToRefresh = useCallback(() => {
    if (logicRef.current.refreshing) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void logicRef.current.onRefresh();
  }, []);

  // Theme Constants
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const modalBgColor = isDark ? "#1C1C1E" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#8E8E93";
  const borderColor = isDark ? "#2C2C2E" : "#E5E5EA";
  const emptyIconColor = isDark ? "#2C2C2E" : "#E5E5EA";
  const accentColor = "#5E17EB";
  const dangerColor = "#FF453A";

  const skeletonData = useMemo(() => Array.from({ length: 6 }), []);

  // 🔥 CUSTOM REFRESH STATE

  // --- ANIMACIONES & SCROLL ---

  // Resetear scroll y spinner al cambiar de tab para evitar glitches visuales

  // Solo se carga al montar el componente.
  const userId = logic.user?.$id;
  useEffect(() => {
    logicRef.current.fetchData();
  }, [userId]);

  const openAddToPlaylist = () => {
    logic.setOptionsModalVisible(false);
    if (logic.playlists.length === 0) {
      Alert.alert("Sin Playlists", "Primero crea una playlist.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Crear", onPress: () => logic.setCreateModalVisible(true) },
      ]);
    } else {
      logic.setSongToAdd(logic.selectedSong);
      logic.setAddToPlaylistModalVisible(true);
    }
  };

  const renderHeader = () => (
    <View>
      <View className="px-6 pt-6 pb-2">
        <Text
          className="text-[36px] font-extrabold tracking-tight"
          style={{ color: textColor }}
        >
          {t("library.title")}
        </Text>
      </View>
      <View className="px-6 py-4 flex-row gap-3 mb-2">
        {["songs", "playlists"].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => logic.setActiveTab(tab as any)}
            className="px-7 py-3 rounded-full"
            style={{
              backgroundColor:
                logic.activeTab === tab
                  ? accentColor
                  : isDark
                    ? "#1C1C1E"
                    : "#F2F2F7",
            }}
          >
            <Text
              className={`font-bold text-[15px] ${logic.activeTab === tab ? "text-white" : isDark ? "text-zinc-400" : "text-zinc-600"}`}
            >
              {t(`library.tabs.${tab}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <SafeAreaView
        className="flex-1"
        edges={["top"]}
        style={{ backgroundColor: bgColor }}
      >
        <StatusBar style={isDark ? "light" : "dark"} />

        {renderHeader()}

        {logic.activeTab === "songs" ? (
          <FlatList
            data={logic.isLoading ? skeletonData : logic.musicCollection}
            keyExtractor={(item: any, index) => item?.id || `sk-${index}`}
            refreshControl={
              <RefreshControl
                refreshing={logic.refreshing}
                onRefresh={onPullToRefresh}
                tintColor="#5E17EB"
                colors={["#5E17EB"]}
                progressBackgroundColor={bgColor}
              />
            }
            renderItem={({ item }) => {
              if (logic.isLoading) return <SongSkeleton isDark={isDark} />;
              return (
                <SongCard
                  item={item}
                  playingId={logic.playingId}
                  loadingAudioId={logic.loadingAudioId}
                  isPlaying={logic.isPlaying}
                  textColor={textColor}
                  subTextColor={subTextColor}
                  accentColor={accentColor}
                  onPlay={logic.handlePlaySong}
                  onOpenOptions={(s: any) => {
                    logic.setSelectedSong(s);
                    logic.setOptionsModalVisible(true);
                  }}
                  onPressCard={(i: any) =>
                    i.isStory
                      ? logic.handlePlaySong(i)
                      : router.push(`/post/${i.postId}` as any)
                  }
                />
              );
            }}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: "space-between" }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: PADDING_HORIZONTAL,
              paddingBottom: 20,
            }}
            // 🔥 SPINNER EN EL HEADER
            ListEmptyComponent={
              !logic.isLoading ? (
                <EmptyState
                  t={t}
                  textColor={textColor}
                  subTextColor={subTextColor}
                  emptyIconColor={emptyIconColor}
                />
              ) : null
            }
          />
        ) : (
          <View className="flex-1 px-5">
            {/* NOTA IMPORTANTE: 
              Movimos el botón "Crear Playlist" dentro del ListHeaderComponent 
              de la FlatList para que el spinner lo empuje hacia abajo al refrescar.
            */}
            <FlatList
              data={logic.isLoading ? skeletonData : logic.playlists}
              keyExtractor={(item: any, index) => item?.$id || `pl-sk-${index}`}
              refreshControl={
                <RefreshControl
                  refreshing={logic.refreshing}
                  onRefresh={onPullToRefresh}
                  tintColor="#5E17EB"
                  colors={["#5E17EB"]}
                  progressBackgroundColor={bgColor}
                />
              }
              renderItem={({ item }) => {
                if (logic.isLoading)
                  return <PlaylistSkeleton isDark={isDark} />;
                return (
                  <PlaylistCard
                    item={item}
                    onPress={(p: any) =>
                      router.push(`/playlist/${p.$id}` as any)
                    }
                    t={t}
                    textColor={textColor}
                    subTextColor={subTextColor}
                    borderColor={borderColor}
                    isDark={isDark}
                  />
                );
              }}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: "space-between" }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 120 }}
              ListHeaderComponent={
                <View>
                  <TouchableOpacity
                    onPress={() => logic.setCreateModalVisible(true)}
                    className="flex-row items-center mb-8 p-5 rounded-[24px] border border-dashed"
                    style={{
                      borderColor: borderColor,
                      backgroundColor: "rgba(94, 23, 235, 0.03)",
                    }}
                  >
                    <View className="w-14 h-14 rounded-full bg-[#5E17EB]/10 items-center justify-center mr-4">
                      <Ionicons name="add" size={28} color={accentColor} />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="font-bold text-lg"
                        style={{ color: textColor }}
                      >
                        {t("library.createBtn")}
                      </Text>
                      <Text
                        className="text-xs mt-1 leading-4"
                        style={{ color: subTextColor }}
                      >
                        {t("library.syncText")}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              }
              ListEmptyComponent={
                !logic.isLoading ? (
                  <Text
                    className="text-center mt-10"
                    style={{ color: subTextColor }}
                  >
                    {t("library.empty.title")}
                  </Text>
                ) : null
              }
            />
          </View>
        )}

        {/* --- MODALES --- */}
        <SongOptionsModal
          visible={logic.isOptionsModalVisible}
          onClose={() => logic.setOptionsModalVisible(false)}
          selectedSong={logic.selectedSong}
          t={t}
          textColor={textColor}
          subTextColor={subTextColor}
          modalBgColor={modalBgColor}
          borderColor={borderColor}
          dangerColor={dangerColor}
          onAddToPlaylist={openAddToPlaylist}
          onUnsave={logic.handleUnsave}
        />

        <CreatePlaylistModal
          visible={logic.isCreateModalVisible}
          onClose={() => logic.setCreateModalVisible(false)}
          onCreate={logic.handleCreatePlaylist}
          t={t}
          textColor={textColor}
          subTextColor={subTextColor}
          modalBgColor={modalBgColor}
          borderColor={borderColor}
          bgColor={bgColor}
          newPlaylistName={logic.newPlaylistName}
          setNewPlaylistName={logic.setNewPlaylistName}
          importPlatform={logic.importPlatform}
          setImportPlatform={logic.setImportPlatform}
          user={logic.user}
        />

        <AddToPlaylistModal
          visible={logic.isAddToPlaylistModalVisible}
          onClose={() => logic.setAddToPlaylistModalVisible(false)}
          onSelectPlaylist={logic.confirmAddToPlaylist}
          playlists={logic.playlists}
          t={t}
          textColor={textColor}
          subTextColor={subTextColor}
          modalBgColor={modalBgColor}
          accentColor={accentColor}
        />
      </SafeAreaView>
    </View>
  );
};

export default Library;
