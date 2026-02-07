import React from "react";
import { View, Text } from "react-native";
import { Stack, router } from "expo-router";

import PressableScale from "@/components/shared/PressableScale";

import { tStatic } from "@/context/LanguageContext";
export default function NotFoundScreen() {
  return (
    <View className="flex-1 bg-black px-6 justify-center">
      <Stack.Screen options={{ title: tStatic("ui.s_c1943897") }} />

      <Text className="text-white text-2xl font-bold mb-2">{tStatic("ui.s_8235c5d0")}</Text>
      <Text className="text-zinc-400 text-base leading-6 mb-6">{tStatic("ui.s_33847840")}</Text>

      <PressableScale
        onPress={() => router.replace("/home" as any)}
        hapticKind="selection"
        className="bg-white/10 border border-white/10 rounded-2xl px-5 py-4"
        accessibilityLabel={tStatic("ui.s_d657cdfd")}
        accessibilityHint={tStatic("ui.s_f18a8fc3")}
      >
        <Text className="text-white text-base font-semibold">{tStatic("ui.s_d657cdfd")}</Text>
      </PressableScale>
    </View>
  );
}