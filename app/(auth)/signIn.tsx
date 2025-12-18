import {
  View,
  Text,
  Image,
  ScrollView,
  Alert,
  TouchableOpacity,
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

const signIn = () => {
  const { setUser, setLoggedIn } = useGlobalContext();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const submit = async () => {
    if (!form.email.trim() || !form.password.trim()) {
      Alert.alert("Error", "Por favor, completa todos los campos.");
      return;
    }

    try {
      setIsLoading(true);

      // 1. Iniciar sesión
      await signInn(form.email, form.password);

      // 2. Obtener los datos del usuario actual
      const result = await getCurrentUser();

      // 3. Actualizar estado global con el TIPADO CORRECTO
      setLoggedIn(true);
      setUser(result as unknown as User);

      // 4. Navegar al Home
      router.replace("/home");
    } catch (error) {
      const appwriteError = error as AppwriteException;
      Alert.alert("Error de Inicio de Sesión", appwriteError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="bg-black h-full">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="w-full items-center px-6 justify-center min-h-[85vh]">
          {/* Logo con dimensiones consistentes */}
          <Image
            source={require("@/assets/fullLogo.png")}
            className="w-[150px] h-[150px]"
            resizeMode="contain"
          />

          <Text className="text-white text-2xl font-bold mt-2">Bienvenido</Text>

          {/* Formulario usando el nuevo FormField */}
          <FormField
            placeholder="Correo electrónico o usuario"
            value={form.email}
            handleChangeText={(text) => setForm({ ...form, email: text })}
            otherStyles="mt-10"
          />

          <FormField
            placeholder="Contraseña"
            value={form.password}
            handleChangeText={(text) => setForm({ ...form, password: text })}
            otherStyles="mt-4"
            secureTextEntry
          />

          {/* Forgot Password Link */}
          <TouchableOpacity
            activeOpacity={0.7}
            className="w-[300px] items-end mt-3"
          >
            <Text className="text-primaryy font-light">
              ¿Olvidaste tu contraseña?
            </Text>
          </TouchableOpacity>

          {/* Botón Principal con prop textStyles corregido */}
          <CustomButtom
            text="INICIAR SESIÓN"
            handlePress={submit}
            containerStyles="w-[300px] mt-8 bg-primaryy"
            textStyles="text-white font-bold"
            loading={isLoading}
          />

          {/* Separador Visual */}
          <View className="flex-row justify-center items-center w-full gap-3 mt-10">
            <View className="bg-gray/20 flex-1 h-[1px]"></View>
            <Text className="text-gray-500 text-xs">O CONTINÚA CON</Text>
            <View className="bg-gray/20 flex-1 h-[1px]"></View>
          </View>

          {/* Botones Sociales */}
          <View className="flex-row gap-4 mt-8">
            <TouchableOpacity className="bg-white p-3 rounded-full">
              <Image
                source={require("@/assets/google-icon.png")}
                className="w-6 h-6"
              />
            </TouchableOpacity>
            <TouchableOpacity className="bg-white p-3 rounded-full">
              <Image
                source={require("@/assets/apple-icon.png")}
                className="w-6 h-6"
              />
            </TouchableOpacity>
          </View>

          {/* Link al SignUp */}
          <View className="mt-12 flex-row items-center justify-center">
            <Text className="text-gray-400">¿No tienes cuenta? </Text>
            <Link href="/signUp">
              <Text className="text-primaryy font-bold text-lg">
                Regístrate
              </Text>
            </Link>
          </View>
        </View>
      </ScrollView>
      <StatusBar style="light" />
    </SafeAreaView>
  );
};

export default signIn;
