import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
// 1. IMPORTAR CONTEXTO
import { useLanguage } from "@/context/LanguageContext";

const HelpCenter = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // 2. USAR HOOK
  const { t } = useLanguage();

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const cardBg = isDark ? "#18181B" : "#F4F4F5";
  const inputBg = isDark ? "#18181B" : "#F4F4F5";
  const backIconColor = isDark ? "#FFFFFF" : "#000000";

  // Generamos las FAQs dinámicamente usando las traducciones
  const faqs = [
    {
      q: t("help.faqs.q1"),
      a: t("help.faqs.a1"),
    },
    {
      q: t("help.faqs.q2"),
      a: t("help.faqs.a2"),
    },
    {
      q: t("help.faqs.q3"),
      a: t("help.faqs.a3"),
    },
    {
      q: t("help.faqs.q4"),
      a: t("help.faqs.a4"),
    },
  ];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: bgColor }}>
      <View className="px-6 py-4 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 p-2 rounded-full"
          style={{ backgroundColor: cardBg }}
        >
          <Ionicons name="arrow-back" size={22} color={backIconColor} />
        </TouchableOpacity>
        <Text className="text-2xl font-bold" style={{ color: textColor }}>
          {t("help.title")}
        </Text>
      </View>
      <ScrollView className="px-6">
        <View
          className="rounded-xl flex-row items-center px-4 py-3 mt-4 border"
          style={{ backgroundColor: inputBg, borderColor: borderColor }}
        >
          <Ionicons name="search" size={20} color={subTextColor} />
          <TextInput
            placeholder={t("help.searchPlaceholder")}
            placeholderTextColor={subTextColor}
            className="ml-3 flex-1"
            style={{ color: textColor }}
          />
        </View>
        <View className="flex-row gap-4 mt-8">
          <TouchableOpacity
            className="flex-1 p-4 rounded-2xl border items-center"
            style={{ backgroundColor: cardBg, borderColor: borderColor }}
          >
            <Ionicons name="chatbubbles-outline" size={28} color="#5E17EB" />
            <Text className="font-bold mt-2" style={{ color: textColor }}>
              {t("help.chatSupport")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 p-4 rounded-2xl border items-center"
            style={{ backgroundColor: cardBg, borderColor: borderColor }}
          >
            <Ionicons name="mail-outline" size={28} color="#5E17EB" />
            <Text className="font-bold mt-2" style={{ color: textColor }}>
              {t("help.email")}
            </Text>
          </TouchableOpacity>
        </View>
        <Text
          className="text-xl font-bold mt-10 mb-4"
          style={{ color: textColor }}
        >
          {t("help.faqTitle")}
        </Text>
        <View className="gap-y-4">
          {faqs.map((item, index) => (
            <View
              key={index}
              className="p-4 rounded-xl border"
              style={{ backgroundColor: cardBg, borderColor: borderColor }}
            >
              <Text
                className="font-bold text-base mb-2"
                style={{ color: textColor }}
              >
                {item.q}
              </Text>
              <Text
                className="text-sm leading-5"
                style={{ color: subTextColor }}
              >
                {item.a}
              </Text>
            </View>
          ))}
        </View>
        <View className="mt-10 mb-10 gap-y-4">
          <TouchableOpacity>
            <Text className="text-[#5E17EB] text-center font-medium">
              {t("help.terms")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text className="text-[#5E17EB] text-center font-medium">
              {t("help.privacy")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HelpCenter;
