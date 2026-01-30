import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
// 🔥 1. Importamos el contexto
import { useAudioContext } from "@/context/AudioContext";

interface VoiceVibeRecorderProps {
  songPreviewUrl: string | null;
  onRecordingComplete: (uri: string, duration: number) => void;
  onCancel: () => void;
  isDark: boolean;
}

export const VoiceVibeRecorder = ({
  songPreviewUrl,
  onRecordingComplete,
  onCancel,
  isDark,
}: VoiceVibeRecorderProps) => {
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [reviewUri, setReviewUri] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [backgroundSound, setBackgroundSound] = useState<Audio.Sound | null>(
    null,
  );
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [duration, setDuration] = useState(0);

  // 🔥 2. Obtenemos la función para detener la música global
  const { stopTrack } = useAudioContext();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const init = async () => {
      if (!permissionResponse?.granted) {
        await requestPermission();
      }
    };
    init();

    return () => {
      cleanup().catch(() => {});
    };
  }, []);

  const cleanup = async () => {
    try {
      if (recording) await recording.stopAndUnloadAsync();
    } catch (e) {}
    try {
      if (backgroundSound) {
        await backgroundSound.stopAsync();
        await backgroundSound.unloadAsync();
      }
    } catch (e) {}
    try {
      if (previewSound) {
        await previewSound.stopAsync();
        await previewSound.unloadAsync();
      }
    } catch (e) {}
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ).start();
      timer = setInterval(() => setDuration((prev) => prev + 1), 1000);
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // 🔥 3. IMPORTANTE: Detener música global antes de grabar
      await stopTrack();

      setDuration(0);
      setReviewUri(null);

      // Configurar modo grabación
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      if (songPreviewUrl) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: songPreviewUrl },
          { shouldPlay: false, volume: 0.25, isLooping: true },
        );
        setBackgroundSound(sound);
        await sound.playAsync();
      }

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRecording(false);

    if (backgroundSound) {
      try {
        await backgroundSound.stopAsync();
        await backgroundSound.unloadAsync();
      } catch (e) {}
      setBackgroundSound(null);
    }

    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);
        if (uri) setReviewUri(uri);
      } catch (e) {
        console.log("Error stopping", e);
      }
    }
  };

  const playReview = async () => {
    if (!reviewUri) return;

    if (previewSound) {
      await previewSound.stopAsync();
      await previewSound.unloadAsync();
      setPreviewSound(null);
      setIsPlayingPreview(false);
      return;
    }

    try {
      // 🔥 4. Detener música global antes de reproducir el preview
      await stopTrack();

      // Configurar modo Altavoz
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: reviewUri },
        { shouldPlay: true, volume: 1.0 },
      );
      setPreviewSound(sound);
      setIsPlayingPreview(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlayingPreview(false);
          setPreviewSound(null);
        }
      });
    } catch (e) {
      console.log("Error playing preview", e);
    }
  };

  const deleteRecording = () => {
    setReviewUri(null);
    setDuration(0);
  };

  const confirmSend = () => {
    if (reviewUri) onRecordingComplete(reviewUri, duration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#27272A" : "#F4F4F5" },
      ]}
    >
      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => {
            cleanup().catch(() => {});
            onCancel();
          }}
          style={styles.cancelBtn}
        >
          <Ionicons name="close" size={20} color="#71717A" />
        </TouchableOpacity>

        <View style={styles.mainContent}>
          {isRecording ? (
            <>
              <Text style={[styles.statusText, { color: "#EF4444" }]}>
                Grabando...
              </Text>
              <Text style={styles.timer}>{formatTime(duration)}</Text>
            </>
          ) : reviewUri ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 15 }}
            >
              <TouchableOpacity onPress={deleteRecording}>
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={playReview}
                style={styles.playPreviewBtn}
              >
                <Ionicons
                  name={isPlayingPreview ? "square" : "play"}
                  size={20}
                  color="white"
                  style={{ marginLeft: isPlayingPreview ? 0 : 2 }}
                />
              </TouchableOpacity>
              <Text style={styles.timer}>{formatTime(duration)}</Text>
            </View>
          ) : (
            <Text
              style={[
                styles.statusText,
                { color: isDark ? "#A1A1AA" : "#52525B" },
              ]}
            >
              {songPreviewUrl ? "🎙️ Grabar con música" : "🎙️ Grabar voz"}
            </Text>
          )}
        </View>

        {reviewUri ? (
          <TouchableOpacity
            onPress={confirmSend}
            style={[styles.recordBtn, { backgroundColor: "#5E17EB" }]}
          >
            <Ionicons name="arrow-up" size={24} color="white" />
          </TouchableOpacity>
        ) : (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              onPress={isRecording ? stopRecording : startRecording}
            >
              <LinearGradient
                colors={
                  isRecording ? ["#EF4444", "#B91C1C"] : ["#5E17EB", "#4C1D95"]
                }
                style={styles.recordBtn}
              >
                <Ionicons
                  name={isRecording ? "stop" : "mic"}
                  size={24}
                  color="white"
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 30,
    flex: 1,
    marginRight: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cancelBtn: {
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 20,
  },
  mainContent: { alignItems: "center", flex: 1 },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  timer: {
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "white",
    fontWeight: "600",
  },
  recordBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  playPreviewBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3F3F46",
    alignItems: "center",
    justifyContent: "center",
  },
});
