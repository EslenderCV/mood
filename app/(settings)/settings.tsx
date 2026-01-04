import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext"; // Asegúrate de que esta ruta sea correcta según tu estructura

const Settings = () => {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Hook Global de Idioma
  const { language, setLanguage, t, availableLanguages } = useLanguage();

  // --- PALETA DE COLORES ---
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const modalBg = isDark ? "#121212" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#6B7280";
  const iconBg = isDark ? "#18181B" : "#F3F4F6";
  const borderColor = isDark ? "#27272A" : "#E5E7EB";

  // Color específico para el botón de idioma (Corrección visual)
  const languagePillBg = isDark ? "#27272A" : "#F3F4F6";
  const pillTextColor = isDark ? "#FFFFFF" : "#000000";

  // --- ESTADOS ---
  const [autoPlay, setAutoPlay] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Objeto del idioma actual (para mostrar la bandera y nombre)
  const currentLangObj =
    availableLanguages.find((l) => l.code === language) ||
    availableLanguages[0];

  // --- HANDLERS ---
  const handleSpotifyConnect = () => {
    if (spotifyConnected) {
      Alert.alert(t("settings.disconnect"), "¿Desvincular cuenta?", [
        { text: t("settings.cancel"), style: "cancel" },
        {
          text: t("settings.disconnect"),
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

  const handleSelectLanguage = (langCode: any) => {
    setLanguage(langCode);
    setShowLanguageModal(false);
  };

  const clearCache = () => {
    Alert.alert(t("settings.clearCache"), "Se han liberado 45MB.");
  };

  // --- COMPONENTES AUXILIARES ---

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
      style={{ borderColor }}
    >
      <View className="flex-row items-center flex-1 mr-4">
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
    <SafeAreaView className="flex-1" style={{ backgroundColor: bgColor }}>
      {/* HEADER */}
      <View
        className="px-6 py-4 flex-row items-center border-b"
        style={{ borderColor }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 p-2 rounded-full"
          style={{ backgroundColor: iconBg }}
        >
          <Ionicons name="arrow-back" size={22} color={textColor} />
        </TouchableOpacity>
        <Text className="text-2xl font-bold" style={{ color: textColor }}>
          {t("settings.title")}
        </Text>
      </View>

      <ScrollView className="px-4 pb-10">
        {/* --- SECCIÓN PERSONALIZACIÓN --- */}
        <SectionTitle title={t("settings.personalization")} />

        {/* Idioma */}
        <TouchableOpacity onPress={() => setShowLanguageModal(true)}>
          <SettingRow
            icon="globe-outline"
            title={t("settings.language")}
            subtitle={t("settings.languageSub")}
            color="#3B82F6"
          >
            <View
              className="flex-row items-center px-3 py-1 rounded-full"
              style={{ backgroundColor: languagePillBg }}
            >
              <Text className="mr-2 text-base">{currentLangObj.flag}</Text>
              <Text
                className="mr-1 text-sm font-medium"
                style={{ color: pillTextColor }}
              >
                {currentLangObj.label}
              </Text>
              <Ionicons name="chevron-down" size={14} color={subTextColor} />
            </View>
          </SettingRow>
        </TouchableOpacity>

        {/* Modo Oscuro */}
        <SettingRow
          icon="moon"
          title={t("settings.darkMode")}
          subtitle={t("settings.darkModeSub")}
          color={isDark ? "#FFFFFF" : "#000000"}
        >
          <Switch
            trackColor={{ false: "#E5E7EB", true: "#5E17EB" }}
            thumbColor={"white"}
            onValueChange={toggleColorScheme}
            value={isDark}
          />
        </SettingRow>

        {/* --- SECCIÓN EXPERIENCIA (Restaurada) --- */}
        <SectionTitle title={t("settings.experience")} />

        <SettingRow
          icon="finger-print"
          title={t("settings.haptic")}
          subtitle={t("settings.hapticSub")}
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
          title={t("settings.autoplay")}
          subtitle={t("settings.autoplaySub")}
          color="#10B981"
        >
          <Switch
            trackColor={{ false: "#E5E7EB", true: "#5E17EB" }}
            thumbColor="white"
            onValueChange={setAutoPlay}
            value={autoPlay}
          />
        </SettingRow>

        {/* --- SECCIÓN CONEXIONES (Restaurada) --- */}
        <SectionTitle title={t("settings.connections")} />

        <TouchableOpacity onPress={handleSpotifyConnect} activeOpacity={0.8}>
          <View
            className="flex-row items-center justify-between py-3.5 border-b px-2"
            style={{ borderColor }}
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
                  {spotifyConnected
                    ? t("settings.connected")
                    : t("settings.connect")}
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

        {/* --- SECCIÓN DATOS (Restaurada) --- */}
        <SectionTitle title={t("settings.data")} />

        <TouchableOpacity onPress={clearCache}>
          <SettingRow
            icon="trash-bin"
            title={t("settings.clearCache")}
            subtitle="Liberar espacio"
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

        {/* FOOTER */}
        <View className="mt-12 items-center mb-8">
          <Text
            className="font-bold text-lg"
            style={{ color: isDark ? "#52525B" : "#9CA3AF" }}
          >
            MOOD
          </Text>
          <Text
            className="text-xs"
            style={{ color: isDark ? "#52525B" : "#9CA3AF" }}
          >
            v1.0.3 (Beta)
          </Text>
        </View>
      </ScrollView>

      {/* --- MODAL DE SELECCIÓN DE IDIOMA --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showLanguageModal}
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowLanguageModal(false)}>
          <View className="flex-1 justify-end bg-black/50">
            <TouchableWithoutFeedback>
              <View
                className="rounded-t-3xl p-6 pb-10 shadow-xl"
                style={{ backgroundColor: modalBg }}
              >
                <View className="items-center mb-6">
                  <View className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                </View>

                <Text
                  className="text-xl font-bold mb-6 text-center"
                  style={{ color: textColor }}
                >
                  {t("settings.selectLanguage")}
                </Text>

                {availableLanguages.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      onPress={() => handleSelectLanguage(lang.code)}
                      className="flex-row items-center justify-between p-4 mb-3 rounded-2xl"
                      style={{
                        backgroundColor: isSelected
                          ? isDark
                            ? "#27272A"
                            : "#F3F4F6"
                          : "transparent",
                        borderWidth: isSelected ? 1 : 0,
                        borderColor: isDark ? "#3F3F46" : "#E5E7EB",
                      }}
                    >
                      <View className="flex-row items-center">
                        <Text className="text-3xl mr-4">{lang.flag}</Text>
                        <Text
                          className={`text-lg ${
                            isSelected ? "font-bold" : "font-medium"
                          }`}
                          style={{ color: textColor }}
                        >
                          {lang.label}
                        </Text>
                      </View>

                      {isSelected && (
                        <View className="bg-blue-500 rounded-full p-1">
                          <Ionicons name="checkmark" size={16} color="white" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  onPress={() => setShowLanguageModal(false)}
                  className="mt-4 p-4 rounded-xl items-center"
                >
                  <Text
                    className="text-base font-medium"
                    style={{ color: subTextColor }}
                  >
                    {t("settings.cancel")}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

export default Settings;
