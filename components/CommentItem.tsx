import { View, Text, Image, TouchableOpacity, Alert } from "react-native";
import React, { useState, useMemo, useEffect } from "react";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { toggleCommentLike, searchUsers, getUser } from "@/lib/appwrite";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { formatTimeAgo } from "@/lib/postUtils";

interface CommentProps {
  item: any;
  currentUserId: string;
  onReply: (item: any) => void;
  allComments: any[];
  depth?: number;
}

const CommentItem = ({
  item,
  currentUserId,
  onReply,
  allComments,
  depth = 0,
}: CommentProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();

  const textColor = isDark ? "#FAFAFA" : "#18181B";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const lineColor = isDark ? "#3F3F46" : "#E4E4E7";
  const avatarBg = isDark ? "#27272A" : "#E4E4E7";

  const [likes, setLikes] = useState<string[]>(item.likedBy || []);
  const [showReplies, setShowReplies] = useState(false);

  const [userData, setUserData] = useState<any>(item.user || null);

  // 🔥 CORRECCIÓN 1: Sincronizar estado local si las props cambian (ej: pull-to-refresh)
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
  }, [item.userId]);

  const displayName = userData?.name || item.username || "Usuario";
  const isVerified = userData?.isVerified || item.isVerified;
  const avatarUrl = userData?.pfp || item.avatar;

  const isLiked = likes.includes(currentUserId);

  const replies = useMemo(() => {
    return allComments.filter((c) => c.parentId === item.$id);
  }, [allComments, item.$id]);

  const handleLike = async () => {
    const newLikes = isLiked
      ? likes.filter((id) => id !== currentUserId)
      : [...likes, currentUserId];
    setLikes(newLikes);
    try {
      await toggleCommentLike(item.$id, currentUserId, likes);
    } catch (error) {
      setLikes(likes); // Revertir si falla
    }
  };

  const handleMentionPress = async (username: string) => {
    try {
      const users = await searchUsers(username);
      const targetUser = users.find((u) => u.username === username);
      if (targetUser) {
        router.push(`/user/${targetUser.$id}` as any);
      } else {
        Alert.alert(
          "Usuario no encontrado",
          "Es posible que haya cambiado su nombre.",
        );
      }
    } catch (error) {
      console.log("Error perfil:", error);
    }
  };

  const renderContent = (content: string) => {
    const words = content.split(/(\s+)/);
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
            className="w-9 h-9 rounded-full mt-1"
            style={{ backgroundColor: avatarBg }}
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

          <Text className="text-[14px] leading-5 mt-0.5">
            {renderContent(item.content)}
          </Text>

          <TouchableOpacity className="mt-2" onPress={() => onReply(item)}>
            <Text
              className="text-xs font-semibold"
              style={{ color: subTextColor }}
            >
              Responder
            </Text>
          </TouchableOpacity>
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
                Ver {replies.length}{" "}
                {replies.length === 1 ? "respuesta" : "respuestas"}
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
                  allComments={allComments}
                  depth={depth + 1}
                />
              ))}
              <TouchableOpacity
                onPress={() => setShowReplies(false)}
                className="mt-2 mb-2"
              >
                <Text className="text-xs ml-1" style={{ color: subTextColor }}>
                  Ocultar
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default CommentItem;
