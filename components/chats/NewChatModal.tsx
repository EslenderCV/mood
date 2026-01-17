import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { searchUsers, getLatestUsers } from "@/lib/appwrite";

export const NewChatModal = ({ visible, onClose, onUserSelect }: any) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const bgColor = isDark ? "#18181B" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const inputBg = isDark ? "#27272A" : "#F4F4F5";
  const borderColor = isDark ? "#3F3F46" : "#E5E5E5";
  const closeBtnBg = isDark ? "#3F3F46" : "#E4E4E7";
  const closeBtnIcon = isDark ? "#FFFFFF" : "#18181B";

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const fetchUsers = async () => {
      setLoading(true);
      try {
        let res;
        if (query.trim().length > 0) {
          res = await searchUsers(query);
        } else {
          res = await getLatestUsers();
        }
        setUsers(res || []);
      } catch (error) {
        console.log("Error buscando usuarios:", error);
      } finally {
        setLoading(false);
      }
    };
    const timeoutId = setTimeout(fetchUsers, 500);
    return () => clearTimeout(timeoutId);
  }, [query, visible]);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-end">
        <View
          className="h-[90%] rounded-t-[32px] overflow-hidden shadow-2xl"
          style={{ backgroundColor: bgColor }}
        >
          <View
            className="px-6 pt-6 pb-4 flex-row items-center justify-between border-b"
            style={{ borderColor }}
          >
            <Text
              className="text-xl font-bold tracking-tight"
              style={{ color: textColor }}
            >
              Nuevo Mensaje
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="p-2 rounded-full"
              style={{ backgroundColor: closeBtnBg }}
            >
              <Ionicons name="close" size={20} color={closeBtnIcon} />
            </TouchableOpacity>
          </View>

          <View className="px-5 py-4">
            <View
              className="flex-row items-center px-4 py-3 rounded-2xl"
              style={{ backgroundColor: inputBg }}
            >
              <Ionicons name="search" size={20} color={subTextColor} />
              <TextInput
                placeholder="Buscar por nombre o usuario..."
                placeholderTextColor={subTextColor}
                className="flex-1 ml-3 text-base"
                style={{ color: textColor }}
                value={query}
                onChangeText={setQuery}
                autoFocus={false}
              />
            </View>
          </View>

          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#5E17EB" />
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item.$id}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: 40,
              }}
              ListEmptyComponent={
                <View className="mt-10 items-center">
                  <Text style={{ color: subTextColor }}>
                    No se encontraron usuarios
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => onUserSelect(item)}
                  className="flex-row items-center py-4 border-b"
                  style={{ borderColor: isDark ? "#27272A" : "#F4F4F5" }}
                >
                  <Image
                    source={{
                      uri:
                        item.pfp ||
                        "https://cloud.appwrite.io/v1/avatars/initials?name=" +
                          (item.name || item.username),
                    }}
                    className="w-12 h-12 rounded-full bg-zinc-700"
                  />
                  <View className="ml-4 flex-1">
                    <View className="flex-row items-center">
                      <Text
                        className="font-bold text-base"
                        numberOfLines={1}
                        style={{ color: textColor }}
                      >
                        {item.name || item.username || "Usuario"}
                      </Text>
                      {item.isVerified && (
                        <MaterialIcons
                          name="verified"
                          size={14}
                          color="#5E17EB"
                          style={{ marginLeft: 4 }}
                        />
                      )}
                    </View>
                    <Text
                      className="text-sm"
                      numberOfLines={1}
                      style={{ color: subTextColor }}
                    >
                      @{item.username}
                    </Text>
                  </View>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={24}
                    color="#5E17EB"
                  />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};
