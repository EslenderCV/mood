import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { AudioProvider } from "@/context/AudioContext";
import GlobalProvider, { useGlobalContext } from "@/context/GlobalProvider";
import { ModalProvider } from "@/context/ModalContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { NotificationProvider } from "@/context/NotificationContext";

// 🟢 1. Importa tu función de registro aquí.
// (Ajusta la ruta si tu archivo está en otra carpeta, ej: "@/lib/notifications")
import { registerForPushNotificationsAsync } from "../lib/usePushNotifications";

const StackLayout = () => {
  // 🟢 2. Agregamos 'user' a la desestructuración para saber cuándo existen los datos
  const { loggedIn, loading, user } = useGlobalContext();
  const segments = useSegments();
  const router = useRouter();

  // 🟢 3. NUEVO EFECTO: Este es el "guardián" que soluciona la Condición de Carrera
  useEffect(() => {
    // Solo entramos aquí si ya terminó de cargar, el usuario está logueado y tenemos sus datos
    if (!loading && loggedIn && user) {
      console.log(
        "✅ Sesión confirmada y lista. Iniciando registro de Push Token..."
      );

      // Llamamos a la función. Si tu función requiere el ID del usuario, pásaselo.
      registerForPushNotificationsAsync(user.$id);
    }
  }, [loading, loggedIn, user]); // <--- Se ejecuta automáticamente cuando 'user' se llena

  // Efecto de Navegación (Tu código original, intacto)
  useEffect(() => {
    if (loading) return;

    const segmentsArray = segments as string[];
    const inAuthGroup = segmentsArray[0] === "(auth)";
    const inTabsGroup = segmentsArray[0] === "(tabs)";
    const inChat = segmentsArray[0] === "chat";
    const inOnboarding = segmentsArray.length === 0;

    if (loggedIn) {
      if (inOnboarding || inAuthGroup) {
        router.replace("/home");
      }
    } else {
      if (inTabsGroup || inChat) {
        router.replace("/");
      }
    }
  }, [loading, loggedIn, segments]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
        }}
      >
        <ActivityIndicator size="large" color="#5E17EB" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
    </Stack>
  );
};

const RootLayout = () => {
  return (
    <GlobalProvider>
      <NotificationProvider>
        <LanguageProvider>
          <AudioProvider>
            <ModalProvider>
              <StackLayout />
            </ModalProvider>
          </AudioProvider>
        </LanguageProvider>
      </NotificationProvider>
    </GlobalProvider>
  );
};

export default RootLayout;
