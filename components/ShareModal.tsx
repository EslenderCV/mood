import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur"; // Opcional: para efecto borroso de fondo
import {
  getCurrentUser,
  getUserChats,
  sendMessage,
  getOrCreateChat,
} from "@/lib/appwrite";

type ShareModalProps = {
  isVisible: boolean;
  onClose: () => void;
  postId: string; // El post que vamos a compartir
};

const ShareModal = ({ isVisible, onClose, postId }: ShareModalProps) => {
  const [chats, setChats] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]); // IDs de usuarios seleccionados
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (isVisible) {
      loadContacts();
      setSelectedUsers([]); // Limpiar selección al abrir
    }
  }, [isVisible]);

  const loadContacts = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (user) {
        // Cargamos chats recientes como "Sugeridos"
        const res = await getUserChats(user.$id);
        setChats(res);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleSendToAll = async () => {
    if (!currentUser || selectedUsers.length === 0) return;
    setSending(true);

    try {
      // Enviamos el mensaje a cada usuario seleccionado
      const promises = selectedUsers.map(async (otherUserId) => {
        // 1. Asegurar que existe el chat
        const chatDoc = await getOrCreateChat(currentUser.$id, otherUserId);

        // 2. Enviar el mensaje con el sharedPostId
        await sendMessage(
          chatDoc.$id,
          currentUser.$id,
          otherUserId,
          "🎵 Post compartido", // Texto fallback
          postId // <--- Aquí va la magia
        );
      });

      await Promise.all(promises);
      onClose(); // Cerrar modal al terminar
    } catch (error) {
      console.log("Error compartiendo:", error);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = selectedUsers.includes(item.otherUser.$id);

    return (
      <TouchableOpacity
        onPress={() => toggleSelection(item.otherUser.$id)}
        className="flex-row items-center justify-between py-3 border-b border-zinc-800"
      >
        <View className="flex-row items-center">
          <Image
            source={{ uri: item.otherUser.pfp }}
            className="w-12 h-12 rounded-full bg-zinc-800"
          />
          <View className="ml-3">
            <Text className="text-white font-bold">{item.otherUser.name}</Text>
            <Text className="text-zinc-500 text-xs">
              @{item.otherUser.username}
            </Text>
          </View>
        </View>

        {/* Checkbox estilo Instagram */}
        <View
          className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
            isSelected ? "bg-[#5E17EB] border-[#5E17EB]" : "border-zinc-600"
          }`}
        >
          {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-[#18181B] rounded-t-[30px] h-[70%] w-full px-5 pt-2 pb-10 shadow-2xl">
          {/* Barrita superior para deslizar */}
          <View className="items-center py-2">
            <View className="w-12 h-1.5 bg-zinc-600 rounded-full" />
          </View>

          <Text className="text-white font-bold text-center text-lg mb-4 mt-2">
            Enviar a...
          </Text>

          {/* Lista */}
          {loading ? (
            <ActivityIndicator color="#5E17EB" />
          ) : (
            <FlatList
              data={chats}
              keyExtractor={(item) => item.$id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}

          {/* Botón Enviar */}
          <TouchableOpacity
            onPress={handleSendToAll}
            disabled={selectedUsers.length === 0 || sending}
            className={`mt-4 py-4 rounded-full items-center ${
              selectedUsers.length > 0 ? "bg-[#5E17EB]" : "bg-zinc-800"
            }`}
          >
            {sending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                className={`font-bold text-lg ${
                  selectedUsers.length > 0 ? "text-white" : "text-zinc-500"
                }`}
              >
                Enviar{" "}
                {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ""}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            className="mt-2 py-3 items-center"
          >
            <Text className="text-white">Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ShareModal;
