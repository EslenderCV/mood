import React, { useEffect, useState } from "react";
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
import { requestPasswordResetCode } from "@/lib/appwrite";
import { useLanguage } from "@/context/LanguageContext";

const ForgotPassword = () => {
  const { t } = useLanguage();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!emailParam || typeof emailParam !== "string") return;
    const p = emailParam;
    setEmail((prev) => (prev === p ? prev : p));
  }, [emailParam]);

  const submit = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean) {
      Alert.alert(
        t("auth.alerts.emptyTitle") || "Falta tu correo",
        "Escribe el correo asociado a tu cuenta.",
      );
      return;
    }

    try {
      setIsLoading(true);
      const token: any = await requestPasswordResetCode(clean);

      // Navigate to in-app reset flow (code + new password)
      const userId = token?.userId || token?.userId?.toString?.() || "";
      const phrase = token?.phrase || "";

      Alert.alert(
        "Revisa tu correo",
        "Te enviamos un código para restablecer tu contraseña. Si no lo ves, revisa Spam/Promociones.",
        [
          {
            text: "OK",
            onPress: () =>
              router.replace({
                pathname: "/recovery",
                params: { email: clean, userId, phrase },
              }),
          },
        ],
      );
    } catch (error: any) {
      // Show a short message in-app and log full details to the console.
      // Some errors can be very large (HTTP bodies / debug info).
      // eslint-disable-next-line no-console
      console.error("[ForgotPassword] requestPasswordResetCode failed:", {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        raw: error,
      });

      Alert.alert(
        t("auth.alerts.errorTitle") || "Error",
        "No pudimos enviar el código. Revisa la consola para ver el error completo.",
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
              Recuperar contraseña
            </Text>

            <Text className="text-zinc-400 text-base mt-2 text-center">
              Te enviaremos un código para crear una nueva contraseña.
            </Text>

            <View className="w-full mt-10">
              <FormField
                placeholder={t("auth.emailPlaceholder") || "Correo"}
                value={email}
                handleChangeText={(text: string) => setEmail(text)}
                otherStyles="mt-0"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
              />

              <CustomButtom
                text="Enviar código"
                handlePress={submit}
                containerStyles="w-full bg-[#5E17EB] rounded-2xl py-4 shadow-lg shadow-[#5E17EB]/40 mt-6"
                textStyles="text-white font-bold text-lg"
                loading={isLoading}
              />

              <View className="items-center mt-6">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.back()}
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

export default ForgotPassword;
