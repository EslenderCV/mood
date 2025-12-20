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

const HelpCenter = () => {
  const faqs = [
    {
      q: "¿Cómo cancelo mi suscripción Plus?",
      a: "Puedes gestionar tu suscripción desde la configuración de tu Apple ID o Google Play Store.",
    },
    {
      q: "¿Cómo subo mi propia música?",
      a: "Ve a tu Perfil > Librería > Tus Subidas y toca el botón '+'.",
    },
    {
      q: "¿Mood es gratis?",
      a: "Mood es gratis para usar. Mood Plus ofrece audio sin pérdidas y cero anuncios.",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-6 py-4 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 p-2 bg-zinc-900 rounded-full"
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">Ayuda</Text>
      </View>

      <ScrollView className="px-6">
        {/* Search Bar Visual */}
        <View className="bg-zinc-900 rounded-xl flex-row items-center px-4 py-3 mt-4 border border-zinc-800">
          <Ionicons name="search" size={20} color="#71717A" />
          <TextInput
            placeholder="Buscar ayuda..."
            placeholderTextColor="#71717A"
            className="ml-3 flex-1 text-white"
          />
        </View>

        {/* Quick Actions */}
        <View className="flex-row gap-4 mt-8">
          <TouchableOpacity className="flex-1 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 items-center">
            <Ionicons name="chatbubbles-outline" size={28} color="#5E17EB" />
            <Text className="text-white font-bold mt-2">Chat Soporte</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 items-center">
            <Ionicons name="mail-outline" size={28} color="#5E17EB" />
            <Text className="text-white font-bold mt-2">Email</Text>
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <Text className="text-white text-xl font-bold mt-10 mb-4">
          Preguntas Frecuentes
        </Text>
        <View className="gap-y-4">
          {faqs.map((item, index) => (
            <View
              key={index}
              className="bg-zinc-900 p-4 rounded-xl border border-zinc-800"
            >
              <Text className="text-white font-bold text-base mb-2">
                {item.q}
              </Text>
              <Text className="text-zinc-400 text-sm leading-5">{item.a}</Text>
            </View>
          ))}
        </View>

        {/* Footer Links */}
        <View className="mt-10 mb-10 gap-y-4">
          <TouchableOpacity>
            <Text className="text-[#5E17EB] text-center font-medium">
              Términos de Servicio
            </Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text className="text-[#5E17EB] text-center font-medium">
              Política de Privacidad
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HelpCenter;
