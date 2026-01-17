import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/context/LanguageContext"; // <--- Importamos el hook

type ConnectionStatus = "connected" | "disconnected" | "connecting";

interface ConnectionBannerProps {
  status: ConnectionStatus;
}

const ConnectionBanner = ({ status }: ConnectionBannerProps) => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage(); // <--- Obtenemos la función de traducción

  // Animaciones
  const translateY = useRef(new Animated.Value(-50)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status === "connected") {
      // Mostrar éxito brevemente y luego salir
      animateIn();
      const timer = setTimeout(() => animateOut(), 2500);
      return () => clearTimeout(timer);
    } else if (status === "disconnected" || status === "connecting") {
      // Mantener visible si hay problemas o cargando
      animateIn();
    }
  }, [status]);

  const animateIn = () => {
    setVisible(true);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 6,
        tension: 50,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  };

  if (!visible) return null;

  // Configuración de Estilos y Textos (Traducidos)
  const getConfig = () => {
    switch (status) {
      case "disconnected":
        return {
          borderColor: "#EF4444", // Rojo Error
          icon: "cloud-offline",
          text: t("connection.disconnected"), // "Sin conexión"
          textColor: "#EF4444",
        };
      case "connecting":
        return {
          borderColor: "#5E17EB", // Morado Mood
          icon: "refresh",
          text: t("connection.reconnecting"), // "Reconectando..."
          textColor: "#A78BFA",
        };
      case "connected":
        return {
          borderColor: "#10B981", // Verde Éxito
          icon: "checkmark-circle",
          text: t("connection.restored"), // "Conexión restaurada"
          textColor: "#10B981",
        };
      default:
        return {
          borderColor: "#5E17EB",
          icon: "help",
          text: "",
          textColor: "white",
        };
    }
  };

  const config = getConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 10, // Flota justo debajo del notch
          opacity: opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        style={[
          styles.pill,
          { borderColor: config.borderColor, shadowColor: config.borderColor },
        ]}
      >
        {status === "connecting" ? (
          <ActivityIndicator
            size="small"
            color={config.borderColor}
            style={styles.icon}
          />
        ) : (
          <Ionicons
            name={config.icon as any}
            size={16}
            color={config.borderColor}
            style={styles.icon}
          />
        )}

        <Text style={[styles.text, { color: "white" }]}>{config.text}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 99999, // Superposición máxima
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 15, 17, 0.95)", // Fondo casi negro (#0F0F11)
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30, // Forma de cápsula completa
    borderWidth: 1, // Borde fino de color

    // Sombra de neón sutil
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontWeight: "600",
    fontSize: 13,
    letterSpacing: 0.3,
  },
});

export default ConnectionBanner;
