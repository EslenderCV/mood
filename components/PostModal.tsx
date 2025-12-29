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
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useModal } from "@/context/ModalContext";
import { useGlobalContext } from "@/context/GlobalProvider";
import { createPost, searchUsers, sendTagNotification } from "@/lib/appwrite";
import { useColorScheme } from "nativewind";

// --- AUDIO ---
import { Audio } from "expo-av";

interface Song {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
}

// ⚠️ REEMPLAZA CON TU TOKEN REAL DE AUDD
const AUDD_API_TOKEN = "TU_TOKEN_DE_AUDD_AQUI";

export default function PostModal() {
  const { isPostModalVisible, setPostModalVisible } = useModal();
  const { user } = useGlobalContext();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // --- COLORES ---
  const bgColor = isDark ? "#121212" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const inputBg = isDark ? "#18181B" : "#F4F4F5";

  // --- ESTADOS ---
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Estados Música
  const [linkedSong, setLinkedSong] = useState<Song | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);

  // Estados Audio (Shazam)
  const [isListening, setIsListening] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Estados Reproducción (Preview)
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Estados Etiquetas
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Limpiar al cerrar
  useEffect(() => {
    if (!isPostModalVisible) {
      // Intentamos limpiar todo
      resetForm();
      if (recordingRef.current) stopRecording();
      // Forzar limpieza de audio sin estado
      stopPreview();
    }
  }, [isPostModalVisible]);

  // Limpiar sonido al desmontar el componente
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => {}); // Ignorar errores al desmontar
      }
    };
  }, [sound]);

  const closeModal = () => {
    Keyboard.dismiss();
    setPostModalVisible(false);
  };

  const resetForm = () => {
    setText("");
    setLinkedSong(null);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchingMusic(false);
    setIsListening(false);
    setShowSuggestions(false);
    // No llamamos a stopPreview aquí para evitar bucles, se maneja en el useEffect o al cambiar canción
  };

  // --- 0. LÓGICA PREVIEW (CORREGIDA Y BLINDADA) ---
  const stopPreview = async () => {
    if (sound) {
      try {
        // Intentamos detener y descargar. Si falla (porque no está cargado), no pasa nada.
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          await sound.stopAsync();
          await sound.unloadAsync();
        }
      } catch (error) {
        console.log(
          "Aviso: El sonido ya estaba descargado o hubo error al detener:",
          error
        );
      }
      setSound(null);
    }
    setIsPlayingPreview(false);
  };

  const togglePreview = async () => {
    if (!linkedSong?.previewUrl) {
      Alert.alert("Sin audio", "Esta canción no tiene preview disponible.");
      return;
    }

    try {
      if (sound) {
        if (isPlayingPreview) {
          await sound.pauseAsync();
          setIsPlayingPreview(false);
        } else {
          await sound.playAsync();
          setIsPlayingPreview(true);
        }
      } else {
        setIsLoadingPreview(true);

        // Configurar audio para reproducción
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: linkedSong.previewUrl },
          { shouldPlay: true }
        );

        setSound(newSound);
        setIsPlayingPreview(true);

        newSound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            setIsPlayingPreview(false);
            // No descargamos aquí para permitir replay, solo reseteamos posición
            newSound.setPositionAsync(0).catch(() => {});
          }
        });
      }
    } catch (error) {
      console.log("Error playing preview:", error);
      Alert.alert("Error", "No se pudo reproducir el audio.");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // --- 1. LÓGICA DE AUDIO (SHAZAM) ---
  const stopRecording = async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
      setIsListening(false);
    } catch (error) {
      console.log("Error deteniendo:", error);
    }
  };

  const handleShazam = async () => {
    if (linkedSong) return;
    await stopPreview(); // Aseguramos silencio antes de grabar

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Permiso requerido",
          "Activa el micrófono en configuración para escuchar."
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      setIsListening(true);

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;

      setTimeout(async () => {
        try {
          if (!recordingRef.current) return;

          await recordingRef.current.stopAndUnloadAsync();
          const uri = recordingRef.current.getURI();
          recordingRef.current = null;

          if (!uri) throw new Error("No audio uri");

          const formData = new FormData();
          formData.append("api_token", AUDD_API_TOKEN);
          formData.append("return", "apple_music,spotify");
          formData.append("file", {
            uri: uri,
            name: "recording.m4a",
            type: "audio/m4a",
          } as any);

          const response = await fetch("https://api.audd.io/", {
            method: "POST",
            body: formData,
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });

          const result = await response.json();

          if (result.status === "success" && result.result) {
            const track = result.result;
            const appleData = track.apple_music ? track.apple_music : null;

            const foundSong: Song = {
              trackId: appleData
                ? appleData.playParams.id
                : Math.floor(Math.random() * 100000),
              trackName: track.title,
              artistName: track.artist,
              artworkUrl100: appleData
                ? appleData.artwork.url
                    .replace("{w}", "300")
                    .replace("{h}", "300")
                : "https://via.placeholder.com/300",
              previewUrl: appleData
                ? appleData.previews[0].url
                : track.preview_url || "",
            };

            setLinkedSong(foundSong);
            Alert.alert(
              "¡Encontrada!",
              `Es "${track.title}" de ${track.artist}`
            );
          } else {
            Alert.alert("No encontrada", "No pudimos reconocer la canción.");
            setIsSearchingMusic(true);
          }
        } catch (err) {
          console.log("Error procesando audio:", err);
          Alert.alert("Error", "Falló el reconocimiento.");
        } finally {
          setIsListening(false);
          Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        }
      }, 5500);
    } catch (err) {
      console.log("Error iniciando grabación:", err);
      setIsListening(false);
    }
  };

  // --- 2. LÓGICA ETIQUETAS (@) ---
  const handleTextChange = async (inputText: string) => {
    setText(inputText);
    const words = inputText.split(" ");
    const lastWord = words[words.length - 1];

    if (lastWord && lastWord.startsWith("@") && lastWord.length > 1) {
      const query = lastWord.substring(1);
      try {
        const results = await searchUsers(query);
        const filtered = results.filter((u) => u.$id !== user?.$id);
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      } catch (error) {
        console.log(error);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectUser = (username: string) => {
    const words = text.split(" ");
    words.pop();
    const newText = `${words.join(" ")} @${username} `;
    setText(newText);
    setShowSuggestions(false);
  };

  const processMentions = async (content: string, postId: string) => {
    if (!user) return;
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex);
    if (!matches) return;
    const uniqueMentions = [...new Set(matches)];

    uniqueMentions.forEach(async (mention) => {
      const username = mention.substring(1);
      const users = await searchUsers(username);
      const targetUser = users.find((u) => u.username === username);
      if (targetUser) {
        await sendTagNotification(user.$id, targetUser.$id, postId);
      }
    });
  };

  // --- 3. BÚSQUEDA MANUAL (DEEZER) ---
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setIsLoadingSearch(false);
      return;
    }
    setIsLoadingSearch(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.deezer.com/search?q=${encodeURIComponent(
            searchQuery
          )}&limit=10`
        );
        const data = await response.json();

        const mappedResults: Song[] = data.data.map((item: any) => ({
          trackId: item.id,
          trackName: item.title,
          artistName: item.artist.name,
          artworkUrl100: item.album.cover_medium,
          previewUrl: item.preview,
        }));

        setSearchResults(mappedResults);
      } catch (error) {
        console.error("Error Deezer Search:", error);
      } finally {
        setIsLoadingSearch(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectSong = async (song: Song) => {
    await stopPreview(); // Detener cualquier cosa que suene antes
    setLinkedSong(song);
    setIsSearchingMusic(false);
    setSearchQuery("");
  };

  // --- 4. PUBLICAR ---
  const handlePost = async () => {
    if (!text.trim() && !linkedSong) {
      Alert.alert("Vacío", "Escribe algo o agrega una canción.");
      return;
    }
    if (!user) return;

    // Detener preview de forma segura antes de subir
    await stopPreview();

    setIsLoading(true);
    try {
      const songDataString = linkedSong
        ? JSON.stringify({
            title: linkedSong.trackName,
            artist: linkedSong.artistName,
            cover: linkedSong.artworkUrl100,
            preview: linkedSong.previewUrl,
          })
        : JSON.stringify({});

      const newPost = await createPost(text, songDataString, user.$id);
      await processMentions(text, newPost.$id);

      Alert.alert("¡Éxito!", "Mood publicado.");
      closeModal(); // Esto llamará al useEffect de limpieza
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDER ITEMS ---
  const renderSongItem = ({ item }: { item: Song }) => (
    <TouchableOpacity
      className="flex-row items-center p-3 border-b"
      style={{ borderColor: borderColor }}
      onPress={() => handleSelectSong(item)}
    >
      <Image
        source={{ uri: item.artworkUrl100 }}
        className="w-12 h-12 rounded mr-3 bg-zinc-800"
      />
      <View className="flex-1">
        <Text className="font-medium text-base" style={{ color: textColor }}>
          {item.trackName}
        </Text>
        <Text className="text-sm" style={{ color: subTextColor }}>
          {item.artistName}
        </Text>
      </View>
      <Ionicons name="add-circle-outline" size={24} color="#5E17EB" />
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => handleSelectUser(item.username)}
      className="flex-row items-center px-4 py-3 border-b"
      style={{ borderColor: borderColor }}
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
    <Modal
      animationType="slide"
      transparent={true}
      visible={isPostModalVisible}
      onRequestClose={closeModal}
    >
      <TouchableWithoutFeedback onPress={closeModal}>
        <View className="flex-1 justify-end bg-black/60">
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              className="w-full"
            >
              <View
                className="w-full rounded-t-[30px] border-t p-5 pb-10 shadow-2xl"
                style={{ backgroundColor: bgColor, borderColor: borderColor }}
              >
                {/* HEADER */}
                <View className="flex-row justify-between items-center mb-6 mt-2">
                  <TouchableOpacity onPress={closeModal} className="p-1">
                    <Text
                      className="text-base font-medium"
                      style={{ color: subTextColor }}
                    >
                      Cancelar
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
                        Publicar
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* CONTENIDO (INPUT + AVATAR) */}
                <View className="flex-row gap-4 mb-2">
                  <Image
                    source={
                      user?.pfp
                        ? { uri: user.pfp }
                        : require("@/assets/noPfp.jpg")
                    }
                    className="w-11 h-11 rounded-full border"
                    style={{ borderColor: borderColor }}
                  />
                  <View className="flex-1">
                    <TextInput
                      placeholder="¿Qué vibra musical traes?"
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

                {/* ZONA DINÁMICA: Sugerencias, Buscador o Preview */}
                <View className="mt-2 min-h-[10px]">
                  {/* A. SUGERENCIAS @ */}
                  {showSuggestions && (
                    <View
                      className="rounded-xl border overflow-hidden max-h-40 mb-4"
                      style={{
                        backgroundColor: inputBg,
                        borderColor: borderColor,
                      }}
                    >
                      <FlatList
                        data={suggestions}
                        keyExtractor={(item) => item.$id}
                        renderItem={renderUserItem}
                        keyboardShouldPersistTaps="handled"
                      />
                    </View>
                  )}

                  {/* B. BUSCADOR MANUAL */}
                  {!showSuggestions && isSearchingMusic && (
                    <View
                      className="rounded-xl p-3 border shadow-sm mb-4"
                      style={{
                        backgroundColor: inputBg,
                        borderColor: borderColor,
                      }}
                    >
                      <View
                        className="flex-row items-center rounded-lg px-3 mb-2 border"
                        style={{
                          backgroundColor: bgColor,
                          borderColor: borderColor,
                        }}
                      >
                        <Ionicons
                          name="search"
                          color={subTextColor}
                          size={20}
                        />
                        <TextInput
                          placeholder="Buscar canción..."
                          placeholderTextColor={subTextColor}
                          className="flex-1 py-3 ml-2 text-base font-medium"
                          style={{ color: textColor }}
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                          autoFocus
                        />
                        {isLoadingSearch && (
                          <ActivityIndicator size="small" color="#5E17EB" />
                        )}
                        <TouchableOpacity
                          onPress={() => setIsSearchingMusic(false)}
                        >
                          <Ionicons
                            name="close"
                            color={subTextColor}
                            size={20}
                          />
                        </TouchableOpacity>
                      </View>
                      <FlatList
                        data={searchResults}
                        renderItem={renderSongItem}
                        keyExtractor={(item) => item.trackId.toString()}
                        style={{ maxHeight: 200 }}
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                      />
                    </View>
                  )}

                  {/* C. PREVIEW CANCIÓN SELECCIONADA CON PLAYER */}
                  {!showSuggestions && !isSearchingMusic && linkedSong && (
                    <View
                      className="flex-row items-center p-3 rounded-xl border mt-2"
                      style={{
                        backgroundColor: inputBg,
                        borderColor: borderColor,
                      }}
                    >
                      {/* FOTO + PLAY BUTTON */}
                      <View className="relative mr-3">
                        <Image
                          source={{ uri: linkedSong.artworkUrl100 }}
                          className="w-14 h-14 rounded-md bg-zinc-800 opacity-90"
                        />
                        <TouchableOpacity
                          onPress={togglePreview}
                          className="absolute inset-0 items-center justify-center bg-black/20 rounded-md"
                        >
                          {isLoadingPreview ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <Ionicons
                              name={isPlayingPreview ? "pause" : "play"}
                              size={24}
                              color="white"
                            />
                          )}
                        </TouchableOpacity>
                      </View>

                      <View className="flex-1">
                        <Text
                          className="font-bold text-sm"
                          style={{ color: textColor }}
                          numberOfLines={1}
                        >
                          {linkedSong.trackName}
                        </Text>
                        <Text
                          className="text-xs"
                          style={{ color: subTextColor }}
                          numberOfLines={1}
                        >
                          {linkedSong.artistName}
                        </Text>
                      </View>

                      {/* BOTÓN QUITAR CANCIÓN */}
                      <TouchableOpacity
                        onPress={async () => {
                          await stopPreview();
                          setLinkedSong(null);
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

                {/* BOTONES INFERIORES: SHAZAM Y MANUAL */}
                {!showSuggestions && !isSearchingMusic && !linkedSong && (
                  <View
                    className="mt-4 pt-4 border-t flex-row justify-between"
                    style={{ borderColor: borderColor }}
                  >
                    {/* Botón 1: Buscar Manualmente */}
                    <TouchableOpacity
                      onPress={() => setIsSearchingMusic(true)}
                      className="flex-row items-center py-2 flex-1"
                    >
                      <View className="bg-[#5E17EB]/10 p-2 rounded-full mr-3">
                        <Ionicons name="search" size={20} color="#5E17EB" />
                      </View>
                      <Text
                        className="font-bold text-base"
                        style={{ color: textColor }}
                      >
                        Agregar Música
                      </Text>
                    </TouchableOpacity>

                    {/* Botón 2: Shazam (Micrófono) */}
                    <TouchableOpacity
                      onPress={handleShazam}
                      disabled={isListening}
                      className={`flex-row items-center px-4 py-2 rounded-full border ${
                        isListening
                          ? "bg-red-500 border-red-500"
                          : "bg-transparent"
                      }`}
                      style={{
                        borderColor: isListening ? "transparent" : borderColor,
                      }}
                    >
                      {isListening ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Ionicons
                          name="mic"
                          size={20}
                          color={isDark ? "white" : "black"}
                        />
                      )}
                      <Text
                        className="font-bold ml-2 text-sm"
                        style={{ color: isListening ? "white" : textColor }}
                      >
                        {isListening ? "Escuchando..." : "¿Qué es?"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
