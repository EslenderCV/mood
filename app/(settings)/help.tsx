import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Modal,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";

const HelpCenter = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();

  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const bgColor = isDark ? "#000000" : "#F9FAFB";
  const textColor = isDark ? "#FFFFFF" : "#1F2937";
  const subTextColor = isDark ? "#A1A1AA" : "#6B7280";
  const borderColor = isDark ? "#27272A" : "#E5E7EB";
  const cardBg = isDark ? "#18181B" : "#FFFFFF";
  const inputBg = isDark ? "#27272A" : "#FFFFFF";
  const accentColor = "#5E17EB";
  const modalOverlayColor = isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)";

  const openWhatsApp = async (phoneNumber: string) => {
    setModalVisible(false);
    const message = "Hola, necesito asistencia con la aplicación Mood.";
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
      message
    )}`;
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.error("Error al abrir enlace", err);
      Alert.alert("Error", "No se pudo abrir WhatsApp");
    }
  };

  const handleEmail = () => {
    Linking.openURL("mailto:soporte@moodapp.com?subject=Soporte Mood App");
  };

  const faqs = [
    { id: 1, q: t("help.faqs.q1"), a: t("help.faqs.a1") },
    { id: 2, q: t("help.faqs.q2"), a: t("help.faqs.a2") },
    { id: 3, q: t("help.faqs.q3"), a: t("help.faqs.a3") },
    { id: 4, q: t("help.faqs.q4"), a: t("help.faqs.a4") },
  ];

  const toggleFaq = (id: number) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: bgColor }}>
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: modalOverlayColor,
            justifyContent: "center",
            padding: 20,
          }}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View
              className="rounded-3xl p-6 shadow-xl"
              style={{
                backgroundColor: cardBg,
                borderColor: borderColor,
                borderWidth: 1,
              }}
            >
              <View className="items-center mb-6">
                <View className="w-16 h-16 rounded-full bg-green-100 items-center justify-center mb-3">
                  <Ionicons name="logo-whatsapp" size={32} color="#25D366" />
                </View>
                <Text
                  className="text-xl font-bold text-center"
                  style={{ color: textColor }}
                >
                  {t("help.modalTitle")}
                </Text>
                <Text
                  className="text-center mt-1"
                  style={{ color: subTextColor }}
                >
                  {t("help.modalSubtitle")}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => openWhatsApp("18293854740")}
                className="flex-row items-center p-4 rounded-xl border mb-3"
                style={{ borderColor: borderColor, backgroundColor: inputBg }}
              >
                <View className="w-10 h-10 rounded-full bg-[#25D366] items-center justify-center mr-3">
                  <Text className="text-white font-bold text-lg">1</Text>
                </View>
                <View>
                  <Text
                    className="font-bold text-base"
                    style={{ color: textColor }}
                  >
                    {t("help.supportMain")}
                  </Text>
                  <Text style={{ color: subTextColor }}>(829) 385-4740</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => openWhatsApp("18294646454")}
                className="flex-row items-center p-4 rounded-xl border mb-6"
                style={{ borderColor: borderColor, backgroundColor: inputBg }}
              >
                <View className="w-10 h-10 rounded-full bg-[#25D366] items-center justify-center mr-3">
                  <Text className="text-white font-bold text-lg">2</Text>
                </View>
                <View>
                  <Text
                    className="font-bold text-base"
                    style={{ color: textColor }}
                  >
                    {t("help.supportTech")}
                  </Text>
                  <Text style={{ color: subTextColor }}>(829) 464-6454</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="py-3 rounded-xl items-center"
              >
                <Text className="font-bold text-base text-red-500">
                  {t("settings.cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      <View className="px-6 py-4 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 rounded-full border"
          style={{ backgroundColor: cardBg, borderColor: borderColor }}
        >
          <Ionicons name="arrow-back" size={22} color={textColor} />
        </TouchableOpacity>
        <Text className="text-xl font-bold" style={{ color: textColor }}>
          {t("help.title")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView className="px-6" showsVerticalScrollIndicator={false}>
        <Text
          className="text-2xl font-bold mt-2 mb-6"
          style={{ color: textColor }}
        >
          {t("help.subtitle")}
        </Text>

        <View
          className="rounded-2xl flex-row items-center px-4 py-3.5 border shadow-sm"
          style={{ backgroundColor: inputBg, borderColor: borderColor }}
        >
          <Ionicons name="search-outline" size={22} color={subTextColor} />
          <TextInput
            placeholder={t("help.searchPlaceholder")}
            placeholderTextColor={subTextColor}
            className="ml-3 flex-1 text-base"
            style={{ color: textColor }}
          />
        </View>

        <View className="flex-row gap-4 mt-8">
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="flex-1 p-5 rounded-2xl border items-center justify-center shadow-sm"
            style={{ backgroundColor: cardBg, borderColor: borderColor }}
          >
            <View className="w-12 h-12 rounded-full items-center justify-center bg-green-100 mb-3">
              <Ionicons name="logo-whatsapp" size={26} color="#25D366" />
            </View>
            <Text className="font-bold text-base" style={{ color: textColor }}>
              {t("help.chatSupport")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleEmail}
            className="flex-1 p-5 rounded-2xl border items-center justify-center shadow-sm"
            style={{ backgroundColor: cardBg, borderColor: borderColor }}
          >
            <View className="w-12 h-12 rounded-full items-center justify-center bg-purple-100 mb-3">
              <Ionicons name="mail" size={24} color={accentColor} />
            </View>
            <Text className="font-bold text-base" style={{ color: textColor }}>
              {t("help.email")}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mt-10 mb-6">
          <Text className="text-lg font-bold mb-4" style={{ color: textColor }}>
            {t("help.faqTitle")}
          </Text>

          <View className="gap-y-3">
            {faqs.map((item) => {
              const isOpen = expandedFaq === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => toggleFaq(item.id)}
                  className="rounded-2xl border overflow-hidden"
                  style={{
                    backgroundColor: cardBg,
                    borderColor: isOpen ? accentColor : borderColor,
                  }}
                >
                  <View className="flex-row items-center justify-between p-4">
                    <Text
                      className="font-semibold text-base flex-1 pr-4"
                      style={{ color: textColor }}
                    >
                      {item.q}
                    </Text>
                    <Ionicons
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={isOpen ? accentColor : subTextColor}
                    />
                  </View>

                  {isOpen && (
                    <View className="px-4 pb-4 pt-0">
                      <Text
                        className="text-sm leading-6"
                        style={{ color: subTextColor }}
                      >
                        {item.a}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
export default HelpCenter;
