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
import { useColorScheme } from "nativewind"; // <--- Importante

// Importamos las funciones
import {
  updateUserPassword,
  getUserSessions,
  deleteSession,
  deleteAllSessions,
} from "@/lib/appwrite";
import { useGlobalContext } from "@/context/GlobalProvider";

const Security = () => {
  // --- TEMA BLINDADO ---
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Colores calculados
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const cardBg = isDark ? "#18181B" : "#FFFFFF"; // Tarjetas blancas en modo claro para contraste limpio
  const cardBorder = isDark ? "#27272A" : "#E4E4E7";
  const iconBg = isDark ? "#27272A" : "#F4F4F5";
  const dangerBg = isDark ? "rgba(239, 68, 68, 0.1)" : "#FEF2F2";
  const modalBg = isDark ? "#18181B" : "#FFFFFF";
  const inputBg = isDark ? "#27272A" : "#F4F4F5";
  const backIconColor = isDark ? "#FFFFFF" : "#000000";

  const { setUser, setIsLogged } = useGlobalContext();

  // Estados
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

  // --- 1. INICIALIZACIÓN ---
  useEffect(() => {
    checkBiometrics();
    fetchSessions();
    getDeviceName();
  }, []);

  const getDeviceName = () => {
    const name = Device.modelName || Device.osName || "Dispositivo Móvil";
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

  // --- 2. MANEJADORES ---
  const handleBiometricToggle = async () => {
    if (!biometrics) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirma para activar FaceID/TouchID",
      });
      if (result.success) {
        setBiometrics(true);
        Alert.alert("Seguridad", "Biometría activada correctamente.");
      }
    } else {
      setBiometrics(false);
    }
  };

  const handleChangePassword = async () => {
    if (passForm.new !== passForm.confirm) {
      Alert.alert("Error", "Las contraseñas nuevas no coinciden.");
      return;
    }
    if (passForm.new.length < 8) {
      Alert.alert("Error", "La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setIsUpdatingPass(true);
    try {
      await updateUserPassword(passForm.new, passForm.old);
      Alert.alert("Éxito", "Tu contraseña ha sido actualizada.");
      setShowPasswordModal(false);
      setPassForm({ old: "", new: "", confirm: "" });
    } catch (error: any) {
      Alert.alert("Error", "Contraseña actual incorrecta o error de red.");
    } finally {
      setIsUpdatingPass(false);
    }
  };

  const handleRevokeSession = (sessionId: string, isCurrent: boolean) => {
    if (isCurrent) {
      Alert.alert(
        "Aviso",
        "No puedes revocar tu sesión actual aquí. Usa cerrar sesión."
      );
      return;
    }
    Alert.alert("Revocar Acceso", "¿Quieres desconectar este dispositivo?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí, desconectar",
        style: "destructive",
        onPress: async () => {
          await deleteSession(sessionId);
          fetchSessions();
        },
      },
    ]);
  };

  const handleLogoutAll = () => {
    Alert.alert(
      "¿Cerrar sesión en TODOS lados?",
      "Se cerrará tu sesión en todos los dispositivos.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar Todo",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAllSessions();
              setUser(null);
              setIsLogged(false);
              router.replace("/signIn");
            } catch (error) {
              Alert.alert("Error", "No se pudieron cerrar todas las sesiones.");
            }
          },
        },
      ]
    );
  };

  // --- RENDERIZADORES ---
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
          Seguridad
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6 mt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* ESTADO DE SEGURIDAD */}
        <View
          className="p-4 rounded-2xl flex-row items-center mb-8 border"
          style={{
            backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5", // Emerald tint
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
              Cuenta Protegida
            </Text>
            <Text className="text-emerald-600/80 text-xs mt-0.5">
              Tus credenciales están encriptadas y seguras.
            </Text>
          </View>
        </View>

        {/* SECCIÓN ACCESO */}
        <Text
          className="text-xs font-bold uppercase mb-2 tracking-widest pl-1"
          style={{ color: subTextColor }}
        >
          Acceso y Autenticación
        </Text>

        <SecurityRow
          icon="key-outline"
          title="Cambiar Contraseña"
          subtitle="Se recomienda cambiarla cada 6 meses"
          onPress={() => setShowPasswordModal(true)}
        />

        {isBiometricSupported && (
          <SecurityRow
            icon="finger-print-outline"
            title={Platform.OS === "ios" ? "Face ID" : "Huella Digital"}
            subtitle="Inicio de sesión rápido"
            hasSwitch
            value={biometrics}
            onToggle={handleBiometricToggle}
          />
        )}

        {/* SECCIÓN DISPOSITIVOS */}
        <View className="flex-row justify-between items-center mt-8 mb-2 pl-1">
          <Text
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: subTextColor }}
          >
            Sesiones Activas ({sessions.length})
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
                        : `${session.clientName || "Dispositivo"} (${
                            session.osName
                          })`}
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
                          ? "Dispositivo Actual"
                          : session.ip || "Ubicación Desconocida"}
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

        {/* SECCIÓN PELIGRO */}
        <Text
          className="text-xs font-bold uppercase mb-2 mt-2 tracking-widest pl-1"
          style={{ color: subTextColor }}
        >
          Zona de Peligro
        </Text>
        <SecurityRow
          icon="log-out-outline"
          title="Cerrar Sesión en Todo"
          subtitle="Desconectar todos los dispositivos"
          isDanger
          onPress={handleLogoutAll}
        />
        <SecurityRow
          icon="trash-outline"
          title="Eliminar Cuenta"
          subtitle="Acción irreversible"
          isDanger
          onPress={() =>
            Alert.alert(
              "Contacto",
              "Para eliminar tu cuenta, contacta a soporte."
            )
          }
        />

        <View className="h-20" />
      </ScrollView>

      {/* --- MODAL CAMBIO DE CONTRASEÑA --- */}
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
              Cambiar Contraseña
            </Text>
            <Text className="text-sm mb-8" style={{ color: subTextColor }}>
              La nueva contraseña debe tener al menos 8 caracteres.
            </Text>

            <View className="gap-y-4">
              <View>
                <Text
                  className="text-xs font-bold uppercase mb-2 ml-1"
                  style={{ color: subTextColor }}
                >
                  Contraseña Actual
                </Text>
                <TextInput
                  secureTextEntry
                  className="border p-4 rounded-xl"
                  style={{
                    backgroundColor: inputBg,
                    borderColor: borderColor,
                    color: textColor,
                  }}
                  placeholder="Ingresa tu contraseña actual"
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
                  Nueva Contraseña
                </Text>
                <TextInput
                  secureTextEntry
                  className="border p-4 rounded-xl"
                  style={{
                    backgroundColor: inputBg,
                    borderColor: borderColor,
                    color: textColor,
                  }}
                  placeholder="Ingresa la nueva contraseña"
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
                  Confirmar Nueva
                </Text>
                <TextInput
                  secureTextEntry
                  className="border p-4 rounded-xl"
                  style={{
                    backgroundColor: inputBg,
                    borderColor: borderColor,
                    color: textColor,
                  }}
                  placeholder="Repite la nueva contraseña"
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
                    Actualizar Contraseña
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
                  Cancelar
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
