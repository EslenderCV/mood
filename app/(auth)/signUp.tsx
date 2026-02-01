import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Link, router } from "expo-router";
import CustomButtom from "@/components/CustomButtom";
import FormField from "@/components/FormField";
import { useGlobalContext, User } from "@/context/GlobalProvider";
import {
  createUser,
  signInWithOAuth,
  syncOrCreateUserDocument,
} from "@/lib/appwrite";
import { sendWelcomeEmail } from "@/lib/email";
import { AppwriteException } from "react-native-appwrite";
import { useLanguage } from "@/context/LanguageContext";

// 🔥 IMPORTAMOS EL ACCOUNT MANAGER
import { AccountManager } from "@/lib/accountManager";

const SignUp = () => {
  const { setUser, setLoggedIn } = useGlobalContext();
  const { t } = useLanguage();

  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });

  const submit = async () => {
    if (
      !form.email.trim() ||
      !form.password.trim() ||
      !form.name.trim() ||
      !form.username.trim()
    ) {
      Alert.alert(t("auth.alerts.emptyTitle"), t("auth.alerts.emptyMsg"));
      return;
    }

    try {
      setIsLoading(true);

      const { user: newUser, session } = await createUser(
        form.email,
        form.password,
        form.name,
        form.username,
      );

      if (setUser && session) {
        sendWelcomeEmail(form.email, form.name).catch(console.error);

        setUser(newUser as unknown as User);
        setLoggedIn(true);

        await AccountManager.saveCurrentAccount();

        router.replace("/home");
      }
    } catch (error: any) {
      const appwriteError = error as AppwriteException;
      Alert.alert(
        t("auth.alerts.errorTitle") || "Error",
        appwriteError.message || t("auth.alerts.createError"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    try {
      setIsLoading(true);

      // 🔥 1. Recibimos el secreto
      const secret = await signInWithOAuth(provider);

      // 🔥 2. Verificamos si existe
      if (secret) {
        const user = await syncOrCreateUserDocument();

        if (user) {
          sendWelcomeEmail(user.email, user.name).catch(console.error);
          setUser(user as unknown as User);
          setLoggedIn(true);

          // 🔥 3. Lo guardamos en el manager
          await AccountManager.saveCurrentAccount();

          setTimeout(() => {
            router.replace("/home");
          }, 500);
        } else {
          Alert.alert("Error", "No se pudo sincronizar el perfil del usuario.");
        }
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const openLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", "No se pudo abrir el enlace");
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
          <View className="w-full px-6 justify-center min-h-[85vh] py-10">
            <View className="items-center mb-8">
              <Image
                source={require("@/assets/fullLogo.png")}
                className="w-20 h-20 mb-4"
                resizeMode="contain"
              />
              <Text className="text-white text-3xl font-bold tracking-tight text-center">
                {t("auth.joinMood")}
              </Text>
              <Text className="text-zinc-400 text-base mt-2 text-center px-4">
                {t("auth.subtitleSignUp")}
              </Text>
            </View>
            <View className="space-y-4">
              <FormField
                placeholder={t("auth.namePlaceholder")}
                value={form.name}
                handleChangeText={(e) => setForm({ ...form, name: e })}
                otherStyles="mt-2"
              />
              <FormField
                placeholder={t("auth.usernamePlaceholder")}
                value={form.username}
                handleChangeText={(e) => setForm({ ...form, username: e })}
                otherStyles="mt-4"
                autoCapitalize="none"
              />
              <FormField
                placeholder={t("auth.emailPlaceholder")}
                value={form.email}
                handleChangeText={(e) => setForm({ ...form, email: e })}
                otherStyles="mt-4"
                keyboardType="email-address"
              />
              <FormField
                placeholder={t("auth.passwordPlaceholder")}
                value={form.password}
                handleChangeText={(e) => setForm({ ...form, password: e })}
                otherStyles="mt-4"
                secureTextEntry
              />
              <CustomButtom
                text={t("auth.signUpButton")}
                handlePress={submit}
                containerStyles="w-full mt-8 bg-[#5E17EB] rounded-2xl py-4 shadow-lg shadow-[#5E17EB]/40"
                textStyles="text-white font-bold text-lg"
                loading={isLoading}
              />
            </View>

            <View className="mt-6 px-2">
              <Text className="text-zinc-500 text-xs text-center leading-4">
                By creating an account, you agree to our{" "}
                <Text
                  className="text-[#5E17EB] font-bold"
                  onPress={() =>
                    openLink(
                      "https://candied-resolution-5fa.notion.site/T-rminos-de-Uso-y-EULA-Acuerdo-de-Licencia-2e08961d2f1080769b1ddd43f1ea92c7?source=copy_link",
                    )
                  }
                >
                  Terms of Use (EULA)
                </Text>
                {" and our "}
                <Text
                  className="text-[#5E17EB] font-bold"
                  onPress={() =>
                    openLink(
                      "https://candied-resolution-5fa.notion.site/Pol-tica-de-Privacidad-de-Mood-2e08961d2f1080018d6dc0ba872fab3d?source=copy_link",
                    )
                  }
                >
                  Privacy Policy
                </Text>
                .
              </Text>
            </View>

            <View className="flex-row justify-center items-center w-full gap-4 mt-6 mb-8">
              <View className="bg-zinc-800 flex-1 h-[1px]"></View>
              <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">
                {t("auth.orRegister")}
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

            <View className="mt-10 flex-row items-center justify-center">
              <Text className="text-zinc-400 text-base">
                {t("auth.hasAccount")}{" "}
              </Text>
              <Link href="/signIn" asChild>
                <TouchableOpacity>
                  <Text className="text-[#5E17EB] font-bold text-base">
                    {t("auth.signInLink")}
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

export default SignUp;