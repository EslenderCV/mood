import React, { useState } from "react";
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
} from "react-native";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { useModal } from "@/context/ModalContext";
import { useGlobalContext } from "@/context/GlobalProvider";
import * as ImagePicker from "expo-image-picker"; // Importamos ImagePicker

export default function PostModal() {
  const { isPostModalVisible, setPostModalVisible } = useModal();
  const { user } = useGlobalContext();

  // Estados del formulario
  const [text, setText] = useState("");
  const [linkedSong, setLinkedSong] = useState<any | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Estado para la imagen
  const [isPublic, setIsPublic] = useState(true); // Estado para la privacidad

  const closeModal = () => {
    Keyboard.dismiss();
    setPostModalVisible(false);
  };

  const resetForm = () => {
    setText("");
    setLinkedSong(null);
    setSelectedImage(null);
    setIsPublic(true);
  };

  const handlePost = () => {
    // Aquí iría la lógica para enviar al Backend
    console.log("Posteando:", {
      text,
      song: linkedSong?.title,
      image: selectedImage ? "Imagen seleccionada" : "Sin imagen",
      privacy: isPublic ? "Public" : "Private",
    });

    resetForm();
    closeModal();
  };

  // --- FUNCIONES DE LOS BOTONES ---

  // 1. Función de Galería
  const pickImage = async () => {
    // Pedir permisos (opcional en versiones nuevas, pero buena práctica)
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(
        "Permiso requerido",
        "Necesitas dar acceso a la galería para subir fotos."
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], // Usando la nueva sintaxis de array string
      allowsEditing: true,
      aspect: [4, 5], // Aspecto vertical tipo Instagram
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // 2. Función de Micrófono (Placeholder)
  const handleMicPress = () => {
    Alert.alert(
      "Próximamente",
      "La función de grabar notas de voz estará disponible en futuras actualizaciones de Mood."
    );
    // Aquí se implementaría la lógica de expo-av para grabar
  };

  // 3. Función de Privacidad
  const togglePrivacy = () => {
    setIsPublic(!isPublic);
  };

  // Simulación de integración musical
  const simulateSpotifyLink = () => {
    if (linkedSong) {
      setLinkedSong(null);
      return;
    }
    setLinkedSong({
      title: "Telekinesis",
      artist: "Travis Scott ft. SZA",
      cover: "https://i.scdn.co/image/ab67616d0000b273881d8d8378cd01099babcd44",
      source: "spotify",
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isPostModalVisible}
      onRequestClose={closeModal}
    >
      {/* Fondo Oscuro Transparente */}
      <TouchableWithoutFeedback onPress={closeModal}>
        <View className="flex-1 bg-black/80 justify-end">
          {/* Evitar cerrar al tocar el contenido */}
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              className="w-full"
            >
              {/* --- CONTENEDOR DEL MODAL --- */}
              <View className="bg-[#121212] w-full rounded-t-[30px] border-t border-white/10 p-5 pb-8 shadow-2xl shadow-[#5E17EB]/10">
                {/* Header */}
                <View className="flex-row justify-between items-center mb-6">
                  <TouchableOpacity onPress={closeModal} className="p-1">
                    <Text className="text-zinc-400 text-base font-medium">
                      Cancelar
                    </Text>
                  </TouchableOpacity>

                  {/* Botón de enviar dinámico */}
                  <TouchableOpacity
                    onPress={handlePost}
                    // Se deshabilita si no hay nada que postear
                    disabled={!text && !linkedSong && !selectedImage}
                    className={`px-5 py-1.5 rounded-full ${
                      text || linkedSong || selectedImage
                        ? "bg-[#5E17EB]"
                        : "bg-zinc-800/50"
                    }`}
                  >
                    <Text
                      className={`font-bold text-base ${
                        text || linkedSong || selectedImage
                          ? "text-white"
                          : "text-zinc-500"
                      }`}
                    >
                      Mood
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className="flex-row gap-4">
                  {/* Avatar */}
                  <Image
                    source={
                      user?.pfp
                        ? { uri: user.pfp }
                        : require("@/assets/noPfp.jpg")
                    }
                    className="w-11 h-11 rounded-full border border-zinc-800"
                  />

                  <View className="flex-1">
                    {/* Input de Texto */}
                    <TextInput
                      placeholder="¿Qué vibra traes hoy?"
                      placeholderTextColor="#52525B"
                      multiline
                      style={{
                        color: "white",
                        fontSize: 17,
                        minHeight: 50,
                        textAlignVertical: "top",
                      }}
                      value={text}
                      onChangeText={setText}
                      autoFocus={true}
                    />

                    {/* --- AREA DE PREVISUALIZACIÓN --- */}
                    <View className="mt-2 gap-3">
                      {/* Preview de Imagen */}
                      {selectedImage && (
                        <View className="relative rounded-2xl overflow-hidden border border-white/10">
                          <Image
                            source={{ uri: selectedImage }}
                            className="w-full h-64 bg-zinc-900"
                            resizeMode="cover"
                          />
                          {/* Botón para quitar imagen */}
                          <TouchableOpacity
                            onPress={() => setSelectedImage(null)}
                            className="absolute top-3 right-3 bg-black/60 backdrop-blur-md p-1.5 rounded-full"
                          >
                            <Ionicons name="close" size={18} color="white" />
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Preview de Canción Vinculada */}
                      {linkedSong && (
                        <View className="bg-zinc-900/90 p-2.5 pr-4 rounded-2xl flex-row items-center border border-[#5E17EB]/30 relative overflow-hidden">
                          {/* Decoración de fondo */}
                          <View className="absolute -right-2 -bottom-2 w-16 h-16 bg-[#5E17EB]/20 blur-xl rounded-full" />

                          <Image
                            source={{ uri: linkedSong.cover }}
                            className="w-11 h-11 rounded-xl bg-zinc-800"
                          />
                          <View className="ml-3 flex-1">
                            <Text
                              className="text-white font-bold text-[15px]"
                              numberOfLines={1}
                            >
                              {linkedSong.title}
                            </Text>
                            <Text
                              className="text-zinc-400 text-xs"
                              numberOfLines={1}
                            >
                              {linkedSong.artist}
                            </Text>
                          </View>
                          <Ionicons
                            name="musical-notes"
                            size={18}
                            color="#5E17EB"
                            className="mr-1"
                          />

                          {/* Botón para quitar canción */}
                          <TouchableOpacity
                            onPress={() => setLinkedSong(null)}
                            className="absolute -top-1 -right-1 bg-zinc-800 p-1 rounded-bl-lg border-b border-l border-white/5"
                          >
                            <Ionicons name="close" size={12} color="zinc" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* --- BARRA DE HERRAMIENTAS INFERIOR --- */}
                <View className="flex-row items-center mt-6 pt-3 border-t border-white/5">
                  <View className="flex-row gap-1 items-center bg-zinc-900/50 rounded-full p-1 pr-4 border border-white/5">
                    {/* Botón MÚSICA */}
                    <TouchableOpacity
                      onPress={simulateSpotifyLink}
                      className={`p-2 rounded-full ${
                        linkedSong ? "bg-[#5E17EB]" : "bg-zinc-800"
                      }`}
                    >
                      <Ionicons
                        name="musical-notes"
                        size={22}
                        color={linkedSong ? "white" : "#A1A1AA"}
                      />
                    </TouchableOpacity>

                    {/* Botón GALERÍA (Funcional) */}
                    <TouchableOpacity onPress={pickImage} className="p-2">
                      <Ionicons
                        name="image-outline"
                        size={24}
                        color={selectedImage ? "#5E17EB" : "#A1A1AA"}
                      />
                    </TouchableOpacity>

                    {/* Botón MICRÓFONO (Con alerta) */}
                    <TouchableOpacity onPress={handleMicPress} className="p-2">
                      <Ionicons name="mic-outline" size={24} color="#A1A1AA" />
                    </TouchableOpacity>
                  </View>

                  <View className="flex-1" />

                  {/* Botón PRIVACIDAD (Funcional) */}
                  <TouchableOpacity
                    onPress={togglePrivacy}
                    className="flex-row items-center bg-zinc-900/80 px-3 py-2 rounded-full border border-white/10"
                  >
                    <Text className="text-zinc-400 text-xs font-medium mr-2">
                      {isPublic ? "Público" : "Privado"}
                    </Text>
                    {isPublic ? (
                      <Ionicons name="earth" size={14} color="#A1A1AA" />
                    ) : (
                      <MaterialIcons
                        name="lock-outline"
                        size={14}
                        color="#A1A1AA"
                      />
                    )}
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
