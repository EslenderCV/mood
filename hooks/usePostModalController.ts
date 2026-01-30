import { useState, useEffect, useRef, useCallback } from "react";
import { Keyboard, Animated, Dimensions, Easing } from "react-native";
import { Audio } from "expo-av";
import { useAudioRecorder } from "expo-audio";
import * as Haptics from "expo-haptics";
import { useModal } from "@/context/ModalContext";
import { useGlobalContext } from "@/context/GlobalProvider";
import { useFeed } from "@/context/FeedProvider";
import { createPost, searchUsers } from "@/lib/appwrite";
import { useLanguage } from "@/context/LanguageContext";

const { height } = Dimensions.get("window");
const MOOD_OFFICIAL_ID = "696b571b00112fd5c1e9";

export interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
  preview: string | null;
  isExplicit: boolean;
}

export interface MoodState {
  emoji: string;
  text: string;
}

export const usePostModalController = (props?: any) => {
  const {
    isPostModalVisible: isGlobalVisible,
    setPostModalVisible: setGlobalVisible,
  } = useModal();

  const isVisible = props?.isVisible ?? props?.visible ?? isGlobalVisible;
  const setVisible = props?.onClose
    ? (val: boolean) => !val && props.onClose()
    : setGlobalVisible;

  const { user } = useGlobalContext();
  const { t } = useLanguage();

  let feedContext;
  try {
    feedContext = useFeed();
  } catch (e) {
    feedContext = null;
  }
  const createPostOptimistic = feedContext?.createPostOptimistic;
  const viralSongToUse = feedContext?.viralSongToUse;
  const setViralSongToUse = feedContext?.setViralSongToUse;

  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [linkedSong, setLinkedSong] = useState<Song | null>(null);

  const [mood, setMood] = useState<MoodState | null>(null);
  const [isMoodPopupVisible, setIsMoodPopupVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [moodStyle, setMoodStyle] = useState<"standard" | "card">("standard");
  const [isShazamScanning, setIsShazamScanning] = useState(false);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingUrl, setCurrentPlayingUrl] = useState<string | null>(
    null,
  );

  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(height)).current;

  const [toast, setToast] = useState({
    visible: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const toastAnim = useRef(new Animated.Value(-150)).current;

  const recorder = useAudioRecorder({
    extension: ".m4a",
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    android: { extension: ".m4a", outputFormat: "mpeg4", audioEncoder: "aac" },
    ios: { extension: ".m4a", outputFormat: "mpeg4aac", audioQuality: 127 },
    web: { mimeType: "audio/mp4", bitsPerSecond: 128000 },
  });

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  useEffect(() => {
    if (isVisible && props?.prefillData?.song) {
      const incoming = props.prefillData.song;
      const mappedSong: Song = {
        id: String(incoming.id || incoming.id || incoming.spotifyId),
        title: incoming.title || incoming.title,
        artist: incoming.artist || incoming.artist,
        cover: incoming.cover || incoming.cover,
        preview: incoming.preview || incoming.preview,
        isExplicit: false,
      };
      setLinkedSong(mappedSong);
    }
  }, [isVisible, props?.prefillData]);

  useEffect(() => {
    if (isVisible && viralSongToUse) {
      const formattedSong: Song = {
        id: String(viralSongToUse.id),
        title: viralSongToUse.title,
        artist: viralSongToUse.artist?.name || viralSongToUse.artist,
        cover:
          viralSongToUse.cover ||
          viralSongToUse.album?.cover_xl ||
          viralSongToUse.album?.cover_medium,
        preview: viralSongToUse.preview,
        isExplicit: !!viralSongToUse.explicit_lyrics,
      };
      setLinkedSong(formattedSong);
      if (setViralSongToUse) setViralSongToUse(null);
    }
  }, [isVisible, viralSongToUse]);

  useEffect(() => {
    if (isVisible) {
      backgroundOpacity.setValue(0);
      contentTranslateY.setValue(height);
      Animated.parallel([
        Animated.timing(backgroundOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(contentTranslateY, {
          toValue: 0,
          damping: 20,
          stiffness: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      resetForm();
      if (recorder.isRecording) recorder.stop();
      stopAudio();
    }
  }, [isVisible]);

  const closeModal = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: height,
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  }, [setVisible]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length > 2) searchDeezerTracks(searchQuery);
      else {
        const loadSuggestions = async () => {
          if (isSearchingMusic) {
            setIsLoading(true);
            const suggestions = await fetchSuggestedSongs();
            setSearchResults(suggestions as any);
            setIsLoading(false);
          }
        };
        loadSuggestions();
        return;
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const fetchSuggestedSongs = async () => {
    try {
      const response = await fetch(
        "https://api.deezer.com/chart/0/tracks?limit=50",
      );
      const json = await response.json();
      if (!json.data) return [];
      const uniqueTracks: any[] = [];
      const seenArtists = new Set();
      for (const track of json.data) {
        if (!seenArtists.has(track.artist.id)) {
          seenArtists.add(track.artist.id);
          uniqueTracks.push(track);
        }
      }
      const shuffled = uniqueTracks.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, 5).map((track: any) => ({
        id: track.id.toString(),
        title: track.title,
        artist: track.artist.name,
        cover: track.album.cover_medium,
        preview: track.preview,
        duration: track.duration,
      }));
    } catch (e) {
      console.error("Error fetching suggestions:", e);
      return [];
    }
  };

  const resetForm = () => {
    setText("");
    if (!props?.prefillData) {
      setLinkedSong(null);
    }
    setMood(null);
    setIsMoodPopupVisible(false);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchingMusic(false);
    setShowSuggestions(false);
    setMoodStyle("standard");
    setIsShazamScanning(false);
  };

  const showToast = useCallback(
    (type: "success" | "error", title: string, message: string) => {
      setToast({ visible: true, type, title, message });
      Haptics.notificationAsync(
        type === "success"
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      );
      Animated.spring(toastAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
      setTimeout(() => {
        Animated.timing(toastAnim, {
          toValue: -150,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setToast((prev) => ({ ...prev, visible: false })));
      }, 3000);
    },
    [],
  );

  const openMoodPopup = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsMoodPopupVisible(true);
  }, []);

  const closeMoodPopup = useCallback(() => {
    setIsMoodPopupVisible(false);
  }, []);

  const stopAudio = async () => {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
      setCurrentPlayingUrl(null);
    }
  };

  const handlePlayMusic = async (url: string | null) => {
    if (!url) {
      showToast(
        "error",
        t("post.alerts.errorTitle"),
        t("post.alerts.noPreview"),
      );
      return;
    }
    Haptics.selectionAsync();
    try {
      if (sound && currentPlayingUrl === url) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
          } else {
            if (status.positionMillis >= (status.durationMillis || 0))
              await sound.replayAsync();
            else await sound.playAsync();
            setIsPlaying(true);
          }
        }
        return;
      }
      await stopAudio();
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
      );
      setSound(newSound);
      setCurrentPlayingUrl(url);
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) setIsPlaying(false);
      });
    } catch {
      showToast("error", "Error", "No se pudo reproducir.");
    }
  };

  const handleSelectSong = useCallback(
    async (song: Song) => {
      await stopAudio();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLinkedSong(song);
      setIsSearchingMusic(false);
      setSearchQuery("");
    },
    [sound],
  );

  const removeLinkedSong = useCallback(async () => {
    await stopAudio();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLinkedSong(null);
  }, [sound]);

  const searchDeezerTracks = async (query: string) => {
    if (!query) return;
    setIsLoadingSearch(true);
    try {
      const response = await fetch(
        `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=25`,
      );
      const data = await response.json();
      if (data.data) {
        setSearchResults(
          data.data.map((item: any) => ({
            id: String(item.id),
            title: item.title,
            artist: item.artist.name,
            cover: item.album.cover_xl || item.album.cover_medium,
            preview: item.preview,
            isExplicit: item.explicit_lyrics === true,
          })),
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const handleShazam = async () => {
    if (linkedSong) return;
    await stopAudio();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsShazamScanning(true);
    setTimeout(() => {
      setIsShazamScanning(false);
    }, 5000);
  };

  const handlePost = async () => {
    if (!user) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (!linkedSong && user.$id !== MOOD_OFFICIAL_ID) {
      showToast("error", "Música Requerida", "Debes agregar una canción.");
      return;
    }
    if (!text.trim() && !linkedSong) return;

    await stopAudio();

    let songDataObj: any = {};
    if (linkedSong) {
      songDataObj = {
        title: linkedSong.title,
        artist: linkedSong.artist,
        cover: linkedSong.cover,
        preview: linkedSong.preview,
        id: linkedSong.id,
      };
    } else if (user.$id === MOOD_OFFICIAL_ID) {
      songDataObj = { moodStyle: moodStyle };
    }

    if (mood) {
      songDataObj.mood = mood;
    }

    // 🔴 NOTA: Si usas createPostOptimistic, la actualización del Streak
    // será visualmente retrasada hasta que el backend responda realmente en segundo plano.
    // Para simplificar y asegurar consistencia con el Streak, usaremos la vía normal aquí.
    // Si prefieres la UI Optimista, el streak podría no ser preciso instantáneamente.

    // Aquí desactivamos temporalmente el path optimista para priorizar la lógica de Streak del backend
    // o puedes mantenerlo, pero sabiendo que el modal de fuego saldrá después.

    // Mantenemos la lógica robusta:
    setIsLoading(true);
    try {
      // 🔥 AQUI EL CAMBIO: Recibimos la respuesta completa con el streak real del backend
      const result: any = await createPost(
        text,
        JSON.stringify(songDataObj),
        user.$id,
      );

      closeModal();

      // Pasamos el streak real y si cambió. Si no cambió, pasamos null.
      if (result && result.hasStreakChanged) {
        props?.onPostCreated?.(result.currentStreak);
      } else {
        props?.onPostCreated?.(null); // No mostrar fuego si es el mismo día
      }

      setTimeout(
        () =>
          showToast(
            "success",
            t("post.alerts.successTitle"),
            t("post.alerts.successMsg"),
          ),
        300,
      );
    } catch (error: any) {
      showToast("error", t("post.alerts.errorTitle"), error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextChange = async (inputText: string) => {
    setText(inputText);
    const words = inputText.split(" ");
    const lastWord = words[words.length - 1];
    if (lastWord && lastWord.startsWith("@") && lastWord.length > 1) {
      try {
        const results = await searchUsers(lastWord.substring(1));
        setSuggestions(results.filter((u) => u.$id !== user?.$id));
        setShowSuggestions(true);
      } catch {}
    } else setShowSuggestions(false);
  };

  const handleSelectUser = (username: string) => {
    const words = text.split(" ");
    words.pop();
    setText(`${words.join(" ")} @${username} `);
    setShowSuggestions(false);
  };

  return {
    isPostModalVisible: isVisible,
    closeModal,
    user,
    text,
    setText: handleTextChange,
    handleSelectUser,
    showSuggestions,
    suggestions,
    moodStyle,
    setMoodStyle,
    linkedSong,
    handleSelectSong,
    removeLinkedSong,
    isSearchingMusic,
    setIsSearchingMusic,
    searchQuery,
    setSearchQuery,
    searchResults,
    isLoadingSearch,
    handlePlayMusic,
    currentPlayingUrl,
    isPlaying,
    recorder,
    handleShazam,
    isShazamScanning,
    handlePost,
    isLoading,
    backgroundOpacity,
    contentTranslateY,
    toast,
    toastAnim,
    MOOD_OFFICIAL_ID,
    t,
    mood,
    setMood,
    isMoodPopupVisible,
    openMoodPopup,
    closeMoodPopup,
  };
};
