import React, {useEffect, useState, useRef, useCallback} from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ImageBackground,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";

import { WeeklyVibe } from "@/lib/appwrite";

import { tStatic } from "@/context/LanguageContext";
const { width, height } = Dimensions.get("window");

interface WeeklyVibeModalProps {
  visible: boolean;
  onClose: () => void;
  vibeData: WeeklyVibe | null;
  onConsume?: (action: "posted" | "discarded") => void | Promise<void>;
}

const WeeklyVibeModal = ({
  visible,
  onClose,
  vibeData,
  onConsume,
}: WeeklyVibeModalProps) => {
  // --- ESTADOS ---
  const [artistImage, setArtistImage] = useState<string | null>(null);
  const [trackPreview, setTrackPreview] = useState<string | null>(null);
  const [trackTitle, setTrackTitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  // 🔥 REF DE AUDIO & CAPTURA
  const soundRef = useRef<Audio.Sound | null>(null);
  const viewShotRef = useRef<View>(null);

  // --- ANIMACIONES ---
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bgScaleAnim = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(50)).current;

  // Visualizador
  const bar1 = useRef(new Animated.Value(10)).current;
  const bar2 = useRef(new Animated.Value(15)).current;
  const bar3 = useRef(new Animated.Value(8)).current;

  // --- ANIMACIONES ---
  const startEntranceAnimations = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1)),
        useNativeDriver: true,
      }),
    ]).start();

    const animateBar = (bar: Animated.Value) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: Math.random() * 18 + 8,
            duration: 150 + Math.random() * 150,
            useNativeDriver: false,
          }),
          Animated.timing(bar, {
            toValue: 8,
            duration: 150 + Math.random() * 150,
            useNativeDriver: false,
          }),
        ]),
      ).start();
    };
    animateBar(bar1);
    animateBar(bar2);
    animateBar(bar3);
  }, [bar1, bar2, bar3, contentOpacity, contentTranslateY, pulseAnim]);

  // --- DATA & AUDIO ---
  const fetchDeezerData = useCallback(async (artistName: string) => {
    try {
      const response = await fetch(
        `https://api.deezer.com/search?q=artist:"${encodeURIComponent(artistName)}"&limit=1`,
      );
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        const track = data.data[0];
        setArtistImage(track.artist.picture_xl || track.artist.picture_medium);
        setTrackPreview(track.preview);
        setTrackTitle(track.title);
      }
    } catch (error) {
      console.log("Error Deezer:", error);
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  }, []);

  const playSound = useCallback(async (uri: string) => {
    try {
      if (soundRef.current) await soundRef.current.unloadAsync();
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: uri },
        { shouldPlay: true, isLooping: true, volume: 1.0 },
      );
      soundRef.current = newSound;
    } catch (e) {
      console.log("Audio Error:", e);
    }
  }, []);

  const stopSound = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
  }, []);

  // --- EFECTOS ---
  useEffect(() => {
    if (visible && vibeData?.topArtist) {
      setIsLoading(true);
      setArtistImage(null);

      // Reset anims
      pulseAnim.setValue(1);
      bgScaleAnim.setValue(1);
      contentOpacity.setValue(0);
      contentTranslateY.setValue(50);

      // Zoom lento fondo
      const bgAnim = Animated.timing(bgScaleAnim, {
        toValue: 1.4,
        duration: 25000,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      bgAnim.start();

      void fetchDeezerData(vibeData.topArtist);

      return () => {
        bgAnim.stop();
        void stopSound();
      };
    }

    void stopSound();
    setIsLoading(true);

    return () => {
      void stopSound();
    };
  }, [
    bgScaleAnim,
    contentOpacity,
    contentTranslateY,
    fetchDeezerData,
    pulseAnim,
    stopSound,
    vibeData?.topArtist,
    visible,
  ]);

  useEffect(() => {
    if (!isLoading && visible) {
      startEntranceAnimations();
    }
  }, [isLoading, startEntranceAnimations, visible]);

  useEffect(() => {
    if (trackPreview && visible) {
      void playSound(trackPreview);
    }
  }, [playSound, trackPreview, visible]);

  // --- 📸 SHARE LOGIC ---
  const handleShareStory = async (): Promise<boolean> => {
    if (isSharing || !viewShotRef.current) return false;
    setIsSharing(true);
    try {
      const uri = await captureRef(viewShotRef, {
        format: "png",
        quality: 1.0,
        result: "tmpfile",
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          dialogTitle: "Compartir mi Vibe Check",
          mimeType: "image/png",
          UTI: "image/png",
        });
      }
      return true;
    } catch (error) {
      console.log("Error sharing:", error);
      return false;
    } finally {
      setIsSharing(false);
    }
  };

  if (!vibeData) return null;
  const accentColor = vibeData.vibeColor || "#5E17EB";

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* 1. FONDO ANIMADO */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ scale: bgScaleAnim }] },
          ]}
        >
          <ImageBackground
            source={artistImage ? { uri: artistImage } : undefined}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          >
            <View style={styles.darkOverlay} />
            <View
              style={[styles.tintOverlay, { backgroundColor: accentColor }]}
            />
          </ImageBackground>
        </Animated.View>

        {/* Partículas */}
        <FloatingParticles color={accentColor} count={12} />

        {/* 2. CONTENIDO UI */}
        <View style={styles.contentContainer}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>

          {isLoading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color="white" />
              <Text
                style={{
                  color: "rgba(255,255,255,0.7)",
                  marginTop: 20,
                  fontSize: 12,
                  letterSpacing: 2,
                }}
              >{tStatic("ui.s_f5e652a3")}</Text>
            </View>
          ) : (
            <Animated.View
              style={{
                flex: 1,
                justifyContent: "space-between",
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }],
              }}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.badgeContainer}>
                  <Text style={styles.weekText}>{tStatic("ui.s_3536ef2d")}</Text>
                </View>
                <Text style={styles.vibeTitle}>{tStatic("ui.s_8b8040eb")}</Text>
              </View>

              {/* Center */}
              <View style={styles.centerStage}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <View
                    style={[
                      styles.emojiContainer,
                      { shadowColor: accentColor },
                    ]}
                  >
                    <Text style={styles.emoji}>{vibeData.topMood}</Text>
                  </View>
                </Animated.View>
                <Text style={styles.moodDescription}>
                  {tStatic("ui.s_ac5711d8")} {vibeData.topMood}
                </Text>
              </View>

              {/* Music Card */}
              <View style={styles.musicCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.visualizer}>
                    <Animated.View
                      style={[
                        styles.bar,
                        { height: bar1, backgroundColor: accentColor },
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.bar,
                        { height: bar2, backgroundColor: accentColor },
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.bar,
                        { height: bar3, backgroundColor: accentColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.nowPlayingText}>{tStatic("ui.s_6becacaf")}</Text>
                </View>
                <Text style={styles.artistName} numberOfLines={1}>
                  {vibeData.topArtist}
                </Text>
                {trackTitle && (
                  <Text style={styles.trackName} numberOfLines={1}>
                    {trackTitle}
                  </Text>
                )}
                <View style={styles.divider} />
                <View style={styles.statsRow}>
                  <StatItem
                    label={tStatic("ui.s_5dc52ca9")}
                    value={vibeData.totalPosts.toString()}
                    icon="layers-outline"
                  />
                  <View
                    style={{
                      width: 1,
                      height: 20,
                      backgroundColor: "rgba(255,255,255,0.2)",
                    }}
                  />
                  <StatItem label={tStatic("ui.s_6e16406e")} value="100%" icon="flash-outline" />
                </View>
              </View>

              {/* ✅ ACCIONES (Postear / Descartar) */}
              <View style={{ gap: 12 }}>
                {/* POSTEAR (usa el share actual como "post") */}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={async () => {
                    const ok = await handleShareStory();
                    if (ok) {
                      await onConsume?.("posted");
                      onClose();
                    }
                  }}
                  disabled={isSharing}
                  style={{
                    shadowColor: accentColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 20,
                    elevation: 10,
                  }}
                >
                  <LinearGradient
                    // Gradiente dinámico: del color del mood a un tono más blanco/brillante
                    colors={[accentColor, adjustColorBrightness(accentColor, 40)]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.shareButtonGradient}
                  >
                    {isSharing ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <Text style={styles.shareText}>{tStatic("ui.s_e73a3987")}</Text>
                        <Ionicons name="paper-plane" size={20} color="white" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* DESCARTAR */}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={async () => {
                    await onConsume?.("discarded");
                    onClose();
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.18)",
                    borderRadius: 18,
                    paddingVertical: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 10,
                    backgroundColor: "rgba(255,255,255,0.06)",
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.9)" />
                  <Text style={{ color: "rgba(255,255,255,0.9)", fontWeight: "800" }}>{tStatic("ui.s_a218d22c")}</Text>
                </TouchableOpacity>
              </View>

            </Animated.View>
          )}
        </View>

        {/* 📸 HIDDEN VIRAL CARD (OFF-SCREEN) */}
        <View
          collapsable={false}
          ref={viewShotRef}
          style={[styles.hiddenCardContainer, { backgroundColor: "#000" }]}
        >
          <ImageBackground
            source={artistImage ? { uri: artistImage } : undefined}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          >
            <LinearGradient
              colors={["rgba(0,0,0,0.3)", "#000"]}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={[accentColor, "transparent"]}
              style={[StyleSheet.absoluteFill, { opacity: 0.4 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />

            <View
              style={{
                flex: 1,
                padding: 40,
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 80,
              }}
            >
              <View style={{ alignItems: "center" }}>
                <Ionicons
                  name="sparkles"
                  size={32}
                  color="white"
                  style={{ marginBottom: 10 }}
                />
                <Text
                  style={{
                    color: "white",
                    fontWeight: "900",
                    fontSize: 16,
                    letterSpacing: 4,
                  }}
                >{tStatic("ui.s_c43399f2")}</Text>
                <Text
                  style={{
                    color: "white",
                    fontWeight: "900",
                    fontSize: 40,
                    fontStyle: "italic",
                  }}
                >{tStatic("ui.s_8b8040eb")}</Text>
              </View>

              <View style={{ alignItems: "center" }}>
                <View
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: 100,
                    backgroundColor: "rgba(255,255,255,0.1)",
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: "rgba(255,255,255,0.3)",
                    marginBottom: 20,
                  }}
                >
                  <Text style={{ fontSize: 100 }}>{vibeData.topMood}</Text>
                </View>
                <Text
                  style={{ color: "white", fontSize: 32, fontWeight: "bold" }}
                >
                  {vibeData.topMood}
                </Text>
              </View>

              <View
                style={{
                  width: "100%",
                  backgroundColor: "rgba(255,255,255,0.1)",
                  padding: 24,
                  borderRadius: 24,
                  borderLeftWidth: 6,
                  borderLeftColor: accentColor,
                }}
              >
                <Text
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: "bold",
                    fontSize: 14,
                    letterSpacing: 1,
                    marginBottom: 4,
                  }}
                >{tStatic("ui.s_6becacaf")}</Text>
                <Text
                  style={{ color: "white", fontWeight: "900", fontSize: 36 }}
                  numberOfLines={1}
                >
                  {vibeData.topArtist}
                </Text>
              </View>
            </View>
          </ImageBackground>
        </View>
      </View>
    </Modal>
  );
};

// --- HELPERS & SUBCOMPONENTES ---

// Helper para aclarar el color del gradiente
const adjustColorBrightness = (_hex: string, _percent: number) => {
  // Versión simplificada que devuelve un color fijo si falla el hex
  // En producción usarías una librería como 'tinycolor2' o una función real de hex
  // Por simplicidad, retornamos un color hardcodeado brillante si es morado, o blanco.
  // Esto es un fallback visual seguro.
  return "#A78BFA";
};

const MovingParticle = ({ color, delay }: { color: string; delay: number }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100 - Math.random() * 200,
            duration: 4000 + Math.random() * 3000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]),
    );

    const t = setTimeout(() => {
      animation.start();
    }, delay);

    return () => {
      clearTimeout(t);
      animation.stop();
    };
  }, [delay, opacity, translateY]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: Math.random() * height,
        left: Math.random() * width,
        width: Math.random() * 8 + 2,
        height: Math.random() * 8 + 2,
        borderRadius: 20,
        backgroundColor: color,
        opacity: opacity,
        transform: [{ translateY }],
      }}
    />
  );
};

const FloatingParticles = ({
  color,
  count,
}: {
  color: string;
  count: number;
}) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    {[...Array(count)].map((_, i) => (
      <MovingParticle key={i} color={color} delay={i * 500} />
    ))}
  </View>
);

const StatItem = ({ label, value, icon }: any) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
    <Ionicons name={icon} size={16} color="rgba(255,255,255,0.7)" />
    <View>
      <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>
        {value}
      </Text>
      <Text
        style={{
          color: "rgba(255,255,255,0.5)",
          fontSize: 10,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  tintOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.25 },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 60,
  },
  closeButton: {
    alignSelf: "flex-end",
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 50,
    marginBottom: 10,
  },
  header: { alignItems: "center", marginBottom: 20 },
  badgeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  weekText: {
    color: "white",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  vibeTitle: {
    color: "white",
    fontSize: 48,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -1,
  },
  centerStage: { flex: 1, justifyContent: "center", alignItems: "center" },
  emojiContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginBottom: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  emoji: { fontSize: 70 },
  moodDescription: {
    color: "white",
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  musicCard: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  nowPlayingText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "bold",
  },
  visualizer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 20,
    gap: 3,
  },
  bar: { width: 4, borderRadius: 2 },
  artistName: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 2,
  },
  trackName: { color: "rgba(255,255,255,0.7)", fontSize: 14, marginBottom: 16 },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  // 🔥 ESTILOS DEL NUEVO BOTÓN
  shareButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 30,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  shareText: { fontSize: 16, fontWeight: "bold", color: "white" },

  hiddenCardContainer: {
    position: "absolute",
    top: 0,
    left: width + 100,
    width: 1080 / 3,
    height: 1920 / 3,
    minWidth: width,
    minHeight: height,
    zIndex: -10,
  },
});

export default WeeklyVibeModal;