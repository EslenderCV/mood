import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "nativewind"; // Hook de NativeWind

const Settings = () => {
  // --- TEMA (LÓGICA BLINDADA) ---
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Colores calculados (Igual que en Home)
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#6B7280"; // Zinc-400 / Gray-500
  const iconBg = isDark ? "#18181B" : "#F3F4F6"; // Zinc-900 / Gray-100
  const borderColor = isDark ? "#27272A" : "#E5E7EB"; // Zinc-800 / Gray-200
  const backIconColor = isDark ? "#FFFFFF" : "#000000";

  // Estados locales (Simulados)
  const [autoPlay, setAutoPlay] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [highQualityAudio, setHighQualityAudio] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);

  // --- HANDLERS ---
  const handleSpotifyConnect = () => {
    if (spotifyConnected) {
      Alert.alert("Desconectar", "¿Desvincular cuenta?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desvincular",
          style: "destructive",
          onPress: () => setSpotifyConnected(false),
        },
      ]);
    } else {
      Alert.alert("Spotify", "Conectando...", [
        { text: "OK", onPress: () => setSpotifyConnected(true) },
      ]);
    }
  };

  const clearCache = () => {
    Alert.alert("Limpieza", "Se han liberado 45MB de caché.");
  };

  // --- COMPONENTES UI ---
  const SectionTitle = ({ title }: { title: string }) => (
    <Text
      className="text-xs font-bold uppercase mb-3 mt-6 tracking-widest px-2"
      style={{ color: subTextColor }}
    >
      {title}
    </Text>
  );

  const SettingRow = ({
    icon,
    title,
    subtitle,
    children,
    color = "#5E17EB",
  }: any) => (
    <View
      className="flex-row items-center justify-between py-3.5 border-b px-2"
      style={{ borderColor: borderColor }}
    >
      <View className="flex-row items-center flex-1 mr-4">
        {/* Fondo del icono */}
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-4"
          style={{ backgroundColor: iconBg }}
        >
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View>
          <Text
            className="text-[15px] font-medium"
            style={{ color: textColor }}
          >
            {title}
          </Text>
          {subtitle && (
            <Text className="text-xs mt-0.5" style={{ color: subTextColor }}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {children}
    </View>
  );

  return (
    // FONDO FORZADO (Nuclear Option)
    <SafeAreaView className="flex-1" style={{ backgroundColor: bgColor }}>
      {/* HEADER */}
      <View
        className="px-6 py-4 flex-row items-center border-b"
        style={{ borderColor: borderColor }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 p-2 rounded-full"
          style={{ backgroundColor: iconBg }}
        >
          <Ionicons name="arrow-back" size={22} color={backIconColor} />
        </TouchableOpacity>
        <Text className="text-2xl font-bold" style={{ color: textColor }}>
          Ajustes
        </Text>
      </View>

      <ScrollView className="px-4 pb-10">
        {/* 1. PERSONALIZACIÓN */}
        <SectionTitle title="Personalización" />

        <SettingRow
          icon="moon"
          title="Modo Oscuro"
          subtitle="Cambiar apariencia de la app"
          color={isDark ? "#FFFFFF" : "#000000"}
        >
          <Switch
            trackColor={{ false: "#E5E7EB", true: "#5E17EB" }}
            thumbColor={"white"}
            onValueChange={toggleColorScheme} // Acción real de NativeWind
            value={isDark} // Estado real
          />
        </SettingRow>

        {/* 2. EXPERIENCIA */}
        <SectionTitle title="Experiencia" />

        <SettingRow
          icon="finger-print"
          title="Haptic Feedback"
          subtitle="Vibración al interactuar"
          color="#F59E0B"
        >
          <Switch
            trackColor={{ false: "#E5E7EB", true: "#5E17EB" }}
            thumbColor="white"
            onValueChange={setHapticFeedback}
            value={hapticFeedback}
          />
        </SettingRow>

        <SettingRow
          icon="play-circle"
          title="Autoplay en Feed"
          subtitle="Reproducir música al deslizar"
          color="#10B981"
        >
          <Switch
            trackColor={{ false: "#E5E7EB", true: "#5E17EB" }}
            thumbColor="white"
            onValueChange={setAutoPlay}
            value={autoPlay}
          />
        </SettingRow>

        {/* 3. INTEGRACIONES */}
        <SectionTitle title="Integraciones" />

        <TouchableOpacity onPress={handleSpotifyConnect} activeOpacity={0.8}>
          <View
            className="flex-row items-center justify-between py-3.5 border-b px-2"
            style={{ borderColor: borderColor }}
          >
            <View className="flex-row items-center flex-1 mr-4">
              <View className="w-10 h-10 rounded-full bg-[#1DB954]/20 items-center justify-center mr-4">
                <FontAwesome5 name="spotify" size={20} color="#1DB954" />
              </View>
              <View>
                <Text
                  className="text-[15px] font-medium"
                  style={{ color: textColor }}
                >
                  Spotify
                </Text>
                <Text
                  className="text-xs"
                  style={{ color: spotifyConnected ? "#1DB954" : subTextColor }}
                >
                  {spotifyConnected ? "Conectado" : "Vincular cuenta"}
                </Text>
              </View>
            </View>
            <Ionicons
              name={spotifyConnected ? "checkmark-circle" : "chevron-forward"}
              size={20}
              color={spotifyConnected ? "#1DB954" : subTextColor}
            />
          </View>
        </TouchableOpacity>

        {/* 4. DATOS */}
        <SectionTitle title="Datos" />

        <TouchableOpacity onPress={clearCache}>
          <SettingRow
            icon="trash-bin"
            title="Borrar Caché"
            subtitle="Liberar espacio (45 MB)"
            color="#EF4444"
          >
            <View
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: iconBg }}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: subTextColor }}
              >
                Limpiar
              </Text>
            </View>
          </SettingRow>
        </TouchableOpacity>

        <View className="mt-12 items-center mb-8">
          <Text
            className="font-bold text-lg"
            style={{ color: isDark ? "#52525B" : "#9CA3AF" }} // Zinc-600 / Gray-400
          >
            MOOD
          </Text>
          <Text
            className="text-xs"
            style={{ color: isDark ? "#52525B" : "#9CA3AF" }}
          >
            Versión Beta 1.0.3
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
