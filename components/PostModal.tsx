import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  FlatList,
  Animated,
  Dimensions,
  StyleSheet,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useModal } from "@/context/ModalContext";
import { useGlobalContext } from "@/context/GlobalProvider";
import { createPost, searchUsers } from "@/lib/appwrite";
import { useColorScheme } from "nativewind";
import { useAudioPlayer, useAudioRecorder } from "expo-audio";
import { useLanguage } from "@/context/LanguageContext";
import { BlurView } from "expo-blur";

const { width, height } = Dimensions.get("window");
const AUDD_API_TOKEN = "a3c6cdb39b3b57fe634900cdc67077c7";

interface Song {
  trackId: string;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string | null;
  isExplicit: boolean;
}

// --- COMPONENTE TOAST PERSONALIZADO ---
const CustomToast = ({ visible, type, title, message, translateY }: any) => {
  if (!visible) return null;

  const isSuccess = type === "success";
  const iconName = isSuccess ? "checkmark-circle" : "alert-circle";
  const iconColor = isSuccess ? "#5E17EB" : "#EF4444";
  const bgColor = "rgba(20, 20, 23, 0.95)";

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        position: "absolute",
        top: Platform.OS === "ios" ? 60 : 40,
        left: 20,
        right: 20,
        zIndex: 9999,
        backgroundColor: bgColor,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: isSuccess
            ? "rgba(94, 23, 235, 0.15)"
            : "rgba(239, 68, 68, 0.15)",
          justifyContent: "center",
          alignItems: "center",
          marginRight: 14,
        }}
      >
        <Ionicons name={iconName} size={28} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: "white",
            fontWeight: "bold",
            fontSize: 16,
            marginBottom: 2,
          }}
        >
          {title}
        </Text>
        <Text style={{ color: "#A1A1AA", fontSize: 13, fontWeight: "500" }}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};

export default function PostModal() {
  const { isPostModalVisible, setPostModalVisible } = useModal();
  const { user } = useGlobalContext();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();

  const bgColor = isDark ? "#121212" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const inputBg = isDark ? "#18181B" : "#F4F4F5";
  const accentColor = "#FA243C";

  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [linkedSong, setLinkedSong] = useState<Song | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // --- ANIMACIONES MODAL ---
  // Background Fade
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  // Content Slide (Empieza abajo fuera de pantalla)
  const contentTranslateY = useRef(new Animated.Value(height)).current;

  // --- ESTADO PARA EL TOAST ---
  const [toast, setToast] = useState({
    visible: false,
    type: "success",
    title: "",
    message: "",
  });
  const toastAnim = useRef(new Animated.Value(-150)).current;

  // Efecto de Entrada del Modal
  useEffect(() => {
    if (isPostModalVisible) {
      // 1. Resetear valores (por si acaso)
      backgroundOpacity.setValue(0);
      contentTranslateY.setValue(height);

      // 2. Animar Entrada (Paralelo: Fade Fondo + Slide Caja)
      Animated.parallel([
        Animated.timing(backgroundOpacity, {
          toValue: 1,
          duration: 200,
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
      if (player) player.pause();
    }
  }, [isPostModalVisible]);

  // Función de Cierre con Animación de Salida
  const closeModal = () => {
    Keyboard.dismiss();

    // Animar Salida
    Animated.parallel([
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: height, // Baja la caja
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Una vez terminada la animación, ocultamos el modal real
      setPostModalVisible(false);
    });
  };

  const showToast = (
    type: "success" | "error",
    title: string,
    message: string
  ) => {
    setToast({ visible: true, type, title, message });
    Animated.spring(toastAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();

    setTimeout(() => {
      hideToast();
    }, 3000);
  };

  const hideToast = () => {
    Animated.timing(toastAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    });
  };

  const recorder = useAudioRecorder({
    extension: ".m4a",
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    android: { extension: ".m4a", outputFormat: "mpeg4", audioEncoder: "aac" },
    ios: {
      extension: ".m4a",
      outputFormat: "mpeg4aac",
      audioQuality: 127,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: { mimeType: "audio/mp4", bitsPerSecond: 128000 },
  });

  const [previewTrackUrl, setPreviewTrackUrl] = useState<string | null>(null);
  const activeAudioSource = previewTrackUrl || linkedSong?.previewUrl || "";
  const player = useAudioPlayer(activeAudioSource);

  useEffect(() => {
    if (previewTrackUrl && player) {
      player.play();
    }
  }, [previewTrackUrl, player]);

  const resetForm = () => {
    setText("");
    setLinkedSong(null);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchingMusic(false);
    setShowSuggestions(false);
    setPreviewTrackUrl(null);
  };

  const searchDeezerTracks = async (query: string) => {
    if (!query) return;
    setIsLoadingSearch(true);
    try {
      const response = await fetch(
        `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=25`
      );
      const data = await response.json();

      if (data.data) {
        const formatted: Song[] = data.data.map((item: any) => ({
          trackId: String(item.id),
          trackName: item.title,
          artistName: item.artist.name,
          artworkUrl100: item.album.cover_xl || item.album.cover_medium,
          previewUrl: item.preview,
          isExplicit: item.explicit_lyrics === true,
        }));

        setSearchResults(formatted);
        return formatted;
      }
      return [];
    } catch (error) {
      console.error("Error buscando en Deezer:", error);
      return [];
    } finally {
      setIsLoadingSearch(false);
    }
  };

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

  const handleTextChange = async (inputText: string) => {
    setText(inputText);
    const words = inputText.split(" ");
    const lastWord = words[words.length - 1];
    if (lastWord && lastWord.startsWith("@") && lastWord.length > 1) {
      try {
        const results = await searchUsers(lastWord.substring(1));
        setSuggestions(results.filter((u) => u.$id !== user?.$id));
        setShowSuggestions(true);
      } catch (e) {}
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectUser = (username: string) => {
    const words = text.split(" ");
    words.pop();
    setText(`${words.join(" ")} @${username} `);
    setShowSuggestions(false);
  };

  const handlePreviewTrack = (url: string | null) => {
    if (!url) {
      showToast(
        "error",
        t("post.alerts.errorTitle"),
        t("post.alerts.noPreview")
      );
      return;
    }
    if (previewTrackUrl === url) {
      player.pause();
      setPreviewTrackUrl(null);
    } else {
      setPreviewTrackUrl(url);
    }
  };

  const handleSelectSong = (song: Song) => {
    if (player) player.pause();
    setPreviewTrackUrl(null);
    setLinkedSong(song);
    setIsSearchingMusic(false);
    setSearchQuery("");
  };

  const toggleLinkedSongPreview = () => {
    if (!linkedSong?.previewUrl) return;
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleShazam = async () => {
    if (linkedSong) return;
    if (player) player.pause();

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
              const deezerResults = await searchDeezerTracks(searchTerm);

              if (deezerResults && deezerResults.length > 0) {
                const bestMatch = deezerResults[0];
                setLinkedSong(bestMatch);
                showToast(
                  "success",
                  t("post.alerts.found"),
                  `Es "${bestMatch.trackName}"`
                );
              } else {
                const fallbackSong: Song = {
                  trackId: String(Math.random()),
                  trackName: auddTrack.title,
                  artistName: auddTrack.artist,
                  artworkUrl100: "https://via.placeholder.com/600",
                  previewUrl: null,
                  isExplicit: false,
                };
                setLinkedSong(fallbackSong);
                showToast(
                  "success",
                  t("post.alerts.found"),
                  `Es "${fallbackSong.trackName}"`
                );
              }
            } else {
              showToast(
                "error",
                t("post.alerts.notFound"),
                t("post.alerts.tryManual")
              );
              setIsSearchingMusic(true);
            }
          }
        } catch (err) {
          console.log(err);
          showToast("error", t("post.alerts.errorTitle"), "Ocurrió un error.");
        }
      }, 5000);
    } catch (err) {
      showToast(
        "error",
        t("post.alerts.permission"),
        t("post.alerts.enableMic")
      );
    }
  };

  const handlePost = async () => {
    if (!text.trim() && !linkedSong) return;
    if (!user) return;
    if (player) player.pause();
    setIsLoading(true);
    try {
      const songDataString = linkedSong
        ? JSON.stringify({
            title: linkedSong.trackName,
            artist: linkedSong.artistName,
            cover: linkedSong.artworkUrl100,
            preview: linkedSong.previewUrl,
            spotifyId: linkedSong.trackId,
          })
        : JSON.stringify({});
      await createPost(text, songDataString, user.$id);

      // --- CAMBIO: Cierre primero, luego Toast ---
      closeModal();

      // Pequeño delay para que la animación de cierre se vea fluida antes del toast
      setTimeout(() => {
        showToast(
          "success",
          t("post.alerts.successTitle"),
          t("post.alerts.successMsg")
        );
      }, 400); // 400ms da tiempo a que el modal baje y el fondo desaparezca
    } catch (error: any) {
      showToast("error", t("post.alerts.errorTitle"), error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSongItem = ({ item }: { item: Song }) => {
    const isPlayingPreview =
      previewTrackUrl === item.previewUrl && player.playing;

    return (
      <TouchableOpacity
        className="flex-row items-center p-3 border-b"
        style={{ borderColor: isDark ? "#333" : "#eee" }}
        onPress={() => handleSelectSong(item)}
      >
        <Image
          source={{ uri: item.artworkUrl100 }}
          className="w-12 h-12 rounded mr-3 bg-zinc-800"
        />
        <View className="flex-1">
          <View className="flex-row items-center flex-wrap pr-2">
            <Text
              className="font-medium text-base mr-1"
              style={{ color: textColor }}
              numberOfLines={1}
            >
              {item.trackName}
            </Text>
            {item.isExplicit && (
              <View className="bg-zinc-600 px-1.5 rounded flex items-center justify-center h-4 ml-1">
                <Text className="text-[10px] font-bold text-white">E</Text>
              </View>
            )}
          </View>
          <Text
            className="text-sm"
            style={{ color: subTextColor }}
            numberOfLines={1}
          >
            {item.artistName}
          </Text>
        </View>
        {item.previewUrl && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handlePreviewTrack(item.previewUrl);
            }}
            className="p-2 mr-2"
          >
            <Ionicons
              name={isPlayingPreview ? "pause-circle" : "play-circle"}
              size={28}
              color={isPlayingPreview ? accentColor : subTextColor}
            />
          </TouchableOpacity>
        )}
        <Ionicons name="add-circle-outline" size={24} color={accentColor} />
      </TouchableOpacity>
    );
  };

  const renderUserItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => handleSelectUser(item.username)}
      className="flex-row items-center px-4 py-3 border-b"
      style={{ borderColor }}
    >
      <Image
        source={{ uri: item.pfp }}
        className="w-8 h-8 rounded-full mr-3 bg-zinc-800"
      />
      <View>
        <Text className="font-bold text-sm" style={{ color: textColor }}>
          {item.username}
        </Text>
        <Text className="text-xs" style={{ color: subTextColor }}>
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      {/* TOAST EXTERNO (Sobrevive al cierre del modal) */}
      <CustomToast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        translateY={toastAnim}
      />

      <Modal
        // 🔥 IMPORTANTE: Desactivamos la animación nativa para hacer la nuestra
        animationType="none"
        transparent
        visible={isPostModalVisible}
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <View className="flex-1 justify-end">
            {/* FONDO NEGRO: FADE IN/OUT (Sin movimiento) */}
            <Animated.View
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: "rgba(0,0,0,0.6)",
                opacity: backgroundOpacity, // Solo opacidad
              }}
            />

            {/* CONTENIDO DEL MODAL: SLIDE UP/DOWN (Solo movimiento) */}
            <Animated.View
              style={{
                width: "100%",
                transform: [{ translateY: contentTranslateY }], // Solo traslación Y
              }}
            >
              <TouchableWithoutFeedback>
                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : "padding"}
                  className="w-full"
                  keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                >
                  <View
                    className="w-full rounded-t-[30px] border-t p-5 pb-10 shadow-2xl"
                    style={{ backgroundColor: bgColor, borderColor }}
                  >
                    <View className="flex-row justify-between items-center mb-6 mt-2">
                      <TouchableOpacity onPress={closeModal} className="p-1">
                        <Text
                          className="text-base font-medium"
                          style={{ color: subTextColor }}
                        >
                          {t("post.cancel")}
                        </Text>
                      </TouchableOpacity>
                      {isLoading ? (
                        <ActivityIndicator color="#5E17EB" />
                      ) : (
                        <TouchableOpacity
                          onPress={handlePost}
                          disabled={!text.trim() && !linkedSong}
                          className={`px-6 py-2 rounded-full ${
                            text.trim() || linkedSong
                              ? "bg-[#5E17EB]"
                              : "bg-zinc-700"
                          }`}
                        >
                          <Text className="text-white font-bold text-base">
                            {t("post.publish")}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <View className="flex-row gap-4 mb-2">
                      <Image
                        source={
                          user?.pfp
                            ? { uri: user.pfp }
                            : require("@/assets/noPfp.jpg")
                        }
                        className="w-11 h-11 rounded-full border"
                        style={{ borderColor }}
                      />
                      <View className="flex-1">
                        <TextInput
                          placeholder={t("post.placeholder")}
                          placeholderTextColor={subTextColor}
                          multiline
                          style={{
                            color: textColor,
                            fontSize: 18,
                            minHeight: 60,
                            textAlignVertical: "top",
                          }}
                          value={text}
                          onChangeText={handleTextChange}
                        />
                      </View>
                    </View>

                    <View className="mt-2 min-h-[10px]">
                      {showSuggestions && (
                        <View
                          className="rounded-xl border overflow-hidden max-h-40 mb-4"
                          style={{ backgroundColor: inputBg, borderColor }}
                        >
                          <FlatList
                            data={suggestions}
                            keyExtractor={(item) => item.$id}
                            renderItem={renderUserItem}
                            keyboardShouldPersistTaps="handled"
                          />
                        </View>
                      )}

                      {isSearchingMusic && (
                        <View
                          className="rounded-xl p-3 border mb-4"
                          style={{ backgroundColor: inputBg, borderColor }}
                        >
                          <View
                            className="flex-row items-center rounded-lg px-3 mb-2 border"
                            style={{ backgroundColor: bgColor, borderColor }}
                          >
                            <Ionicons
                              name="search"
                              color={subTextColor}
                              size={20}
                            />
                            <TextInput
                              placeholder={t("post.searchPlaceholder")}
                              placeholderTextColor={subTextColor}
                              className="flex-1 py-3 ml-2"
                              style={{ color: textColor }}
                              value={searchQuery}
                              onChangeText={setSearchQuery}
                              autoFocus
                              autoCorrect={false}
                            />
                            {isLoadingSearch && (
                              <ActivityIndicator
                                size="small"
                                color={accentColor}
                              />
                            )}
                            <TouchableOpacity
                              onPress={() => {
                                setIsSearchingMusic(false);
                                setPreviewTrackUrl(null);
                              }}
                            >
                              <Ionicons
                                name="close"
                                size={20}
                                color={subTextColor}
                              />
                            </TouchableOpacity>
                          </View>

                          <FlatList
                            data={searchResults}
                            renderItem={renderSongItem}
                            keyExtractor={(item) => item.trackId}
                            style={{ maxHeight: 250 }}
                            keyboardShouldPersistTaps="handled"
                            ListEmptyComponent={
                              searchQuery.length > 2 && !isLoadingSearch ? (
                                <Text
                                  className="text-center py-4"
                                  style={{ color: subTextColor }}
                                >
                                  {t("post.noResults")}
                                </Text>
                              ) : null
                            }
                          />
                        </View>
                      )}

                      {linkedSong && !isSearchingMusic && (
                        <View
                          className="flex-row items-center p-3 rounded-xl border mt-2"
                          style={{ backgroundColor: inputBg, borderColor }}
                        >
                          <View className="relative mr-3">
                            <Image
                              source={{ uri: linkedSong.artworkUrl100 }}
                              className="w-14 h-14 rounded-md bg-zinc-800"
                            />
                            {linkedSong.previewUrl && (
                              <TouchableOpacity
                                onPress={toggleLinkedSongPreview}
                                className="absolute inset-0 items-center justify-center bg-black/30 rounded-md"
                              >
                                <Ionicons
                                  name={
                                    player.playing && previewTrackUrl === null
                                      ? "pause"
                                      : "play"
                                  }
                                  size={24}
                                  color="white"
                                />
                              </TouchableOpacity>
                            )}
                          </View>
                          <View className="flex-1">
                            <View className="flex-row items-center">
                              <Text
                                className="font-bold text-sm mr-1"
                                style={{ color: textColor }}
                                numberOfLines={1}
                              >
                                {linkedSong.trackName}
                              </Text>
                              {linkedSong.isExplicit && (
                                <View className="bg-zinc-600 px-1 rounded flex items-center justify-center h-4 w-4">
                                  <Text className="text-[8px] font-bold text-white">
                                    E
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text
                              className="text-xs"
                              style={{ color: subTextColor }}
                              numberOfLines={1}
                            >
                              {linkedSong.artistName}
                            </Text>
                            <Text className="text-[10px] text-[#FA243C] mt-1">
                              {t("post.via")}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => {
                              setLinkedSong(null);
                              if (player) player.pause();
                            }}
                            className="p-2"
                          >
                            <Ionicons
                              name="close-circle"
                              size={24}
                              color="#EF4444"
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    {!isSearchingMusic && !linkedSong && (
                      <View
                        className="mt-4 pt-4 border-t flex-row justify-between"
                        style={{ borderColor }}
                      >
                        <View className="flex-row items-center flex-1">
                          <TouchableOpacity
                            onPress={() => setIsSearchingMusic(true)}
                            className="flex-row items-center py-2 mr-4"
                          >
                            <View className="bg-[#FA243C]/10 p-2 rounded-full mr-3">
                              <Ionicons
                                name="musical-notes"
                                size={20}
                                color="#FA243C"
                              />
                            </View>
                            <Text
                              className="font-bold text-base"
                              style={{ color: textColor }}
                            >
                              {t("post.addMusic")}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          onPress={handleShazam}
                          disabled={recorder.isRecording}
                          className={`flex-row items-center px-4 py-2 rounded-full border ${
                            recorder.isRecording
                              ? "bg-red-500 border-red-500"
                              : "bg-transparent"
                          }`}
                          style={{
                            borderColor: recorder.isRecording
                              ? "transparent"
                              : borderColor,
                          }}
                        >
                          {recorder.isRecording ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <Ionicons
                              name="mic"
                              size={20}
                              color={isDark ? "white" : "black"}
                            />
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </KeyboardAvoidingView>
              </TouchableWithoutFeedback>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
