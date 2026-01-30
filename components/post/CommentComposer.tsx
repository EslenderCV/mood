import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { VoiceVibeRecorder } from "@/components/comments/VoiceVibeRecorder";

interface CommentComposerProps {
  user: any;
  text: string;
  setText: (text: string) => void;
  onSubmit: () => void;
  isSending: boolean;
  replyingTo: { username: string } | null;
  onCancelReply: () => void;
  isRecordingMode: boolean;
  setRecordingMode: (mode: boolean) => void;
  onVoiceUpload: (uri: string, duration: number) => void;
  activeSongPreview: string | null;
  styles: any;
  inputRef: any;
}

export const CommentComposer = ({
  user,
  text,
  setText,
  onSubmit,
  isSending,
  replyingTo,
  onCancelReply,
  isRecordingMode,
  setRecordingMode,
  onVoiceUpload,
  activeSongPreview,
  styles,
  inputRef,
}: CommentComposerProps) => {
  const hasText = text.trim().length > 0;

  return (
    <View
      className="border-t pt-2 px-2"
      style={{
        backgroundColor: styles.bgColor,
        borderColor: styles.borderColor,
        paddingBottom: Platform.OS === "ios" ? 10 : 0,
      }}
    >
      {replyingTo && (
        <View className="flex-row items-center justify-between px-4 pb-2 mb-1">
          <Text
            className="text-xs font-medium"
            style={{ color: styles.subTextColor }}
          >
            Respondiendo a{" "}
            <Text style={{ color: styles.accentColor }}>
              @{replyingTo.username}
            </Text>
          </Text>
          <TouchableOpacity onPress={onCancelReply} className="p-1">
            <Ionicons name="close" size={16} color={styles.subTextColor} />
          </TouchableOpacity>
        </View>
      )}

      {isRecordingMode ? (
        <View className="flex-row items-center w-full">
          <VoiceVibeRecorder
            songPreviewUrl={activeSongPreview}
            onRecordingComplete={onVoiceUpload}
            onCancel={() => setRecordingMode(false)}
            isDark={styles.isDark}
          />
        </View>
      ) : (
        <View className="flex-row items-end gap-3 px-2 mb-2">
          <Image
            source={{
              uri:
                user?.pfp ||
                "https://cloud.appwrite.io/v1/avatars/initials?name=Me",
            }}
            style={{ width: 40, height: 40, borderRadius: 999 }}
            className="mb-1 bg-zinc-800"
            contentFit="cover"
          />

          <View
            className="flex-1 rounded-3xl flex-row items-center px-5 py-1 border"
            style={{
              backgroundColor: styles.inputBg,
              borderColor: styles.isDark ? "transparent" : styles.borderColor,
            }}
          >
            <TextInput
              ref={inputRef}
              placeholder={
                replyingTo
                  ? `Responde a ${replyingTo.username}...`
                  : "Escribe un comentario..."
              }
              placeholderTextColor={styles.subTextColor}
              className="flex-1 text-[16px] py-3"
              style={{ color: styles.textColor, maxHeight: 100 }}
              value={text}
              onChangeText={setText}
              multiline
            />
          </View>

          <TouchableOpacity
            onPress={hasText ? onSubmit : () => setRecordingMode(true)}
            disabled={hasText ? isSending : false}
            className={`w-11 h-11 rounded-full items-center justify-center mb-0.5 ${
              hasText ? "opacity-100 scale-100 shadow-md" : ""
            }`}
            style={{
              backgroundColor: hasText ? styles.accentColor : "transparent",
            }}
          >
            {hasText ? (
              isSending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="arrow-up" size={24} color="white" />
              )
            ) : (
              <Ionicons
                name="mic-outline"
                size={27}
                color={styles.accentColor}
              />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
