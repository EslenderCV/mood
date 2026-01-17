import React from "react";
import {
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CreatorModalProps {
  visible: boolean;
  onClose: () => void;
  onMusic: () => void;
  onGallery: () => void;
}

const CreatorModal = ({
  visible,
  onClose,
  onMusic,
  onGallery,
}: CreatorModalProps) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-black/60">
          <TouchableWithoutFeedback>
            <View className="bg-[#121212] rounded-t-[32px] p-6 pb-10">
              <View className="w-12 h-1.5 bg-zinc-700 rounded-full self-center mb-6" />
              <Text className="text-white text-xl font-bold text-center mb-8">
                Crear Nueva Historia
              </Text>

              <View className="flex-row gap-4 mb-4">
                <TouchableOpacity
                  onPress={onMusic}
                  className="flex-1 bg-zinc-900 p-6 rounded-2xl items-center border border-zinc-800 active:bg-zinc-800"
                >
                  <View className="w-14 h-14 rounded-full bg-[#5E17EB]/20 items-center justify-center mb-3">
                    <Ionicons name="musical-notes" size={28} color="#5E17EB" />
                  </View>
                  <Text className="text-white font-bold text-lg">Música</Text>
                  <Text className="text-zinc-500 text-xs text-center mt-1">
                    Comparte una canción
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onGallery}
                  className="flex-1 bg-zinc-900 p-6 rounded-2xl items-center border border-zinc-800 active:bg-zinc-800"
                >
                  <View className="w-14 h-14 rounded-full bg-pink-500/20 items-center justify-center mb-3">
                    <Ionicons name="image" size={28} color="#ec4899" />
                  </View>
                  <Text className="text-white font-bold text-lg">Galería</Text>
                  <Text className="text-zinc-500 text-xs text-center mt-1">
                    Foto o Video
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={onClose} className="mt-2 py-3">
                <Text className="text-zinc-500 text-center font-medium">
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default CreatorModal;
