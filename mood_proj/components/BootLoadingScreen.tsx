import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { useLanguage } from "@/context/LanguageContext";

type Props = {
  onRetry?: () => void;
};

/**
 * Shown ONLY when auth is still resolving after the splash fades out.
 * Keeps startup feeling premium even if the network is slow.
 */
export default function BootLoadingScreen({ onRetry }: Props) {
  const { t } = useLanguage();

  return (
    <View style={styles.overlay}>
      <Image
        source={require("@/assets/images/icon.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>{t("boot.title")}</Text>
      <Text style={styles.subtitle}>{t("boot.subtitle")}</Text>

      <ActivityIndicator size="small" style={styles.spinner} />

      {onRetry ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onRetry}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{t("boot.retry")}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    zIndex: 9999,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 18,
    borderRadius: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginBottom: 14,
  },
  spinner: {
    marginBottom: 18,
  },
  button: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});
