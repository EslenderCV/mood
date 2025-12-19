import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useModal } from "../context/ModalContext";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar"; // <--- 1. IMPORTAR ESTO

const PostModal = () => {
  const { isPostModalVisible, setPostModalVisible } = useModal();

  if (!isPostModalVisible) return null;

  return (
    <Modal
      transparent
      visible={isPostModalVisible}
      animationType="fade"
      // 2. IMPORTANTE: Esto permite que el modal cubra la barra en Android
      statusBarTranslucent={true}
      onRequestClose={() => setPostModalVisible(false)}
    >
      {/* 3. IMPORTANTE: Esto oculta la hora y batería mientras el modal esté abierto */}
      <StatusBar hidden={true} />

      <TouchableWithoutFeedback onPress={() => setPostModalVisible(false)}>
        <View className="flex-1 bg-black/70 justify-end items-center">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="w-full items-center mb-28"
          >
            <TouchableWithoutFeedback>
              <View className="bg-zinc-900 w-[90%] p-5 rounded-3xl border border-zinc-800 shadow-2xl relative">
                {/* Header: Avatar + Input + Enviar */}
                <View className="flex-row items-start justify-between mb-6">
                  {/* ... (el resto de tu código sigue igual) ... */}
                  <Image
                    source={{
                      uri: "https://cloud.appwrite.io/v1/avatars/initials?name=User&project=6689e59b000acd6caf6f",
                    }}
                    className="w-10 h-10 rounded-full mr-3 bg-zinc-700"
                  />

                  <View className="flex-1 mr-2">
                    <TextInput
                      placeholder="What's your mood? 🎵"
                      placeholderTextColor="#71717A"
                      multiline
                      autoFocus
                      className="text-white text-lg font-medium max-h-32"
                      style={{ textAlignVertical: "top" }}
                    />
                  </View>

                  <TouchableOpacity className="mt-1">
                    <Ionicons name="send" size={20} color="#8B5CF6" />
                  </TouchableOpacity>
                </View>

                {/* Iconos */}
                <View className="flex-row justify-between px-4 mb-6">
                  <TouchableOpacity>
                    <Ionicons name="image-outline" size={22} color="#E4E4E7" />
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <Ionicons
                      name="location-outline"
                      size={22}
                      color="#E4E4E7"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <Ionicons
                      name="calendar-outline"
                      size={22}
                      color="#E4E4E7"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <Ionicons
                      name="options-outline"
                      size={22}
                      color="#E4E4E7"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <Ionicons name="camera-outline" size={22} color="#E4E4E7" />
                  </TouchableOpacity>
                </View>

                {/* Botón Shazam */}
                <TouchableOpacity className="flex-row items-center justify-center bg-violet-900/30 p-4 rounded-2xl border border-violet-500/30 active:bg-violet-900/50">
                  <View className="bg-violet-600 w-8 h-8 rounded-full items-center justify-center mr-3 shadow-lg shadow-violet-500">
                    <FontAwesome5 name="music" size={14} color="white" />
                  </View>
                  <View>
                    <Text className="text-white font-bold text-base">
                      What's this song?
                    </Text>
                    <Text className="text-violet-200 text-xs">
                      Hold up, I'm listening...
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Flecha decorativa */}
                <View
                  className="absolute -bottom-3 left-1/2 -ml-3 w-0 h-0"
                  style={{
                    borderLeftWidth: 12,
                    borderRightWidth: 12,
                    borderTopWidth: 12,
                    borderLeftColor: "transparent",
                    borderRightColor: "transparent",
                    borderTopColor: "#18181B",
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default PostModal;
