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
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Link, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
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
import { useLanguage } from "@/context/LanguageContext";

const SignIn = () => {
  const { setUser, setLoggedIn } = useGlobalContext();
  const { t } = useLanguage();

  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const submit = async () => {
    if (!form.email.trim() || !form.password.trim()) {
      Alert.alert(t("auth.alerts.emptyTitle"), t("auth.alerts.emptyMsg"));
      return;
    }

    try {
      setIsLoading(true);
      await signInn(form.email, form.password);
      const result = await getCurrentUser();

      if (result) {
        setLoggedIn(true);
        setUser(result as unknown as User);
        router.replace("/home");
      } else {
        throw new Error("No se pudo obtener la información del usuario.");
      }
    } catch (error) {
      const appwriteError = error as AppwriteException;
      Alert.alert(
        t("auth.alerts.errorTitle"),
        appwriteError.message || t("auth.alerts.wrongCredentials")
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
          // 1. Enviamos el correo en segundo plano
          sendWelcomeEmail(user.email, user.name).catch(console.error);

          // 2. Actualizamos el estado global
          setUser(user as unknown as User);
          setLoggedIn(true);

          // 3. SOLUCIÓN CLAVE: Esperar a que el navegador se cierre por completo
          // antes de intentar montar la pantalla de Home que usa recursos nativos.
          setTimeout(() => {
            router.replace("/home");
          }, 500); // Aumentamos a 500ms para mayor seguridad en Android físico
        } else {
          Alert.alert("Error", "No se pudo crear el perfil de usuario.");
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
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
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
                  setForm({ ...form, email: text })
                }
                otherStyles="mt-2"
              />
              <FormField
                placeholder={t("auth.passwordPlaceholder")}
                value={form.password}
                handleChangeText={(text: string) =>
                  setForm({ ...form, password: text })
                }
                otherStyles="mt-4"
                secureTextEntry
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
