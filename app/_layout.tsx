import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import GlobalProvider from "../context/GlobalProvider";
import { ModalProvider } from "../context/ModalContext";
import PostModal from "../components/PostModal";

const RootLayout = () => {
  return (
    <GlobalProvider>
      <ModalProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="index" />
          {/* Si tienes otras pantallas, van aquí */}
        </Stack>

        <PostModal />

        <StatusBar style="light" />
      </ModalProvider>
    </GlobalProvider>
  );
};

export default RootLayout;
