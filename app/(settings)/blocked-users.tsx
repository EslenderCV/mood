import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useGlobalContext } from "@/context/GlobalProvider";
import { getBlockedUsersList, unblockUser } from "@/lib/appwrite";

const BlockedUsers = () => {
  const { user, setUser } = useGlobalContext();
  const [blockedList, setBlockedList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBlockedUsers();
  }, [user]);

  const fetchBlockedUsers = async () => {
    // Verificación de seguridad: si no hay usuario, no hacemos nada
    if (!user?.$id) return;

    try {
      const users = await getBlockedUsersList(user.$id);
      setBlockedList(users);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleUnblock = async (blockedUser: any) => {
    Alert.alert(
      "Desbloquear usuario",
      `¿Quieres desbloquear a ${blockedUser.name}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desbloquear",
          style: "destructive",
          onPress: async () => {
            // 1. Verificación de seguridad CRÍTICA para TypeScript
            if (!user) return;

            // 2. Optimistic Update (Visual)
            setBlockedList((prev) =>
              prev.filter((u) => u.$id !== blockedUser.$id)
            );

            try {
              // Llamada a la base de datos
              await unblockUser(user.$id, blockedUser.$id);

              // 3. Actualizar Contexto Global de forma segura
              // Usamos (user.blockedUsers || []) para asegurar que sea un array
              const currentBlocked = user.blockedUsers || [];
              const updatedBlocked = currentBlocked.filter(
                (id: string) => id !== blockedUser.$id
              );

              setUser({ ...user, blockedUsers: updatedBlocked });
            } catch (error) {
              Alert.alert("Error", "No se pudo desbloquear");
              fetchBlockedUsers(); // Revertimos si falla
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View className="flex-row items-center justify-between py-4 border-b border-zinc-900 px-6">
      <View className="flex-row items-center flex-1">
        <Image
          source={item.pfp ? { uri: item.pfp } : require("@/assets/noPfp.jpg")}
          className="w-10 h-10 rounded-full bg-zinc-800"
        />
        <View className="ml-3">
          <Text className="text-white font-bold text-base">{item.name}</Text>
          <Text className="text-zinc-500 text-sm">@{item.username}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => handleUnblock(item)}
        className="bg-zinc-800 px-4 py-2 rounded-lg"
      >
        <Text className="text-white font-bold text-xs">Desbloquear</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      <View className="flex-row items-center px-4 h-[50px] border-b border-zinc-900">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg ml-2">
          Cuentas Bloqueadas
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#5E17EB" size="large" />
        </View>
      ) : (
        <FlatList
          data={blockedList}
          keyExtractor={(item) => item.$id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchBlockedUsers();
              }}
              tintColor="#5E17EB"
            />
          }
          ListEmptyComponent={
            <View className="mt-20 items-center px-10">
              <Ionicons
                name="shield-checkmark-outline"
                size={48}
                color="#3f3f46"
              />
              <Text className="text-zinc-500 text-center mt-4">
                No has bloqueado a nadie.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default BlockedUsers;
