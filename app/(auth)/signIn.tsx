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

// Componentes y Contexto
import CustomButtom from "@/components/CustomButtom";
import FormField from "@/components/FormField";
import { useGlobalContext, User } from "@/context/GlobalProvider";

// Appwrite
import { getCurrentUser, signInn } from "@/lib/appwrite";
import { AppwriteException } from "react-native-appwrite";

const SignIn = () => {
  const { setUser, setLoggedIn } = useGlobalContext();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const submit = async () => {
    if (!form.email.trim() || !form.password.trim()) {
      Alert.alert("Campos vacíos", "Por favor, completa todos los campos.");
      return;
    }

    try {
      setIsLoading(true);

      // 1. Iniciar sesión
      await signInn(form.email, form.password);

      // 2. Obtener los datos del usuario actual
      const result = await getCurrentUser();

      // 3. Actualizar estado global
      setLoggedIn(true);
      setUser(result as unknown as User);

      // 4. Navegar al Home
      router.replace("/home");
    } catch (error) {
      const appwriteError = error as AppwriteException;
      Alert.alert("Error", appwriteError.message || "Credenciales incorrectas");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="bg-black flex-1">
      {/* KeyboardAvoidingView asegura que el teclado no tape los inputs */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="w-full px-6 justify-center min-h-[85vh]">
            {/* --- HEADER: Logo y Bienvenida --- */}
            <View className="items-center mb-10">
              <Image
                source={require("@/assets/fullLogo.png")}
                className="w-24 h-24 mb-6"
                resizeMode="contain"
              />
              <Text className="text-white text-4xl font-bold tracking-tight text-center">
                ¡Hola de nuevo!
              </Text>
              <Text className="text-zinc-400 text-base mt-2 text-center">
                Ingresa tus credenciales para continuar vibra.
              </Text>
            </View>

            {/* --- FORMULARIO --- */}
            <View className="space-y-4">
              <FormField
                placeholder="Correo electrónico"
                value={form.email}
                handleChangeText={(text: string) =>
                  setForm({ ...form, email: text })
                }
                otherStyles="mt-2"
                // Eliminé keyboardType para evitar el error de TypeScript
              />

              <FormField
                placeholder="Contraseña"
                value={form.password}
                handleChangeText={(text: string) =>
                  setForm({ ...form, password: text })
                }
                otherStyles="mt-4"
                secureTextEntry
              />

              {/* Forgot Password Link */}
              <View className="items-end mb-6">
                <TouchableOpacity activeOpacity={0.7}>
                  <Text className="text-zinc-500 text-sm font-medium">
                    ¿Olvidaste tu contraseña?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Botón Principal */}
              <CustomButtom
                text="INICIAR SESIÓN"
                handlePress={submit}
                containerStyles="w-full bg-[#5E17EB] rounded-2xl py-4 shadow-lg shadow-[#5E17EB]/40"
                textStyles="text-white font-bold text-lg"
                loading={isLoading}
              />
            </View>

            {/* --- SEPARADOR --- */}
            <View className="flex-row justify-center items-center w-full gap-4 mt-12 mb-8">
              <View className="bg-zinc-800 flex-1 h-[1px]"></View>
              <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">
                O continúa con
              </Text>
              <View className="bg-zinc-800 flex-1 h-[1px]"></View>
            </View>

            {/* --- SOCIALS --- */}
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

            {/* --- FOOTER: Registro --- */}
            <View className="mt-10 flex-row items-center justify-center pb-10">
              <Text className="text-zinc-400 text-base">¿Nuevo aquí? </Text>
              <Link href="/signUp" asChild>
                <TouchableOpacity>
                  <Text className="text-[#5E17EB] font-bold text-base">
                    Crea una cuenta
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
