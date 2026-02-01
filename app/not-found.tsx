import React from "react";
import { View, Text } from "react-native";
import { Stack, router } from "expo-router";

import PressableScale from "@/components/shared/PressableScale";

export default function NotFoundScreen() {
  return (
    <View className="flex-1 bg-black px-6 justify-center">
      <Stack.Screen options={{ title: "No encontrado" }} />

      <Text className="text-white text-2xl font-bold mb-2">Ups…</Text>
      <Text className="text-zinc-400 text-base leading-6 mb-6">
        Esta pantalla no existe o fue movida.
      </Text>

      <PressableScale
        onPress={() => router.replace("/home" as any)}
        hapticKind="selection"
        className="bg-white/10 border border-white/10 rounded-2xl px-5 py-4"
        accessibilityLabel="Volver al inicio"
        accessibilityHint="Regresa al feed principal"
      >
        <Text className="text-white text-base font-semibold">Volver al inicio</Text>
      </PressableScale>
    </View>
  );
}
