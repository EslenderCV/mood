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
const AUDD_API_TOKEN = "a3c6cdb39b3b57fe634900cdc67077c7";
const MOOD_OFFICIAL_ID = "696b571b00112fd5c1e9";

export interface Song {
  trackId: string;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string | null;
  isExplicit: boolean;
}

export const usePostModalController = () => {
  const { isPostModalVisible, setPostModalVisible } = useModal();
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

  // --- STATE ---
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [linkedSong, setLinkedSong] = useState<Song | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [moodStyle, setMoodStyle] = useState<"standard" | "card">("standard");

  // Audio State
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingUrl, setCurrentPlayingUrl] = useState<string | null>(
    null,
  );

  // Animation Refs
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(height)).current;

  // Toast State
  const [toast, setToast] = useState({
    visible: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const toastAnim = useRef(new Animated.Value(-150)).current;

  // Recorder
  const recorder = useAudioRecorder({
    extension: ".m4a",
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    android: { extension: ".m4a", outputFormat: "mpeg4", audioEncoder: "aac" },
    ios: { extension: ".m4a", outputFormat: "mpeg4aac", audioQuality: 127 },
    web: { mimeType: "audio/mp4", bitsPerSecond: 128000 },
  });

  // --- AUDIO CLEANUP ---
  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  // --- VIRAL SONG IMPORT ---
  useEffect(() => {
    if (isPostModalVisible && viralSongToUse) {
      const formattedSong: Song = {
        trackId: String(viralSongToUse.id),
        trackName: viralSongToUse.title,
        artistName: viralSongToUse.artist?.name || viralSongToUse.artist,
        artworkUrl100:
          viralSongToUse.cover ||
          viralSongToUse.album?.cover_xl ||
          viralSongToUse.album?.cover_medium,
        previewUrl: viralSongToUse.preview,
        isExplicit: !!viralSongToUse.explicit_lyrics,
      };
      setLinkedSong(formattedSong);
      if (setViralSongToUse) setViralSongToUse(null);
    }
  }, [isPostModalVisible, viralSongToUse]);

  // --- ANIMATIONS ---
  useEffect(() => {
    if (isPostModalVisible) {
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
  }, [isPostModalVisible]);

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
    ]).start(() => setPostModalVisible(false));
  }, []);

  // --- DEBOUNCE SEARCH ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length > 2) {
        searchDeezerTracks(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // --- METHODS ---

  const resetForm = () => {
    setText("");
    setLinkedSong(null);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchingMusic(false);
    setShowSuggestions(false);
    setMoodStyle("standard");
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
            trackId: String(item.id),
            trackName: item.title,
            artistName: item.artist.name,
            artworkUrl100: item.album.cover_xl || item.album.cover_medium,
            previewUrl: item.preview,
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

    try {
      await recorder.record();
      setTimeout(async () => {
        try {
          if (recorder.isRecording) {
            await recorder.stop();
            const uri = recorder.uri;
            if (!uri) throw new Error("No audio uri");

            const formData = new FormData();
            formData.append("api_token", AUDD_API_TOKEN);
            formData.append("file", {
              uri: uri,
              name: "recording.m4a",
              type: "audio/m4a",
            } as any);

            const response = await fetch("https://api.audd.io/", {
              method: "POST",
              body: formData,
              headers: { "Content-Type": "multipart/form-data" },
            });
            const result = await response.json();

            if (result.status === "success" && result.result) {
              const auddTrack = result.result;
              const searchTerm = `${auddTrack.title} ${auddTrack.artist}`;
              const deezerResults = await fetch(
                `https://api.deezer.com/search?q=${encodeURIComponent(searchTerm)}&limit=1`,
              )
                .then((r) => r.json())
                .catch(() => ({ data: [] }));

              if (deezerResults.data && deezerResults.data.length > 0) {
                const bestMatch = deezerResults.data[0];
                setLinkedSong({
                  trackId: String(bestMatch.id),
                  trackName: bestMatch.title,
                  artistName: bestMatch.artist.name,
                  artworkUrl100: bestMatch.album.cover_xl,
                  previewUrl: bestMatch.preview,
                  isExplicit: bestMatch.explicit_lyrics,
                });
                showToast(
                  "success",
                  t("post.alerts.found"),
                  `"${bestMatch.title}"`,
                );
              } else {
                setLinkedSong({
                  trackId: String(Math.random()),
                  trackName: auddTrack.title,
                  artistName: auddTrack.artist,
                  artworkUrl100: "https://via.placeholder.com/600",
                  previewUrl: null,
                  isExplicit: false,
                });
                showToast(
                  "success",
                  t("post.alerts.found"),
                  `"${auddTrack.title}"`,
                );
              }
            } else {
              showToast(
                "error",
                t("post.alerts.notFound"),
                t("post.alerts.tryManual"),
              );
              setIsSearchingMusic(true);
            }
          }
        } catch {
          showToast("error", t("post.alerts.errorTitle"), "Ocurrió un error.");
        }
      }, 5000);
    } catch {
      showToast(
        "error",
        t("post.alerts.permission"),
        t("post.alerts.enableMic"),
      );
    }
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
        title: linkedSong.trackName,
        artist: linkedSong.artistName,
        cover: linkedSong.artworkUrl100,
        preview: linkedSong.previewUrl,
        trackId: linkedSong.trackId,
      };
    } else if (user.$id === MOOD_OFFICIAL_ID) {
      songDataObj = { moodStyle: moodStyle };
    }

    if (createPostOptimistic) {
      // @ts-ignore
      createPostOptimistic(text, songDataObj, user);
      closeModal();
      setTimeout(
        () =>
          showToast("success", t("post.alerts.successTitle"), "Publicando..."),
        300,
      );
    } else {
      setIsLoading(true);
      try {
        // @ts-ignore
        await createPost(text, JSON.stringify(songDataObj), user.$id);
        closeModal();
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
    isPostModalVisible,
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
    handlePost,
    isLoading,
    backgroundOpacity,
    contentTranslateY,
    toast,
    toastAnim,
    MOOD_OFFICIAL_ID,
    t,
  };
};
