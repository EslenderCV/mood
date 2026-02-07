import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  StyleSheet,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import {
  getDeezerTrackUrl,
  toggleLikePost,
  toggleSavePost,
  followUser,
  getFollowedUserIds,
} from "@/lib/appwrite";
import { parseSongData, getCreatorFromPost } from "@/utils/exploreHelpers";
import CommentsSheet from "./CommentsSheet";

import { tStatic } from "@/context/LanguageContext";
// 🔥 1. IMPORTAR EL CONTEXTO
import { useAudioContext } from "@/context/AudioContext";

const { width, height } = Dimensions.get("window");

const FullScreenPostItem = React.memo(
  ({ item, isActive, currentUser, onOption, onClose }: any) => {
    const insets = useSafeAreaInsets();
    const song = parseSongData(item.songData);
    const songId = song?.id;
    const songSpotifyId = song?.spotifyId;
    const songPreview = song?.preview;
    const creator = getCreatorFromPost(item);

    // 🔥 2. OBTENER LA FUNCIÓN PARA DETENER EL AUDIO GLOBAL
    const { stopTrack } = useAudioContext();

    const [isLiked, setIsLiked] = useState(
      item.likedBy?.includes(currentUser?.$id) || false,
    );
    const [likesCount, setLikesCount] = useState(item.likedBy?.length || 0);
    const [isSaved, setIsSaved] = useState(
      item.savedBy?.includes(currentUser?.$id) || false,
    );
    const [isFollowing, setIsFollowing] = useState(false);
    const [showComments, setShowComments] = useState(false);

    const soundRef = useRef<Audio.Sound | null>(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);

    useEffect(() => {
      let isMounted = true;
      const checkFollow = async () => {
        if (currentUser && creator.id && creator.id !== "unknown") {
          try {
            const followedIds = await getFollowedUserIds(currentUser.$id);
            if (isMounted && followedIds.includes(creator.id))
              setIsFollowing(true);
          } catch (e) {
            console.log("Error checking follow", e);
          }
        }
      };
      checkFollow();
      return () => {
        isMounted = false;
      };
    }, [currentUser, creator.id]);

    useEffect(() => {
      let isMounted = true;
      const manageAudio = async () => {
        try {
          if (isActive) {
            // 🔥 3. SI EL POST ES ACTIVO, DETENER MÚSICA GLOBAL
            // Esto cierra la barra global y evita cacofonía, pero NO reemplaza los datos de la barra.
            void stopTrack();

            let previewUrl = songPreview;
            if (!previewUrl && (songId || songSpotifyId)) {
              previewUrl = await getDeezerTrackUrl(songId || songSpotifyId);
            }
            if (previewUrl && isMounted) {
              const { sound } = await Audio.Sound.createAsync(
                { uri: previewUrl },
                { shouldPlay: true, isLooping: true },
              );
              soundRef.current = sound;
              setIsAudioPlaying(true);
            }
          } else {
            if (soundRef.current) {
              await soundRef.current.unloadAsync();
              soundRef.current = null;
              setIsAudioPlaying(false);
            }
          }
        } catch (e) {
          console.log("Audio Error:", e);
        }
      };
      manageAudio();
      return () => {
        isMounted = false;
        if (soundRef.current) soundRef.current.unloadAsync();
      };
    }, [isActive, songId, songPreview, songSpotifyId, stopTrack]);

    const togglePlayback = async () => {
      if (soundRef.current) {
        if (isAudioPlaying) {
          await soundRef.current.pauseAsync();
          setIsAudioPlaying(false);
        } else {
          // 🔥 4. ASEGURAR QUE AL DAR PLAY MANUAL, TAMBIÉN SE CALLE LO GLOBAL
          stopTrack();
          await soundRef.current.playAsync();
          setIsAudioPlaying(true);
        }
      }
    };

    const handleFollow = async () => {
      if (!currentUser || !creator.id) return;
      setIsFollowing(true);
      try {
        await followUser(currentUser.$id, creator.id);
      } catch {
        setIsFollowing(false);
        Alert.alert(tStatic("ui.s_902b0d55"), tStatic("ui.s_73e191f0"));
      }
    };

    const handleLike = async () => {
      if (!currentUser) return;
      const prevLiked = isLiked;
      setIsLiked(!prevLiked);
      setLikesCount(prevLiked ? likesCount - 1 : likesCount + 1);
      try {
        await toggleLikePost(item.$id, currentUser.$id, item.likedBy || []);
      } catch {
        setIsLiked(prevLiked);
      }
    };

    const handleSave = async () => {
      if (!currentUser) return;
      setIsSaved(!isSaved);
      try {
        await toggleSavePost(item.$id, currentUser.$id);
      } catch {
        setIsSaved(isSaved);
      }
    };

    return (
      <View style={{ height: height, width: width, backgroundColor: "#000" }}>
        <Image
          source={{ uri: song?.cover }}
          style={StyleSheet.absoluteFillObject}
          blurRadius={50}
          className="opacity-40"
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.8)"]}
          style={StyleSheet.absoluteFillObject}
        />

        <View
          className="absolute top-0 w-full z-50 flex-row justify-between items-center px-4"
          style={{ paddingTop: insets.top + 10 }}
        >
          <TouchableOpacity
            onPress={onClose}
            className="w-10 h-10 bg-black/20 rounded-full items-center justify-center backdrop-blur-md"
          >
            <Ionicons name="chevron-down" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white/80 font-bold text-xs uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full backdrop-blur-md">{tStatic("ui.s_65f35e27")}</Text>
          <TouchableOpacity
            onPress={() => onOption(item)}
            className="w-10 h-10 bg-black/20 rounded-full items-center justify-center backdrop-blur-md"
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <TouchableWithoutFeedback onPress={togglePlayback}>
          <View className="flex-1 justify-center items-center">
            <View
              className="w-64 h-64 rounded-3xl shadow-2xl bg-zinc-900 border border-white/10"
              style={{ elevation: 10 }}
            >
              <Image
                source={{ uri: song?.cover }}
                className="w-full h-full rounded-3xl"
              />
              {!isAudioPlaying && isActive && (
                <View className="absolute inset-0 items-center justify-center bg-black/40 rounded-3xl">
                  <Ionicons
                    name="play"
                    size={50}
                    color="white"
                    style={{ opacity: 0.9 }}
                  />
                </View>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>

        <View className="absolute right-2 bottom-32 items-center gap-6 z-20">
          <TouchableOpacity
            onPress={() => {
              onClose();
              router.push(`/user/${creator.id}` as any);
            }}
            className="items-center mb-2"
          >
            <View className="w-12 h-12 rounded-full border-2 border-white bg-black p-0.5">
              <Image
                source={
                  creator.avatar
                    ? { uri: creator.avatar }
                    : require("@/assets/noPfp.jpg")
                }
                className="w-full h-full rounded-full"
              />
            </View>
            {!isFollowing && currentUser?.$id !== creator.id && (
              <TouchableOpacity
                onPress={handleFollow}
                className="bg-[#5E17EB] rounded-full w-5 h-5 items-center justify-center absolute -bottom-2 shadow-sm"
              >
                <Ionicons name="add" size={14} color="white" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLike} className="items-center">
            <Ionicons
              name={isLiked ? "heart" : "heart"}
              size={36}
              color={isLiked ? "#EF4444" : "white"}
              style={{ opacity: isLiked ? 1 : 0.9 }}
            />
            <Text className="text-white text-xs font-bold mt-1">
              {likesCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowComments(true)}
            className="items-center"
          >
            <Ionicons name="chatbubble-ellipses" size={34} color="white" />
            <Text className="text-white text-xs font-bold mt-1">{tStatic("ui.s_55dcdf01")}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} className="items-center">
            <Ionicons
              name="bookmark"
              size={34}
              color={isSaved ? "#5E17EB" : "white"}
            />
            <Text className="text-white text-xs font-bold mt-1">{tStatic("ui.s_c9cc8cce")}</Text>
          </TouchableOpacity>
        </View>

        <View className="absolute bottom-0 w-[75%] px-4 pb-8 z-10 pointer-events-none">
          <TouchableOpacity
            onPress={() => router.push(`/user/${creator.id}` as any)}
          >
            <Text className="text-white font-bold text-lg mb-1 shadow-sm">
              @{creator.username}
            </Text>
          </TouchableOpacity>
          <Text
            className="text-white/90 text-sm mb-3 leading-5 shadow-sm"
            numberOfLines={3}
          >
            {item.comment}
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="musical-notes" size={14} color="white" />
            <Text
              className="text-white text-xs ml-2 font-medium"
              numberOfLines={1}
            >
              {song?.title} - {song?.artist}
            </Text>
          </View>
        </View>

        <CommentsSheet
          visible={showComments}
          onClose={() => setShowComments(false)}
          postId={item.$id}
          currentUser={currentUser}
        />
      </View>
    );
  },
);


FullScreenPostItem.displayName = "FullScreenPostItem";

export default FullScreenPostItem;