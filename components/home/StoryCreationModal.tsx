import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  LayoutAnimation,
  Animated,
  StatusBar,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Audio } from "expo-av"; // 🔥 Usamos expo-av como en PostItem
import { Video, ResizeMode } from "expo-av";
import { pickMedia, uploadFile } from "@/lib/appwrite";
import { useLanguage } from "@/context/LanguageContext";
import CustomToast from "../shared/CustomToast";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";

const MOOD_OFFICIAL_ID = "696b571b00112fd5c1e9";
const { width } = Dimensions.get("window");

// 🎨 Paleta de colores Premium
const COLORS = {
  primary: "#5E17EB",
  secondary: "#7c3aed",
  bgDark: "#000000",
  bgGradientStart: "#1a0b2e",
  text: "#FFFFFF",
  textMuted: "#A1A1AA",
  border: "rgba(255,255,255,0.1)",
};

// 🎲 Lista de términos para el "Shuffle Latino"
const LATIN_SHUFFLE_TERMS = [
  "Exitos Reggaeton 2024",
  "Feid",
  "Bad Bunny",
  "Karol G",
  "Rauw Alejandro",
  "Top Mexico",
  "Perreo Intenso",
  "Trap Argentino",
  "Myke Towers",
  "Mora",
  "Young Miko",
  "Arcangel",
  "Eladio Carrion",
  "Bachata Hits",
  "Dembow Dominicano"
];

interface StoryCreationModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: any;
  onSuccess: () => void;
  initialSongData: any;
  createStory: (songData: string, userId: string) => Promise<any>;
  searchSongsWrapper: (query: string) => Promise<any[]>;
  RANDOM_SEARCH_TERMS: string[];
}

const StoryCreationModal = ({
  visible,
  onClose,
  currentUser,
  onSuccess,
  initialSongData,
  createStory,
  searchSongsWrapper,
}: StoryCreationModalProps) => {
  const [step, setStep] = useState<"search" | "preview">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  
  // Audio State (Lógica de PostItem)
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [previewTrackUrl, setPreviewTrackUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [media, setMedia] = useState<any>(null);

  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [trendingSongs, setTrendingSongs] = useState<any[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  const toastAnim = useRef(new Animated.Value(-150)).current;
  const [toast, setToast] = useState({
    visible: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  const isOfficialAccount = currentUser?.$id === MOOD_OFFICIAL_ID;

  // --- EFECTOS DE CICLO DE VIDA ---

  useEffect(() => {
    if (visible) {
      if (initialSongData) {
        setSelectedSong(initialSongData);
        setStep("preview");
        // Si ya viene con canción, intentamos reproducir su preview
        if (initialSongData.preview) {
            handlePlayPreview(initialSongData.preview);
        }
      } else {
        resetForm();
        loadRandomLatinHits(); // 🔥 Carga aleatoria
      }
    } else {
      // Al cerrar modal, detener audio
      stopSound();
    }
  }, [visible, initialSongData]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      stopSound();
    };
  }, []);

  // --- LÓGICA DE AUDIO (PostItem Style) ---
  
  const stopSound = async () => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      setIsPlaying(false);
      setPreviewTrackUrl(null);
    } catch (error) {
      console.log("Error stopping sound", error);
    }
  };

  const handlePlayPreview = async (url: string | null) => {
    if (!url) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Si tocamos la misma canción que suena -> Pausa/Stop
      if (previewTrackUrl === url && sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
          return; // Salimos, ya pausamos
        } else if (status.isLoaded && !status.isPlaying) {
            // Si estaba pausada, reanudamos
            await sound.playAsync();
            setIsPlaying(true);
            return;
        }
      }

      // Si es una nueva canción, detenemos la anterior
      if (sound) {
        await sound.unloadAsync();
      }

      // 🔥 CONFIGURACIÓN DE AUDIO DE POSTITEM (SILENT MODE FIX)
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );

      setSound(newSound);
      setPreviewTrackUrl(url);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          // Opcional: loop en preview
          // newSound.replayAsync(); 
        }
      });

    } catch (error) {
      console.log("Error playing preview:", error);
    }
  };

  // --- LÓGICA DE DATOS ---

  const filterUniqueArtists = (songs: any[]) => {
    if (!songs || songs.length === 0) return [];
    const seenArtists = new Set();
    const uniqueSongs = [];
    for (const song of songs) {
      if (!song.cover || !song.preview) continue;
      const artistName = song.artist ? song.artist.trim().toLowerCase() : "unknown";
      if (!seenArtists.has(artistName)) {
        seenArtists.add(artistName);
        uniqueSongs.push(song);
      }
    }
    return uniqueSongs.length >= 5 ? uniqueSongs : songs.filter(s => s.cover && s.preview);
  };

  const loadRandomLatinHits = async () => {
    setLoadingTrending(true);
    try {
      // 🔥 SHUFFLE: Elegimos un término al azar cada vez
      const randomTerm = LATIN_SHUFFLE_TERMS[Math.floor(Math.random() * LATIN_SHUFFLE_TERMS.length)];
      console.log("Searching for:", randomTerm);
      
      const songs = await searchSongsWrapper(randomTerm);
      const premiumList = filterUniqueArtists(songs);
      
      setTrendingSongs(premiumList);
    } catch (e) {
      console.log("Error cargando hits:", e);
    } finally {
      setLoadingTrending(false);
    }
  };

  // --- BÚSQUEDA ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length > 2) {
        setSearching(true);
        try {
            const songs = await searchSongsWrapper(query);
            setResults(filterUniqueArtists(songs));
        } catch (e) { console.log(e); } finally { setSearching(false); }
      } else if (query.length === 0) {
        setResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const resetForm = () => {
    setStep("search");
    setQuery("");
    setResults([]);
    setSelectedSong(null);
    setMedia(null);
    setCaption("");
    setPreviewTrackUrl(null);
    stopSound();
  };

  const handleSelectSong = (song: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Reproducimos la canción seleccionada al pasar al preview
    if (song.preview) {
        handlePlayPreview(song.preview);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedSong(song);
    setMedia(null);
    setStep("preview");
  };

  const handlePickMedia = async (type: "image" | "video") => {
    try {
      stopSound(); // Paramos música al elegir media
      const result = await pickMedia(type);
      if (result) {
        setMedia({ uri: result.uri, type: type, file: result });
        setSelectedSong(null);
        setStep("preview");
      }
    } catch (error) { console.log(error); }
  };

  const handleUpload = async () => {
    if ((!selectedSong && !media) || !currentUser) return;
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    stopSound(); // Parar audio al subir

    try {
      let payloadString = "";
      if (media && isOfficialAccount) {
        const uploadedUrl = await uploadFile(media.file, media.type);
        payloadString = JSON.stringify({
          mediaUrl: uploadedUrl,
          mediaType: media.type,
          caption,
          duration: media.type === "video" ? 15000 : 5000,
          isMediaStory: true,
        });
      } else if (selectedSong) {
        const songId = selectedSong.id || selectedSong.spotifyId || selectedSong.trackId;
        payloadString = JSON.stringify({
          title: selectedSong.title,
          artist: selectedSong.artist,
          cover: selectedSong.cover,
          preview: selectedSong.preview,
          spotifyId: songId,
          caption,
          mediaType: "music",
          isMediaStory: false,
        });
      }
      
      await createStory(payloadString, currentUser.$id);
      onClose();
      setTimeout(() => showToast("success", t("common.posted"), t("story.postedMsg")), 300);
      onSuccess();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast("error", t("common.error"), t("story.errorPosting"));
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: "success" | "error", title: string, message: string) => {
    setToast({ visible: true, type, title, message });
    Animated.spring(toastAnim, { toValue: 0, useNativeDriver: true }).start();
    setTimeout(() => {
        Animated.timing(toastAnim, { toValue: -150, duration: 300, useNativeDriver: true }).start(() => setToast((prev) => ({ ...prev, visible: false })));
    }, 3000);
  };

  const handleBack = () => {
    if (step === "preview") {
      if (initialSongData) {
          onClose();
      } else {
        setStep("search");
        setSelectedSong(null);
        setMedia(null);
        // Si volvemos y no hay query, recargamos trends random para variedad
        if (query.length === 0) loadRandomLatinHits();
      }
    } else {
      onClose();
    }
  };

  if (!visible && !toast.visible) return null;

  // --- RENDER ITEM ---
  const renderSongItem = ({ item, index, isTrending = false }: any) => {
    // Comparamos URL para saber si es el que suena
    const isThisPlaying = isPlaying && previewTrackUrl === item.preview;
    
    return (
      <TouchableOpacity
        onPress={() => handleSelectSong(item)}
        className="flex-row items-center px-4 mb-5"
        activeOpacity={0.7}
      >
        {isTrending && (
          <Text className="text-zinc-600 font-black text-xl w-8 text-center mr-3 italic">
            {index + 1}
          </Text>
        )}
        
        <View className="relative shadow-sm">
          <Image
            source={{ uri: item.cover }}
            className="w-14 h-14 rounded-xl bg-zinc-900"
          />
          {isThisPlaying && (
            <View className="absolute inset-0 bg-black/50 rounded-xl items-center justify-center border-2 border-[#5E17EB]">
              <Ionicons name="stats-chart" size={16} color={COLORS.primary} />
            </View>
          )}
        </View>

        <View className="ml-4 flex-1 justify-center">
          <Text className="text-white font-bold text-[16px] mb-1 tracking-tight" numberOfLines={1}>
            {item.title}
          </Text>
          <Text className="text-zinc-400 text-sm font-medium" numberOfLines={1}>
            {item.artist}
          </Text>
        </View>

        {item.preview && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handlePlayPreview(item.preview);
            }}
            className="ml-2 p-1"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isThisPlaying ? (
                 <Ionicons name="pause-circle" size={36} color={COLORS.primary} />
            ) : (
                 <Ionicons name="play-circle" size={36} color="#3f3f46" />
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderSkeleton = () => (
    <View className="px-4 pt-4">
        {[1, 2, 3, 4, 5].map(i => (
            <View key={i} className="flex-row items-center mb-6 opacity-20">
                <View className="w-8 h-4 bg-zinc-700 rounded mr-3" />
                <View className="w-14 h-14 bg-zinc-700 rounded-[12px]" />
                <View className="ml-4 flex-1">
                    <View className="w-2/3 h-4 bg-zinc-700 rounded mb-2" />
                    <View className="w-1/3 h-3 bg-zinc-700 rounded" />
                </View>
            </View>
        ))}
    </View>
  );

  return (
    <>
      <CustomToast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        translateY={toastAnim}
      />
      <Modal
        animationType="slide"
        transparent={false}
        visible={visible}
        onRequestClose={onClose}
      >
        <View className="flex-1 bg-[#000000]">
          <StatusBar barStyle="light-content" />
          
          <LinearGradient
            colors={[COLORS.bgGradientStart, COLORS.bgDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 0.4 }}
            className="absolute w-full h-full"
          />

          <View style={{ paddingTop: insets.top }} className="flex-1">
            
            {/* HEADER */}
            <View className="flex-row items-center justify-between px-4 py-4 z-10">
                <TouchableOpacity 
                    onPress={handleBack} 
                    className="w-10 h-10 items-center justify-center bg-white/5 rounded-full backdrop-blur-md border border-white/5"
                >
                    {step === 'preview' ? <Ionicons name="chevron-back" size={24} color="white" /> : <Ionicons name="close" size={24} color="white" />}
                </TouchableOpacity>
                
                <Text className="text-white font-bold text-[17px] tracking-wide">
                    {step === 'search' ? t('story.newStory') : t('common.share')}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
            >
              <View className="flex-1">
                
                {/* --- SEARCH --- */}
                {step === "search" && (
                  <View className="flex-1 pt-2">
                    
                    <View className="px-4">
                        <BlurView intensity={20} tint="dark" className="flex-row items-center px-4 py-3.5 rounded-2xl mb-6 border border-white/10 overflow-hidden">
                            <Ionicons name="search" size={20} color={COLORS.textMuted} />
                            <TextInput
                                placeholder={t("story.searchPlaceholder")}
                                placeholderTextColor={COLORS.textMuted}
                                className="flex-1 ml-3 text-white text-[16px] font-medium"
                                value={query}
                                onChangeText={setQuery}
                                autoFocus={false}
                                returnKeyType="search"
                                selectionColor={COLORS.primary}
                            />
                            {query.length > 0 && (
                                <TouchableOpacity onPress={() => setQuery("")}>
                                    <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            )}
                        </BlurView>
                    </View>

                    <View className="flex-1">
                        {searching ? (
                             <ActivityIndicator size="large" color={COLORS.primary} className="mt-20" />
                        ) : query.length === 0 ? (
                            loadingTrending ? renderSkeleton() : (
                            <FlatList
                                data={trendingSongs}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item, index }) => renderSongItem({ item, index, isTrending: true })}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
                                ListHeaderComponent={
                                    <View className="mb-6 px-4">
                                        <Text className="text-white font-bold text-2xl tracking-tight">
                                            {t("story.trending")}
                                        </Text>
                                        <Text className="text-zinc-500 text-sm mt-1">
                                            {t("story.topHitsSubtitle") || "Lo más viral del momento"}
                                        </Text>
                                    </View>
                                }
                            />
                            )
                        ) : (
                             <FlatList
                                data={results}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => renderSongItem({ item })}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
                            />
                        )}
                    </View>
                  </View>
                )}

                {/* --- PREVIEW --- */}
                {step === "preview" && (
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View className="flex-1 items-center px-6 pt-4">
                            
                            <View className="w-full aspect-square rounded-[32px] overflow-hidden shadow-2xl bg-zinc-900 relative mb-8 border border-white/5" 
                                  style={{ shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 30 }}>
                                {media ? (
                                    media.type === "video" ? (
                                        <Video source={{ uri: media.uri }} style={{ width: "100%", height: "100%" }} resizeMode={ResizeMode.COVER} shouldPlay isLooping />
                                    ) : (
                                        <Image source={{ uri: media.uri }} className="w-full h-full" resizeMode="cover" />
                                    )
                                ) : selectedSong ? (
                                    <>
                                        <Image source={{ uri: selectedSong.cover }} className="w-full h-full" resizeMode="cover" />
                                        <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)"]} className="absolute bottom-0 w-full h-40" />
                                        
                                        <View className="absolute top-4 right-4 bg-black/40 px-3 py-1.5 rounded-full flex-row items-center border border-white/10 backdrop-blur-md">
                                            <Ionicons name="musical-notes" size={10} color={COLORS.primary} />
                                            <Text className="text-white text-[10px] font-bold ml-1.5 uppercase tracking-widest">MOOD</Text>
                                        </View>
                                    </>
                                ) : null}
                            </View>

                            {!media && selectedSong && (
                                <View className="w-full items-center mb-8">
                                    <Text className="text-white text-2xl font-black text-center mb-2 leading-8 tracking-tight shadow-sm">
                                        {selectedSong.title}
                                    </Text>
                                    <Text className="text-zinc-400 text-lg font-medium text-center">
                                        {selectedSong.artist}
                                    </Text>
                                </View>
                            )}

                            <View className="w-full mb-6">
                                <BlurView intensity={15} tint="light" className="rounded-2xl overflow-hidden border border-white/10">
                                    <TextInput
                                        placeholder={t("story.captionPlaceholder")}
                                        placeholderTextColor="rgba(255,255,255,0.5)"
                                        className="px-5 py-4 text-white text-center text-[16px] font-medium bg-white/5"
                                        value={caption}
                                        onChangeText={setCaption}
                                        maxLength={100}
                                        multiline
                                        returnKeyType="done"
                                        blurOnSubmit
                                    />
                                </BlurView>
                            </View>

                            <TouchableOpacity onPress={handleUpload} disabled={loading} className="w-full mt-auto mb-8">
                                <LinearGradient
                                    colors={[COLORS.primary, COLORS.secondary]}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    className="py-4 rounded-full flex-row items-center justify-center shadow-lg shadow-purple-900/30"
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <>
                                            <Text className="text-white font-bold text-[16px] mr-2 tracking-wide">{t("story.shareBtn") || t("common.share")}</Text>
                                            <Ionicons name="arrow-forward" size={20} color="white" />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                )}
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default StoryCreationModal;