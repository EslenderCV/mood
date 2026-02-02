import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { Audio } from "expo-av";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

// Contextos
import { AudioProvider } from "@/context/AudioContext";
import GlobalProvider, { useGlobalContext } from "@/context/GlobalProvider";
import { ModalProvider } from "@/context/ModalContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ConnectionProvider } from "@/context/ConnectionProvider";
import { FeedProvider } from "@/context/FeedProvider";
import { CommentsModalProvider } from "@/context/CommentsModalContext";

// Componentes
import CustomSplashScreen from "@/components/CustomSplashScreen";
import CommentsSheet from "@/components/comments/CommentsSheet";

SplashScreen.preventAutoHideAsync();

const StackLayout = () => {
  const { loggedIn, loading } = useGlobalContext();
  const segments = useSegments();
  const router = useRouter();

  const [isAppReady, setIsAppReady] = useState(false);
  const [isSplashAnimationComplete, setIsSplashAnimationComplete] =
    useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // 1. Configuración de Audio básica
  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          staysActiveInBackground: false,
        });
      } catch (e) {
        console.error("Audio error", e);
      }
    })();
  }, []);

  // 2. Control de Navegación
  useEffect(() => {
    if (loading) return;
    const segmentsArray = segments as string[];
    const root = segmentsArray[0];

    if (loggedIn) {
      if (!root || root === "(auth)") router.replace("/home");
    } else {
      if (root === "(tabs)" || root === "chat") router.replace("/");
    }
  }, [loading, loggedIn, segments, router]);

  // 3. Splash Control
  useEffect(() => {
    if (!loading) setIsAppReady(true);
  }, [loading]);

  useEffect(() => {
    if (isAppReady) {
      SplashScreen.hideAsync();
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setIsSplashAnimationComplete(true));
    }
  }, [isAppReady, fadeAnim]);

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#000" },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
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

// 🔥 EXPORTACIÓN POR DEFECTO REFORZADA
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <GlobalProvider>
          <NotificationProvider>
            <LanguageProvider>
              <ConnectionProvider>
                <FeedProvider>
                  <CommentsModalProvider>
                    <AudioProvider>
                      <ModalProvider>
                        <StackLayout />
                        <CommentsSheet />
                      </ModalProvider>
                    </AudioProvider>
                  </CommentsModalProvider>
                </FeedProvider>
              </ConnectionProvider>
            </LanguageProvider>
          </NotificationProvider>
        </GlobalProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
