import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { Stack, router } from "expo-router";

import PressableScale from "@/components/shared/PressableScale";

type Props = {
  error: Error;
  retry: () => void;
};

export default function ErrorBoundary({ error, retry }: Props) {
  useEffect(() => {
    // Keep this log for debugging in dev builds.
    console.error("[AppErrorBoundary]", error);
  }, [error]);

  return (
    <View className="flex-1 bg-black px-6 justify-center">
      <Stack.Screen options={{ title: "Algo salió mal" }} />

      <Text className="text-white text-2xl font-bold mb-2">Algo salió mal</Text>
      <Text className="text-zinc-400 text-base leading-6 mb-6">
        Se produjo un error inesperado. Puedes intentar de nuevo o volver al inicio.
      </Text>

      <View className="flex-row">
        <PressableScale
          onPress={retry}
          hapticKind="selection"
          className="flex-1 bg-[#5E17EB] rounded-2xl px-5 py-4 mr-3"
          accessibilityLabel="Reintentar"
          accessibilityHint="Intenta cargar la pantalla nuevamente"
        >
          <Text className="text-white text-base font-semibold text-center">
            Reintentar
          </Text>
        </PressableScale>

        <PressableScale
          onPress={() => router.replace("/home" as any)}
          hapticKind="selection"
          className="flex-1 bg-white/10 border border-white/10 rounded-2xl px-5 py-4"
          accessibilityLabel="Volver al inicio"
          accessibilityHint="Regresa al feed principal"
        >
          <Text className="text-white text-base font-semibold text-center">
            Inicio
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}
