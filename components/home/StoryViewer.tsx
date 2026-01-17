import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Animated,
  Dimensions,
  Pressable,
  Easing,
  Alert,
  Share,
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
import { Audio } from "expo-av"; // Usamos expo-av igual que en PostItem
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
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  return "1d";
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

  // Estado de Audio (expo-av)
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  const [isPaused, setIsPaused] = useState(false);
  const [viewersModalVisible, setViewersModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [previewViewers, setPreviewViewers] = useState<any[]>([]);
  const [realViewersList, setRealViewersList] = useState<string[]>([]);

  const pressStartTime = useRef<number>(0);
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;

  const { t } = useLanguage();

  const currentStory = group?.stories ? group.stories[currentIndex] : null;

  const parseSongData = (songDataString: string) => {
    try {
      if (!songDataString) return null;
      const song = JSON.parse(songDataString);
      if (song.cover && song.cover.includes("100x100bb")) {
        song.cover = song.cover.replace("100x100bb", "600x600bb");
      }
      return song;
    } catch (e) {
      return null;
    }
  };

  const songData = currentStory ? parseSongData(currentStory.songData) : null;
  const isOwner =
    group?.userId === currentUserId ||
    group?.user?.$id === currentUserId ||
    (currentUserId === moodOfficialId && group?.userId === moodOfficialId);
  const isOfficialMood = group?.userId === moodOfficialId;
  const isVerified = group?.user?.isVerified || isOfficialMood;
  const isCustomMedia =
    songData?.mediaType === "image" || songData?.mediaType === "video";

  // --- LIMPIEZA DE AUDIO AL DESMONTAR ---
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // --- CARGAR Y REPRODUCIR AUDIO (Lógica corregida) ---
  useEffect(() => {
    const loadAndPlayAudio = async () => {
      // 1. Resetear estado
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      setProgress(0);
      setIsAudioLoading(true);

      if (!songData) {
        setIsAudioLoading(false);
        return;
      }

      try {
        // 2. Obtener URL Fresca (Igual que PostItem)
        const trackId = songData.id || songData.spotifyId;
        let url = null;

        // PRIORIDAD: Si hay ID, buscamos en Deezer (más confiable que el preview guardado)
        if (trackId) {
          const fetchedUrl = await getDeezerTrackUrl(trackId);
          if (fetchedUrl) url = fetchedUrl;
        }

        // Fallback: Si no hay ID o falló el fetch, intentamos usar el preview guardado
        // PERO solo si parece una URL válida (http) y no un archivo local viejo
        if (!url && songData.preview && songData.preview.startsWith("http")) {
          url = songData.preview;
        }

        if (url && visible) {
          console.log("🎵 Reproduciendo historia:", url);

          // 3. Configuración de Audio (CRÍTICO para modo silencio)
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            allowsRecordingIOS: false,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });

          // 4. Cargar sonido
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: url },
            { shouldPlay: !isPaused && !viewersModalVisible },
          );

          // 5. Listener de progreso
          newSound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded) {
              if (status.didJustFinish) {
                handleNext();
              } else if (status.isPlaying && status.durationMillis) {
                const percent =
                  (status.positionMillis / status.durationMillis) * 100;
                setProgress(percent);
              }
            } else if (status.error) {
              console.log(`Error de reproducción: ${status.error}`);
            }
          });

          setSound(newSound);
        } else {
          console.log(
            "⚠️ No se encontró URL de audio válida para esta historia",
          );
        }
      } catch (e) {
        console.log("❌ Error cargando audio historia:", e);
      } finally {
        setIsAudioLoading(false);
      }
    };

    if (visible && currentStory) {
      loadAndPlayAudio();
    } else {
      if (sound) sound.unloadAsync();
    }
  }, [currentIndex, visible, group]);

  // --- CONTROL PAUSA/PLAY ---
  useEffect(() => {
    const handlePauseState = async () => {
      if (!sound) return;
      try {
        const status = await sound.getStatusAsync();
        if (!status.isLoaded) return;

        if (isPaused || viewersModalVisible || detailsVisible) {
          if (status.isPlaying) await sound.pauseAsync();
        } else {
          if (!status.isPlaying) await sound.playAsync();
        }
      } catch (e) {}
    };
    handlePauseState();
  }, [isPaused, viewersModalVisible, detailsVisible, sound]);

  // --- TIMER FALLBACK (Si no hay música o es foto) ---
  useEffect(() => {
    // Si estamos cargando audio o tenemos un sonido válido, el audio controla el tiempo
    if (isAudioLoading || sound) return;

    if (visible && !isPaused && !viewersModalVisible && !detailsVisible) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            handleNext();
            return 0;
          }
          return prev + 1; // 100ms * 100 pasos = 10 segundos por defecto
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [
    visible,
    isPaused,
    viewersModalVisible,
    detailsVisible,
    sound,
    isAudioLoading,
  ]);

  // --- VIEW TRACKING ---
  useEffect(() => {
    if (
      visible &&
      currentStory &&
      currentUserId &&
      !isOwner &&
      !isOfficialMood
    ) {
      viewStory(currentStory.$id, currentUserId, currentStory.viewers || []);
    }
    if (
      visible &&
      currentStory &&
      currentUserId &&
      isOfficialMood &&
      currentUserId !== moodOfficialId
    ) {
      viewStory(currentStory.$id, currentUserId, currentStory.viewers || []);
    }
  }, [currentIndex, visible, currentStory]);

  // --- FETCH VIEWERS ---
  useEffect(() => {
    const fetchRealViewers = async () => {
      if (currentStory && visible) {
        setRealViewersList(currentStory.viewers || []);
        if (isOwner) {
          try {
            const freshStoryDoc = await databases.getDocument(
              appwriteConfig.databaseId,
              appwriteConfig.storiesCollectionId,
              currentStory.$id,
            );
            if (freshStoryDoc && freshStoryDoc.viewers) {
              setRealViewersList(freshStoryDoc.viewers);
            }
          } catch (e) {}
        }
      }
    };
    fetchRealViewers();
  }, [currentStory, visible, isOwner]);

  useEffect(() => {
    if (currentStory && currentUserId) {
      setIsSaved(currentStory.savedBy?.includes(currentUserId) || false);
    }
  }, [currentStory, currentUserId]);

  useEffect(() => {
    const fetchPreviewViewers = async () => {
      if (isOwner && realViewersList.length > 0) {
        const idsToFetch = realViewersList.slice(-3).reverse();
        try {
          const fetchedUsers = await Promise.all(
            idsToFetch.map((id: string) => getUser(id)),
          );
          setPreviewViewers(fetchedUsers.filter((u) => u !== null));
        } catch (e) {}
      } else {
        setPreviewViewers([]);
      }
    };
    if (visible && currentStory) fetchPreviewViewers();
  }, [realViewersList, visible, isOwner]);

  // Animaciones Mood
  useEffect(() => {
    if (isOfficialMood) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoScale, {
            toValue: 1.05,
            duration: 2500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ]),
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1.3,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [isOfficialMood, currentIndex]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true },
  );
  const onHandlerStateChange = ({ nativeEvent }: any) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      if (nativeEvent.translationY > 100) {
        setTimeout(() => onClose(), 0);
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < (group?.stories.length || 0) - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      setTimeout(() => onClose(), 0);
    }
  };
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

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
            const updatedStories = group.stories.filter(
              (s: any) => s.$id !== currentStory.$id,
            );
            if (updatedStories.length > 0) {
              group.stories = updatedStories;
              if (currentIndex >= updatedStories.length)
                setCurrentIndex(updatedStories.length - 1);
              setIsPaused(false);
            } else {
              setTimeout(() => onClose(), 0);
              if (onRefreshFeed) onRefreshFeed();
            }
          } catch (error) {
            Alert.alert(t("common.error"), t("story.deleteError"));
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
      onRequestClose={() => setTimeout(onClose, 0)}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: "black" }}>
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
            activeOffsetY={[-10, 10]}
            failOffsetX={[-5, 5]}
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
              {isCustomMedia ? (
                <View className="absolute w-full h-full bg-black">
                  <Image
                    source={{ uri: songData.cover }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
              ) : isOfficialMood ? (
                <View className="absolute w-full h-full bg-black overflow-hidden">
                  <Animated.Image
                    source={require("@/assets/images/icon.png")}
                    style={{
                      position: "absolute",
                      width: "150%",
                      height: "150%",
                      top: "-25%",
                      left: "-25%",
                      opacity: 0.6,
                      transform: [{ scale: glowAnim }],
                    }}
                    blurRadius={100}
                  />
                  <LinearGradient
                    colors={["#4F089A", "transparent", "#000000"] as const}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    className="absolute w-full h-full opacity-80"
                  />

                  <View
                    className="flex-1 justify-center items-center px-8 z-0"
                    pointerEvents="none"
                  >
                    <View className="items-center justify-center w-full">
                      <Animated.View
                        style={{
                          transform: [
                            {
                              translateY: logoScale.interpolate({
                                inputRange: [1, 1.05],
                                outputRange: [0, -15],
                              }),
                            },
                          ],
                          zIndex: 1,
                        }}
                      >
                        <Image
                          source={require("@/assets/images/icon.png")}
                          style={{ width: 140, height: 140, borderRadius: 35 }}
                          resizeMode="contain"
                        />
                      </Animated.View>
                      <Animated.View
                        style={{
                          opacity: fadeAnim,
                          transform: [{ translateY: slideAnim }],
                          marginTop: 50,
                          zIndex: 1,
                        }}
                      >
                        <Text
                          className="text-white font-black text-5xl text-center tracking-tighter leading-tight"
                          style={{
                            textShadowColor: "#5E17EB",
                            textShadowOffset: { width: 0, height: 0 },
                            textShadowRadius: 20,
                          }}
                        >
                          {t("story.official.title")}
                        </Text>
                      </Animated.View>
                      <Animated.View
                        style={{
                          opacity: fadeAnim,
                          transform: [{ translateY: slideAnim }],
                          marginTop: 20,
                          zIndex: 1,
                        }}
                      >
                        <Text className="text-zinc-300 text-center text-xl font-light tracking-widest uppercase">
                          {t("story.official.subtitle")}
                        </Text>
                      </Animated.View>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="absolute w-full h-full">
                  <Image
                    source={{ uri: songData.cover }}
                    className="absolute w-full h-full opacity-60"
                    blurRadius={40}
                  />
                  <LinearGradient
                    colors={
                      [
                        "rgba(0,0,0,0.6)",
                        "transparent",
                        "transparent",
                        "rgba(0,0,0,0.9)",
                      ] as const
                    }
                    locations={[0, 0.2, 0.7, 1]}
                    className="absolute w-full h-full"
                  />
                  <View
                    className="flex-1 justify-center items-center px-8 z-0"
                    pointerEvents="none"
                  >
                    <Image
                      source={{ uri: songData.cover }}
                      style={{ width: width - 60, height: width - 60 }}
                      className="rounded-2xl"
                      resizeMode="cover"
                    />
                    <View className="items-center w-full mt-8">
                      <Text className="text-white font-black text-center text-3xl mb-2 leading-8">
                        {songData.title}
                      </Text>
                      <Text className="text-white/80 font-bold text-center text-lg mb-6">
                        {songData.artist}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* LOADER */}
              {isAudioLoading && (
                <View className="absolute inset-0 justify-center items-center z-50">
                  <ActivityIndicator size="large" color="#5E17EB" />
                </View>
              )}

              {/* Controls */}
              <View
                className="absolute w-full h-full flex-row z-10"
                pointerEvents="box-none"
              >
                <Pressable
                  className="h-full w-[30%]"
                  onPress={() => {
                    if (Date.now() - pressStartTime.current < 200) handlePrev();
                  }}
                  onPressIn={() => {
                    pressStartTime.current = Date.now();
                    setIsPaused(true);
                  }}
                  onPressOut={() => setIsPaused(false)}
                />
                <Pressable
                  className="h-full w-[70%]"
                  onPress={() => {
                    if (Date.now() - pressStartTime.current < 200) handleNext();
                  }}
                  onPressIn={() => {
                    pressStartTime.current = Date.now();
                    setIsPaused(true);
                  }}
                  onPressOut={() => setIsPaused(false)}
                />
              </View>

              {/* Header */}
              <View
                pointerEvents="box-none"
                className="absolute top-0 w-full pt-12 z-20 px-2"
              >
                <View className="flex-row gap-1 px-1 mb-4">
                  {group.stories.map((_: any, index: number) => (
                    <View
                      key={index}
                      className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden"
                    >
                      <View
                        style={{
                          width:
                            index < currentIndex
                              ? "100%"
                              : index === currentIndex
                                ? `${progress}%`
                                : "0%",
                        }}
                        className="h-full bg-white rounded-full"
                      />
                    </View>
                  ))}
                </View>
                <View className="flex-row items-center justify-between px-2">
                  <View className="flex-row items-center gap-3">
                    <Image
                      source={
                        isOfficialMood
                          ? require("@/assets/images/icon.png")
                          : group.user?.pfp
                            ? { uri: group.user?.pfp }
                            : require("@/assets/noPfp.jpg")
                      }
                      className="w-10 h-10 rounded-full border border-white/20"
                    />
                    <View>
                      <View className="flex-row items-center">
                        <Text className="text-white font-bold text-[15px] leading-4 mr-1 shadow-sm">
                          {group.user?.name || group.user?.username}
                        </Text>
                        {isVerified && (
                          <MaterialIcons
                            name="verified"
                            size={16}
                            color="#5E17EB"
                            style={{ marginLeft: 4 }}
                          />
                        )}
                        <Text className="text-zinc-400 text-xs ml-2 font-medium">
                          {formatTimeAgo(currentStory.$createdAt)}
                        </Text>
                      </View>
                      {isOfficialMood && (
                        <Text className="text-white/70 text-xs font-medium">
                          {t("story.moodStory")}
                        </Text>
                      )}
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
                          size={22}
                          color="white"
                        />
                      </TouchableOpacity>
                    )}
                    {isOwner && (
                      <TouchableOpacity
                        onPress={() => {
                          setTimeout(() => onClose(), 0);
                          setTimeout(onAddMore, 300);
                        }}
                        className="bg-white/10 p-2 rounded-full backdrop-blur-md border border-white/5"
                      >
                        <Ionicons name="add" size={24} color="white" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => setTimeout(onClose, 0)}
                      className="p-1"
                    >
                      <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Footer */}
              <View
                pointerEvents="box-none"
                className="absolute bottom-0 w-full pb-8 px-4 z-20"
              >
                {isOwner ? (
                  <TouchableOpacity
                    onPress={() => {
                      setIsPaused(true);
                      setViewersModalVisible(true);
                    }}
                    activeOpacity={0.8}
                    className="flex-row items-center bg-black/60 px-5 py-3 rounded-full border border-white/20 self-start backdrop-blur-lg"
                  >
                    <View className="flex-row mr-2 items-center">
                      {previewViewers.length > 0 ? (
                        previewViewers.slice(0, 3).map((v, i) => (
                          <Image
                            key={i}
                            source={
                              v.pfp || v.avatar
                                ? { uri: v.pfp || v.avatar }
                                : require("@/assets/noPfp.jpg")
                            }
                            className="w-6 h-6 rounded-full border border-black bg-zinc-700"
                            style={{
                              marginLeft: i === 0 ? 0 : -10,
                              zIndex: 3 - i,
                            }}
                          />
                        ))
                      ) : (
                        <Ionicons name="eye" size={16} color="white" />
                      )}
                    </View>
                    <Text className="text-white font-bold text-sm ml-2">
                      {realViewersList.length} {t("story.views")}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  !isOfficialMood && (
                    <View className="flex-row items-center gap-3">
                      <View className="flex-1 h-12 rounded-full border border-white/20 px-5 justify-center bg-black/30 backdrop-blur-md">
                        <TextInput
                          placeholder={t("story.replyPlaceholder")}
                          placeholderTextColor="rgba(255,255,255,0.6)"
                          className="text-white font-medium text-base"
                        />
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setIsPaused(true);
                          setDetailsVisible(true);
                        }}
                        className="bg-black/30 p-3 rounded-full border border-white/20 backdrop-blur-md"
                      >
                        <Ionicons name="disc-outline" size={24} color="white" />
                      </TouchableOpacity>
                      <TouchableOpacity className="bg-black/30 p-3 rounded-full border border-white/20 backdrop-blur-md">
                        <Ionicons
                          name="heart-outline"
                          size={24}
                          color="white"
                        />
                      </TouchableOpacity>
                    </View>
                  )
                )}
              </View>
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
