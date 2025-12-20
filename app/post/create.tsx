import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useGlobalContext } from "@/context/GlobalProvider"; // Asumo que tienes esto para la foto del usuario

export default function CreatePostScreen() {
  const router = useRouter();
  const { user } = useGlobalContext(); // Para mostrar tu avatar al lado del input
  const [caption, setCaption] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Estado simulado de una canción seleccionada (esto vendría de tu buscador de Spotify/Apple)
  const [selectedSong, setSelectedSong] = useState<any | null>(null);

  // Función para abrir la galería
  const pickImage = async () => {
    // Solución al warning que tenías antes: usaremos el array ['images']
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // Simulación de abrir el buscador de canciones (Integración futura)
  const openMusicSearch = () => {
    // Aquí abriríamos un Modal para buscar en Spotify/Apple Music
    // Por ahora, simulamos que el usuario eligió una canción
    if (selectedSong) {
      setSelectedSong(null); // Quitar canción
    } else {
      setSelectedSong({
        title: "MY EYES",
        artist: "Travis Scott",
        cover:
          "https://i.scdn.co/image/ab67616d0000b273881d8d8378cd01099babcd44",
        source: "spotify", // o apple_music
      });
    }
  };

  const handlePost = () => {
    // Aquí iría la lógica para enviar al Backend
    console.log({ caption, selectedSong, selectedImage });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* --- HEADER --- */}
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-white/10">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-white text-base">Cancelar</Text>
        </TouchableOpacity>

        <Text className="text-white font-bold text-lg">Nuevo Mood</Text>

        <TouchableOpacity
          onPress={handlePost}
          disabled={!caption && !selectedSong && !selectedImage}
          className={`px-4 py-1.5 rounded-full ${
            caption || selectedSong || selectedImage
              ? "bg-[#5E17EB]"
              : "bg-zinc-800"
          }`}
        >
          <Text
            className={`${
              caption || selectedSong || selectedImage
                ? "text-white font-bold"
                : "text-zinc-500"
            }`}
          >
            Publicar
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-4 pt-6">
          <View className="flex-row">
            {/* Avatar del Usuario */}
            <Image
              source={
                user?.pfp ? { uri: user.pfp } : require("@/assets/noPfp.jpg")
              }
              className="w-10 h-10 rounded-full mr-3 bg-zinc-800"
            />

            <View className="flex-1">
              {/* Input de Texto */}
              <TextInput
                placeholder="¿Qué estás escuchando?..."
                placeholderTextColor="#71717A"
                multiline
                autoFocus
                value={caption}
                onChangeText={setCaption}
                style={{ fontSize: 18, color: "white", minHeight: 40 }}
                textAlignVertical="top"
              />

              {/* --- VISTA PREVIA DE CANCIÓN (The Mood Card) --- */}
              {selectedSong && (
                <View className="mt-4 bg-zinc-900 rounded-xl p-3 flex-row items-center border border-white/10 relative overflow-hidden">
                  {/* Decoración de fondo (Brillo morado) */}
                  <View className="absolute right-0 top-0 w-20 h-20 bg-[#5E17EB]/20 blur-xl rounded-full" />

                  <Image
                    source={{ uri: selectedSong.cover }}
                    className="w-12 h-12 rounded-md bg-zinc-800"
                  />
                  <View className="ml-3 flex-1">
                    <Text className="text-white font-bold text-base">
                      {selectedSong.title}
                    </Text>
                    <Text className="text-zinc-400 text-xs">
                      {selectedSong.artist}
                    </Text>
                  </View>

                  {/* Icono de la fuente (Spotify/Apple) */}
                  <View className="bg-black/40 p-1.5 rounded-full">
                    <Ionicons name="musical-notes" size={16} color="#1DB954" />
                    {/* Nota: Podrías poner el logo de Spotify real aquí */}
                  </View>

                  {/* Botón para quitar */}
                  <TouchableOpacity
                    onPress={() => setSelectedSong(null)}
                    className="absolute -top-1 -right-1 bg-zinc-800 rounded-full p-1"
                  >
                    <Ionicons name="close" size={12} color="white" />
                  </TouchableOpacity>
                </View>
              )}

              {/* --- VISTA PREVIA DE IMAGEN --- */}
              {selectedImage && (
                <View className="mt-4 relative">
                  <Image
                    source={{ uri: selectedImage }}
                    className="w-full h-64 rounded-xl bg-zinc-900"
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => setSelectedImage(null)}
                    className="absolute top-2 right-2 bg-black/60 p-2 rounded-full"
                  >
                    <Ionicons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* --- TOOLBAR INFERIOR --- */}
        <View className="px-4 py-4 border-t border-white/5 flex-row items-center gap-6">
          {/* Botón MÚSICA (El más importante) */}
          <TouchableOpacity onPress={openMusicSearch}>
            <View
              className={`p-2 rounded-full ${
                selectedSong ? "bg-[#5E17EB]/20" : ""
              }`}
            >
              <Ionicons
                name="musical-notes"
                size={28}
                color={selectedSong ? "#5E17EB" : "#5E17EB"}
              />
            </View>
          </TouchableOpacity>

          {/* Botón IMAGEN */}
          <TouchableOpacity onPress={pickImage}>
            <Ionicons name="image-outline" size={26} color="#71717A" />
          </TouchableOpacity>

          {/* Botón CÁMARA */}
          <TouchableOpacity>
            <Ionicons name="camera-outline" size={26} color="#71717A" />
          </TouchableOpacity>

          {/* Botón TAGS/HASHTAGS */}
          <TouchableOpacity>
            <Feather name="hash" size={24} color="#71717A" />
          </TouchableOpacity>

          {/* Espaciador */}
          <View className="flex-1" />

          {/* Contador de caracteres (Opcional) */}
          <Text
            className={`text-xs ${
              caption.length > 200 ? "text-red-500" : "text-zinc-600"
            }`}
          >
            {caption.length}/280
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
