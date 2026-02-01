import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

interface TrackOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  track: any;
  onCreateStory: () => void;
  onCreatePost: () => void;
}

export const TrackOptionsModal = ({
  visible,
  onClose,
  track,
  onCreateStory,
  onCreatePost,
}: TrackOptionsModalProps) => {
  if (!track) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-black/60">
          <TouchableWithoutFeedback>
            <View className="bg-zinc-900 rounded-t-3xl border-t border-zinc-800 p-6 pb-10">
              {/* Header con Canción */}
              <View className="flex-row items-center mb-8 pb-6 border-b border-zinc-800">
                <Image
                  source={{ uri: track.cover }}
                  style={{ width: 50, height: 50, borderRadius: 8 }}
                  contentFit="cover"
                />
                <View className="ml-4 flex-1">
                  <Text
                    className="text-white font-bold text-lg"
                    numberOfLines={1}
                  >
                    {track.title}
                  </Text>
                  <Text className="text-zinc-400" numberOfLines={1}>
                    {track.artist}
                  </Text>
                </View>
              </View>

              {/* Opciones */}
              <Text className="text-zinc-500 font-bold mb-4 uppercase text-xs tracking-widest">
                Crear contenido con esta música
              </Text>

              <TouchableOpacity
                onPress={onCreateStory}
                className="flex-row items-center bg-zinc-800 p-4 rounded-xl mb-3 active:bg-zinc-700"
              >
                <View className="w-10 h-10 rounded-full bg-purple-500/20 items-center justify-center mr-4">
                  <Ionicons name="aperture" size={24} color="#A855F7" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base">
                    Crear Historia
                  </Text>
                  <Text className="text-zinc-400 text-xs">
                    Visible por 24 horas
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onCreatePost}
                className="flex-row items-center bg-zinc-800 p-4 rounded-xl active:bg-zinc-700"
              >
                <View className="w-10 h-10 rounded-full bg-blue-500/20 items-center justify-center mr-4">
                  <Ionicons name="images" size={24} color="#3B82F6" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base">
                    Crear Publicación
                  </Text>
                  <Text className="text-zinc-400 text-xs">
                    Para tu perfil y el feed
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
