import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useNotification } from "@/context/NotificationContext";

const { width } = Dimensions.get("window");

// --- HELPER: Limpiador de Emojis ---
const cleanText = (text: string | null | undefined) => {
  if (!text) return "";
  // Quita emojis comunes de notificaciones para dejar el diseño limpio
  return text.replace(/❤️|💬|👤|🏷️|🔥/g, "").trim();
};

const InAppNotification = () => {
  const { currentNotification, setCurrentNotification } = useNotification();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const translateY = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    if (currentNotification) {
      // Entrada elástica suave (Estilo iOS)
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        mass: 1.2,
        stiffness: 100,
      }).start();
    } else {
      // Salida rápida
      Animated.timing(translateY, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [currentNotification, translateY]);

  if (!currentNotification) return null;

  const content = currentNotification.request.content;
  const { title, body, data } = content;
  const image = data?.image || data?.imagePreview || null; // Soporte para ambos nombres

  const cleanTitle = cleanText(title);
  const isMessage = cleanTitle.toLowerCase().includes("mensaje");

  const handlePress = () => {
    if (data?.url) {
      setTimeout(() => router.push(data.url), 100);
    }
    setCurrentNotification(null);
  };

  // Ajuste de margen superior dinámico
  const topPadding = Platform.OS === "android" ? insets.top + 10 : insets.top;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ translateY }],
          paddingTop: topPadding,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={styles.container}
      >
        {/* --- IZQUIERDA: IMAGEN O ICONO MOOD --- */}
        <View style={styles.avatarContainer}>
          {image ? (
            <Image source={{ uri: image }} style={styles.avatarImage} />
          ) : (
            // 🔥 AQUÍ ESTÁ EL CAMBIO: Fondo Morado Mood si no hay foto
            <View
              style={[styles.avatarPlaceholder, { backgroundColor: "#5E17EB" }]}
            >
              <Ionicons
                name={isMessage ? "chatbubble-ellipses" : "notifications"}
                size={20}
                color="#FFF"
              />
            </View>
          )}
        </View>

        {/* --- CENTRO: TEXTO --- */}
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.titleText} numberOfLines={1}>
              {cleanTitle}
            </Text>
            <Text style={styles.timeText}>Ahora</Text>
          </View>

          <Text style={styles.bodyText} numberOfLines={2}>
            {body}
          </Text>
        </View>

        {/* --- DERECHA: INDICADOR VISUAL SUTIL --- */}
        {/* Pequeña píldora decorativa para balancear el diseño */}
        <View style={styles.pillIndicator} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    width: Math.min(width, 450), // Máximo ancho en tablets
    zIndex: 99999,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  container: {
    // Fondo oscuro premium (casi negro pero no total)
    backgroundColor: "rgba(28, 28, 30, 0.98)",
    borderRadius: 20, // Bordes más redondos estilo iOS 17
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    // Sombras profundas para efecto "flotante"
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10, // Sombra fuerte en Android
    // Borde sutil "Glass"
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderCurve: "continuous", // Suavizado extra en iOS
  },
  avatarContainer: {
    marginRight: 14,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2C2C2E",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    // Sombra interna sutil para el icono
    shadowColor: "#5E17EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    marginRight: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  titleText: {
    color: "#FFFFFF",
    fontWeight: "700", // Más negrita para el título
    fontSize: 15,
    letterSpacing: 0.3,
  },
  timeText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "500",
  },
  bodyText: {
    color: "#D4D4D8", // Blanco grisáceo (Zinc 300) para mejor lectura
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  },
  pillIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    backgroundColor: "#3F3F46", // Gris oscuro sutil
    opacity: 0.5,
  },
});

export default InAppNotification;
