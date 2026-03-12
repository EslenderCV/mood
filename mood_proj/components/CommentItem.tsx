import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  ActionSheetIOS,
} from "react-native";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { toggleCommentLike, searchUsers, getUser } from "@/lib/appwrite";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";
import { tStatic, useLanguage } from "@/context/LanguageContext";
import { formatTimeAgo } from "@/lib/postUtils";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";

// 🔥 Importamos el contexto para pausar/reanudar la música global
import { useAudioContext } from "@/context/AudioContext";

interface CommentProps {
  item: any;
  currentUserId: string;
  onReply: (item: any) => void;
  onDelete?: (commentId: string) => void;
  allComments: any[];
  depth?: number;
}

// Función de caché (se mantiene igual)
async function getCachedVoiceUri(remoteUrl: string) {
  try {
    const fileIdMatch = remoteUrl.match(/files\/([^\/]+)\//);
    let uniqueId = "";
    if (fileIdMatch && fileIdMatch[1]) {
      uniqueId = fileIdMatch[1];
    } else {
      uniqueId = remoteUrl.replace(/[^a-zA-Z0-9]/g, "").slice(-30);
    }

    const cacheDir = FileSystem.cacheDirectory || "";
    const localUri = `${cacheDir}voice_${uniqueId}.m4a`;

    const info = await FileSystem.getInfoAsync(localUri);
    if (!info.exists) {
      await FileSystem.downloadAsync(remoteUrl, localUri);
    }
    return localUri;
  } catch (error) {
    console.error("Error caching voice:", error);
    return remoteUrl;
  }
}

const CommentItem = ({
  item,
  currentUserId,
  onReply,
  onDelete,
  allComments,
  depth = 0,
}: CommentProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();

  // 🔥 Contexto Global (para pausar/reanudar música de fondo)
  const {
    pauseTrack: pauseGlobalTrack,
    resumeTrack: resumeGlobalTrack,
    isPlaying: isGlobalPlaying,
  } = useAudioContext();

  const textColor = isDark ? "#FAFAFA" : "#18181B";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const lineColor = isDark ? "#3F3F46" : "#E4E4E7";

  const [likes, setLikes] = useState<string[]>(item.likedBy || []);
  const [showReplies, setShowReplies] = useState(false);
  const [userData, setUserData] = useState<any>(item.user || null);

  // 🔥 Estados LOCALES para la nota de voz (ya no usamos playTrack global aquí)
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Referencia para recordar si debemos reanudar la música global al terminar
  const shouldResumeGlobalRef = useRef(false);

  const isOwner = currentUserId === item.userId;

  let isVoice = false;
  let voiceData: any = null;
  let contentText = item.content || item.body || "";
  let isUrlValid = false;

  if (typeof contentText === "object" && contentText !== null) {
    if (contentText.type === "voice_vibe" || contentText.audioUrl) {
      isVoice = true;
      voiceData = contentText;
    }
  } else if (typeof contentText === "string") {
    const trimmed = contentText.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.type === "voice_vibe" || parsed.audioUrl) {
          isVoice = true;
          voiceData = parsed;
        }
      } catch {
        isVoice = false;
      }
    }
  }

  if (
    isVoice &&
    voiceData?.audioUrl &&
    typeof voiceData.audioUrl === "string"
  ) {
    isUrlValid = true;
  }

  useEffect(() => {
    setLikes(item.likedBy || []);
  }, [item.likedBy]);

  useEffect(() => {
    let isMounted = true;
    if (!userData && item.userId) {
      getUser(item.userId)
        .then((res) => {
          if (isMounted && res) setUserData(res);
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [item.userId, userData]);

  // Limpieza al desmontar: detener audio local y liberar memoria
  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  const displayName = userData?.name || item.username || "Usuario";
  const isVerified = userData?.isVerified || item.isVerified;
  const avatarUrl = userData?.pfp || item.avatar;
  const isLiked = likes.includes(currentUserId);

  const replies = useMemo(() => {
    return allComments.filter((c) => c.parentId === item.$id);
  }, [allComments, item.$id]);

  const handleLike = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newLikes = isLiked
      ? likes.filter((id) => id !== currentUserId)
      : [...likes, currentUserId];
    setLikes(newLikes);
    try {
      await toggleCommentLike(item.$id, currentUserId, likes);
    } catch {
      setLikes(likes);
    }
  };

  const handleDeletePress = () => {
    Alert.alert(tStatic("ui.s_47d8c19f"), tStatic("ui.s_83227328"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            if (onDelete) onDelete(item.$id);
          },
        },
      ],
    );
  };

  const handleOptionsPress = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t("common.cancel"), t("comments.deleteComment")],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleDeletePress();
        },
      );
    } else {
      Alert.alert(tStatic("ui.s_8877f3a2"), tStatic("ui.s_581696c1"), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.delete"), onPress: handleDeletePress },
      ]);
    }
  };

  // 🔥 LÓGICA DE REPRODUCCIÓN: INTERRUPCIÓN INTELIGENTE
  const handlePlayVoice = async () => {
    if (!isUrlValid) {
      Alert.alert(tStatic("ui.s_8734dcc8"), tStatic("ui.s_6dba6580"));
      return;
    }

    // 1. Si ya está sonando ESTE audio local, lo pausamos
    if (isPlaying && sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
      return;
    }

    // 2. Si está pausado pero cargado, reanudamos
    if (sound) {
      // Antes de reanudar local, pausamos global si está sonando
      if (isGlobalPlaying) {
        shouldResumeGlobalRef.current = true;
        await pauseGlobalTrack();
      }
      await sound.playAsync();
      setIsPlaying(true);
      return;
    }

    // 3. Primera reproducción (Cargar y Play)
    try {
      // a) Si hay música global sonando, la pausamos y recordamos reanudarla después
      if (isGlobalPlaying) {
        shouldResumeGlobalRef.current = true;
        await pauseGlobalTrack();
      } else {
        shouldResumeGlobalRef.current = false;
      }

      // b) Forzar salida por altavoz
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      let playUri = voiceData.audioUrl;
      if (Platform.OS === "ios") {
        playUri = await getCachedVoiceUri(voiceData.audioUrl);
      }

      // c) Crear sonido local
      const { sound: voiceSound } = await Audio.Sound.createAsync(
        { uri: playUri },
        { shouldPlay: true, volume: 1.0 },
      );
      setSound(voiceSound);
      setIsPlaying(true);

      // d) Escuchar cuando termine
      voiceSound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          // Reiniciar posición del audio local por si quieren oírlo de nuevo
          await voiceSound.setPositionAsync(0);
          await voiceSound.pauseAsync();

          // 🔥 e) REANUDAR MÚSICA GLOBAL SI ESTABA SONANDO
          if (shouldResumeGlobalRef.current) {
            shouldResumeGlobalRef.current = false; // Resetear flag
            await resumeGlobalTrack();
          }
        }
      });
    } catch (e) {
      console.log("Error playing voice:", e);
      Alert.alert(tStatic("ui.s_902b0d55"), tStatic("ui.s_2e4228cd"));
    }
  };

  const handleMentionPress = async (username: string) => {
    try {
      const users = await searchUsers(username);
      const targetUser = users.find((u) => u.username === username);
      if (targetUser) router.push(`/user/${targetUser.$id}` as any);
      else
        Alert.alert(tStatic("ui.s_cf21e637"), tStatic("ui.s_aa293eb1"),
        );
    } catch (error) {
      console.log("Error perfil:", error);
    }
  };

  const renderContent = (content: any) => {
    const text =
      typeof content === "string" ? content : JSON.stringify(content);
    const words = text.split(/(\s+)/);
    return words.map((word, index) => {
      const cleanWord = word.trim().replace(/[^a-zA-Z0-9@_]/g, "");
      if (cleanWord.startsWith("@") && cleanWord.length > 1) {
        const username = cleanWord.substring(1);
        return (
          <Text
            key={index}
            className="text-[#5E17EB] font-bold"
            onPress={() => handleMentionPress(username)}
          >
            {word}
          </Text>
        );
      }
      return (
        <Text key={index} style={{ color: textColor }}>
          {word}
        </Text>
      );
    });
  };

  return (
    <View className={`mb-4 w-full ${depth > 0 ? "mt-3" : ""} px-4`}>
      <View className="flex-row">
        <TouchableOpacity
          onPress={() => router.push(`/user/${item.userId}` as any)}
        >
          <Image
            source={{
              uri:
                avatarUrl ||
                "https://cloud.appwrite.io/v1/avatars/initials?name=" +
                  displayName,
            }}
            className="w-9 h-9 rounded-full mt-1 bg-zinc-800"
          />
        </TouchableOpacity>

        <View className="flex-1 ml-3">
          <View className="flex-row items-center mb-0.5">
            <Text
              className="font-bold text-[13px] mr-1"
              style={{ color: textColor }}
            >
              {displayName}
            </Text>
            {isVerified && (
              <MaterialIcons
                name="verified"
                size={12}
                color="#5E17EB"
                style={{ marginRight: 4 }}
              />
            )}
            <Text className="text-[11px]" style={{ color: subTextColor }}>
              {formatTimeAgo(item.$createdAt, t)}
            </Text>
          </View>

          {isVoice ? (
            <View
              className={`mt-1 rounded-2xl p-3 border self-start ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}
            >
              <View className="flex-row items-center gap-3">
                <TouchableOpacity
                  onPress={handlePlayVoice}
                  disabled={!isUrlValid}
                  className={`w-10 h-10 rounded-full items-center justify-center shadow-sm ${isUrlValid ? "bg-[#5E17EB]" : "bg-zinc-500"}`}
                >
                  <Ionicons
                    name={isPlaying ? "square" : "play"}
                    size={16}
                    color="white"
                    style={{ marginLeft: isPlaying ? 0 : 2 }}
                  />
                </TouchableOpacity>
                <View>
                  <Text
                    className={`font-bold text-xs ${isDark ? "text-white" : "text-black"}`}
                  >{tStatic("ui.s_3da61fd2")}</Text>
                  <Text className="text-[10px] text-zinc-500 font-medium">
                    {isUrlValid
                      ? `${voiceData?.duration || 0}s • ${voiceData?.songContext ? tStatic("ui.s_7ca59d57") : tStatic("ui.s_15fa29e2")}`
                      : "Audio no disponible"}
                  </Text>
                </View>
                {isUrlValid && (
                  <View className="flex-row gap-0.5 h-4 items-center opacity-50 ml-2">
                    {[...Array(5)].map((_, i) => (
                      <View
                        key={i}
                        className="w-1 bg-[#5E17EB] rounded-full"
                        style={{
                          height: isPlaying ? Math.random() * 12 + 4 : 4,
                        }}
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>
          ) : (
            <Text
              className="text-[14px] leading-5 mt-0.5"
              style={{ color: textColor }}
            >
              {renderContent(contentText)}
            </Text>
          )}

          <View className="flex-row items-center gap-4 mt-2">
            <TouchableOpacity onPress={() => onReply(item)}>
              <Text
                className="text-xs font-semibold"
                style={{ color: subTextColor }}
              >{tStatic("ui.s_df7e8969")}</Text>
            </TouchableOpacity>

            {isOwner && (
              <TouchableOpacity onPress={handleOptionsPress}>
                <Ionicons
                  name="ellipsis-horizontal"
                  size={16}
                  color={subTextColor}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View className="items-center justify-start mt-2 ml-2">
          <TouchableOpacity onPress={handleLike} className="p-1">
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={14}
              color={isLiked ? "#EF4444" : subTextColor}
            />
          </TouchableOpacity>
          {likes.length > 0 && (
            <Text
              className="text-[10px] mt-0.5"
              style={{ color: subTextColor }}
            >
              {likes.length}
            </Text>
          )}
        </View>
      </View>

      {replies.length > 0 && (
        <View className="ml-11 pl-2">
          {!showReplies && (
            <TouchableOpacity
              onPress={() => setShowReplies(true)}
              className="flex-row items-center mt-3 mb-1"
            >
              <View
                className="w-8 h-[1px] mr-3"
                style={{ backgroundColor: lineColor }}
              />
              <Text
                className="text-xs font-semibold"
                style={{ color: subTextColor }}
              >
                {tStatic("ui.s_862fa4ae")} {replies.length}{" "}
                {replies.length === 1 ? tStatic("ui.s_dfba171a") : tStatic("ui.s_f1498459")}
              </Text>
            </TouchableOpacity>
          )}
          {showReplies && (
            <View>
              {replies.map((reply) => (
                <CommentItem
                  key={reply.$id}
                  item={reply}
                  currentUserId={currentUserId}
                  onReply={onReply}
                  onDelete={onDelete}
                  allComments={allComments}
                  depth={depth + 1}
                />
              ))}
              <TouchableOpacity
                onPress={() => setShowReplies(false)}
                className="mt-2 mb-2"
              >
                <Text className="text-xs ml-1" style={{ color: subTextColor }}>{tStatic("ui.s_dc52ced9")}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default CommentItem;
