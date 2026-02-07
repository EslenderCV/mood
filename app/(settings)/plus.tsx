import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import { tStatic, useLanguage } from "@/context/LanguageContext";
import { useGlobalContext } from "@/context/GlobalProvider";
import { Databases } from "react-native-appwrite";
import { client, appwriteConfig, getCurrentUser } from "@/lib/appwrite";

const databases = new Databases(client);

const GetPlus = () => {
  const { t } = useLanguage();
  const { user, setUser } = useGlobalContext(); // Necesitamos setUser para actualizar localmente

  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handlePurchase = async () => {
    setLoading(true);

    // 1. Verificar Promo Code
    if (promoCode.trim().toUpperCase() === "MOODFREE") {
      // Simular proceso de espera
      setTimeout(async () => {
        try {
          if (!user) return;

          // 2. Actualizar usuario en Appwrite (Otorgar Badge)
          await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.usersCollectionId,
            user.$id,
            {
              isVerified: true, // El beneficio principal
            }
          );

          // 3. Refrescar el usuario localmente
          const updatedUser = await getCurrentUser();

          // --- CORRECCIÓN AQUÍ ---
          // Usamos 'as any' para decirle a TypeScript que confíe en que la estructura es correcta
          setUser(updatedUser as any);

          Alert.alert(tStatic("ui.s_fca9e94b"), tStatic("ui.s_c99ca222"),
            [
              {
                text: "Genial",
                onPress: () => router.back(),
              },
            ]
          );
        } catch (error) {
          console.error("Error activating plus:", error);
          Alert.alert(tStatic("ui.s_902b0d55"), tStatic("ui.s_cf4e15f2"));
        } finally {
          setLoading(false);
        }
      }, 1500);
    } else {
      // Flujo de pago normal
      setLoading(false);
      if (promoCode.trim() !== "") {
        Alert.alert(tStatic("ui.s_4636d03e"), tStatic("ui.s_fd034769"));
      } else {
        Alert.alert(tStatic("ui.s_563d5e56"), tStatic("ui.s_df6980c4")
        );
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Header */}
          <View className="px-6 py-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 bg-zinc-900 rounded-full items-center justify-center"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Título Principal */}
          <View className="items-center px-6 mt-2">
            <View className="w-20 h-20 bg-[#5E17EB]/20 rounded-full items-center justify-center mb-6 border border-[#5E17EB]/50 shadow-[0_0_30px_#5E17EB]">
              <Ionicons name="diamond" size={40} color="#5E17EB" />
            </View>
            <Text className="text-white text-4xl font-black tracking-tighter">
              {tStatic("ui.s_891d33e4")}<Text className="text-[#5E17EB]">{t("plus.title")}</Text>
            </Text>
            <Text className="text-zinc-400 text-center mt-3 text-base px-4 leading-6">
              {t("plus.subtitle")}
            </Text>
          </View>

          {/* Lista de Beneficios */}
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
                  <View className="flex-row items-center">
                    <Text className="text-white font-bold text-lg mr-2">
                      {item.title}
                    </Text>
                    {/* Mostrar visualización del Badge en el beneficio correspondiente */}
                    {item.id === 3 && (
                      <MaterialIcons
                        name="verified"
                        size={16}
                        color="#5E17EB"
                      />
                    )}
                  </View>
                  <Text className="text-zinc-500 text-xs mt-0.5">
                    {item.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Tarjeta de Precio */}
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

        {/* Footer Fijo: Promo Code + Botón */}
        <View className="absolute bottom-0 w-full px-6 pb-10 pt-4 bg-black/90 border-t border-zinc-900">
          {/* Input de Promo Code */}
          <View className="flex-row items-center bg-zinc-900 rounded-xl px-4 mb-4 border border-zinc-800">
            <MaterialCommunityIcons
              name="ticket-percent-outline"
              size={20}
              color="#71717A"
            />
            <TextInput
              placeholder={tStatic("ui.s_7089b605")}
              placeholderTextColor="#71717A"
              className="flex-1 ml-3 text-white py-4 font-medium"
              value={promoCode}
              onChangeText={setPromoCode}
              autoCapitalize="characters"
            />
            {promoCode.length > 0 && (
              <TouchableOpacity onPress={() => setPromoCode("")}>
                <Ionicons name="close-circle" size={16} color="#71717A" />
              </TouchableOpacity>
            )}
          </View>

          {/* Botón de Compra */}
          <TouchableOpacity
            onPress={handlePurchase}
            disabled={loading}
            className={`w-full py-4 rounded-full items-center shadow-lg shadow-[#5E17EB]/40 flex-row justify-center ${
              loading ? "bg-zinc-800" : "bg-[#5E17EB]"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text className="text-white font-bold text-lg mr-2">
                  {promoCode.trim().toUpperCase() === "MOODFREE"
                    ? "Canjear Gratis"
                    : t("plus.button")}
                </Text>
                {promoCode.trim().toUpperCase() !== "MOODFREE" && (
                  <Ionicons name="arrow-forward" size={20} color="white" />
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default GetPlus;
