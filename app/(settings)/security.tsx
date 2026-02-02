import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import * as Device from "expo-device";
import * as ScreenCapture from "expo-screen-capture"; // 1. IMPORTANTE
import * as Clipboard from "expo-clipboard"; // 2. IMPORTANTE
import { useColorScheme } from "nativewind";
import {
  updateUserPassword,
  getUserSessions,
  deleteSession,
  deleteAllSessions,
} from "@/lib/appwrite";
import { useGlobalContext } from "@/context/GlobalProvider";
import { useLanguage } from "@/context/LanguageContext";

const Security = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();
  const { setUser, setIsLogged } = useGlobalContext();

  // --- COLORES ---
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const cardBg = isDark ? "#18181B" : "#FFFFFF";
  const cardBorder = isDark ? "#27272A" : "#E4E4E7";
  const iconBg = isDark ? "#27272A" : "#F4F4F5";
  const dangerBg = isDark ? "rgba(239, 68, 68, 0.1)" : "#FEF2F2";
  const modalBg = isDark ? "#18181B" : "#FFFFFF";
  const inputBg = isDark ? "#27272A" : "#F4F4F5";
  const backIconColor = isDark ? "#FFFFFF" : "#000000";

  // --- ESTADOS ---
  const [biometrics, setBiometrics] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [deviceName, setDeviceName] = useState<string>("Dispositivo");

  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Forms
  const [passForm, setPassForm] = useState({ old: "", new: "", confirm: "" });
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  // Nuevas Funciones
  const [privacyMode, setPrivacyMode] = useState(false); // Anti-Screenshots

  const getDeviceName = useCallback(() => {
    const name =
      Device.modelName || Device.osName || t("security.sessions.device");
    setDeviceName(name);
  }, [t]);

  const checkBiometrics = useCallback(async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    setIsBiometricSupported(compatible);
  }, []);

  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    const activeSessions = await getUserSessions();
    setSessions(activeSessions);
    setIsLoadingSessions(false);
  }, []);

  useEffect(() => {
    checkBiometrics();
    fetchSessions();
    getDeviceName();
  }, [checkBiometrics, fetchSessions, getDeviceName]);

  // Efecto para el Modo Privacidad
  useEffect(() => {
    if (privacyMode) {
      ScreenCapture.preventScreenCaptureAsync();
    } else {
      ScreenCapture.allowScreenCaptureAsync();
    }
  }, [privacyMode]);

  

  // --- ACTIONS ---

  const handlePrivacyModeToggle = async (val: boolean) => {
    setPrivacyMode(val);
    if (val) {
      Alert.alert(
        "Modo Privacidad Activado",
        "Ahora no se pueden tomar capturas de pantalla ni grabar dentro de la app.",
      );
    }
  };

  const handleBiometricToggle = async () => {
    if (!biometrics) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t("security.alerts.biometricPrompt"),
      });
      if (result.success) {
        setBiometrics(true);
      }
    } else {
      setBiometrics(false);
    }
  };

  const handleChangePassword = async () => {
    if (passForm.new !== passForm.confirm) {
      Alert.alert(
        t("security.alerts.error"),
        t("security.alerts.passMismatch"),
      );
      return;
    }
    if (passForm.new.length < 8) {
      Alert.alert(t("security.alerts.error"), t("security.alerts.passLength"));
      return;
    }

    setIsUpdatingPass(true);
    try {
      await updateUserPassword(passForm.new, passForm.old);
      Alert.alert(
        t("security.alerts.success"),
        t("security.alerts.passSuccess"),
      );
      setShowPasswordModal(false);
      setPassForm({ old: "", new: "", confirm: "" });
    } catch {
      Alert.alert(t("security.alerts.error"), t("security.alerts.passError"));
    } finally {
      setIsUpdatingPass(false);
    }
  };

  const handleRevokeSession = (sessionId: string, isCurrent: boolean) => {
    if (isCurrent) {
      Alert.alert(
        t("security.alerts.notice"),
        t("security.sessions.revokeError"),
      );
      return;
    }
    Alert.alert(
      t("security.sessions.revoke"),
      t("security.sessions.revokeMsg"),
      [
        { text: t("security.modal.btnCancel"), style: "cancel" },
        {
          text: t("security.sessions.confirmRevoke"),
          style: "destructive",
          onPress: async () => {
            await deleteSession(sessionId);
            fetchSessions();
          },
        },
      ],
    );
  };

  const handleLogoutAll = () => {
    Alert.alert(
      t("security.alerts.logoutAllTitle"),
      t("security.alerts.logoutAllMsg"),
      [
        { text: t("security.modal.btnCancel"), style: "cancel" },
        {
          text: t("security.alerts.logoutAllConfirm"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAllSessions();
              setUser(null);
              setIsLogged(false);
              router.replace("/signIn");
            } catch {
              Alert.alert(
                t("security.alerts.error"),
                t("security.alerts.logoutAllError"),
              );
            }
          },
        },
      ],
    );
  };
  const goToDeleteAccount = () => {
    router.push("/(settings)/delete-account");
  };

  // --- CALCULAR SCORE DE SEGURIDAD (Gamification) ---
  const calculateSecurityScore = () => {
    let score = 50; // Base
    if (biometrics) score += 20;
    if (passForm.new.length > 10) score += 10; // Simulado, deberíamos guardar si la pass es fuerte
    if (privacyMode) score += 20;
    return Math.min(score, 100);
  };
  const score = calculateSecurityScore();
  const scoreColor =
    score > 80 ? "#10B981" : score > 60 ? "#F59E0B" : "#EF4444";

  // Componente de Fila Reutilizable
  const SecurityRow = ({
    icon,
    title,
    subtitle,
    isDanger = false,
    hasSwitch = false,
    value,
    onToggle,
    onPress,
    rightElement,
  }: any) => (
    <TouchableOpacity
      disabled={hasSwitch}
      onPress={onPress}
      className="flex-row items-center py-4 border-b"
      style={{ borderColor: borderColor }}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-4"
        style={{ backgroundColor: isDanger ? dangerBg : iconBg }}
      >
        <Ionicons
          name={icon}
          size={20}
          color={isDanger ? "#EF4444" : "#5E17EB"}
        />
      </View>
      <View className="flex-1 mr-2">
        <Text
          className="text-base font-semibold"
          style={{ color: isDanger ? "#EF4444" : textColor }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text className="text-xs mt-0.5" style={{ color: subTextColor }}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement ? (
        rightElement
      ) : hasSwitch ? (
        <Switch
          trackColor={{
            false: isDark ? "#3F3F46" : "#E4E4E7",
            true: "#5E17EB",
          }}
          thumbColor={"white"}
          onValueChange={onToggle}
          value={value}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={subTextColor} />
      )}
    </TouchableOpacity>
  );

  return (
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
          {t("security.title")}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6 mt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* SCORE WIDGET */}
        <View
          className="p-5 rounded-3xl mb-8 border relative overflow-hidden"
          style={{
            backgroundColor: isDark ? "rgba(94, 23, 235, 0.05)" : "#F5F3FF",
            borderColor: isDark ? "rgba(94, 23, 235, 0.2)" : "#DDD6FE",
          }}
        >
          <View className="flex-row justify-between items-start mb-2">
            <View>
              <Text className="text-sm font-bold uppercase tracking-widest text-[#5E17EB]">
                Salud de Seguridad
              </Text>
              <Text
                className="text-2xl font-bold mt-1"
                style={{ color: textColor }}
              >
                {score >= 80 ? "Excelente" : score >= 60 ? "Buena" : "Riesgo"}
              </Text>
            </View>
            <View
              className="items-center justify-center w-12 h-12 rounded-full border-4"
              style={{ borderColor: scoreColor }}
            >
              <Text className="font-bold text-xs" style={{ color: scoreColor }}>
                {score}%
              </Text>
            </View>
          </View>
          <View className="h-2 w-full bg-gray-200 dark:bg-zinc-700 rounded-full mt-2 overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{ width: `${score}%`, backgroundColor: scoreColor }}
            />
          </View>
        </View>

        {/* ACCIONES DE ACCESO */}
        <Text
          className="text-xs font-bold uppercase mb-2 tracking-widest pl-1"
          style={{ color: subTextColor }}
        >
          {t("security.headers.access")}
        </Text>

        <SecurityRow
          icon="key-outline"
          title={t("security.actions.changePass")}
          subtitle={t("security.actions.changePassSub")}
          onPress={() => setShowPasswordModal(true)}
        />

        {isBiometricSupported && (
          <SecurityRow
            icon="finger-print-outline"
            title={
              Platform.OS === "ios"
                ? t("security.actions.faceId")
                : t("security.actions.touchId")
            }
            subtitle={t("security.actions.biometricsSub")}
            hasSwitch
            value={biometrics}
            onToggle={handleBiometricToggle}
          />
        )}

        {/* NUEVA SECCIÓN DE PRIVACIDAD */}
        <Text
          className="text-xs font-bold uppercase mb-2 mt-6 tracking-widest pl-1"
          style={{ color: subTextColor }}
        >
          Privacidad
        </Text>

        <SecurityRow
          icon="eye-off-outline"
          title="Modo Privacidad"
          subtitle="Bloquea capturas y grabaciones de pantalla"
          hasSwitch
          value={privacyMode}
          onToggle={handlePrivacyModeToggle}
        />

        <SecurityRow
          icon="clipboard-outline"
          title="Limpiar Portapapeles"
          subtitle="Borrar datos copiados por seguridad"
          onPress={async () => {
            await Clipboard.setStringAsync("");
            Alert.alert("Listo", "Portapapeles limpiado.");
          }}
          rightElement={
            <View className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-md">
              <Text style={{ color: subTextColor, fontSize: 10 }}>LIMPIAR</Text>
            </View>
          }
        />

        {/* SESIONES */}
        <View className="flex-row justify-between items-center mt-8 mb-2 pl-1">
          <Text
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: subTextColor }}
          >
            {t("security.headers.sessions")} ({sessions.length})
          </Text>
          <TouchableOpacity onPress={fetchSessions}>
            <Ionicons name="refresh" size={16} color="#5E17EB" />
          </TouchableOpacity>
        </View>

        {isLoadingSessions ? (
          <ActivityIndicator color="#5E17EB" className="my-4" />
        ) : (
          <View
            className="rounded-2xl border overflow-hidden mb-6"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            {sessions.map((session, index) => (
              <View
                key={session.$id}
                className={`p-4 flex-row items-center justify-between ${
                  index !== sessions.length - 1 ? "border-b" : ""
                }`}
                style={{ borderColor: cardBorder }}
              >
                <View className="flex-row items-center flex-1">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{
                      backgroundColor: session.current
                        ? isDark
                          ? "rgba(16, 185, 129, 0.2)"
                          : "#D1FAE5"
                        : iconBg,
                    }}
                  >
                    <Ionicons
                      name={
                        session.clientType === "mobile"
                          ? "phone-portrait-outline"
                          : "laptop-outline"
                      }
                      size={20}
                      color={session.current ? "#10B981" : subTextColor}
                    />
                  </View>
                  <View>
                    <Text
                      className="font-bold text-sm"
                      style={{ color: textColor }}
                    >
                      {session.current
                        ? deviceName
                        : `${session.clientName || t("security.sessions.device")} (${session.osName})`}
                    </Text>
                    <View className="flex-row items-center">
                      {session.current && (
                        <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                      )}
                      <Text
                        className="text-xs"
                        style={{
                          color: session.current ? "#10B981" : subTextColor,
                          fontWeight: session.current ? "bold" : "normal",
                        }}
                      >
                        {session.current
                          ? t("security.sessions.current")
                          : session.ip || t("security.sessions.unknown")}
                      </Text>
                    </View>
                  </View>
                </View>

                {!session.current && (
                  <TouchableOpacity
                    onPress={() =>
                      handleRevokeSession(session.$id, session.current)
                    }
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: dangerBg }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ZONA DE PELIGRO */}
        <Text
          className="text-xs font-bold uppercase mb-2 mt-2 tracking-widest pl-1"
          style={{ color: subTextColor }}
        >
          {t("security.headers.danger")}
        </Text>
        <SecurityRow
          icon="log-out-outline"
          title={t("security.actions.logoutAll")}
          subtitle={t("security.actions.logoutAllSub")}
          isDanger
          onPress={handleLogoutAll}
        />

        <SecurityRow
          icon="trash-outline"
          title={t("security.actions.deleteAccount")}
          subtitle={t("security.actions.deleteAccountSub")}
          isDanger
          onPress={goToDeleteAccount}
        />

        <View className="h-20" />
      </ScrollView>

      {/* --- MODAL CAMBIAR CONTRASEÑA --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPasswordModal}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View
            className="rounded-t-3xl border-t p-6 h-[70%]"
            style={{ backgroundColor: modalBg, borderColor: borderColor }}
          >
            <View
              className="w-12 h-1 rounded-full self-center mb-6"
              style={{ backgroundColor: borderColor }}
            />
            <Text
              className="text-2xl font-bold mb-2"
              style={{ color: textColor }}
            >
              {t("security.modal.title")}
            </Text>
            <Text className="text-sm mb-8" style={{ color: subTextColor }}>
              {t("security.modal.subtitle")}
            </Text>

            <View className="gap-y-4">
              {/* Inputs de contraseña (simplificado visualmente) */}
              {["old", "new", "confirm"].map((field) => (
                <View key={field}>
                  <Text
                    className="text-xs font-bold uppercase mb-2 ml-1"
                    style={{ color: subTextColor }}
                  >
                    {/* Aquí usarías tus traducciones, hardcodeo labels genéricos por simplicidad si no existen */}
                    {field === "old"
                      ? "Actual"
                      : field === "new"
                        ? "Nueva"
                        : "Confirmar"}
                  </Text>
                  <TextInput
                    secureTextEntry
                    className="border p-4 rounded-xl"
                    style={{
                      backgroundColor: inputBg,
                      borderColor: borderColor,
                      color: textColor,
                    }}
                    placeholder={"********"}
                    placeholderTextColor={subTextColor}
                    value={(passForm as any)[field]}
                    onChangeText={(t) =>
                      setPassForm({ ...passForm, [field]: t })
                    }
                  />
                </View>
              ))}
            </View>

            <View className="flex-1 justify-end gap-y-3">
              <TouchableOpacity
                onPress={handleChangePassword}
                disabled={isUpdatingPass}
                className="bg-[#5E17EB] h-[56px] rounded-xl items-center justify-center shadow-lg"
              >
                {isUpdatingPass ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">
                    {t("security.modal.btnUpdate")}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                className="h-[56px] rounded-xl items-center justify-center"
              >
                <Text
                  className="font-bold text-base"
                  style={{ color: subTextColor }}
                >
                  {t("security.modal.btnCancel")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Security;
