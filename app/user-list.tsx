import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useGlobalContext } from "@/context/GlobalProvider";
import { useLanguage } from "@/context/LanguageContext";
import { getUserFollowers, getUserFollowing } from "@/lib/appwrite";

const UserList = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();
  const { user: currentUser } = useGlobalContext();

  const params = useLocalSearchParams();
  const userId = params.userId as string;
  const type = params.type as "followers" | "following";

  // Colores
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const cardBg = isDark ? "#18181B" : "#F4F4F5";
  const iconColor = isDark ? "#FFFFFF" : "#000000";

  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId, type]);

  const fetchData = async () => {
    if (!userId) return;
    try {
      let data = [];
      if (type === "followers") {
        data = await getUserFollowers(userId);
      } else {
        data = await getUserFollowing(userId);
      }
      setUsers(data);
    } catch (error) {
      console.log("Error fetching user list:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handlePressUser = (item: any) => {
    if (item.$id === currentUser?.$id) {
      router.push("/(tabs)/profile");
    } else {
      router.push({
        pathname: "/user/[id]",
        params: {
          id: item.$id,
          username: item.username,
          name: item.name,
          avatar: item.pfp,
        },
      } as any);
    }
  };

  const getTitle = () => {
    if (type === "followers") return t("userList.followers");
    if (type === "following") return t("userList.following");
    return t("userList.title");
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => handlePressUser(item)}
      activeOpacity={0.7}
      className="flex-row items-center px-5 py-4 border-b"
      style={{ borderColor: borderColor, backgroundColor: bgColor }}
    >
      <Image
        source={item.pfp ? { uri: item.pfp } : require("@/assets/noPfp.jpg")}
        className="w-12 h-12 rounded-full"
        style={{ backgroundColor: cardBg }}
      />
      <View className="ml-4 flex-1">
        <Text
          className="font-bold text-base"
          style={{ color: textColor }}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text
          className="text-sm mt-0.5"
          style={{ color: subTextColor }}
          numberOfLines={1}
        >
          @{item.username}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={subTextColor} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: bgColor }}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        className="flex-row items-center px-4 h-[50px] border-b"
        style={{ borderColor: borderColor }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 rounded-full"
        >
          <Ionicons name="arrow-back" size={24} color={iconColor} />
        </TouchableOpacity>
        <Text
          className="font-bold text-xl ml-2 capitalize"
          style={{ color: textColor }}
        >
          {getTitle()}
        </Text>
      </View>

      {/* Lista */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#5E17EB" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.$id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#5E17EB"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center mt-20 px-10">
              <Ionicons
                name="people-outline"
                size={48}
                color={subTextColor}
                style={{ opacity: 0.5, marginBottom: 10 }}
              />
              <Text className="text-center" style={{ color: subTextColor }}>
                {type === "followers"
                  ? t("userList.emptyFollowers")
                  : t("userList.emptyFollowing")}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default UserList;
