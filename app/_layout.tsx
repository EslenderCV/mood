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
import { FlagsProvider, useFlag } from "@/src/config/flags";
import { NotificationProvider } from "@/context/NotificationContext";
import { ChatProvider } from "@/context/ChatContext";
import { ConnectionProvider } from "@/context/ConnectionProvider";
import { FeedProvider } from "@/context/FeedProvider";
import { CommentsModalProvider } from "@/context/CommentsModalContext";
import { installGlobalHandlers } from "@/src/observability/install";
import { markHealthyBoot } from "@/src/observability/crashLoop";
import NetworkBanner from "@/components/shared/NetworkBanner";
import { BootProvider, useBoot } from "@/src/boot/BootContext";

// Componentes
import CustomSplashScreen from "@/components/CustomSplashScreen";
import BootLoadingScreen from "@/components/BootLoadingScreen";
import CommentsSheet from "@/components/comments/CommentsSheet";
import InAppNotification from "@/components/InAppNotification";
// 🔥 IMPORT NUEVO
import GlobalAudioPlayerBar from "@/components/GlobalAudioPlayerBar";

SplashScreen.preventAutoHideAsync();

const StackLayout = () => {
  const enableFade = useFlag("fadeTransitions");
  const { loggedIn, loading, checkAuth } = useGlobalContext();
  const { setBootComplete } = useBoot();
  const segments = useSegments();
  const router = useRouter();

  const [isAppReady, setIsAppReady] = useState(false);
  const [isSplashAnimationComplete, setIsSplashAnimationComplete] =
    useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

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

  useEffect(() => {
    if (loading) return;
    const segmentsArray = segments as string[];
    const root = segmentsArray[0];

    if (loggedIn) {
      if (!root || root === "(auth)") router.replace("/home");
    } else {
      // Send unauthenticated users to the auth flow.
      if (root === "(tabs)" || root === "chat") router.replace("/signIn");
    }
  }, [loading, loggedIn, segments, router]);

  // --- Boot gating ---
  // Never allow network stalls to keep the native splash on-screen.
  // We hide the native splash quickly, then (if auth is still resolving)
  // we show our own premium boot screen.
  const MIN_SPLASH_MS = 450;
  const MAX_SPLASH_MS = 2500;

  useEffect(() => {
    const start = Date.now();
    let minTimer: any;
    let maxTimer: any;
    let cancelled = false;

    const arm = () => {
      // If auth resolved fast, keep splash at least MIN_SPLASH_MS.
      if (!loading) {
        const elapsed = Date.now() - start;
        const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
        minTimer = setTimeout(() => {
          if (!cancelled) setIsAppReady(true);
        }, wait);
      }

      // Absolute cap: always proceed.
      maxTimer = setTimeout(() => {
        if (!cancelled) setIsAppReady(true);
      }, MAX_SPLASH_MS);
    };

    arm();
    return () => {
      cancelled = true;
      if (minTimer) clearTimeout(minTimer);
      if (maxTimer) clearTimeout(maxTimer);
    };
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

  useEffect(() => {
    if (isSplashAnimationComplete) {
      // Allow banners/toasts AFTER the splash is gone.
      setBootComplete(true);
    }
  }, [isSplashAnimationComplete, setBootComplete]);

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#000" },
          // Premium feel: avoid hard cuts between screens.
          // If a platform doesn't support a given option, it will be ignored.
          animation: enableFade ? "fade" : "default",
          animationDuration: 180,
          gestureEnabled: true,
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

      {/* If auth is still resolving after the splash is gone, show a clean boot screen. */}
      {isSplashAnimationComplete && loading && (
        <BootLoadingScreen
          onRetry={() => {
            // Force auth re-check (e.g. after network comes back)
            void checkAuth(true);
          }}
        />
      )}
    </View>
  );
};

export default function RootLayout() {
  useEffect(() => {
    installGlobalHandlers();
    // If we manage to stay alive for a bit, clear crash-loop state.
    const t = setTimeout(() => {
      void markHealthyBoot();
    }, 15000);
    return () => clearTimeout(t);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BootProvider>
        <NetworkBanner />
        <LanguageProvider>
          <FlagsProvider>
        <BottomSheetModalProvider>
          <GlobalProvider>
            <NotificationProvider>
              <ChatProvider>
                <ConnectionProvider>
                  <FeedProvider>
                    <CommentsModalProvider>
                      <AudioProvider>
                        <ModalProvider>
                          <StackLayout />

                          {/* 🔥 COMPONENTES GLOBALES (Sobre todo lo demás) */}
                          <CommentsSheet />
                          <InAppNotification />
                          <GlobalAudioPlayerBar />
                        </ModalProvider>
                      </AudioProvider>
                    </CommentsModalProvider>
                  </FeedProvider>
                </ConnectionProvider>
              </ChatProvider>
            </NotificationProvider>
          </GlobalProvider>
        </BottomSheetModalProvider>
                </FlagsProvider>
        </LanguageProvider>
      </BootProvider>
    </GestureHandlerRootView>
  );
}
