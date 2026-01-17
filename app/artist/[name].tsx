import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { StatusBar } from "expo-status-bar";

// Imports de lógica
import { getFeedCandidates } from "@/lib/appwrite";
import { parseSongData, normalize } from "@/utils/exploreHelpers";
import PostItem from "@/components/PostItem";
import { useGlobalContext } from "@/context/GlobalProvider";

// Componentes de Modal (Opcional: Si quieres que funcionen las opciones/share desde aquí también)
import OptionsModal from "@/components/OptionsModal";
import ShareModal from "@/components/ShareModal";
// Nota: Puedes reutilizar la lógica de modales de home o explore si deseas full interactividad.
// Por ahora, haremos una lista simple visualizable.

const ArtistPosts = () => {
  const { name } = useLocalSearchParams();
  const artistName = decodeURIComponent(name as string);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useGlobalContext();

  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Colores
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";

  useEffect(() => {
    fetchArtistPosts();
  }, [artistName]);

  const fetchArtistPosts = async () => {
    setIsLoading(true);
    try {
      // Obtenemos todos los candidatos del feed (igual que en Explore)
      // Nota: En una app real con millones de posts, esto debería ser una Query al backend.
      // Como Appwrite guarda JSON en string, filtramos en el cliente por ahora.
      const allPosts = await getFeedCandidates();

      const filtered = allPosts.filter((post: any) => {
        const song = parseSongData(post.songData);
        if (!song) return false;
        // Comparamos el nombre normalizado (sin mayúsculas/espacios extra)
        return normalize(song.artist) === normalize(artistName);
      });

      setPosts(filtered);
    } catch (error) {
      console.log("Error fetching artist posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header Simple */}
      <View className="flex-row items-center px-4 py-3 border-b border-zinc-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="font-bold text-lg" style={{ color: textColor }}>
            {artistName}
          </Text>
          <Text className="text-xs" style={{ color: subTextColor }}>
            Canciones en Mood
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#5E17EB" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.$id}
          contentContainerStyle={{ paddingBottom: 50 }}
          renderItem={({ item }) => (
            <View className="py-4 border-b border-zinc-800">
              <PostItem
                post={item}
                currentUserId={user?.$id || ""}
                // Navegación básica
                onProfilePress={(id) => router.push(`/user/${id}` as any)}
                onCommentPress={(id) => router.push(`/post/${id}` as any)}
                // Placeholder para opciones (puedes conectar la lógica completa si quieres)
                onOptionsPress={() => {}}
                onSharePress={() => {}}
              />
            </View>
          )}
          ListEmptyComponent={
            <View className="py-20 items-center">
              <Ionicons
                name="musical-notes-outline"
                size={48}
                color={subTextColor}
              />
              <Text
                className="mt-4 font-medium"
                style={{ color: subTextColor }}
              >
                No se encontraron posts de este artista.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default ArtistPosts;
