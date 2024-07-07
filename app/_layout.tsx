import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import GlobalProvider from "@/context/GlobalProvider";

export default function Layout() {
  return (
    <>
      <GlobalProvider>
        <>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar backgroundColor="black" style="light" />
        </>
      </GlobalProvider>
    </>
  );
}
