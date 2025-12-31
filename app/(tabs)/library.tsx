import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  Linking,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import React, { useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import { useColorScheme } from "nativewind";

import {
  GestureHandlerRootView,
  FlingGestureHandler,
  Directions,
  State,
} from "react-native-gesture-handler";

import { getSavedPosts } from "@/lib/appwrite";
import { useGlobalContext } from "@/context/GlobalProvider";

const Library = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const cardBg = isDark ? "#18181B" : "#F4F4F5";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const iconColor = isDark ? "#A1A1AA" : "#52525B";
  const emptyIconColor = isDark ? "#27272A" : "#E4E4E7";

  const { user } = useGlobalContext();
  const [activeTab, setActiveTab] = useState("Colección");

  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [musicCollection, setMusicCollection] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLibrary = async () => {
    if (!user) return;
    try {
      const savedDocs = await getSavedPosts(user.$id);
      setSavedPosts(savedDocs);

      const musicOnly = savedDocs
        .map((post) => {
          try {
            if (!post.songData) return null;
            const song = JSON.parse(post.songData);
            if (song.cover && song.cover.includes("100x100bb")) {
              song.cover = song.cover.replace("100x100bb", "600x600bb");
            }

            let creatorName = "anon";
            if (post.postedBy) {
              creatorName =
                post.postedBy.username || post.postedBy.name || "Usuario";
            }

            return {
              ...song,
              id: post.$id,
              originalPostCreator: creatorName,
            };
          } catch (e) {
            return null;
          }
        })
        .filter((item) => item !== null);

      setMusicCollection(musicOnly);
    } catch (error) {
      console.log("Error cargando librería:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLibrary();
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLibrary();
    setRefreshing(false);
  };

  const handleFlingRight = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.ACTIVE) {
      router.push("/explore");
    }
  };

  const openExternalMusic = async (song: any) => {
    const cleanTitle = song.title ? song.title.split("(")[0].trim() : "";
    const query = `${cleanTitle} ${song.artist}`;
    const platform = user?.preferredPlatform || "spotify";

    let appUrl = "";
    let webUrl = "";

    if (platform === "apple") {
      appUrl = `music://music.apple.com/us/search?term=${encodeURIComponent(
        query
      )}`;
      webUrl = `https://music.apple.com/us/search?term=${encodeURIComponent(
        query
      )}`;
    } else {
      appUrl = `spotify:search:${encodeURIComponent(query)}`;
      webUrl = `https://open.spotify.com/search/${encodeURIComponent(query)}`;
    }

    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (err) {
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(
        query + " " + platform
      )}`;
      await Linking.openURL(googleUrl);
    }
  };

  const renderCollectionItem = ({ item }: { item: any }) => {
    const platform = user?.preferredPlatform || "spotify";
    const iconName = platform === "apple" ? "apple" : "spotify";
    const btnColor = platform === "apple" ? "bg-[#FA243C]" : "bg-[#1DB954]";

    return (
      <View
        className="flex-row items-center justify-between mb-3 p-3 rounded-2xl border"
        style={{ backgroundColor: cardBg, borderColor: borderColor }}
      >
        <View className="flex-row items-center flex-1 mr-2">
          <Image
            source={{ uri: item.cover }}
            className="w-14 h-14 rounded-xl"
            style={{ backgroundColor: isDark ? "#27272A" : "#E4E4E7" }}
          />
          <View className="ml-3 flex-1">
            <Text
              className="font-bold text-base"
              numberOfLines={1}
              style={{ color: textColor }}
            >
              {item.title}
            </Text>
            <Text
              className="text-sm"
              numberOfLines={1}
              style={{ color: subTextColor }}
            >
              {item.artist}
            </Text>
            <View className="flex-row items-center mt-1">
              <Ionicons name="flash" size={10} color="#EAB308" />
              <Text className="text-yellow-600 dark:text-yellow-200 text-[10px] ml-1 font-bold">
                Vía @{item.originalPostCreator}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => openExternalMusic(item)}
          className={`${btnColor} px-4 py-2 rounded-full flex-row items-center justify-center`}
        >
          <FontAwesome5
            name={iconName}
            size={16}
            color="white"
            style={{ marginRight: 6 }}
          />
          <Text className="text-white font-bold text-xs uppercase">Abrir</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSavedPost = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: "/post/[id]",
          params: { id: item.$id, content: item.comment },
        })
      }
      activeOpacity={0.7}
      className="p-4 rounded-xl mb-3 border"
      style={{ backgroundColor: cardBg, borderColor: borderColor }}
    >
      <View className="flex-row items-center mb-2 justify-between">
        <View className="flex-row items-center">
          <Text className="text-xs font-bold" style={{ color: subTextColor }}>
            @{item.postedBy?.username || "usuario"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={iconColor} />
      </View>
      <Text
        className="text-base"
        numberOfLines={3}
        style={{ color: textColor }}
      >
        {item.comment}
      </Text>
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FlingGestureHandler
        direction={Directions.RIGHT}
        onHandlerStateChange={handleFlingRight}
      >
        <View style={{ flex: 1 }}>
          <SafeAreaView
            className="flex-1"
            edges={["top"]}
            style={{ backgroundColor: bgColor }}
          >
            <StatusBar style={isDark ? "light" : "dark"} />

            <View className="px-6 pt-6 pb-4">
              <Text
                className="text-3xl font-bold mb-1"
                style={{ color: textColor }}
              >
                Tu Librería
              </Text>
              <Text className="text-sm" style={{ color: subTextColor }}>
                Tus descubrimientos guardados.
              </Text>
            </View>

            <View
              className="flex-row px-6 mt-4 mb-6 border-b pb-4"
              style={{ borderColor: borderColor }}
            >
              <TouchableOpacity
                onPress={() => setActiveTab("Colección")}
                className={`mr-6 ${
                  activeTab === "Colección" ? "opacity-100" : "opacity-40"
                }`}
              >
                <Text
                  className="font-bold text-lg"
                  style={{ color: textColor }}
                >
                  Música ({musicCollection.length})
                </Text>
                {activeTab === "Colección" && (
                  <View className="h-1 w-full bg-[#5E17EB] rounded-full mt-1" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab("Guardados")}
                className={`mr-6 ${
                  activeTab === "Guardados" ? "opacity-100" : "opacity-40"
                }`}
              >
                <Text
                  className="font-bold text-lg"
                  style={{ color: textColor }}
                >
                  Posts ({savedPosts.length})
                </Text>
                {activeTab === "Guardados" && (
                  <View className="h-1 w-full bg-[#5E17EB] rounded-full mt-1" />
                )}
              </TouchableOpacity>
            </View>

            <FlatList
              data={activeTab === "Colección" ? musicCollection : savedPosts}
              keyExtractor={(item) => item.id || item.$id}
              renderItem={
                activeTab === "Colección"
                  ? renderCollectionItem
                  : renderSavedPost
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingBottom: 100,
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#5E17EB"
                />
              }
              ListEmptyComponent={
                !isLoading ? (
                  <View className="items-center justify-center py-20">
                    <Ionicons
                      name="bookmark-outline"
                      size={60}
                      color={emptyIconColor}
                    />
                    <Text
                      className="mt-4 font-bold text-lg text-center"
                      style={{ color: textColor }}
                    >
                      Nada por aquí
                    </Text>
                    <Text
                      className="text-center mt-2 px-6"
                      style={{ color: subTextColor }}
                    >
                      Usa el botón de Guardar en el Feed para agregar contenido.
                    </Text>
                  </View>
                ) : (
                  <ActivityIndicator
                    color="#5E17EB"
                    size="large"
                    className="mt-10"
                  />
                )
              }
            />
          </SafeAreaView>
        </View>
      </FlingGestureHandler>
    </GestureHandlerRootView>
  );
};

export default Library;
