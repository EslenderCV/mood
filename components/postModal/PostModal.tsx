import React from "react";
import {
  View,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  KeyboardAvoidingView,
  StyleSheet,
  Animated,
} from "react-native";
import { useColorScheme } from "nativewind";
import { usePostModalController } from "@/hooks/usePostModalController";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import PostModalHeader from "./PostModalHeader";
import PostComposer from "./PostComposer";
import MoodStyleSelector from "./MoodStyleSelector";
import MusicSection from "./MusicSection";
import PostToast from "./PostToast";
import MoodSelectorPopup from "./MoodSelectorPopup";

interface PostModalProps {
  isVisible?: boolean;
  onClose?: () => void;
  prefillData?: { song?: any };
  visible?: boolean;
}

export default function PostModal(props: PostModalProps) {
  const controller = usePostModalController(props);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const canPublish = Boolean(
    (controller.text.trim() || controller.linkedSong) &&
    (controller.linkedSong ||
      controller.user?.$id === controller.MOOD_OFFICIAL_ID),
  );

  const blurTint = isDark
    ? "systemUltraThinMaterialDark"
    : "systemUltraThinMaterialLight";

  const glassBorder = isDark
    ? "rgba(255,255,255,0.15)"
    : "rgba(255,255,255,0.6)";

  const gradientColors = isDark
    ? (["rgba(30,30,35,0.7)", "rgba(10,10,12,0.8)"] as const)
    : (["rgba(255,255,255,0.85)", "rgba(240,240,255,0.9)"] as const);

  return (
    <>
      <PostToast
        visible={controller.toast.visible}
        type={controller.toast.type}
        title={controller.toast.title}
        message={controller.toast.message}
        translateY={controller.toastAnim}
      />

      <Modal
        animationType="none"
        transparent
        visible={controller.isPostModalVisible}
        onRequestClose={controller.closeModal}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={controller.closeModal}>
          <Animated.View
            style={[styles.backdrop, { opacity: controller.backgroundOpacity }]}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.keyboardView}
            >
              <TouchableWithoutFeedback>
                <Animated.View
                  style={[
                    styles.glassContainer,
                    {
                      borderColor: glassBorder,
                      shadowColor: isDark ? "#5E17EB" : "#A78BFA",
                      transform: [{ translateY: controller.contentTranslateY }],
                    },
                  ]}
                >
                  <BlurView
                    intensity={Platform.OS === "ios" ? 40 : 100}
                    tint={blurTint as any}
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    colors={["rgba(94, 23, 235, 0.15)", "transparent"] as const}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 0.4 }}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 150,
                    }}
                  />
                  <View style={styles.contentContainer}>
                    <View className="mt-[-10px] z-10">
                      <PostModalHeader
                        onClose={controller.closeModal}
                        onPublish={controller.handlePost}
                        canPublish={canPublish}
                      />
                    </View>
                    <View
                      style={{
                        minHeight: 70,
                        maxHeight: 160,
                        marginBottom: 10,
                      }}
                    >
                      <PostComposer
                        user={controller.user}
                        text={controller.text}
                        onChangeText={controller.setText}
                        showSuggestions={controller.showSuggestions}
                        suggestions={controller.suggestions}
                        onSelectUser={controller.handleSelectUser}
                      />
                    </View>

                    <View style={{ height: 10 }} />

                    {!controller.linkedSong &&
                      controller.user?.$id === controller.MOOD_OFFICIAL_ID && (
                        <View className="mb-3">
                          <MoodStyleSelector
                            moodStyle={controller.moodStyle}
                            setMoodStyle={controller.setMoodStyle}
                          />
                        </View>
                      )}

                    <MusicSection
                      isSearchingMusic={controller.isSearchingMusic}
                      setIsSearchingMusic={controller.setIsSearchingMusic}
                      linkedSong={controller.linkedSong}
                      onRemoveSong={controller.removeLinkedSong}
                      searchQuery={controller.searchQuery}
                      setSearchQuery={controller.setSearchQuery}
                      isLoadingSearch={controller.isLoadingSearch}
                      searchResults={controller.searchResults}
                      onSelectSong={controller.handleSelectSong}
                      onPlayPreview={controller.handlePlayMusic}
                      isPlaying={controller.isPlaying}
                      currentPlayingUrl={controller.currentPlayingUrl}
                      onShazam={controller.handleShazam}
                      isRecording={controller.recorder.isRecording}
                      isShazamScanning={controller.isShazamScanning}
                      openMoodPopup={controller.openMoodPopup}
                      mood={controller.mood}
                      setMood={controller.setMood}
                    />
                  </View>
                </Animated.View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </Animated.View>
        </TouchableWithoutFeedback>
        <MoodSelectorPopup
          isVisible={controller.isMoodPopupVisible}
          onClose={controller.closeMoodPopup}
          selectedMood={controller.mood}
          onSelectMood={controller.setMood}
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  keyboardView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    width: "100%",
  },
  glassContainer: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 36,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 24,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 20,
  },
});
