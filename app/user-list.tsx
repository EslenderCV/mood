import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import {
  getUserFollowers,
  getUserFollowing,
  getCurrentUser,
  followUser,
  createChat,
} from "@/lib/appwrite";

const UserList = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const params = useLocalSearchParams();
  const { userId, type } = params;

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const cardBg = isDark ? "#18181B" : "#F4F4F5";
  const activeColor = "#5E17EB";

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [myFollowingIds, setMyFollowingIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [userId, type]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const me = await getCurrentUser();
      setCurrentUser(me);

      let fetchedUsers: any[] = [];

      if (type === "followers") {
        fetchedUsers = await getUserFollowers(userId as string);
      } else {
        fetchedUsers = await getUserFollowing(userId as string);
      }
      setUsers(fetchedUsers);

      if (me && fetchedUsers.length > 0) {
        const whoIFollow = await getUserFollowing(me.$id);
        const followingIds = whoIFollow.map((u: any) => u.$id);
        setMyFollowingIds(followingIds);
      }
    } catch (error) {
      console.error("Error fetching user list:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (targetUser: any) => {
    if (!currentUser) return;
    if (actionLoading) return;

    const isFollowing = myFollowingIds.includes(targetUser.$id);

    if (isFollowing) {
      setActionLoading(targetUser.$id);
      try {
        const chatDoc = await createChat(currentUser.$id, targetUser.$id);
        if (chatDoc) {
          router.push(`/chat/${chatDoc.$id}` as any);
        }
      } catch (error) {
        Alert.alert("Error", "No se pudo abrir el chat");
      } finally {
        setActionLoading(null);
      }
    } else {
      setActionLoading(targetUser.$id);
      try {
        await followUser(currentUser.$id, targetUser.$id);
        setMyFollowingIds((prev) => [...prev, targetUser.$id]);
      } catch (error) {
        console.error("Error following:", error);
      } finally {
        setActionLoading(null);
      }
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isMe = currentUser?.$id === item.$id;
    const isFollowing = myFollowingIds.includes(item.$id);
    const isLoadingThis = actionLoading === item.$id;

    return (
      <View className="flex-row items-center justify-between py-3 px-4 w-full">
        <TouchableOpacity
          className="flex-row items-center flex-1"
          onPress={() => router.push(`/user/${item.$id}` as any)}
        >
          <Image
            source={
              item.pfp ? { uri: item.pfp } : require("@/assets/noPfp.jpg")
            }
            className="w-14 h-14 rounded-full border border-gray-200 dark:border-gray-800"
            style={{ backgroundColor: cardBg }}
          />
          <View className="ml-3 flex-1">
            <Text className="font-bold text-base" style={{ color: textColor }}>
              {item.username}
            </Text>
            <Text className="text-sm" style={{ color: subTextColor }}>
              {item.name}
            </Text>
          </View>
        </TouchableOpacity>
        {!isMe && (
          <TouchableOpacity
            onPress={() => handleAction(item)}
            disabled={isLoadingThis}
            className={`px-5 py-2 rounded-lg items-center justify-center min-w-[100px] ${
              isFollowing ? "bg-gray-200 dark:bg-gray-800" : "bg-[#5E17EB]"
            }`}
          >
            {isLoadingThis ? (
              <ActivityIndicator
                size="small"
                color={isFollowing ? textColor : "white"}
              />
            ) : (
              <Text
                className="font-semibold text-sm"
                style={{ color: isFollowing ? textColor : "white" }}
              >
                {isFollowing ? "Message" : "Follow"}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: bgColor }}>
      <View
        className="flex-row items-center px-4 py-3 border-b"
        style={{ borderColor: isDark ? "#27272A" : "#E5E7EB" }}
      >
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text className="text-lg font-bold" style={{ color: textColor }}>
          {type === "followers" ? "Followers" : "Following"}
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={activeColor} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.$id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 10 }}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Text style={{ color: subTextColor }}>No users found.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchData}
              tintColor={activeColor}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

export default UserList;
