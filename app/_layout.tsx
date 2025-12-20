import { Stack } from "expo-router";
import React from "react";
// Importamos el Proveedor de Audio
import { AudioProvider } from "@/context/AudioContext";
// Importamos tus otros proveedores si los tienes (ej: GlobalProvider)
import GlobalProvider from "@/context/GlobalProvider";
import { ModalProvider } from "@/context/ModalContext";

const RootLayout = () => {
  return (
    // Envuelve TODO con los proveedores globales
    <GlobalProvider>
      <AudioProvider>
        <ModalProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            {/* Pantallas Modales o Full Screen */}
            <Stack.Screen
              name="music-player"
              options={{
                presentation: "modal", // Opcional: animación de subir
                headerShown: false,
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen name="index" options={{ headerShown: false }} />
          </Stack>
        </ModalProvider>
      </AudioProvider>
    </GlobalProvider>
  );
};

export default RootLayout;
