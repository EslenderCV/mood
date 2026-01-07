import {
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ViewShot, { captureRef } from "react-native-view-shot";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const MOOD_PURPLE = "#5E17EB";
const MOOD_DARK = "#000000";

interface Props {
  isVisible: boolean;
  onClose: () => void;
  post: {
    title: string;
    artist: string;
    cover: string | null;
    originalPostCreator: string;
    creatorPfp?: string;
    comment?: string;
  } | null;
}

type CardMode = "square" | "story" | "quote";

export default function MoodShareCard({ isVisible, onClose, post }: Props) {
  const viewShotRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<CardMode>("story");
  const canvasWidth = SCREEN_WIDTH * 0.85;
  const canvasHeight = mode === "square" ? canvasWidth : (canvasWidth * 16) / 9;
  const isSquare = mode === "square";
  const isQuote = mode === "quote";
  const getCoverSize = () => {
    if (isQuote) return canvasWidth * 0.25;
    if (isSquare) return canvasWidth * 0.55;
    return canvasWidth * 0.75;
  };

  const handleCapture = async () => {
    Haptics.selectionAsync();
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const uri = await captureRef(viewShotRef, {
        format: "jpg",
        quality: 1.0,
        result: "tmpfile",
      });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Error", "Compartir no disponible.");
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: "image/jpeg",
        dialogTitle: `Compartir en Mood`,
        UTI: "public.jpeg",
      });
    } catch (error) {
      console.error("Fallo captura", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible || !post) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/95 justify-center items-center">
        <View className="absolute top-12 w-full flex-row justify-between items-center px-6 z-10">
          <TouchableOpacity
            onPress={onClose}
            className="bg-zinc-800/80 p-2 rounded-full border border-white/5"
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-row bg-zinc-800/80 rounded-full p-1 border border-zinc-700">
            <TouchableOpacity
              onPress={() => setMode("square")}
              className={`px-4 py-1.5 rounded-full ${
                mode === "square" ? "bg-white" : ""
              }`}
            >
              <Text
                className={`font-bold text-xs ${
                  mode === "square" ? "text-black" : "text-zinc-400"
                }`}
              >
                1:1
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMode("story")}
              className={`px-4 py-1.5 rounded-full ${
                mode === "story" ? "bg-white" : ""
              }`}
            >
              <Text
                className={`font-bold text-xs ${
                  mode === "story" ? "text-black" : "text-zinc-400"
                }`}
              >
                Story
              </Text>
            </TouchableOpacity>
            {post.comment && (
              <TouchableOpacity
                onPress={() => setMode("quote")}
                className={`px-4 py-1.5 rounded-full ${
                  mode === "quote" ? "bg-white" : ""
                }`}
              >
                <Text
                  className={`font-bold text-xs ${
                    mode === "quote" ? "text-black" : "text-zinc-400"
                  }`}
                >
                  Quote
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View
          style={{
            width: canvasWidth,
            height: canvasHeight,
            borderRadius: 24,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(94, 23, 235, 0.2)",
            elevation: 20,
            shadowColor: MOOD_PURPLE,
            shadowOpacity: 0.6,
            shadowRadius: 50,
          }}
        >
          <ViewShot
            ref={viewShotRef}
            options={{ format: "jpg", quality: 1.0 }}
            style={{ flex: 1 }}
          >
            <LinearGradient
              colors={[MOOD_DARK, "#1a0b2e", "#000000"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flex: 1,
                padding: 24,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View className="absolute top-0 left-0 w-full h-full opacity-40">
                <View className="absolute top-[-20%] right-[-30%] w-[300px] h-[300px] rounded-full bg-[#5E17EB] blur-[80px]" />
                <View className="absolute bottom-[-10%] left-[-20%] w-[250px] h-[250px] rounded-full bg-indigo-900 blur-[60px]" />
              </View>
              <View className="w-full flex-row justify-center mt-2 z-10">
                <View className="flex-row items-center bg-black/20 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
                  <Ionicons
                    name="musical-notes"
                    size={12}
                    color={MOOD_PURPLE}
                    style={{ marginRight: 6 }}
                  />
                  <Text className="text-white/80 font-bold text-[10px] tracking-widest uppercase">
                    Mood
                  </Text>
                </View>
              </View>
              <View className="items-center justify-center flex-1 w-full relative">
                {isQuote && post.comment ? (
                  <View className="w-full items-center justify-center">
                    <MaterialCommunityIcons
                      name="format-quote-open"
                      size={120}
                      color="rgba(255,255,255,0.05)"
                      style={{ position: "absolute", top: -40, left: 0 }}
                    />
                    <MaterialCommunityIcons
                      name="format-quote-close"
                      size={120}
                      color="rgba(255,255,255,0.05)"
                      style={{ position: "absolute", bottom: -40, right: 0 }}
                    />
                    <Text
                      className="text-white text-center font-bold italic leading-8 shadow-sm"
                      style={{ fontSize: post.comment.length > 100 ? 20 : 26 }}
                    >
                      "{post.comment}"
                    </Text>
                    <View className="w-12 h-1 bg-[#5E17EB] rounded-full my-6 opacity-80" />
                    <View className="flex-row items-center bg-white/5 p-3 rounded-2xl border border-white/10 w-full max-w-[90%]">
                      <Image
                        source={{
                          uri: post?.cover || "https://via.placeholder.com/150",
                        }}
                        style={{ width: 50, height: 50, borderRadius: 10 }}
                      />
                      <View className="ml-3 flex-1">
                        <Text
                          className="text-white font-bold text-sm"
                          numberOfLines={1}
                        >
                          {post?.title}
                        </Text>
                        <Text
                          className="text-zinc-400 text-xs"
                          numberOfLines={1}
                        >
                          {post?.artist}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View className="items-center" style={{ width: "100%" }}>
                    <View
                      className="rounded-2xl shadow-2xl bg-zinc-900"
                      style={{
                        shadowColor: MOOD_PURPLE,
                        shadowOffset: { width: 0, height: 12 },
                        shadowOpacity: 0.5,
                        shadowRadius: 24,
                        elevation: 20,
                        padding: 0,
                      }}
                    >
                      <Image
                        source={{
                          uri: post?.cover || "https://via.placeholder.com/300",
                        }}
                        style={{
                          width: getCoverSize(),
                          height: getCoverSize(),
                          borderRadius: 18,
                        }}
                        resizeMode="cover"
                      />
                    </View>

                    <View className="mt-6 items-center w-full px-4">
                      <Text
                        className="text-white font-black text-center"
                        style={{
                          fontSize: isSquare ? 22 : 26,
                          lineHeight: isSquare ? 26 : 30,
                          textShadowColor: "rgba(94, 23, 235, 0.5)",
                          textShadowOffset: { width: 0, height: 0 },
                          textShadowRadius: 10,
                        }}
                        numberOfLines={2}
                      >
                        {post?.title || "Canción"}
                      </Text>
                      <Text
                        className="text-zinc-300 font-medium text-center mt-2 tracking-wide"
                        style={{ fontSize: isSquare ? 14 : 16 }}
                        numberOfLines={1}
                      >
                        {post?.artist || "Artista"}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
              <View className="w-full flex-row justify-between items-end z-10">
                <View className="flex-row items-center bg-black/30 p-1.5 pr-4 rounded-full border border-white/5 backdrop-blur-md">
                  <Image
                    source={{
                      uri:
                        post.creatorPfp ||
                        "https://cloud.appwrite.io/v1/avatars/initials?name=User",
                    }}
                    className="w-8 h-8 rounded-full border border-zinc-600 bg-zinc-800"
                  />
                  <View className="ml-2">
                    <Text className="text-zinc-400 text-[8px] uppercase font-bold tracking-wide">
                      Shared by
                    </Text>
                    <Text className="text-white font-bold text-xs">
                      @{post?.originalPostCreator || "user"}
                    </Text>
                  </View>
                </View>

                <View className="flex-row gap-3 opacity-90 pb-2">
                  <FontAwesome5 name="spotify" size={20} color="#1DB954" />
                  <FontAwesome5 name="apple" size={20} color="white" />
                </View>
              </View>
            </LinearGradient>
          </ViewShot>
        </View>
        <View className="absolute bottom-12 w-full flex-row justify-center px-6">
          {loading ? (
            <View className="bg-zinc-800/80 px-8 py-4 rounded-full">
              <ActivityIndicator size="small" color={MOOD_PURPLE} />
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleCapture}
              className="flex-row items-center px-8 py-4 rounded-full shadow-lg shadow-purple-900/40 w-full justify-center"
              style={{ backgroundColor: MOOD_PURPLE }}
            >
              <Ionicons
                name="share-social"
                size={22}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text className="text-white font-bold text-lg">
                Compartir {isQuote ? "Quote" : "Canción"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
