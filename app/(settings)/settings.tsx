import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Linking,
} from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";
import { useGlobalContext, User } from "@/context/GlobalProvider";
import { updateProfile } from "@/lib/appwrite";
import { logger } from "@/src/observability/logger";
import * as Application from "expo-application";
import Constants from "expo-constants";

const Settings = () => {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const { user, setUser } = useGlobalContext();
  const [updatingPlatform, setUpdatingPlatform] = useState(false);

  // 🔥 ESTADO PARA NOTIFICACIONES
  // Usamos `(user as any)` para que TypeScript no se queje de la propiedad nueva
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    (user as any)?.notificationsEnabled ?? true,
  );

  const { language, setLanguage, t, availableLanguages } = useLanguage();

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const modalBg = isDark ? "#121212" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#6B7280";
  const iconBg = isDark ? "#18181B" : "#F3F4F6";
  const borderColor = isDark ? "#27272A" : "#E5E7EB";

  const languagePillBg = isDark ? "#27272A" : "#F3F4F6";
  const pillTextColor = isDark ? "#FFFFFF" : "#000000";

  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const configVersion = Constants.expoConfig?.version ?? "";
  const isExpoGo = Constants.appOwnership === "expo";
  const appVersion = (isExpoGo ? configVersion : Application.nativeApplicationVersion) ?? configVersion;
  const buildVersion = isExpoGo ? "" : Application.nativeBuildVersion ?? "";
  const versionLabel = appVersion
    ? buildVersion
      ? `v${appVersion} (${buildVersion})`
      : `v${appVersion}`
    : "";

  const currentLangObj =
    availableLanguages.find((l) => l.code === language) ||
    availableLanguages[0];

  useEffect(() => {
    if (user) {
      // Forzamos el tipo aquí también
      setNotificationsEnabled((user as any).notificationsEnabled ?? true);
    }
  }, [user]);

  const handleSelectLanguage = (langCode: any) => {
    setLanguage(langCode);
    setShowLanguageModal(false);
  };

  const clearCache = () => {
    Alert.alert(t("settings.clearCache"), "Se han liberado 45MB.");
  };

  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsEnabled(value);

    try {
      await updateProfile(user?.$id || "", {
        notificationsEnabled: value,
      });

      if (setUser) {
        setUser({ ...user, notificationsEnabled: value } as any);
      }
    } catch (error: any) {
      // <--- Añade :any aquí
      setNotificationsEnabled(!value);

      // 🔥 AGREGA ESTO PARA VER EL ERROR REAL EN LA CONSOLA
      logger.warn("update notifications failed", { message: error?.message });

      Alert.alert("Error", `No se pudo actualizar: ${error.message}`);
    }
  };

  const handlePlatformChange = async (platform: string) => {
    if (user?.preferredPlatform === platform || updatingPlatform) return;

    try {
      setUpdatingPlatform(true);
      await updateProfile(user?.$id || "", {
        preferredPlatform: platform,
      });

      if (setUser) {
        setUser({ ...user, preferredPlatform: platform } as User);
      }
    } catch {
      Alert.alert("Error", "No se pudo actualizar la preferencia de música.");
    } finally {
      setUpdatingPlatform(false);
    }
  };

  const openLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", "No se pudo abrir el enlace.");
    }
  };

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
    isCustomIcon = false,
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
          {isCustomIcon ? (
            icon
          ) : (
            <Ionicons name={icon} size={20} color={color} />
          )}
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
        <SectionTitle title={t("settings.personalization")} />

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

        <SettingRow
          icon="notifications"
          title="Notificaciones"
          subtitle="Alertas push y actividades"
          color="#F59E0B"
        >
          <Switch
            trackColor={{ false: "#E5E7EB", true: "#5E17EB" }}
            thumbColor={"white"}
            onValueChange={handleNotificationToggle}
            value={notificationsEnabled}
          />
        </SettingRow>

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

        <SectionTitle title="PLATAFORMA DE MÚSICA" />
        <TouchableOpacity
          onPress={() => handlePlatformChange("spotify")}
          disabled={updatingPlatform}
        >
          <SettingRow
            isCustomIcon={true}
            icon={<FontAwesome5 name="spotify" size={20} color="#1DB954" />}
            title="Spotify"
            subtitle="Reproducir en Spotify"
          >
            {user?.preferredPlatform === "spotify" && (
              <Ionicons name="checkmark-circle" size={22} color="#1DB954" />
            )}
            {updatingPlatform && user?.preferredPlatform !== "spotify" && (
              <View />
            )}
          </SettingRow>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handlePlatformChange("apple")}
          disabled={updatingPlatform}
        >
          <SettingRow
            isCustomIcon={true}
            icon={<FontAwesome5 name="apple" size={22} color={textColor} />}
            title="Apple Music"
            subtitle="Reproducir en Apple Music"
          >
            {user?.preferredPlatform === "apple" && (
              <Ionicons name="checkmark-circle" size={22} color="#FA243C" />
            )}
          </SettingRow>
        </TouchableOpacity>

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

        <SectionTitle title={t("deleteAccount.section")} />
        <TouchableOpacity onPress={() => router.push("/delete-account")}>
          <SettingRow
            icon="person-remove-outline"
            title={t("deleteAccount.action")}
            subtitle={t("deleteAccount.subtitle")}
            color="#EF4444"
          />
        </TouchableOpacity>

        <SectionTitle title="LEGAL" />
        <TouchableOpacity
          onPress={() =>
            openLink(
              "https://candied-resolution-5fa.notion.site/T-rminos-de-Uso-y-EULA-Acuerdo-de-Licencia-2e08961d2f1080769b1ddd43f1ea92c7?source=copy_link",
            )
          }
        >
          <SettingRow
            icon="document-text-outline"
            title="Términos y Condiciones (EULA)"
            subtitle="Reglas de convivencia"
            color={textColor}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            openLink(
              "https://candied-resolution-5fa.notion.site/Pol-tica-de-Privacidad-de-Mood-2e08961d2f1080018d6dc0ba872fab3d?source=copy_link",
            )
          }
        >
          <SettingRow
            icon="shield-checkmark-outline"
            title="Política de Privacidad"
            subtitle="Cómo cuidamos tus datos"
            color={textColor}
          />
        </TouchableOpacity>

        <View className="mt-12 items-center mb-8">
          <Text
            className="font-bold text-lg"
            style={{ color: isDark ? "#52525B" : "#9CA3AF" }}
          >
            MOOD
          </Text>
          {versionLabel ? (
            <Text
              className="text-xs"
              style={{ color: isDark ? "#52525B" : "#9CA3AF" }}
            >
              {versionLabel}
            </Text>
          ) : null}
        </View>
      
        {typeof __DEV__ !== "undefined" && __DEV__ && (
          <>
            <SectionTitle title="DESARROLLO" />
            <TouchableOpacity onPress={() => router.push("/feature-flags" as any)}>
              <SettingRow
                icon="flask-outline"
                title="Experimentos"
                subtitle="Feature flags / kill switches"
                color="#8B5CF6"
              >
                <Ionicons name="chevron-forward" size={20} color={subTextColor} />
              </SettingRow>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>

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
