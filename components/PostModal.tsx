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
import { createPost } from "@/lib/appwrite";
import SongPreview from "./SongPreview";
interface Song {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
}

export default function PostModal() {
  const { isPostModalVisible, setPostModalVisible } = useModal();
  const { user } = useGlobalContext();

  const [text, setText] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  // Estados de Música y Búsqueda
  const [linkedSong, setLinkedSong] = useState<Song | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const closeModal = () => {
    Keyboard.dismiss();
    setPostModalVisible(false);
  };

  const resetForm = () => {
    setText("");
    setLinkedSong(null);
    setIsPublic(true);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchingMusic(false);
  };

  // --- BÚSQUEDA (DEBOUNCE) ---
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

  // --- SUBIR A APPWRITE ---
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

      // Usamos la función centralizada
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

  // Render item de búsqueda
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
              <View className="bg-[#121212] w-full rounded-t-[30px] border-t border-white/10 p-5 pb-8 shadow-2xl shadow-[#5E17EB]/10">
                {/* Header */}
                <View className="flex-row justify-between items-center mb-6">
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

                    {/* Zona Dinámica: Buscador o Reproductor */}
                    <View className="mt-4 gap-3">
                      {/* BUSCADOR */}
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

                      {/* CANCIÓN SELECCIONADA (Usando el nuevo componente SongPreview) */}
                      {linkedSong && (
                        <SongPreview
                          song={linkedSong}
                          onRemove={() => setLinkedSong(null)}
                        />
                      )}
                    </View>
                  </View>
                </View>

                {/* Toolbar Inferior */}
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
                        Elegir Canción
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
