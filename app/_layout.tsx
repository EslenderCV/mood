import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { AudioProvider } from "@/context/AudioContext";
import GlobalProvider, { useGlobalContext } from "@/context/GlobalProvider";
import { ModalProvider } from "@/context/ModalContext";

const StackLayout = () => {
  const { loggedIn, loading } = useGlobalContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Convertimos segments a string[] para evitar el error de TypeScript
    const segmentsArray = segments as string[];

    const inAuthGroup = segmentsArray[0] === "(auth)"; // Pantallas de Login/Registro
    const inTabsGroup = segmentsArray[0] === "(tabs)"; // Pantallas Privadas (Home, Profile)
    const inChat = segmentsArray[0] === "chat"; // Pantalla de Chat
    const inOnboarding = segmentsArray.length === 0; // Raíz (app/index.tsx)

    // --- ESCENARIO 1: USUARIO LOGUEADO ---
    if (loggedIn) {
      // Si el usuario ya entró, no debe ver el Onboarding ni el Login.
      // Lo mandamos directo al Home.
      if (inOnboarding || inAuthGroup) {
        router.replace("/home");
      }
    }

    // --- ESCENARIO 2: USUARIO NO LOGUEADO (INVITADO) ---
    else {
      // Si intenta entrar a zonas prohibidas (Tabs, Chat, Post),
      // lo mandamos al ONBOARDING (index) en lugar del Login.
      if (inTabsGroup || inChat) {
        router.replace("/"); // Redirige a app/index.tsx
      }

      // NOTA IMPORTANTE:
      // Si el usuario está en inOnboarding (/) o en inAuthGroup ((auth)),
      // NO hacemos nada. Dejamos que la app muestre esa pantalla.
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
      {/* Agrega aquí cualquier otra pantalla que uses */}
    </Stack>
  );
};

// --- COMPONENTE RAÍZ ---
const RootLayout = () => {
  return (
    <GlobalProvider>
      <AudioProvider>
        <ModalProvider>
          <StackLayout />
        </ModalProvider>
      </AudioProvider>
    </GlobalProvider>
  );
};

export default RootLayout;
