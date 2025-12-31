import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getUserFollowers, getUserFollowing } from "../lib/appwrite";

const UserItem = ({ user }: { user: any }) => (
  <TouchableOpacity
    onPress={() => router.push(`/user/${user.$id}`)}
    className="flex-row items-center p-4 border-b border-zinc-900"
  >
    <Image
      source={user.pfp ? { uri: user.pfp } : require("../assets/noPfp.jpg")}
      className="w-12 h-12 rounded-full bg-zinc-800"
    />
    <View className="ml-4">
      <Text className="text-white font-bold text-base">
        {user.name || user.username}
      </Text>
      <Text className="text-zinc-500 text-sm">@{user.username}</Text>
    </View>
  </TouchableOpacity>
);

const UserList = () => {
  const { userId, type } = useLocalSearchParams();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;

      setLoading(true);
      try {
        let result = [];
        const idString = Array.isArray(userId) ? userId[0] : userId;

        if (type === "followers") {
          result = await getUserFollowers(idString);
        } else {
          result = await getUserFollowing(idString);
        }
        setUsers(result);
      } catch (error) {
        console.log("Error loading user list:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userId, type]);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-row items-center px-4 py-2 border-b border-zinc-900 mb-2">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold ml-4 capitalize">
          {type === "followers" ? "Seguidores" : "Seguidos"}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#5E17EB" className="mt-10" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.$id}
          renderItem={({ item }) => <UserItem user={item} />}
          ListEmptyComponent={() => (
            <View className="items-center mt-10">
              <Text className="text-zinc-500 text-center">
                No se encontraron usuarios.
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default UserList;
