import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import * as SplashScreen from 'expo-splash-screen';
import { AudioProvider } from "@/context/AudioContext";
import GlobalProvider, { useGlobalContext } from "@/context/GlobalProvider";
import { ModalProvider } from "@/context/ModalContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";
import CustomSplashScreen from "@/components/CustomSplashScreen"; 

// Mantiene el Splash Nativo visible hasta que estemos listos para cambiar al nuestro
SplashScreen.preventAutoHideAsync();

const StackLayout = () => {
  const { loggedIn, loading } = useGlobalContext();
  const segments = useSegments();
  const router = useRouter();

  // Estados para la animación del Splash
  const [isAppReady, setIsAppReady] = useState(false);
  const [isSplashAnimationComplete, setIsSplashAnimationComplete] = useState(false);
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
      // Ocultamos el splash nativo inmediatamente
      SplashScreen.hideAsync();

      // Iniciamos la animación de desvanecimiento de nuestro Custom Splash
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500, // 500ms de desvanecimiento suave
        useNativeDriver: true,
      }).start(() => {
        setIsSplashAnimationComplete(true);
      });
    }
  }, [isAppReady]);

  return (
    // 🔥 CAMBIO CLAVE: backgroundColor negro para eliminar el flash gris
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      
      {/* La App Real */}
      <Stack 
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: "#000000" } // Asegura fondo negro en navegación
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        
        {/* 🔥 PANTALLAS MODALES Y CHATS */}
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

      {/* El Splash Screen Custom superpuesto */}
      {!isSplashAnimationComplete && (
        <Animated.View 
          pointerEvents="none" 
          style={[StyleSheet.absoluteFill, { opacity: fadeAnim, zIndex: 99999 }]}
        >
          <CustomSplashScreen />
        </Animated.View>
      )}
    </View>
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