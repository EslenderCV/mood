import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Image,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// --- MODAL: OPCIONES DE CANCIÓN ---
export const SongOptionsModal = ({
  visible,
  onClose,
  selectedSong,
  t,
  textColor,
  subTextColor,
  modalBgColor,
  borderColor,
  dangerColor,
  onAddToPlaylist,
  onUnsave,
}: any) => {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-black/60">
          <TouchableWithoutFeedback>
            <View
              className="rounded-t-[32px] p-6 pb-10"
              style={{ backgroundColor: modalBgColor }}
            >
              <View className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded-full self-center mb-6 opacity-50" />
              {selectedSong && (
                <View className="flex-row items-center mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                  <Image
                    source={{ uri: selectedSong.cover }}
                    className="w-16 h-16 rounded-2xl bg-zinc-800 mr-4"
                  />
                  <View className="flex-1">
                    <Text
                      className="font-bold text-lg"
                      style={{ color: textColor }}
                      numberOfLines={1}
                    >
                      {selectedSong.title}
                    </Text>
                    <Text
                      className="text-base"
                      style={{ color: subTextColor }}
                      numberOfLines={1}
                    >
                      {selectedSong.artist}
                    </Text>
                  </View>
                </View>
              )}
              <TouchableOpacity
                onPress={onAddToPlaylist}
                className="flex-row items-center p-4 rounded-2xl mb-2 active:bg-zinc-100 dark:active:bg-zinc-800"
              >
                <View className="w-10 h-10 rounded-full bg-blue-500/10 items-center justify-center mr-4">
                  <Ionicons name="add-circle" size={24} color="#3B82F6" />
                </View>
                <Text
                  className="font-semibold text-lg"
                  style={{ color: textColor }}
                >
                  {t("library.addTo")} Playlist
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onUnsave}
                className="flex-row items-center p-4 rounded-2xl active:bg-zinc-100 dark:active:bg-zinc-800"
              >
                <View className="w-10 h-10 rounded-full bg-red-500/10 items-center justify-center mr-4">
                  <Ionicons name="trash" size={24} color={dangerColor} />
                </View>
                <Text
                  className="font-semibold text-lg"
                  style={{ color: dangerColor }}
                >
                  {t("library.removeFromLibrary") || "Eliminar de Librería"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                className="mt-6 p-4 rounded-2xl border items-center justify-center"
                style={{ borderColor: borderColor }}
              >
                <Text
                  className="font-bold text-lg"
                  style={{ color: textColor }}
                >
                  {t("library.cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// --- MODAL: CREAR PLAYLIST ---
export const CreatePlaylistModal = ({
  visible,
  onClose,
  onCreate,
  t,
  textColor,
  subTextColor,
  modalBgColor,
  borderColor,
  bgColor,
  newPlaylistName,
  setNewPlaylistName,
  importPlatform,
  setImportPlatform,
  user,
}: any) => {
  const renderPlatformOptions = () => {
    const myPlatform =
      user?.preferredPlatform === "apple" ? "apple" : "spotify";
    const brandColor = myPlatform === "apple" ? "#FA243C" : "#1DB954";
    const iconName = myPlatform === "apple" ? "logo-apple" : "spotify";
    const label = myPlatform === "apple" ? "Apple Music" : "Spotify";
    const isDark = modalBgColor.includes("1C1C1E"); // Simple check

    return (
      <View className="flex-row gap-3 mb-8">
        <TouchableOpacity
          onPress={() => setImportPlatform("mood")}
          className={`flex-1 p-3 rounded-2xl border items-center ${importPlatform === "mood" ? "border-[#5E17EB] bg-[#5E17EB]/10" : "border-transparent bg-zinc-100 dark:bg-zinc-800"}`}
        >
          <Ionicons
            name="musical-notes"
            size={24}
            color={importPlatform === "mood" ? "#5E17EB" : subTextColor}
          />
          <Text className="font-bold mt-2" style={{ color: textColor }}>
            {t("library.local")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setImportPlatform(myPlatform)}
          className={`flex-1 p-3 rounded-2xl border items-center`}
          style={{
            backgroundColor:
              importPlatform === myPlatform
                ? isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.05)"
                : isDark
                  ? "#27272A"
                  : "#F4F4F5",
            borderColor:
              importPlatform === myPlatform ? brandColor : "transparent",
          }}
        >
          <Ionicons
            name={iconName as any}
            size={24}
            color={importPlatform === myPlatform ? brandColor : subTextColor}
          />
          <Text className="font-bold mt-2" style={{ color: textColor }}>
            {label} Sync
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-black/70">
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              className="w-full"
            >
              <View
                className="rounded-t-[32px] p-8 pb-10"
                style={{ backgroundColor: modalBgColor }}
              >
                <View className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full self-center mb-8 opacity-50" />
                <Text
                  className="text-2xl font-bold mb-6"
                  style={{ color: textColor }}
                >
                  {t("library.newPlaylist")}
                </Text>
                <TextInput
                  className="p-5 rounded-2xl mb-8 text-xl border-2"
                  style={{
                    backgroundColor: bgColor,
                    color: textColor,
                    borderColor: borderColor,
                  }}
                  placeholder={t("library.createBtn") + "..."}
                  placeholderTextColor={subTextColor}
                  value={newPlaylistName}
                  onChangeText={setNewPlaylistName}
                  autoFocus
                />
                <Text
                  className="text-sm font-bold mb-4 uppercase tracking-wider opacity-70"
                  style={{ color: subTextColor }}
                >
                  {t("library.platformLabel")}
                </Text>
                {renderPlatformOptions()}
                <View className="flex-row gap-4 mt-2">
                  <TouchableOpacity
                    onPress={onClose}
                    className="flex-1 p-4 rounded-full items-center bg-zinc-100 dark:bg-zinc-800"
                  >
                    <Text
                      className="font-bold text-lg"
                      style={{ color: subTextColor }}
                    >
                      {t("library.cancel")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onCreate}
                    className="flex-1 bg-[#5E17EB] p-4 rounded-full items-center shadow-lg shadow-purple-500/30"
                  >
                    <Text className="text-white font-bold text-lg">
                      {t("library.create")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// --- MODAL: AGREGAR A PLAYLIST ---
export const AddToPlaylistModal = ({
  visible,
  onClose,
  onSelectPlaylist,
  playlists,
  t,
  textColor,
  subTextColor,
  modalBgColor,
  accentColor,
}: any) => {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-black/70">
          <TouchableWithoutFeedback>
            <View
              className="rounded-t-[32px] p-6 h-[55%]"
              style={{ backgroundColor: modalBgColor }}
            >
              <View className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full self-center mb-6 opacity-50" />
              <Text
                className="text-xl font-bold mb-6 text-center"
                style={{ color: textColor }}
              >
                {t("library.addTo")}
              </Text>
              <FlatList
                data={playlists}
                keyExtractor={(item) => item.$id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => onSelectPlaylist(item.$id)}
                    className="flex-row items-center p-4 border-b border-zinc-100 dark:border-zinc-800/50 mb-1"
                  >
                    <View style={{ width: 56, height: 56, marginRight: 16 }}>
                      {/* Nota: Usamos un placeholder simple aquí o pasamos el renderizador */}
                      <View className="w-full h-full rounded-2xl bg-zinc-200 dark:bg-zinc-800 items-center justify-center">
                        <Ionicons
                          name="musical-notes"
                          size={24}
                          color={subTextColor}
                        />
                      </View>
                    </View>
                    <View className="flex-1 justify-center">
                      <Text
                        className="font-bold text-lg mb-1"
                        style={{ color: textColor }}
                      >
                        {item.name}
                      </Text>
                      <Text
                        className="text-xs font-medium opacity-60"
                        style={{ color: subTextColor }}
                      >
                        {item.songs.length} {t("library.songsCount")}
                      </Text>
                    </View>
                    <View className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center">
                      <Ionicons name="add" size={24} color={accentColor} />
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
