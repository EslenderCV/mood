import React, { useState, useEffect } from "react";
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
import { createPost, searchUsers } from "@/lib/appwrite";
import { useColorScheme } from "nativewind";
import { useAudioPlayer, useAudioRecorder } from "expo-audio";

interface Song {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
}

const AUDD_API_TOKEN = "a3c6cdb39b3b57fe634900cdc67077c7";

export default function PostModal() {
  const { isPostModalVisible, setPostModalVisible } = useModal();
  const { user } = useGlobalContext();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const bgColor = isDark ? "#121212" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const inputBg = isDark ? "#18181B" : "#F4F4F5";

  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [linkedSong, setLinkedSong] = useState<Song | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const recorder = useAudioRecorder({
    extension: ".m4a",
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    android: {
      extension: ".m4a",
      outputFormat: "mpeg4",
      audioEncoder: "aac",
    },
    ios: {
      extension: ".m4a",
      outputFormat: "mpeg4aac",
      audioQuality: 127,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: "audio/mp4",
      bitsPerSecond: 128000,
    },
  });

  const player = useAudioPlayer(linkedSong?.previewUrl || "");

  useEffect(() => {
    if (!isPostModalVisible) {
      resetForm();
      if (recorder.isRecording) recorder.stop();
      player.pause();
    }
  }, [isPostModalVisible]);

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
    setShowSuggestions(false);
  };

  const togglePreview = () => {
    if (!linkedSong?.previewUrl) {
      Alert.alert("Sin audio", "Esta canción no tiene preview.");
      return;
    }
    player.playing ? player.pause() : player.play();
  };

  const handleShazam = async () => {
    if (linkedSong) return;

    player.pause();

    try {
      await recorder.record();

      setTimeout(async () => {
        try {
          if (recorder.isRecording) {
            await recorder.stop();
            const uri = recorder.uri;

            if (!uri) throw new Error("No se generó el archivo de audio");

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
              headers: { "Content-Type": "multipart/form-data" },
            });

            const result = await response.json();

            if (result.status === "success" && result.result) {
              const track = result.result;

              let finalPreview = "";
              let finalArtwork = "";

              if (
                track.apple_music &&
                track.apple_music.previews &&
                track.apple_music.previews.length > 0
              ) {
                finalPreview = track.apple_music.previews[0].url;
                finalArtwork = track.apple_music.artwork.url
                  .replace("{w}", "300")
                  .replace("{h}", "300");
              } else if (track.spotify && track.spotify.preview_url) {
                finalPreview = track.spotify.preview_url;
                finalArtwork = track.spotify.album.images[0].url;
              } else {
                finalPreview = track.preview_url;
                finalArtwork = "https://via.placeholder.com/300";
              }

              const foundSong: Song = {
                trackId: Math.floor(Math.random() * 100000),
                trackName: track.title,
                artistName: track.artist,
                artworkUrl100: finalArtwork,
                previewUrl: finalPreview,
              };

              setLinkedSong(foundSong);
              Alert.alert(
                "¡Encontrada!",
                `Es "${track.title}" de ${track.artist}`
              );
            } else {
              Alert.alert(
                "No encontrada",
                "Intenta acercarte más a la música."
              );
              setIsSearchingMusic(true);
            }
          }
        } catch (err) {
          console.log("Error procesando audio:", err);
          Alert.alert("Error", "Ocurrió un error al procesar el audio.");
        }
      }, 5500);
    } catch (err) {
      console.log("Error iniciando grabación:", err);
      Alert.alert(
        "Permiso requerido",
        "Por favor activa el micrófono en la configuración."
      );
    }
  };

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
    setText(`${words.join(" ")} @${username} `);
    setShowSuggestions(false);
  };

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
        console.error(error);
      } finally {
        setIsLoadingSearch(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectSong = (song: Song) => {
    player.pause();
    setLinkedSong(song);
    setIsSearchingMusic(false);
    setSearchQuery("");
  };

  const handlePost = async () => {
    if (!text.trim() && !linkedSong) return;
    if (!user) return;

    player.pause();
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

      await createPost(text, songDataString, user.$id);
      Alert.alert("¡Éxito!", "Mood publicado.");
      closeModal();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

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
                <View className="mt-2 min-h-[10px]">
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

                  {isSearchingMusic && (
                    <View
                      className="rounded-xl p-3 border mb-4"
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
                          className="flex-1 py-3 ml-2"
                          style={{ color: textColor }}
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                          autoFocus
                        />
                        {isLoadingSearch && (
                          <ActivityIndicator size="small" color="#5E17EB" />
                        )}
                      </View>
                      <FlatList
                        data={searchResults}
                        renderItem={renderSongItem}
                        keyExtractor={(item) => item.trackId.toString()}
                        style={{ maxHeight: 200 }}
                        keyboardShouldPersistTaps="handled"
                      />
                    </View>
                  )}

                  {linkedSong && !isSearchingMusic && (
                    <View
                      className="flex-row items-center p-3 rounded-xl border mt-2"
                      style={{
                        backgroundColor: inputBg,
                        borderColor: borderColor,
                      }}
                    >
                      <View className="relative mr-3">
                        <Image
                          source={{ uri: linkedSong.artworkUrl100 }}
                          className="w-14 h-14 rounded-md bg-zinc-800"
                        />
                        <TouchableOpacity
                          onPress={togglePreview}
                          className="absolute inset-0 items-center justify-center bg-black/20 rounded-md"
                        >
                          <Ionicons
                            name={player.playing ? "pause" : "play"}
                            size={24}
                            color="white"
                          />
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
                      <TouchableOpacity
                        onPress={() => setLinkedSong(null)}
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
                    style={{ borderColor: borderColor }}
                  >
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
                      <Text
                        className="font-bold ml-2 text-sm"
                        style={{
                          color: recorder.isRecording ? "white" : textColor,
                        }}
                      >
                        {recorder.isRecording ? "Escuchando..." : "¿Qué es?"}
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
