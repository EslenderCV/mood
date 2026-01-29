import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
  ScrollView,
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
  // Estado local
  const [localEmoji, setLocalEmoji] = useState("");
  const [localText, setLocalText] = useState("");

  // Referencia para el input oculto (teclado)
  const customEmojiInputRef = useRef<TextInput>(null);

  // Emojis sugeridos (Estilo WhatsApp)
  const SUGGESTED_EMOJIS = ["🔥", "😂", "😍", "😭", "🤯", "❤️"];

  // Sincronizar estado local al abrir
  useEffect(() => {
    if (isVisible) {
      setLocalEmoji(selectedMood?.emoji || "");
      setLocalText(selectedMood?.text || "");
    }
  }, [isVisible, selectedMood]);

  // Colores
  const popupBg = "#1A1A1A";
  const accentColor = "#5E17EB";
  const inputBg = "#27272A";
  const borderColor = "#3F3F46";
  const placeholderColor = "#71717A";

  const handleEmojiInput = (text: string) => {
    // 1. Limpiar si borra todo
    if (text === "") {
      setLocalEmoji("");
      onSelectMood(null);
      return;
    }

    // 2. Bloquear caracteres no deseados (letras/números)
    const hasRestrictedChars =
      /[a-zA-Z0-9`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/.test(text);

    if (hasRestrictedChars) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // 3. Tomar el último emoji ingresado
    const cleanEmoji = text.slice(-2);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalEmoji(cleanEmoji);
    onSelectMood({ emoji: cleanEmoji, text: localText });
  };

  const handleTextChange = (text: string) => {
    setLocalText(text);
    if (localEmoji) {
      onSelectMood({ emoji: localEmoji, text: text });
    }
  };

  const handleClose = () => {
    if (!localEmoji) {
      onSelectMood(null);
    }
    onClose();
  };

  const handleSelectSuggestion = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalEmoji(emoji);
    onSelectMood({ emoji: emoji, text: localText });
  };

  const handleCustomEmojiPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Enfocamos el input oculto para abrir el teclado
    customEmojiInputRef.current?.focus();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={handleClose}
    >
      <BlurView
        intensity={Platform.OS === "ios" ? 25 : 60}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />

      <View className="flex-1 justify-center items-center px-6 bg-black/50">
        <View
          style={{ backgroundColor: popupBg, width: "100%", maxWidth: 340 }}
          className="rounded-[36px] p-6 shadow-2xl border border-zinc-800"
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
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

          {/* --- DISPLAY DE EMOJI (CÍRCULO GIGANTE) --- */}
          {/* Ya no abre el teclado directamente, solo muestra el estado */}
          <View className="items-center mb-6">
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: localEmoji
                  ? "rgba(94, 23, 235, 0.15)"
                  : inputBg,
                borderColor: localEmoji ? accentColor : borderColor,
                borderWidth: 2,
                borderStyle: localEmoji ? "solid" : "dashed",
              }}
              className="items-center justify-center mb-3 shadow-lg shadow-purple-900/20"
            >
              <Text style={{ fontSize: 50, color: "white" }}>
                {localEmoji || "🫥"}
              </Text>
            </View>
          </View>

          {/* --- SLIDE DE EMOJIS SUGERIDOS (REACTION PICKER) --- */}
          <View className="mb-6">
            <Text className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3 ml-1">
              Selecciona una reacción
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {SUGGESTED_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => handleSelectSuggestion(emoji)}
                  style={{
                    backgroundColor:
                      localEmoji === emoji ? accentColor : "#27272A",
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: localEmoji === emoji ? accentColor : "#3F3F46",
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}

              {/* BOTÓN + (BUSCAR OTRO) */}
              <TouchableOpacity
                onPress={handleCustomEmojiPress}
                style={{
                  backgroundColor: "#27272A",
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "#3F3F46",
                }}
              >
                <Ionicons name="add" size={26} color="white" />
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* --- INPUT OCULTO PARA EL TECLADO --- */}
          <TextInput
            ref={customEmojiInputRef}
            value={localEmoji}
            onChangeText={handleEmojiInput}
            style={{ height: 0, width: 0, opacity: 0, position: "absolute" }}
            caretHidden={true}
          />

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

          {/* Botón Guardar */}
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
