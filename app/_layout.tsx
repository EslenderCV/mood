import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import GlobalProvider from "@/context/GlobalProvider";

// This is your MAIN layout file
const RootLayout = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GlobalProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(edit)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </GlobalProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;
