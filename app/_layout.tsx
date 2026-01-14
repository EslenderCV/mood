import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { AudioProvider } from "@/context/AudioContext";
import GlobalProvider, { useGlobalContext } from "@/context/GlobalProvider";
import { ModalProvider } from "@/context/ModalContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";

const StackLayout = () => {
  const { loggedIn, loading } = useGlobalContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const configureAudioSession = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          shouldDuckAndroid: true,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
        });
        console.log("✅ Audio configurado: Categoría Playback forzada.");
      } catch (error) {
        console.error("❌ Error configurando audio:", error);
      }
    };
    configureAudioSession();
  }, []);

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

      {/* 🔥 CAMBIOS CLAVE AQUÍ: */}
      <Stack.Screen
        name="chats"
        options={{
          headerShown: false,
          // 1. transparentModal: Mantiene Home visible debajo
          presentation: "transparentModal",
          // 2. animation: 'none': Elimina el delay/brinco nativo
          animation: "none",
          // 3. gestureEnabled: false: Desactiva el gesto nativo para usar el nuestro
          gestureEnabled: false,
        }}
      />

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
