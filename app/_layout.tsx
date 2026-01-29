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
import { ChatProvider } from "@/context/ChatContext";
import { ConnectionProvider } from "@/context/ConnectionProvider";
import { FeedProvider } from "@/context/FeedProvider";
import { CommentsModalProvider } from "@/context/CommentsModalContext";

// Componentes
import CustomSplashScreen from "@/components/CustomSplashScreen";
import CommentsSheet from "@/components/comments/CommentsSheet";
import InAppNotification from "@/components/InAppNotification";
// 🔥 IMPORT NUEVO
import GlobalAudioPlayerBar from "@/components/GlobalAudioPlayerBar";

SplashScreen.preventAutoHideAsync();

const StackLayout = () => {
  const { loggedIn, loading } = useGlobalContext();
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
      if (root === "(tabs)" || root === "chat") router.replace("/");
    }
  }, [loading, loggedIn, segments]);

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
  }, [isAppReady]);

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

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
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
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
