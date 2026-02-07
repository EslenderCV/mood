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
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Link, router, useLocalSearchParams } from "expo-router";
import CustomButtom from "@/components/CustomButtom";
import FormField from "@/components/FormField";
import { useGlobalContext, User } from "@/context/GlobalProvider";
import {
  getCurrentUser,
  signInn,
  signInWithOAuth,
  syncOrCreateUserDocument,
} from "@/lib/appwrite";
import { sendWelcomeEmail } from "@/lib/email";
import { AppwriteException } from "react-native-appwrite";
import { tStatic, useLanguage } from "@/context/LanguageContext";

// 🔥 IMPORTAMOS EL ACCOUNT MANAGER
import { AccountManager } from "@/lib/accountManager";

const SignIn = () => {
  const { setUser, setLoggedIn } = useGlobalContext();
  const { t } = useLanguage();

  // ✅ Capturar parámetros de navegación
  const params = useLocalSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  // ✅ CORRECCIÓN TYPE SCRIPT:
  // Capturamos el valor en una variable const para asegurar el tipo string
  useEffect(() => {
    const incomingEmail = params.email; // 1. Asignamos a variable
    if (incomingEmail && typeof incomingEmail === "string") {
      setForm((prev) => ({ ...prev, email: incomingEmail })); // 2. Usamos la variable segura
    }
  }, [params]);

  const submit = async () => {
    if (!form.email.trim() || !form.password.trim()) {
      Alert.alert(t("auth.alerts.emptyTitle"), t("auth.alerts.emptyMsg"));
      return;
    }

    try {
      setIsLoading(true);

      // 1. Iniciar sesión (Crea la cookie nativa real)
      await signInn(form.email, form.password);

      // 2. Obtener usuario
      const result = await getCurrentUser();

      if (result) {
        setLoggedIn(true);
        setUser(result as unknown as User);

        // 🔥 3. Guardar solo metadata (No se necesita secreto)
        await AccountManager.saveCurrentAccount();

        router.replace("/home");
      } else {
        throw new Error("No se pudo obtener la información del usuario.");
      }
    } catch (error: any) {
      const appwriteError = error as AppwriteException;
      Alert.alert(
        t("auth.alerts.errorTitle") || "Error",
        appwriteError.message || t("auth.alerts.wrongCredentials"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    try {
      setIsLoading(true);

      const success = await signInWithOAuth(provider);

      if (success) {
        const user = await syncOrCreateUserDocument();

        if (user) {
          sendWelcomeEmail(user.email, user.name).catch(console.error);
          setUser(user as unknown as User);
          setLoggedIn(true);

          // 🔥 Guardar metadata también en OAuth
          await AccountManager.saveCurrentAccount();

          setTimeout(() => {
            router.replace("/home");
          }, 500);
        } else {
          Alert.alert(tStatic("ui.s_902b0d55"), tStatic("ui.s_77c0ff57"));
        }
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="bg-black flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full px-6 justify-center min-h-[85vh]">
            <View className="items-center mb-10">
              <Image
                source={require("@/assets/fullLogo.png")}
                className="w-24 h-24 mb-6"
                resizeMode="contain"
              />
              <Text className="text-white text-4xl font-bold tracking-tight text-center">
                {t("auth.welcomeBack")}
              </Text>
              <Text className="text-zinc-400 text-base mt-2 text-center">
                {t("auth.subtitleSignIn")}
              </Text>
            </View>
            <View className="space-y-4">
              <FormField
                placeholder={t("auth.emailPlaceholder")}
                value={form.email}
                handleChangeText={(text: string) =>
                  setForm((prev) => ({ ...prev, email: text }))
                }
                otherStyles="mt-2"
                keyboardType="email-address"
                autoCapitalize="none"
                textContentType="username"
                autoComplete="email"
              />
              <FormField
                placeholder={t("auth.passwordPlaceholder")}
                value={form.password}
                handleChangeText={(text: string) =>
                  setForm((prev) => ({ ...prev, password: text }))
                }
                otherStyles="mt-4"
                secureTextEntry
                textContentType="password"
                autoComplete="password"
              />
              <View className="items-end mb-6">
                <TouchableOpacity activeOpacity={0.7}>
                  <Text className="text-zinc-500 text-sm font-medium">
                    {t("auth.forgotPassword")}
                  </Text>
                </TouchableOpacity>
              </View>
              <CustomButtom
                text={t("auth.signInButton")}
                handlePress={submit}
                containerStyles="w-full bg-[#5E17EB] rounded-2xl py-4 shadow-lg shadow-[#5E17EB]/40"
                textStyles="text-white font-bold text-lg"
                loading={isLoading}
              />
            </View>
            <View className="flex-row justify-center items-center w-full gap-4 mt-12 mb-8">
              <View className="bg-zinc-800 flex-1 h-[1px]"></View>
              <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">
                {t("auth.orContinue")}
              </Text>
              <View className="bg-zinc-800 flex-1 h-[1px]"></View>
            </View>

            <View className="flex-row justify-center gap-6">
              <TouchableOpacity
                onPress={() => handleOAuth("google")}
                className="bg-zinc-900 border border-zinc-800 w-16 h-16 rounded-2xl items-center justify-center"
              >
                <Image
                  source={require("@/assets/google-icon.png")}
                  className="w-7 h-7"
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleOAuth("apple")}
                className="bg-zinc-900 border border-zinc-800 w-16 h-16 rounded-2xl items-center justify-center"
              >
                <Image
                  source={require("@/assets/apple-icon.png")}
                  className="w-7 h-7"
                  resizeMode="contain"
                  style={{ tintColor: "white" }}
                />
              </TouchableOpacity>
            </View>

            <View className="mt-10 flex-row items-center justify-center pb-10">
              <Text className="text-zinc-400 text-base">
                {t("auth.newUser")}{" "}
              </Text>
              <Link href="/signUp" asChild>
                <TouchableOpacity>
                  <Text className="text-[#5E17EB] font-bold text-base">
                    {t("auth.createAccount")}
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style="light" />
    </SafeAreaView>
  );
};

export default SignIn;