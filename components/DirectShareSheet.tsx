import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
 Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";


const { height } = Dimensions.get("window");

const DirectShareSheet = ({
  visible,
  onClose,
  contacts,
  onSend,
  onAddToStory,
  onViralCard,
  onSystemShare,
  onCopyLink,
  isDark,
  onSearch,
  isLoadingContacts,
}: any) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const insets = useSafeAreaInsets();

  const bgColor = isDark ? "#18181B" : "#ffffff";
  const textColor = isDark ? "white" : "black";
  const placeholderColor = isDark ? "#A1A1AA" : "#71717A";

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch) onSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSend = () => {
    onSend(selectedUsers, searchQuery);
    setSelectedUsers([]);
    setSearchQuery("");
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-black/50">
          <TouchableWithoutFeedback>
            <View
              className="rounded-t-[32px] overflow-hidden"
              style={{
                backgroundColor: bgColor,
                paddingBottom: insets.bottom + 20,
                maxHeight: height * 0.8,
              }}
            >
              <View className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full self-center mt-4 mb-4" />

              <View className="px-5 mb-4">
                <View
                  className={`flex-row items-center px-4 py-3 rounded-2xl ${isDark ? "bg-zinc-800" : "bg-zinc-100"}`}
                >
                  <Ionicons name="search" size={20} color={placeholderColor} />
                  <TextInput
                    placeholder="Buscar persona..."
                    placeholderTextColor={placeholderColor}
                    className="flex-1 ml-3 text-base"
                    style={{ color: textColor }}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={placeholderColor}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View className="h-28 pl-5 mb-4">
                {isLoadingContacts ? (
                  <View className="flex-1 justify-center items-center mr-5">
                    <ActivityIndicator color="#5E17EB" />
                  </View>
                ) : (
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={contacts}
                    keyExtractor={(item) => item.$id}
                    ListEmptyComponent={
                      <Text className="text-zinc-500 mt-8 ml-2">
                        No se encontraron usuarios.
                      </Text>
                    }
                    renderItem={({ item }) => {
                      const isSelected = selectedUsers.includes(item.$id);
                      return (
                        <TouchableOpacity
                          onPress={() => toggleUserSelection(item.$id)}
                          className="mr-6 items-center w-18"
                          activeOpacity={0.8}
                        >
                          <View className="relative">
                            <Image
                              source={{
                                uri:
                                  item.avatar ||
                                  item.pfp ||
                                  "https://cloud.appwrite.io/v1/avatars/initials?name=" +
                                    item.username,
                              }}
                              className="w-16 h-16 rounded-full bg-zinc-700"
                            />
                            {isSelected && (
                              <View
                                className="absolute bottom-0 right-0 bg-[#5E17EB] rounded-full w-6 h-6 items-center justify-center border-2"
                                style={{ borderColor: bgColor }}
                              >
                                <Ionicons
                                  name="checkmark"
                                  size={14}
                                  color="white"
                                />
                              </View>
                            )}
                          </View>
                          <Text
                            className="text-xs mt-2 text-center w-20"
                            numberOfLines={1}
                            style={{ color: textColor }}
                          >
                            {item.name || item.username}
                          </Text>
                          <Text
                            className="text-[10px] text-zinc-500 text-center w-20"
                            numberOfLines={1}
                          >
                            @{item.username}
                          </Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}
              </View>

              <View
                className={`h-[1px] w-full ${isDark ? "bg-zinc-800" : "bg-zinc-200"} mb-4`}
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="px-5 mb-4"
              >
                {[
                  {
                    label: "Tu historia",
                    icon: "add",
                    onPress: onAddToStory,
                    color: isDark ? "white" : "black",
                  },
                  {
                    label: "Viral Card",
                    icon: "share-social",
                    onPress: onViralCard,
                    color: "#ec4899",
                  },
                  {
                    label: "Compartir via...",
                    icon: "share",
                    onPress: onSystemShare,
                    color: textColor,
                    Feather: true,
                  },
                  {
                    label: "Copiar enlace",
                    icon: "link",
                    onPress: onCopyLink,
                    color: textColor,
                    Feather: true,
                  },
                ].map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={action.onPress}
                    className="items-center mr-8"
                  >
                    <View
                      className={`w-14 h-14 rounded-full items-center justify-center ${action.label === "Tu historia" ? `border-2 border-dashed ${isDark ? "border-zinc-600" : "border-zinc-400"}` : isDark ? "bg-zinc-800" : "bg-zinc-100"}`}
                    >
                      {action.Feather ? (
                        <Feather
                          name={action.icon as any}
                          size={24}
                          color={action.color}
                        />
                      ) : (
                        <Ionicons
                          name={action.icon as any}
                          size={28}
                          color={action.color}
                        />
                      )}
                    </View>
                    <Text className="text-xs mt-2" style={{ color: textColor }}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {selectedUsers.length > 0 && (
                <View className="px-5 pt-2">
                  <TouchableOpacity
                    onPress={handleSend}
                    className="w-full bg-[#5E17EB] py-4 rounded-full items-center"
                  >
                    <Text className="text-white font-bold text-base">
                      Enviar ({selectedUsers.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default DirectShareSheet;
