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
import { createPost, searchUsers, sendTagNotification } from "@/lib/appwrite";
import { useColorScheme } from "nativewind";

// Interfaz para canciones de iTunes
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
  const [isPublic, setIsPublic] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Estados Música
  const [linkedSong, setLinkedSong] = useState<Song | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);

  // Estados Etiquetas
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Limpiar al cerrar
  useEffect(() => {
    if (!isPostModalVisible) {
      resetForm();
    }
  }, [isPostModalVisible]);

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
    setShowSuggestions(false);
  };

  // --- 1. LÓGICA DE ETIQUETAS (@) ---
  const handleTextChange = async (inputText: string) => {
    setText(inputText);

    const words = inputText.split(" ");
    const lastWord = words[words.length - 1];

    if (lastWord && lastWord.startsWith("@") && lastWord.length > 1) {
      const query = lastWord.substring(1);
      try {
        const results = await searchUsers(query);
        // Filtrar usuarios: que permitan etiquetas y no sea yo mismo
        const filtered = results.filter((u) => u.$id !== user?.$id); // Añadir filtro allowTags en backend si no se hizo

        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      } catch (error) {
        console.log("Error buscando usuarios:", error);
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

  // --- 2. LÓGICA DE BÚSQUEDA DE MÚSICA (iTunes) ---
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

  // --- 3. PUBLICAR ---
  const handlePost = async () => {
    if (!text.trim() && !linkedSong) {
      Alert.alert("Vacío", "Escribe algo o agrega una canción.");
      return;
    }
    if (!user) return;

    setIsLoading(true);

    try {
      // Preparamos datos de la canción si existe
      const songDataString = linkedSong
        ? JSON.stringify({
            title: linkedSong.trackName,
            artist: linkedSong.artistName,
            cover: linkedSong.artworkUrl100,
            preview: linkedSong.previewUrl,
          })
        : JSON.stringify({}); // JSON vacío si no hay canción

      // Crear Post
      const newPost = await createPost(text, songDataString, user.$id);

      // Enviar notificaciones de etiquetas
      await processMentions(text, newPost.$id);

      Alert.alert("¡Éxito!", "Tu Mood ha sido publicado.");
      resetForm();
      closeModal();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDERIZADO DE ITEMS ---
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
                className="w-full rounded-t-[30px] border-t p-5 pb-8 shadow-2xl"
                style={{ backgroundColor: bgColor, borderColor: borderColor }}
              >
                {/* HEADER MODAL */}
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

                {/* CONTENIDO PRINCIPAL */}
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
                        minHeight: 50,
                        textAlignVertical: "top",
                      }}
                      value={text}
                      onChangeText={handleTextChange}
                    />
                  </View>
                </View>

                {/* AREA DINÁMICA (Sugerencias Usuarios O Búsqueda Música O Preview) */}
                <View className="mt-2 min-h-[50px]">
                  {/* A. LISTA DE USUARIOS (ETIQUETAS) */}
                  {showSuggestions && (
                    <View
                      className="rounded-xl border overflow-hidden max-h-40"
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

                  {/* B. BUSCADOR DE MÚSICA */}
                  {!showSuggestions && isSearchingMusic && (
                    <View
                      className="rounded-xl p-3 border shadow-sm"
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

                  {/* C. PREVIEW DE CANCIÓN SELECCIONADA */}
                  {!showSuggestions && !isSearchingMusic && linkedSong && (
                    <View
                      className="flex-row items-center p-3 rounded-xl border mt-2"
                      style={{
                        backgroundColor: inputBg,
                        borderColor: borderColor,
                      }}
                    >
                      <Image
                        source={{ uri: linkedSong.artworkUrl100 }}
                        className="w-12 h-12 rounded-md bg-zinc-800 mr-3"
                      />
                      <View className="flex-1">
                        <Text
                          className="font-bold text-sm"
                          style={{ color: textColor }}
                        >
                          {linkedSong.trackName}
                        </Text>
                        <Text
                          className="text-xs"
                          style={{ color: subTextColor }}
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

                {/* BOTONES INFERIORES */}
                {!showSuggestions && !isSearchingMusic && !linkedSong && (
                  <View
                    className="mt-4 pt-4 border-t"
                    style={{ borderColor: borderColor }}
                  >
                    <TouchableOpacity
                      onPress={() => setIsSearchingMusic(true)}
                      className="flex-row items-center py-3"
                    >
                      <View className="bg-[#5E17EB]/10 p-2 rounded-full mr-3">
                        <Ionicons
                          name="musical-notes"
                          size={20}
                          color="#5E17EB"
                        />
                      </View>
                      <Text
                        className="font-bold text-base"
                        style={{ color: textColor }}
                      >
                        Agregar Música
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* OPCIÓN PRIVACIDAD */}
                <View className="mt-4 flex-row justify-end">
                  <TouchableOpacity
                    onPress={() => setIsPublic(!isPublic)}
                    className="flex-row items-center px-3 py-1.5 rounded-full border"
                    style={{
                      backgroundColor: inputBg,
                      borderColor: borderColor,
                    }}
                  >
                    <Text
                      className="text-xs font-medium mr-2"
                      style={{ color: subTextColor }}
                    >
                      {isPublic ? "Público" : "Privado"}
                    </Text>
                    <Ionicons
                      name={isPublic ? "earth" : "lock-closed"}
                      size={12}
                      color={subTextColor}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
