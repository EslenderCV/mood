import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";

// Contextos
import { AudioProvider } from "@/context/AudioContext";
import GlobalProvider, { useGlobalContext } from "@/context/GlobalProvider";
import { ModalProvider } from "@/context/ModalContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ConnectionProvider } from "@/context/ConnectionProvider";

// Componentes
import CustomSplashScreen from "@/components/CustomSplashScreen";

// Mantiene el Splash Nativo visible hasta que estemos listos para cambiar al nuestro
SplashScreen.preventAutoHideAsync();

const StackLayout = () => {
  const { loggedIn, loading } = useGlobalContext();
  const segments = useSegments();
  const router = useRouter();

  // Estados para la animación del Splash
  const [isAppReady, setIsAppReady] = useState(false);
  const [isSplashAnimationComplete, setIsSplashAnimationComplete] =
    useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // 1. Configuración de Audio
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

  // 2. Control de Navegación (Auth)
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

  // 3. Detectar cuando la app terminó de cargar (GlobalProvider listo)
  useEffect(() => {
    if (!loading) {
      setIsAppReady(true);
    }
  }, [loading]);

  // 4. Manejo de la Animación de Entrada
  useEffect(() => {
    if (isAppReady) {
      SplashScreen.hideAsync();
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setIsSplashAnimationComplete(true);
      });
    }
  }, [isAppReady]);

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#000000" },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />

        <Stack.Screen
          name="chats"
          options={{
            headerShown: false,
            presentation: "transparentModal",
            animation: "none",
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      </Stack>

      {!isSplashAnimationComplete && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { opacity: fadeAnim, zIndex: 99999 },
          ]}
        >
          <CustomSplashScreen />
        </Animated.View>
      )}
    </View>
  );
};

const RootLayout = () => {
  return (
    // ORDEN CORREGIDO: Global -> Notification -> Language -> Connection
    <GlobalProvider>
      <NotificationProvider>
        <LanguageProvider>
          {/* 🔥 AHORA SÍ: ConnectionProvider está DENTRO de LanguageProvider */}
          <ConnectionProvider>
            <AudioProvider>
              <ModalProvider>
                <StackLayout />
              </ModalProvider>
            </AudioProvider>
          </ConnectionProvider>
        </LanguageProvider>
      </NotificationProvider>
    </GlobalProvider>
  );
};

export default RootLayout;
