import React, { useMemo } from "react";
import { View, Text, ScrollView, Switch, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, Redirect } from "expo-router";
import { useColorScheme } from "nativewind";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import { useFlags, FlagKey, FLAG_DEFAULTS } from "@/src/config/flags";

import { tStatic } from "@/context/LanguageContext";
const FeatureFlagsScreen = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const { flags, setFlag, resetFlags, loaded, safeModeActive, safeModeUntilMs } = useFlags();

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#6B7280";
  const iconBg = isDark ? "#18181B" : "#F3F4F6";
  const borderColor = isDark ? "#27272A" : "#E5E7EB";

  const meta = useMemo(
    () =>
      [
        {
          key: "brainRankingHome" as FlagKey,
          title: "Ranking inteligente (Home)",
          desc: "Personaliza el orden del feed sin saltos (Brain tail reorder).",
        },
        {
          key: "brainRankingExplore" as FlagKey,
          title: "Ranking inteligente (Explore)",
          desc: "Reordena música/artistas/perfiles usando afinidad local (sin nuevas llamadas).",
        },
        {
          key: "audioPrefetch" as FlagKey,
          title: "Audio prefetch",
          desc: "Precarga el próximo preview para que el tap-to-play sea instantáneo.",
        },
        {
          key: "shimmerSkeleton" as FlagKey,
          title: "Shimmer skeleton",
          desc: "Animación shimmer en skeletons (si notas lag en Android, apágalo).",
        },
        {
          key: "fadeTransitions" as FlagKey,
          title: "Transiciones fade", 
          desc: "Evita cortes secos entre pantallas (animación suave).",
        },
        {
          key: "devPerfLogs" as FlagKey,
          title: "Logs de rendimiento (DEV)",
          desc: "Imprime spans de performance en consola. Solo afecta DEV.",
        },
      ] as const,
    [],
  );

  // En builds de producción no queremos exponer pantallas internas de debug/experimentos.
  // Mantener el route existe para DEV, pero en release redirigimos silenciosamente.
  if (!__DEV__) {
    return <Redirect href="/(settings)/settings" />;
  }

  const onToggle = (key: FlagKey, value: boolean) => {
    void Haptics.selectionAsync();
    setFlag(key, value);
  };

  const copyJson = async () => {
    try {
      const payload = JSON.stringify({ flags }, null, 2);
      await Clipboard.setStringAsync(payload);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <View
        style={{
          paddingHorizontal: 24,
          paddingVertical: 16,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            marginRight: 12,
            padding: 8,
            borderRadius: 999,
            backgroundColor: iconBg,
          }}
        >
          <Ionicons name="arrow-back" size={22} color={textColor} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: textColor, fontSize: 22, fontWeight: "800" }}>{tStatic("ui.s_603d05a8")}</Text>
          <Text style={{ color: subTextColor, fontSize: 12, marginTop: 2 }}>{tStatic("ui.s_e0b1f1b4")}</Text>
        </View>
        <TouchableOpacity
          onPress={copyJson}
          style={{
            padding: 10,
            borderRadius: 999,
            backgroundColor: iconBg,
          }}
        >
          <Ionicons name="copy-outline" size={20} color={textColor} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <View style={{ paddingTop: 12 }}>
          {safeModeActive && (
            <View
              style={{
                marginBottom: 12,
                padding: 12,
                borderRadius: 16,
                backgroundColor: isDark ? "#18181B" : "#F3F4F6",
                borderWidth: 1,
                borderColor: borderColor,
              }}
            >
              <Text style={{ color: textColor, fontWeight: "900" }}>{tStatic("ui.s_ed330643")}</Text>
              <Text style={{ color: subTextColor, fontSize: 12, marginTop: 4 }}>{tStatic("ui.s_a465034c")}</Text>
              {typeof safeModeUntilMs === "number" && (
                <Text style={{ color: subTextColor, fontSize: 11, marginTop: 6 }}>
                  {tStatic("ui.s_f5b11f41")} {new Date(safeModeUntilMs).toLocaleString()}
                </Text>
              )}
            </View>
          )}
          {!loaded && (
            <Text style={{ color: subTextColor, paddingHorizontal: 8, paddingVertical: 8 }}>{tStatic("ui.s_d310cee9")}</Text>
          )}

          {meta.map((m) => (
            <View
              key={m.key}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 14,
                paddingHorizontal: 8,
                borderBottomWidth: 1,
                borderBottomColor: borderColor,
              }}
            >
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={{ color: textColor, fontSize: 15, fontWeight: "700" }}>
                  {m.title}
                </Text>
                <Text style={{ color: subTextColor, fontSize: 12, marginTop: 4 }}>
                  {m.desc}
                </Text>
                <Text style={{ color: subTextColor, fontSize: 11, marginTop: 6 }}>
                  {tStatic("ui.s_e5f7f63d")} {FLAG_DEFAULTS[m.key] ? tStatic("ui.s_90651ebe") : tStatic("ui.s_88559a0c")}
                </Text>
              </View>

              <Switch
                value={!!flags[m.key]}
                onValueChange={(v) => onToggle(m.key, v)}
                trackColor={{ false: isDark ? "#27272A" : "#E5E7EB", true: "#5E17EB" }}
                thumbColor={"white"}
              />
            </View>
          ))}

          <View style={{ marginTop: 18, flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                resetFlags();
              }}
              style={{
                flex: 1,
                backgroundColor: isDark ? "#18181B" : "#F3F4F6",
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: "center",
                borderWidth: 1,
                borderColor: borderColor,
              }}
            >
              <Text style={{ color: textColor, fontWeight: "800" }}>{tStatic("ui.s_1c373962")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/settings" as any)}
              style={{
                flex: 1,
                backgroundColor: "#5E17EB",
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>{tStatic("ui.s_d8f00338")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FeatureFlagsScreen;