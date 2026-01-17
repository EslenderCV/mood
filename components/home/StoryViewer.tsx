import React, { useState, useEffect, useRef } from "react";
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
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  PanGestureHandler,
  State,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { Audio, Video, ResizeMode } from "expo-av";
import { Databases } from "react-native-appwrite";

import { useLanguage } from "@/context/LanguageContext";
import {
  getUser,
  getDeezerTrackUrl,
  viewStory,
  client,
  appwriteConfig,
} from "@/lib/appwrite";
import ViewersModal from "./ViewersModal";

const { width } = Dimensions.get("window");
const databases = new Databases(client);

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
  const [progress, setProgress] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [viewersModalVisible, setViewersModalVisible] = useState(false);
  const [realViewersList, setRealViewersList] = useState<string[]>([]);

  // 🔥 Nuevo estado para controlar cuándo la imagen está lista
  const [imageLoaded, setImageLoaded] = useState(false);

  const translateY = useRef(new Animated.Value(0)).current;
  const { t } = useLanguage();

  const currentStory = group?.stories ? group.stories[currentIndex] : null;

  const parseSongData = (songDataString: string) => {
    try {
      if (!songDataString) return null;
      const song = JSON.parse(songDataString);
      if (song.cover?.includes("100x100bb"))
        song.cover = song.cover.replace("100x100bb", "600x600bb");
      return song;
    } catch {
      return null;
    }
  };

  const songData = currentStory ? parseSongData(currentStory.songData) : null;

  const ownerId =
    typeof group?.user === "string" ? group.user : group?.user?.$id;
  const isOwner = currentUserId && ownerId === currentUserId;
  const isOfficialMood = ownerId === moodOfficialId;
  const isVerified = group?.user?.isVerified || isOfficialMood;
  const isMediaStory =
    songData?.isMediaStory === true ||
    ["image", "video"].includes(songData?.mediaType);
  const isVideo = isMediaStory && songData?.mediaType === "video";

  const handleNext = () => {
    if (currentIndex < (group?.stories.length || 0) - 1) {
      setImageLoaded(false); // Reset para la siguiente
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      requestAnimationFrame(() => {
        onClose();
      });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setImageLoaded(false); // Reset para la anterior
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  // --- AUDIO LOGIC ---
  useEffect(() => {
    let isMounted = true;
    const loadAudio = async () => {
      if (sound) {
        await sound.unloadAsync();
        if (isMounted) setSound(null);
      }
      if (isMounted) setProgress(0);

      if (!songData || isMediaStory || !visible) {
        if (isMounted) setIsAudioLoading(false);
        return;
      }

      if (isMounted) setIsAudioLoading(true);
      try {
        let url =
          songData.id || songData.spotifyId
            ? await getDeezerTrackUrl(songData.id || songData.spotifyId)
            : null;
        if (!url && songData.preview?.startsWith("http"))
          url = songData.preview;

        if (url && visible && isMounted) {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            allowsRecordingIOS: false,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: url },
            { shouldPlay: !isPaused },
          );

          newSound.setOnPlaybackStatusUpdate((s) => {
            if (s.isLoaded && isMounted) {
              if (s.didJustFinish) handleNext();
              else if (s.isPlaying && s.durationMillis)
                setProgress((s.positionMillis / s.durationMillis) * 100);
            }
          });
          if (isMounted) setSound(newSound);
        }
      } catch (e) {
        console.log("Audio Error", e);
      } finally {
        if (isMounted) setIsAudioLoading(false);
      }
    };

    loadAudio();
    return () => {
      isMounted = false;
    };
  }, [currentIndex, visible, group?.$id]);

  // --- TIMER ---
  useEffect(() => {
    // 🔥 Pausamos el timer hasta que la imagen esté lista (si es media)
    if (
      isAudioLoading ||
      sound ||
      isVideo ||
      !visible ||
      isPaused ||
      viewersModalVisible ||
      (isMediaStory && !isVideo && !imageLoaded)
    )
      return;

    const duration = isMediaStory ? 5000 : 10000;
    const intervalTime = 50;
    const increment = (100 * intervalTime) / duration;

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          handleNext();
          return 100;
        }
        return p + increment;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [
    currentIndex,
    visible,
    isPaused,
    viewersModalVisible,
    isAudioLoading,
    sound,
    isVideo,
    isMediaStory,
    imageLoaded,
  ]);

  const handleDeleteStory = async () => {
    setIsPaused(true);
    Alert.alert(t("story.deleteTitle"), t("story.deleteConfirm"), [
      {
        text: t("common.cancel"),
        style: "cancel",
        onPress: () => setIsPaused(false),
      },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await databases.deleteDocument(
              appwriteConfig.databaseId,
              appwriteConfig.storiesCollectionId,
              currentStory.$id,
            );
            requestAnimationFrame(() => {
              onClose();
              onRefreshFeed();
            });
          } catch {
            setIsPaused(false);
          }
        },
      },
    ]);
  };

  if (!visible || !currentStory || !songData) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: "black" }}>
          <PanGestureHandler
            onGestureEvent={Animated.event(
              [{ nativeEvent: { translationY: translateY } }],
              { useNativeDriver: true },
            )}
            onHandlerStateChange={({ nativeEvent }: any) => {
              if (
                nativeEvent.oldState === State.ACTIVE &&
                nativeEvent.translationY > 100
              )
                onClose();
              else
                Animated.spring(translateY, {
                  toValue: 0,
                  useNativeDriver: true,
                }).start();
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
              {/* CAPA DE CONTENIDO */}
              <View className="absolute w-full h-full bg-black justify-center items-center">
                {isMediaStory ? (
                  isVideo ? (
                    <Video
                      source={{ uri: songData.mediaUrl }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode={ResizeMode.COVER}
                      shouldPlay={!isPaused && visible}
                      isLooping={false}
                      onPlaybackStatusUpdate={(s) => {
                        if (s.isLoaded && s.didJustFinish) handleNext();
                      }}
                    />
                  ) : (
                    <>
                      <Image
                        source={{ uri: songData.mediaUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                        // 🔥 Forzamos la detección de carga para eliminar el negro
                        onLoadStart={() => setImageLoaded(false)}
                        onLoad={() => setImageLoaded(true)}
                      />
                      {!imageLoaded && (
                        <View className="absolute inset-0 bg-black justify-center items-center">
                          <ActivityIndicator size="large" color="#5E17EB" />
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
                        style={{ width: width - 60, height: width - 60 }}
                        className="rounded-2xl shadow-xl"
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
                {songData.caption && (
                  <View className="absolute bottom-40 w-full px-8">
                    <Text
                      className="text-white text-2xl font-bold text-center"
                      style={{
                        textShadowColor: "rgba(0,0,0,0.9)",
                        textShadowRadius: 10,
                        textShadowOffset: { width: 0, height: 2 },
                      }}
                    >
                      {songData.caption}
                    </Text>
                  </View>
                )}
              </View>

              {/* TAP ZONES */}
              <View className="absolute w-full h-full flex-row z-10">
                <Pressable
                  className="h-full w-[30%]"
                  onPress={handlePrev}
                  onPressIn={() => setIsPaused(true)}
                  onPressOut={() => setIsPaused(false)}
                />
                <Pressable
                  className="h-full w-[70%]"
                  onPress={handleNext}
                  onPressIn={() => setIsPaused(true)}
                  onPressOut={() => setIsPaused(false)}
                />
              </View>

              {/* HEADER */}
              <View className="absolute top-0 w-full pt-12 z-20 px-2">
                <View className="flex-row gap-1 px-1 mb-4">
                  {group.stories.map((_: any, i: number) => (
                    <View
                      key={i}
                      className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden"
                    >
                      <View
                        style={{
                          width:
                            i < currentIndex
                              ? "100%"
                              : i === currentIndex
                                ? `${progress}%`
                                : "0%",
                        }}
                        className="h-full bg-white"
                      />
                    </View>
                  ))}
                </View>
                <View className="flex-row items-center justify-between px-2">
                  <View className="flex-row items-center gap-3">
                    <Image
                      source={
                        group.user?.pfp
                          ? { uri: group.user.pfp }
                          : isOfficialMood
                            ? require("@/assets/images/icon.png")
                            : require("@/assets/noPfp.jpg")
                      }
                      className="w-10 h-10 rounded-full border border-white/20"
                    />
                    <View>
                      <View className="flex-row items-center">
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

                  <View className="flex-row items-center gap-4">
                    {isOwner && (
                      <TouchableOpacity
                        onPress={handleDeleteStory}
                        className="p-1"
                      >
                        <Ionicons
                          name="trash-outline"
                          size={24}
                          color="white"
                        />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => onClose()} className="p-1">
                      <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* VISTAS */}
              {isOwner && (
                <View className="absolute bottom-0 w-full pb-8 px-4 z-20">
                  <TouchableOpacity
                    onPress={() => {
                      setIsPaused(true);
                      setViewersModalVisible(true);
                    }}
                    className="flex-row items-center bg-black/60 px-5 py-3 rounded-full border border-white/20 self-start backdrop-blur-lg"
                  >
                    <Ionicons name="eye" size={16} color="white" />
                    <Text className="text-white font-bold text-sm ml-2">
                      {realViewersList.length} {t("story.views")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          </PanGestureHandler>
        </View>
        <ViewersModal
          visible={viewersModalVisible}
          onClose={() => {
            setViewersModalVisible(false);
            setIsPaused(false);
          }}
          viewerIds={realViewersList}
        />
      </GestureHandlerRootView>
    </Modal>
  );
};

export default StoryViewer;
