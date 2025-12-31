import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Link, router } from "expo-router";
import CustomButtom from "@/components/CustomButtom";
import FormField from "@/components/FormField";
import { useGlobalContext, User } from "@/context/GlobalProvider";
import { createUser } from "@/lib/appwrite";
import { AppwriteException } from "react-native-appwrite";

const SignUp = () => {
  const { setUser, setLoggedIn } = useGlobalContext();
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
      Alert.alert("Campos vacíos", "Por favor completa todos los campos.");
      return;
    }

    try {
      setIsLoading(true);
      const result = await createUser(
        form.email,
        form.password,
        form.name,
        form.username
      );

      if (setUser) {
        setUser(result as unknown as User);
        setLoggedIn(true);
        router.replace("/home");
      }
    } catch (error) {
      const appwriteError = error as AppwriteException;
      Alert.alert(
        "Error",
        appwriteError.message || "No se pudo crear la cuenta."
      );
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
          <View className="w-full px-6 justify-center min-h-[85vh] py-10">
            <View className="items-center mb-8">
              <Image
                source={require("@/assets/fullLogo.png")}
                className="w-20 h-20 mb-4"
                resizeMode="contain"
              />
              <Text className="text-white text-3xl font-bold tracking-tight text-center">
                Únete a Mood
              </Text>
              <Text className="text-zinc-400 text-base mt-2 text-center px-4">
                Crea una cuenta para descubrir y compartir música como nunca
                antes.
              </Text>
            </View>
            <View className="space-y-4">
              <FormField
                placeholder="Nombre completo"
                value={form.name}
                handleChangeText={(e) => setForm({ ...form, name: e })}
                otherStyles="mt-2"
              />
              <FormField
                placeholder="Nombre de usuario"
                value={form.username}
                handleChangeText={(e) => setForm({ ...form, username: e })}
                otherStyles="mt-4"
                autoCapitalize="none"
              />
              <FormField
                placeholder="Correo electrónico"
                value={form.email}
                handleChangeText={(e) => setForm({ ...form, email: e })}
                otherStyles="mt-4"
                keyboardType="email-address"
              />
              <FormField
                placeholder="Contraseña"
                value={form.password}
                handleChangeText={(e) => setForm({ ...form, password: e })}
                otherStyles="mt-4"
                secureTextEntry
              />
              <CustomButtom
                text="CREAR CUENTA"
                handlePress={submit}
                containerStyles="w-full mt-8 bg-[#5E17EB] rounded-2xl py-4 shadow-lg shadow-[#5E17EB]/40"
                textStyles="text-white font-bold text-lg"
                loading={isLoading}
              />
            </View>
            <View className="flex-row justify-center items-center w-full gap-4 mt-10 mb-8">
              <View className="bg-zinc-800 flex-1 h-[1px]"></View>
              <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">
                O regístrate con
              </Text>
              <View className="bg-zinc-800 flex-1 h-[1px]"></View>
            </View>
            <View className="flex-row justify-center gap-6">
              <TouchableOpacity className="bg-zinc-900 border border-zinc-800 w-16 h-16 rounded-2xl items-center justify-center">
                <Image
                  source={require("@/assets/google-icon.png")}
                  className="w-7 h-7"
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <TouchableOpacity className="bg-zinc-900 border border-zinc-800 w-16 h-16 rounded-2xl items-center justify-center">
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
                ¿Ya tienes cuenta?{" "}
              </Text>
              <Link href="/signIn" asChild>
                <TouchableOpacity>
                  <Text className="text-[#5E17EB] font-bold text-base">
                    Inicia sesión
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
