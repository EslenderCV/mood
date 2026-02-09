import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import CustomButtom from "@/components/CustomButtom";
import FormField from "@/components/FormField";
import { resetPasswordWithEmailCode } from "@/lib/appwrite";
import { useLanguage } from "@/context/LanguageContext";
import { useGlobalContext } from "@/context/GlobalProvider";

const Recovery = () => {
  const { t } = useLanguage();
  const { checkAuth } = useGlobalContext();
  const params = useLocalSearchParams();

  const userId = useMemo(() => {
    const v = params?.userId;
    return typeof v === "string" ? v : "";
  }, [params]);

  const email = useMemo(() => {
    const v = params?.email;
    return typeof v === "string" ? v : "";
  }, [params]);

  const phrase = useMemo(() => {
    const v = params?.phrase;
    return typeof v === "string" ? v : "";
  }, [params]);

  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const submit = async () => {
    if (!userId) {
      Alert.alert(
        "Datos inválidos",
        "No pudimos iniciar el proceso de recuperación. Solicita un código nuevo.",
        [{ text: "OK", onPress: () => router.replace("/forgotPassword") }],
      );
      return;
    }

    // Appwrite Email OTP codes can be alphanumeric depending on configuration.
    // Don't strip to digits-only (it would corrupt valid codes containing letters).
    const cleanCode = code.replace(/[\s-]/g, "").trim();
    // Appwrite Email OTP suele ser 6 dígitos, pero en algunas configuraciones puede ser más largo.
    // Validamos un mínimo razonable y NO truncamos el input.
    if (!cleanCode || cleanCode.length < 6) {
      Alert.alert(
        "Código inválido",
        "Escribe el código exacto que recibiste por correo (usa el más reciente).",
      );
      return;
    }

    if (!password.trim() || password.trim().length < 8) {
      Alert.alert(
        "Contraseña muy corta",
        "Usa una contraseña de al menos 8 caracteres.",
      );
      return;
    }

    if (password !== password2) {
      Alert.alert("No coinciden", "Asegúrate de escribir la misma contraseña.");
      return;
    }

    try {
      setIsLoading(true);
      await resetPasswordWithEmailCode(userId, cleanCode, password);

      // We just created a valid session (via Email OTP). Refresh auth state so the
      // router doesn't bounce the user back to auth screens.
      await checkAuth(true);

      Alert.alert(
        "Listo",
        "Tu contraseña fue actualizada.",
        [
          {
            text: "OK",
            // Mantén la sesión creada con el código (OTP) y envía al usuario
            // directamente a la app para evitar fricción y loops de navegación.
            onPress: () => router.replace("/home"),
          },
        ],
      );
    } catch (error: any) {
      const msg = String(error?.message || "");
      const looksLikeCodeIssue =
        /invalid\s+`?secret`?/i.test(msg) ||
        /invalid\s+secret/i.test(msg) ||
        /token/i.test(msg) ||
        /otp/i.test(msg);

      Alert.alert(
        t("auth.alerts.errorTitle") || "Error",
        looksLikeCodeIssue
          ? "El código es incorrecto o expiró. Si pediste otro, usa el más reciente."
          : error?.message || "No pudimos actualizar tu contraseña.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="bg-black flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full flex justify-center items-center min-h-[85vh] px-6">
            <Image
              source={require("@/assets/mood.png")}
              className="w-[140px] h-[140px]"
              resizeMode="contain"
            />

            <Text className="text-white text-3xl font-bold mt-6">
              Restablecer contraseña
            </Text>

            <Text className="text-zinc-400 text-base mt-2 text-center">
              Escribe el código que recibiste por correo y crea una nueva contraseña.
            </Text>

            <View className="w-full mt-10">
              <FormField
                placeholder={"Código"}
                value={code}
                handleChangeText={(text: string) => setCode(text)}
                otherStyles="mt-0"
                keyboardType={Platform.OS === "ios" ? "ascii-capable" : "default"}
                autoCapitalize="none"
                autoCorrect={false}
                // No limit: Appwrite puede emitir OTPs de longitudes distintas según versión/config.
              />

              {phrase ? (
                <Text className="text-zinc-500 text-xs mt-2">
                  Frase de seguridad: <Text className="text-zinc-300">{phrase}</Text>
                </Text>
              ) : null}

              <FormField
                placeholder={t("auth.passwordPlaceholder") || "Nueva contraseña"}
                value={password}
                handleChangeText={(text: string) => setPassword(text)}
                otherStyles="mt-4"
                secureTextEntry
                textContentType="newPassword"
                autoComplete="password-new"
              />

              <FormField
                placeholder={"Confirmar contraseña"}
                value={password2}
                handleChangeText={(text: string) => setPassword2(text)}
                otherStyles="mt-4"
                secureTextEntry
                textContentType="newPassword"
                autoComplete="password-new"
              />

              <CustomButtom
                text="Guardar"
                handlePress={submit}
                containerStyles="w-full bg-[#5E17EB] rounded-2xl py-4 shadow-lg shadow-[#5E17EB]/40 mt-6"
                textStyles="text-white font-bold text-lg"
                loading={isLoading}
              />

              <View className="items-center mt-6">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.replace("/signIn")}
                >
                  <Text className="text-zinc-400 text-sm">
                    Volver al inicio de sesión
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <StatusBar style="light" />
    </SafeAreaView>
  );
};

export default Recovery;
