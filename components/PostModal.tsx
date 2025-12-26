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
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useModal } from "@/context/ModalContext";
import { useGlobalContext } from "@/context/GlobalProvider";
import { createPost } from "@/lib/appwrite";
import SongPreview from "./SongPreview";

// 1. IMPORTACIONES: Usamos expo-audio para grabar y expo-av para configurar/permisos
import { useAudioRecorder, RecordingPresets } from "expo-audio";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

interface Song {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
}

const AUDD_API_TOKEN = "TU_TOKEN_DE_AUDD_AQUI";

export default function PostModal() {
  const { isPostModalVisible, setPostModalVisible } = useModal();
  const { user } = useGlobalContext();

  const [text, setText] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [linkedSong, setLinkedSong] = useState<Song | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // 2. CONFIGURACIÓN DEL GRABADOR (TS FIX)
  // Usamos el preset completo para evitar el error de "propiedades faltantes"
  const audioRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY, // Esto rellena android, ios, extension...
    sampleRate: 44100,
  });

  const closeModal = () => {
    Keyboard.dismiss();
    if (audioRecorder.isRecording) {
      audioRecorder.stop();
    }
    setPostModalVisible(false);
  };

  const resetForm = () => {
    setText("");
    setLinkedSong(null);
    setIsPublic(true);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchingMusic(false);
    setIsListening(false);
  };

  // --- BÚSQUEDA MANUAL ---
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
          `https://itunes.apple.com/search?term=${encodeURIComponent(
            searchQuery
          )}&media=music&entity=song&limit=5`
        );
        const data = await response.json();
        setSearchResults(data.results);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingSearch(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectSong = (song: Song) => {
    setLinkedSong(song);
    setIsSearchingMusic(false);
    setSearchQuery("");
  };

  // --- LÓGICA SHAZAM (REPARADA PARA iOS Y ANDROID) ---
  const handleShazam = async () => {
    if (linkedSong) return;

    try {
      // 3. PASO CRÍTICO: Solicitud de Permisos con expo-av
      const { status } = await Audio.requestPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permiso requerido",
          "Ve a Configuración y permite el acceso al micrófono para identificar canciones.",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Abrir Configuración",
              onPress: () => Linking.openSettings(),
            },
          ]
        );
        return;
      }

      // 4. PASO CRÍTICO: Configurar Modo de Audio (Evita el crash en iOS)
      // Esto le dice al iPhone "Prepárate para grabar, no solo reproducir"
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Si llegamos aquí, todo está verde. Empezamos.
      setIsListening(true);

      // A. Iniciar Grabación (expo-audio)
      audioRecorder.record();

      // B. Esperar 5 segundos
      setTimeout(async () => {
        try {
          if (!audioRecorder.isRecording) return;

          // C. Detener Grabación
          await audioRecorder.stop();

          const uri = audioRecorder.uri;
          if (!uri) throw new Error("No se generó el archivo de audio");

          // D. Leer Archivo (Usando string literal 'base64' para evitar error de TS)
          const base64Audio = await FileSystem.readAsStringAsync(uri, {
            encoding: "base64",
          });

          // E. Enviar a AudD
          const formData = new FormData();
          formData.append("api_token", AUDD_API_TOKEN);
          formData.append("audio", base64Audio);
          formData.append("return", "apple_music,spotify");

          const response = await fetch("https://api.audd.io/", {
            method: "POST",
            body: formData,
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
              previewUrl: appleData ? appleData.previews[0].url : "",
            };

            setLinkedSong(foundSong);
            Alert.alert(
              "¡Encontrada!",
              `Es "${track.title}" de ${track.artist}`
            );
          } else {
            Alert.alert(
              "Ups",
              "No pudimos reconocer la canción. Intenta acercarte más."
            );
          }
        } catch (error) {
          console.log("Error procesando audio:", error);
          Alert.alert("Error", "Ocurrió un error al analizar.");
        } finally {
          setIsListening(false);
          // Opcional: Restaurar modo de audio a solo reproducción
          Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        }
      }, 5000);
    } catch (error) {
      console.log("Error general:", error);
      setIsListening(false);
      Alert.alert("Error", "No se pudo acceder al micrófono.");
    }
  };

  const handlePost = async () => {
    if (!linkedSong) return;
    if (!user) {
      Alert.alert("Error", "No se encontró el usuario activo.");
      return;
    }

    setIsUploading(true);

    try {
      const songDataString = JSON.stringify({
        title: linkedSong.trackName,
        artist: linkedSong.artistName,
        cover: linkedSong.artworkUrl100,
        preview: linkedSong.previewUrl,
      });

      await createPost(text, songDataString, user.$id);

      Alert.alert(
        "¡Mood Publicado!",
        `Has compartido "${linkedSong.trackName}"`
      );
      resetForm();
      closeModal();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const renderSongItem = ({ item }: { item: Song }) => (
    <TouchableOpacity
      className="flex-row items-center p-3 border-b border-white/10"
      onPress={() => handleSelectSong(item)}
    >
      <Image
        source={{ uri: item.artworkUrl100 }}
        className="w-12 h-12 rounded mr-3 bg-zinc-800"
      />
      <View className="flex-1">
        <Text className="text-white font-medium text-base">
          {item.trackName}
        </Text>
        <Text className="text-zinc-400 text-sm">{item.artistName}</Text>
      </View>
      <Ionicons name="add-circle-outline" size={24} color="#52525B" />
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
        <View className="flex-1 bg-black/80 justify-end">
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              className="w-full"
            >
              {/* BOTÓN SHAZAM FLOTANTE */}
              {!isSearchingMusic && !linkedSong && (
                <View className="items-center -mb-6 z-10">
                  <TouchableOpacity
                    onPress={handleShazam}
                    disabled={isListening}
                    activeOpacity={0.8}
                    className={`flex-row items-center px-5 py-3 rounded-full shadow-lg shadow-[#5E17EB]/40 border-2 border-[#121212] ${
                      isListening ? "bg-red-500" : "bg-[#5E17EB]"
                    }`}
                  >
                    {isListening ? (
                      <>
                        <ActivityIndicator
                          color="white"
                          size="small"
                          className="mr-2"
                        />
                        <Text className="text-white font-bold text-sm">
                          Escuchando...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons
                          name="mic"
                          size={20}
                          color="white"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-white font-bold text-sm">
                          ¿Qué canción es?
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <View className="bg-[#121212] w-full rounded-t-[30px] border-t border-white/10 p-5 pb-8 shadow-2xl shadow-[#5E17EB]/10">
                <View className="flex-row justify-between items-center mb-6 mt-2">
                  <TouchableOpacity onPress={closeModal} className="p-1">
                    <Text className="text-zinc-400 text-base font-medium">
                      Cancelar
                    </Text>
                  </TouchableOpacity>

                  {isUploading ? (
                    <ActivityIndicator color="#5E17EB" />
                  ) : (
                    <TouchableOpacity
                      onPress={handlePost}
                      disabled={!linkedSong}
                      className={`px-6 py-2 rounded-full ${
                        linkedSong ? "bg-[#5E17EB]" : "bg-zinc-800/50"
                      }`}
                    >
                      <Text
                        className={`font-bold text-base ${
                          linkedSong ? "text-white" : "text-zinc-500"
                        }`}
                      >
                        Publicar
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View className="flex-row gap-4">
                  <Image
                    source={
                      user?.pfp
                        ? { uri: user.pfp }
                        : require("@/assets/noPfp.jpg")
                    }
                    className="w-11 h-11 rounded-full border border-zinc-800"
                  />

                  <View className="flex-1">
                    <TextInput
                      placeholder="¿Qué vibra musical traes?"
                      placeholderTextColor="#52525B"
                      multiline
                      style={{
                        color: "white",
                        fontSize: 18,
                        minHeight: 50,
                        textAlignVertical: "top",
                      }}
                      value={text}
                      onChangeText={setText}
                    />

                    <View className="mt-4 gap-3">
                      {isSearchingMusic && (
                        <View className="bg-zinc-900 rounded-xl p-3 mb-2 border border-white/10 shadow-lg">
                          <View className="flex-row items-center bg-black/50 rounded-lg px-3 mb-2 border border-[#5E17EB]/30">
                            <Ionicons name="search" color="#A1A1AA" size={20} />
                            <TextInput
                              placeholder="Buscar artista o canción..."
                              placeholderTextColor="#71717A"
                              className="flex-1 text-white py-3 ml-2 text-base font-medium"
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
                            style={{ maxHeight: 250 }}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                          />
                        </View>
                      )}

                      {linkedSong && (
                        <SongPreview
                          song={linkedSong}
                          onRemove={() => setLinkedSong(null)}
                        />
                      )}
                    </View>
                  </View>
                </View>

                <View className="mt-6 pt-2 border-t border-white/5">
                  {!linkedSong && !isSearchingMusic && (
                    <TouchableOpacity
                      onPress={() => setIsSearchingMusic(true)}
                      className="flex-row items-center justify-center bg-zinc-800/80 w-full py-4 rounded-xl border border-white/10 active:bg-zinc-700"
                    >
                      <View className="bg-[#5E17EB] p-2 rounded-full mr-3">
                        <Ionicons
                          name="musical-notes"
                          size={20}
                          color="white"
                        />
                      </View>
                      <Text className="text-white font-bold text-lg">
                        Elegir Canción Manualmente
                      </Text>
                    </TouchableOpacity>
                  )}

                  {(linkedSong || isSearchingMusic) && (
                    <View className="flex-row justify-end">
                      <TouchableOpacity
                        onPress={() => setIsPublic(!isPublic)}
                        className="flex-row items-center bg-zinc-900/80 px-3 py-2 rounded-full border border-white/10"
                      >
                        <Text className="text-zinc-400 text-xs font-medium mr-2">
                          {isPublic ? "Público" : "Privado"}
                        </Text>
                        <Ionicons
                          name={isPublic ? "earth" : "lock-closed"}
                          size={14}
                          color="#A1A1AA"
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
