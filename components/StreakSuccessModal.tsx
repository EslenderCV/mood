import React, { useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  Animated,
  Easing,
  StyleSheet,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import StreakBadge from "./StreakBadge";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

interface StreakSuccessModalProps {
  visible: boolean;
  days: number;
  onClose: () => void;
}

const StreakSuccessModal = ({
  visible,
  days,
  onClose,
}: StreakSuccessModalProps) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      // Resetear valores para la próxima
      scaleAnim.setValue(0);
      textTranslateY.setValue(20);
    });
  }, [onClose, opacityAnim, scaleAnim, textTranslateY]);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Secuencia de animación de entrada
      Animated.sequence([
        // 1. Aparece fondo
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // 2. Explota el fuego (Pop)
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        // 3. Sube el texto
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]).start();

      // Cerrar automáticamente después de 3 segundos
      const timer = setTimeout(() => {
        handleClose();
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [handleClose, opacityAnim, scaleAnim, textTranslateY, visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.container}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: opacityAnim }]}
        >
          <BlurView
            intensity={40}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)" }} />
        </Animated.View>

        <View style={styles.content}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            {/* Usamos el Badge en modo LARGE */}
            <StreakBadge days={days} size="large" />
          </Animated.View>

          <Animated.View
            style={{
              marginTop: 30,
              alignItems: "center",
              opacity: opacityAnim,
              transform: [{ translateY: textTranslateY }],
            }}
          >
            <Text style={styles.title}>¡RACHA EN LLAMAS!</Text>
            <Text style={styles.subtitle}>
              Has publicado {days} días seguidos.{"\n"}¡Sigue así!
            </Text>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    width: width * 0.8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "900",
    fontStyle: "italic",
    marginBottom: 8,
    textShadowColor: "#5E17EB",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    color: "#E4E4E7",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "500",
  },
});

export default StreakSuccessModal;
