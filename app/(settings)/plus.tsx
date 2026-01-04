import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
// 1. IMPORTAR CONTEXTO
import { useLanguage } from "@/context/LanguageContext";

const GetPlus = () => {
  // 2. USAR HOOK
  const { t } = useLanguage();

  // Generamos las características dinámicamente usando las traducciones
  const features = [
    {
      id: 1,
      title: t("plus.features.f1Title"),
      desc: t("plus.features.f1Desc"),
      icon: "waveform",
    },
    {
      id: 2,
      title: t("plus.features.f2Title"),
      desc: t("plus.features.f2Desc"),
      icon: "block-helper",
    },
    {
      id: 3,
      title: t("plus.features.f3Title"),
      desc: t("plus.features.f3Desc"),
      icon: "check-decagram",
    },
    {
      id: 4,
      title: t("plus.features.f4Title"),
      desc: t("plus.features.f4Desc"),
      icon: "cloud-upload",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="px-6 py-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-zinc-900 rounded-full items-center justify-center"
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View className="items-center px-6 mt-2">
          <View className="w-20 h-20 bg-[#5E17EB]/20 rounded-full items-center justify-center mb-6 border border-[#5E17EB]/50 shadow-[0_0_30px_#5E17EB]">
            <Ionicons name="diamond" size={40} color="#5E17EB" />
          </View>
          <Text className="text-white text-4xl font-black tracking-tighter">
            MOOD<Text className="text-[#5E17EB]">{t("plus.title")}</Text>
          </Text>
          <Text className="text-zinc-400 text-center mt-3 text-base px-4 leading-6">
            {t("plus.subtitle")}
          </Text>
        </View>
        <View className="mt-10 px-6 gap-y-6">
          {features.map((item) => (
            <View
              key={item.id}
              className="flex-row items-center bg-zinc-900/40 p-4 rounded-2xl border border-white/5"
            >
              <View className="w-12 h-12 rounded-full bg-[#5E17EB]/10 items-center justify-center mr-4">
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={24}
                  color="#5E17EB"
                />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-lg">
                  {item.title}
                </Text>
                <Text className="text-zinc-500 text-xs mt-0.5">
                  {item.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <View className="mx-6 mt-8 p-6 bg-gradient-to-r from-zinc-900 to-black rounded-3xl border border-[#5E17EB]/30 relative overflow-hidden">
          <View className="absolute top-0 right-0 bg-[#5E17EB] px-3 py-1 rounded-bl-xl">
            <Text className="text-white text-xs font-bold">
              {t("plus.plan.badge")}
            </Text>
          </View>
          <Text className="text-zinc-400 font-medium">
            {t("plus.plan.title")}
          </Text>
          <View className="flex-row items-end mt-2">
            <Text className="text-white text-4xl font-bold">
              {t("plus.plan.price")}
            </Text>
            <Text className="text-zinc-500 mb-1 ml-1">
              {t("plus.plan.period")}
            </Text>
          </View>
          <Text className="text-zinc-500 text-xs mt-2">
            {t("plus.plan.cancel")}
          </Text>
        </View>
      </ScrollView>
      <View className="absolute bottom-10 w-full px-6">
        <TouchableOpacity className="w-full bg-[#5E17EB] py-4 rounded-full items-center shadow-lg shadow-[#5E17EB]/40 active:scale-95 transition-transform">
          <Text className="text-white font-bold text-lg">
            {t("plus.button")}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default GetPlus;
