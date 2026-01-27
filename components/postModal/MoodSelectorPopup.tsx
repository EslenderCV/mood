import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { MoodState } from "@/hooks/usePostModalController";

interface MoodSelectorPopupProps {
  isVisible: boolean;
  onClose: () => void;
  selectedMood: MoodState | null;
  onSelectMood: (mood: MoodState | null) => void;
}

const MoodSelectorPopup = ({
  isVisible,
  onClose,
  selectedMood,
  onSelectMood,
}: MoodSelectorPopupProps) => {
  // Estado local para manejar el input antes de guardar
  const [localEmoji, setLocalEmoji] = useState("");
  const [localText, setLocalText] = useState("");

  // Sincronizar estado local al abrir
  useEffect(() => {
    if (isVisible) {
      setLocalEmoji(selectedMood?.emoji || "");
      setLocalText(selectedMood?.text || "");
    }
  }, [isVisible, selectedMood]);

  // Colores (Estilo Dark/Premium)
  const popupBg = "#1A1A1A";
  const accentColor = "#5E17EB";
  const inputBg = "#27272A";
  const borderColor = "#3F3F46";
  const placeholderColor = "#71717A";

  const handleEmojiInput = (text: string) => {
    // 1. Si borra todo, limpiamos
    if (text === "") {
      setLocalEmoji("");
      onSelectMood(null);
      return;
    }

    // 2. REGEX: Bloquear letras (a-z), números (0-9) y símbolos básicos de teclado.
    // Solo dejamos pasar caracteres complejos (Unicode alto) que suelen ser Emojis.
    const hasRestrictedChars =
      /[a-zA-Z0-9`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/.test(text);

    if (hasRestrictedChars) {
      // Feedback de error si intenta escribir texto
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // 3. Limitar longitud (Un emoji puede ocupar 2-4 caracteres en JS, así que permitimos un slice generoso pero corto)
    // Tomamos los últimos caracteres para simular que reemplaza al anterior
    const cleanEmoji = text.slice(-2);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalEmoji(cleanEmoji);

    // Actualizamos el padre en tiempo real
    onSelectMood({ emoji: cleanEmoji, text: localText });
  };

  const handleTextChange = (text: string) => {
    setLocalText(text);
    // Solo actualizamos el padre si ya tenemos un emoji definido
    if (localEmoji) {
      onSelectMood({ emoji: localEmoji, text: text });
    }
  };

  const handleClose = () => {
    // Si no hay emoji, limpiamos todo al salir
    if (!localEmoji) {
      onSelectMood(null);
    }
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={handleClose}
    >
      {/* Fondo borroso oscuro */}
      <BlurView
        intensity={Platform.OS === "ios" ? 25 : 60}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />

      <View className="flex-1 justify-center items-center px-6 bg-black/50">
        {/* Contenedor Principal */}
        <View
          style={{ backgroundColor: popupBg, width: "100%", maxWidth: 340 }}
          className="rounded-[36px] p-6 shadow-2xl border border-zinc-800"
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-8">
            <View className="flex-row items-center">
              <View
                style={{ backgroundColor: "rgba(94, 23, 235, 0.2)" }}
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
              >
                <Ionicons name="sparkles" size={20} color={accentColor} />
              </View>
              <Text className="text-white font-bold text-xl tracking-tight">
                Tu Mood
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              className="bg-zinc-800 p-2 rounded-full"
            >
              <Ionicons name="close" size={20} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          {/* --- INPUT DE EMOJI (CÍRCULO GIGANTE) --- */}
          <View className="items-center mb-8">
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: localEmoji
                  ? "rgba(94, 23, 235, 0.15)"
                  : inputBg,
                borderColor: localEmoji ? accentColor : borderColor,
                borderWidth: 2, // Borde más grueso
                borderStyle: localEmoji ? "solid" : "dashed", // Dashed si está vacío
              }}
              className="items-center justify-center mb-3 shadow-lg shadow-purple-900/20"
            >
              {/* Input invisible superpuesto para capturar el emoji */}
              <TextInput
                value={localEmoji}
                onChangeText={handleEmojiInput}
                style={{
                  fontSize: 60,
                  color: "white",
                  textAlign: "center",
                  width: "100%",
                  height: "100%",
                }}
                placeholder="+"
                placeholderTextColor="rgba(255,255,255,0.2)"
                caretHidden={true} // Ocultar cursor para que parezca un botón
                maxLength={5} // Margen técnico para el emoji
                autoFocus={true} // Abrir teclado directo
              />
            </View>
            <Text className="text-zinc-500 text-xs font-medium uppercase tracking-widest">
              {localEmoji ? "Emoji Seleccionado" : "Toca para añadir Emoji"}
            </Text>
          </View>

          {/* --- INPUT DE TEXTO --- */}
          <View
            style={{ backgroundColor: inputBg, borderColor: borderColor }}
            className="rounded-2xl px-4 py-3.5 border flex-row items-center mb-2"
          >
            <TextInput
              value={localText}
              onChangeText={handleTextChange}
              placeholder="Describe cómo te sientes..."
              placeholderTextColor={placeholderColor}
              style={{
                color: "white",
                flex: 1,
                fontSize: 16,
                fontWeight: "500",
              }}
              maxLength={25}
            />
            {localText.length > 0 && (
              <TouchableOpacity onPress={() => setLocalText("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={placeholderColor}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Botón Guardar (Visual) */}
          <TouchableOpacity
            onPress={handleClose}
            disabled={!localEmoji}
            style={{
              backgroundColor: localEmoji ? accentColor : "#27272A",
              opacity: localEmoji ? 1 : 0.5,
            }}
            className="w-full py-4 rounded-2xl items-center mt-4 shadow-md"
          >
            <Text
              className={`font-bold text-base ${localEmoji ? "text-white" : "text-zinc-500"}`}
            >
              {localEmoji ? "Listo" : "Elige un emoji primero"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default MoodSelectorPopup;
