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
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import * as Device from "expo-device";
import { useColorScheme } from "nativewind";
import {
  updateUserPassword,
  getUserSessions,
  deleteSession,
  deleteAllSessions,
} from "@/lib/appwrite";
import { useGlobalContext } from "@/context/GlobalProvider";
// 1. IMPORTAR CONTEXTO
import { useLanguage } from "@/context/LanguageContext";

const Security = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // 2. USAR HOOK
  const { t } = useLanguage();

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
  const { setUser, setIsLogged } = useGlobalContext();
  const [biometrics, setBiometrics] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [deviceName, setDeviceName] = useState<string>(
    "Dispositivo Desconocido"
  );
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passForm, setPassForm] = useState({ old: "", new: "", confirm: "" });
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  useEffect(() => {
    checkBiometrics();
    fetchSessions();
    getDeviceName();
  }, []);

  const getDeviceName = () => {
    const name =
      Device.modelName || Device.osName || t("security.sessions.device");
    setDeviceName(name);
  };

  const checkBiometrics = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    setIsBiometricSupported(compatible);
  };

  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    const activeSessions = await getUserSessions();
    setSessions(activeSessions);
    setIsLoadingSessions(false);
  };

  const handleBiometricToggle = async () => {
    if (!biometrics) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t("security.alerts.biometricPrompt"),
      });
      if (result.success) {
        setBiometrics(true);
        Alert.alert(
          t("security.alerts.biometricsTitle"),
          t("security.alerts.biometricSuccess")
        );
      }
    } else {
      setBiometrics(false);
    }
  };

  const handleChangePassword = async () => {
    if (passForm.new !== passForm.confirm) {
      Alert.alert(
        t("security.alerts.error"),
        t("security.alerts.passMismatch")
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
        t("security.alerts.passSuccess")
      );
      setShowPasswordModal(false);
      setPassForm({ old: "", new: "", confirm: "" });
    } catch (error: any) {
      Alert.alert(t("security.alerts.error"), t("security.alerts.passError"));
    } finally {
      setIsUpdatingPass(false);
    }
  };

  const handleRevokeSession = (sessionId: string, isCurrent: boolean) => {
    if (isCurrent) {
      Alert.alert(
        t("security.alerts.notice"),
        t("security.sessions.revokeError")
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
      ]
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
            } catch (error) {
              Alert.alert(
                t("security.alerts.error"),
                t("security.alerts.logoutAllError")
              );
            }
          },
        },
      ]
    );
  };
  const SecurityRow = ({
    icon,
    title,
    subtitle,
    isDanger = false,
    hasSwitch = false,
    value,
    onToggle,
    onPress,
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
      <View className="flex-1">
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
      {hasSwitch ? (
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
        <View
          className="p-4 rounded-2xl flex-row items-center mb-8 border"
          style={{
            backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5",
            borderColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#D1FAE5",
          }}
        >
          <View
            className="p-2 rounded-full mr-3"
            style={{
              backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#D1FAE5",
            }}
          >
            <MaterialIcons name="security" size={24} color="#10B981" />
          </View>
          <View className="flex-1">
            <Text className="text-emerald-500 font-bold text-base">
              {t("security.protectedTitle")}
            </Text>
            <Text className="text-emerald-600/80 text-xs mt-0.5">
              {t("security.protectedMsg")}
            </Text>
          </View>
        </View>
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
                        : `${
                            session.clientName || t("security.sessions.device")
                          } (${session.osName})`}
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
          onPress={() =>
            Alert.alert(
              t("security.alerts.deleteContactTitle"),
              t("security.alerts.deleteContactMsg")
            )
          }
        />
        <View className="h-20" />
      </ScrollView>
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
              <View>
                <Text
                  className="text-xs font-bold uppercase mb-2 ml-1"
                  style={{ color: subTextColor }}
                >
                  {t("security.modal.currentLabel")}
                </Text>
                <TextInput
                  secureTextEntry
                  className="border p-4 rounded-xl"
                  style={{
                    backgroundColor: inputBg,
                    borderColor: borderColor,
                    color: textColor,
                  }}
                  placeholder={t("security.modal.currentPlaceholder")}
                  placeholderTextColor={subTextColor}
                  value={passForm.old}
                  onChangeText={(t) => setPassForm({ ...passForm, old: t })}
                />
              </View>
              <View>
                <Text
                  className="text-xs font-bold uppercase mb-2 ml-1"
                  style={{ color: subTextColor }}
                >
                  {t("security.modal.newLabel")}
                </Text>
                <TextInput
                  secureTextEntry
                  className="border p-4 rounded-xl"
                  style={{
                    backgroundColor: inputBg,
                    borderColor: borderColor,
                    color: textColor,
                  }}
                  placeholder={t("security.modal.newPlaceholder")}
                  placeholderTextColor={subTextColor}
                  value={passForm.new}
                  onChangeText={(t) => setPassForm({ ...passForm, new: t })}
                />
              </View>
              <View>
                <Text
                  className="text-xs font-bold uppercase mb-2 ml-1"
                  style={{ color: subTextColor }}
                >
                  {t("security.modal.confirmLabel")}
                </Text>
                <TextInput
                  secureTextEntry
                  className="border p-4 rounded-xl"
                  style={{
                    backgroundColor: inputBg,
                    borderColor: borderColor,
                    color: textColor,
                  }}
                  placeholder={t("security.modal.confirmPlaceholder")}
                  placeholderTextColor={subTextColor}
                  value={passForm.confirm}
                  onChangeText={(t) => setPassForm({ ...passForm, confirm: t })}
                />
              </View>
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
