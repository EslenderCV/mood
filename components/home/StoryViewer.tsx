import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Easing,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  PanGestureHandler,
  State,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useVideoPlayer, VideoView } from "expo-video";
import * as Haptics from "expo-haptics";

import { useAudioContext } from "@/context/AudioContext";
import { BrainEmitter } from "@/src/brain/signals/emitters";
import { InteractionType } from "@/src/brain/signals/InteractionSignals";

import { tStatic, useLanguage } from "@/context/LanguageContext";
import { getDeezerTrackUrl, viewStory, deleteStory } from "@/lib/appwrite";
import ViewersModal from "./ViewersModal";

const { width } = Dimensions.get("window");

const parseSongDataSafe = (songDataString: string) => {
  try {
    if (!songDataString) return null;
    const song = JSON.parse(songDataString);
    if (song?.cover?.includes("100x100bb")) {
      song.cover = song.cover.replace("100x100bb", "600x600bb");
    }
    return song;
  } catch {
    return null;
  }
};

const formatTimeAgo = (dateString: string) => {
  if (!dateString) return "";
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  return `${Math.floor(diffInMinutes / 60)}h`;
};

interface StoryViewerProps {
  visible: boolean;
  onClose: () => void;
  group: any;
  currentUserId: any;
  onAddMore: () => void;
  onRefreshFeed: () => void;
  moodOfficialId: string;
}

const StoryViewer = ({
  visible,
  onClose,
  group,
  currentUserId,
  onAddMore,
  onRefreshFeed,
  moodOfficialId,
}: StoryViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const {
    playTrack,
    pauseTrack,
    resumeTrack,
    stopTrack,
    isLoading: isContextLoading,
  } = useAudioContext();

  const [isPaused, setIsPaused] = useState(false);
  const [viewersModalVisible, setViewersModalVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [replyText, setReplyText] = useState("");

  const progressAnim = useRef(new Animated.Value(0)).current;
  const lastProgressValue = useRef(0);
  const uiOpacity = useRef(new Animated.Value(1)).current;
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const groupId = group?.$id;
  const storyCount = group?.stories?.length ?? 0;

  // Reset de estado/animaciones al abrir o cambiar de grupo
  useEffect(() => {
    if (!visible) return;
    setCurrentIndex(0);
    setImageLoaded(false);
    setReplyText("");
    setIsPaused(false);
    lastProgressValue.current = 0;
    progressAnim.setValue(0);
  }, [visible, groupId, progressAnim]);

  const currentStory = group?.stories ? group.stories[currentIndex] : null;
  const storyId: string | undefined = currentStory?.$id;
  // Use a stable scalar input for memoization to avoid deps warnings.
  const songDataRaw = currentStory?.songData;
  const songData = useMemo(
    () => (songDataRaw ? parseSongDataSafe(songDataRaw) : null),
    [songDataRaw],
  );
  const ownerId =
    typeof group?.user === "string" ? group.user : group?.user?.$id;
  const isOwner = currentUserId && ownerId === currentUserId;
  const isOfficialMood = ownerId === moodOfficialId;
  const isVerified = group?.user?.isVerified || isOfficialMood;

  const isMediaStory =
    songData?.isMediaStory === true ||
    ["image", "video"].includes(songData?.mediaType);
  const isVideo = isMediaStory && songData?.mediaType === "video";
  const mediaSource = songData?.mediaUrl || songData?.cover;
  const userPfp = group?.user?.avatar || group?.user?.pfp;
  const viewersCount = currentStory?.viewers?.length || 0;

  const player = useVideoPlayer(isVideo ? mediaSource : null, (player) => {
    player.loop = true;
    player.muted = false;
    if (visible && !isPaused) {
      void stopTrack().then(() => player.play());
    }
  });

  useEffect(() => {
    if (isVideo && player) {
      if (visible && !isPaused && !viewersModalVisible) {
        void stopTrack();
        player.play();
      } else {
        player.pause();
      }
    }
  }, [visible, isPaused, viewersModalVisible, isVideo, player, stopTrack]);

  const handleDelete = () => {
    setIsPaused(true);
    Alert.alert(tStatic("ui.s_f5c87d64"), tStatic("ui.s_9202d8b5"),
      [
        {
          text: "Cancelar",
          style: "cancel",
          onPress: () => setIsPaused(false),
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              if (currentStory?.$id) {
                await deleteStory(currentStory.$id);
                onClose();
                setTimeout(() => onRefreshFeed(), 500);
              }
            } catch {
              Alert.alert(tStatic("ui.s_902b0d55"), tStatic("ui.s_25380339"));
              setIsPaused(false);
            }
          },
        },
      ],
    );
  };

  const handleNext = useCallback(async () => {
    if (isPaused) return;

    lastProgressValue.current = 0;
    progressAnim.setValue(0);

    if (player) player.pause();

    if (currentIndex < storyCount - 1) {
      setImageLoaded(false);
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    void stopTrack();
    onClose();
  }, [currentIndex, isPaused, onClose, player, progressAnim, stopTrack, storyCount]);

  // Animación fluida y duración correcta
  const startAnimation = useCallback(
    (fromValue = 0) => {
      progressAnim.setValue(fromValue);

      // Calcular duración basada en tipo de contenido
      let duration = 5000;
      if (isVideo) {
        duration = 15000;
      } else if (songData && !isMediaStory) {
        // Usar duración real si existe, sino 30s estándar
        duration = songData.duration ? songData.duration * 1000 : 30000;
      }

      const remainingDuration = duration * (1 - fromValue);

      Animated.timing(progressAnim, {
        toValue: 1,
        duration: remainingDuration,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) void handleNext();
      });
    },
    [handleNext, isMediaStory, isVideo, progressAnim, songData],
  );

  const loadStoryAudio = useCallback(async () => {
    if (!visible || isMediaStory || !songData) return;

    try {
      let url =
        songData.id || songData.spotifyId
          ? await getDeezerTrackUrl(songData.id || songData.spotifyId)
          : null;
      if (!url && songData.preview?.startsWith("http")) url = songData.preview;

      if (url && visible) {
        const trackId = songData.id || `story_${storyId ?? ""}`;
        await playTrack(trackId, url, {
          title: songData.title,
          artist: songData.artist,
          cover: songData.cover,
        });
      }
    } catch (e) {
      console.log("Audio Error", e);
    }
  }, [isMediaStory, playTrack, songData, storyId, visible]);

  const handlePrev = useCallback(async () => {
    if (isPaused) return;

    lastProgressValue.current = 0;
    progressAnim.setValue(0);

    if (currentIndex === 0) {
      if (player) player.replay();
      if (!isMediaStory) {
        await stopTrack();
        await loadStoryAudio();
      }
      startAnimation(0);
      return;
    }

    if (player) player.pause();
    setImageLoaded(false);
    setCurrentIndex((prev) => prev - 1);
  }, [currentIndex, isMediaStory, isPaused, loadStoryAudio, player, progressAnim, startAnimation, stopTrack]);

  useEffect(() => {
    const audioLoading = !isMediaStory && isContextLoading;

    if (
      !visible ||
      isPaused ||
      audioLoading ||
      viewersModalVisible ||
      (isMediaStory && !isVideo && !imageLoaded)
    ) {
      progressAnim.stopAnimation((value) => {
        lastProgressValue.current = value;
      });
      return;
    }

    startAnimation(lastProgressValue.current);

    return () => progressAnim.stopAnimation();
  }, [
    currentIndex,
    imageLoaded,
    isContextLoading,
    isMediaStory,
    isPaused,
    isVideo,
    progressAnim,
    startAnimation,
    viewersModalVisible,
    visible,
  ]);

  const togglePause = (pause: boolean) => {
    if (pause) {
      pauseTimeoutRef.current = setTimeout(() => {
        setIsPaused(true);
        if (!isMediaStory) void pauseTrack();

        Animated.timing(uiOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 200);
    } else {
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
      setIsPaused(false);
      if (!isMediaStory) void resumeTrack();

      Animated.timing(uiOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) void loadStoryAudio();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [currentIndex, groupId, loadStoryAudio, visible]);

  useEffect(() => {
    if (visible && storyId && currentUserId && !isOwner) {
      viewStory(storyId, currentUserId);
    }
  }, [currentUserId, isOwner, storyId, visible]);

  useEffect(() => {
    if (!visible) {
      void stopTrack();
      setReplyText("");
    }
  }, [stopTrack, visible]);

  if (!visible || !currentStory || !songData) return null;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, backgroundColor: "black" }}
        >
          <PanGestureHandler
            onGestureEvent={Animated.event(
              [{ nativeEvent: { translationY: translateY } }],
              { useNativeDriver: true },
            )}
            onHandlerStateChange={({ nativeEvent }: any) => {
              if (
                nativeEvent.oldState === State.ACTIVE &&
                nativeEvent.translationY > 100
              ) {
                void stopTrack();
                onClose();
              } else {
                Animated.spring(translateY, {
                  toValue: 0,
                  useNativeDriver: true,
                }).start();
              }
            }}
          >
            <Animated.View
              style={{
                flex: 1,
                transform: [
                  {
                    translateY: translateY.interpolate({
                      inputRange: [0, 500],
                      outputRange: [0, 500],
                      extrapolateLeft: "clamp",
                    }),
                  },
                ],
              }}
            >
              <View
                key={currentStory.$id}
                className="absolute w-full h-full bg-black justify-center items-center"
              >
                {isMediaStory ? (
                  isVideo ? (
                    <VideoView
                      player={player}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      nativeControls={false}
                    />
                  ) : (
                    <>
                      <Image
                        source={{ uri: mediaSource }}
                        className="w-full h-full"
                        resizeMode="cover"
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageLoaded(true)}
                      />
                      {!imageLoaded && (
                        <View className="absolute inset-0 bg-black justify-center items-center">
                          <ActivityIndicator color="#5E17EB" />
                        </View>
                      )}
                    </>
                  )
                ) : (
                  <View className="absolute w-full h-full bg-black">
                    <Image
                      source={{ uri: songData.cover }}
                      className="absolute w-full h-full opacity-60"
                      blurRadius={40}
                    />
                    <LinearGradient
                      colors={[
                        "rgba(0,0,0,0.6)",
                        "transparent",
                        "rgba(0,0,0,0.9)",
                      ]}
                      className="absolute w-full h-full"
                    />
                    <View className="flex-1 justify-center items-center px-8">
                      <Image
                        source={{ uri: songData.cover }}
                        style={{ width: width - 80, height: width - 80 }}
                        className="rounded-2xl shadow-2xl"
                      />
                      <Text className="text-white font-bold text-3xl mt-8 text-center">
                        {songData.title}
                      </Text>
                      <Text className="text-white/80 text-lg mt-2 text-center">
                        {songData.artist}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <View className="absolute w-full h-full flex-row z-10">
                <Pressable
                  className="h-full w-[30%]"
                  onPress={handlePrev}
                  onPressIn={() => togglePause(true)}
                  onPressOut={() => togglePause(false)}
                />
                <Pressable
                  className="h-full w-[70%]"
                  onPress={handleNext}
                  onPressIn={() => togglePause(true)}
                  onPressOut={() => togglePause(false)}
                />
              </View>

              <Animated.View
                className="absolute top-0 w-full z-20"
                style={{ paddingTop: insets.top + 10, opacity: uiOpacity }}
              >
                <View className="flex-row gap-1 px-4 mb-4">
                  {group.stories.map((_: any, i: number) => {
                    const isCurrent = i === currentIndex;
                    const isFinished = i < currentIndex;
                    return (
                      <View
                        key={i}
                        className="flex-1 h-[2.5px] bg-white/30 rounded-full overflow-hidden"
                      >
                        <Animated.View
                          style={{
                            width: isFinished
                              ? "100%"
                              : isCurrent
                                ? progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ["0%", "100%"],
                                  })
                                : "0%",
                          }}
                          className="h-full bg-white"
                        />
                      </View>
                    );
                  })}
                </View>
                <View className="flex-row items-center justify-between px-4">
                  <View className="flex-row items-center gap-3">
                    <Image
                      source={
                        userPfp
                          ? { uri: userPfp }
                          : require("@/assets/noPfp.jpg")
                      }
                      className="w-10 h-10 rounded-full border border-white/20"
                    />
                    <View>
                      <View className="flex-row items-center">
                        {/* 🔥 CORRECCIÓN: Mostrar NAME en lugar de USERNAME */}
                        <Text className="text-white font-bold text-[15px] mr-1">
                          {group.user?.name ||
                            group.user?.username ||
                            "Usuario"}
                        </Text>
                        {isVerified && (
                          <MaterialIcons
                            name="verified"
                            size={16}
                            color="#5E17EB"
                          />
                        )}
                      </View>
                      <Text className="text-zinc-400 text-xs">
                        {formatTimeAgo(currentStory.$createdAt)}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    {isOwner && (
                      <TouchableOpacity className="p-2" onPress={handleDelete}>
                        <Ionicons
                          name="trash-outline"
                          size={24}
                          color="white"
                        />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => {
                        void stopTrack();
                        onClose();
                      }}
                      className="p-2"
                    >
                      <Ionicons name="close" size={32} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>

              <Animated.View
                className="absolute bottom-0 w-full z-30 px-4"
                style={{
                  paddingBottom: insets.bottom + 20,
                  opacity: uiOpacity,
                }}
              >
                {isOwner ? (
                  <TouchableOpacity
                    onPress={() => {
                      setIsPaused(true);
                      setViewersModalVisible(true);
                    }}
                    className="flex-row items-center bg-black/40 px-5 py-3 rounded-full border border-white/20 self-start backdrop-blur-md"
                  >
                    <Ionicons name="eye-outline" size={18} color="white" />
                    <Text className="text-white font-bold text-sm ml-2">
                      {viewersCount} {t("story.views")}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View className="flex-row items-center gap-4">
                    <View className="flex-1 flex-row items-center bg-black/30 border border-white/20 rounded-full h-12 px-4 backdrop-blur-md">
                      <TextInput
                        placeholder={
                          t("story.replyPlaceholder") || "Responder..."
                        }
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        className="flex-1 text-white text-sm"
                        value={replyText}
                        onChangeText={setReplyText}
                        onFocus={() => togglePause(true)}
                        onBlur={() => togglePause(false)}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        BrainEmitter.interaction(
                          InteractionType.LIKE,
                          currentStory.$id,
                        );
                      }}
                    >
                      <Ionicons name="heart-outline" size={32} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      }
                    >
                      <Ionicons
                        name="paper-plane-outline"
                        size={28}
                        color="white"
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
            </Animated.View>
          </PanGestureHandler>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
      <ViewersModal
        visible={viewersModalVisible}
        onClose={() => {
          setViewersModalVisible(false);
          setIsPaused(false);
        }}
        viewerIds={currentStory?.viewers || []}
      />
    </Modal>
  );
};

export default StoryViewer;
