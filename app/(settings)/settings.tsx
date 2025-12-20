import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const Settings = () => {
  const SettingItem = ({ title, value, icon, hasArrow = true }: any) => (
    <TouchableOpacity
      activeOpacity={0.7}
      className="flex-row items-center py-4 border-b border-zinc-900"
    >
      <View className="bg-zinc-900 w-10 h-10 rounded-full items-center justify-center mr-4">
        <Ionicons name={icon} size={20} color="#5E17EB" />
      </View>
      <View className="flex-1">
        <Text className="text-white text-base font-medium">{title}</Text>
      </View>
      <View className="flex-row items-center">
        {value && <Text className="text-zinc-500 mr-2 text-sm">{value}</Text>}
        {hasArrow && (
          <Ionicons name="chevron-forward" size={18} color="#71717A" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-6 py-4 flex-row items-center border-b border-zinc-900">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 p-2 bg-zinc-900 rounded-full"
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">Ajustes</Text>
      </View>

      <ScrollView className="px-6 mt-4">
        <Text className="text-zinc-500 text-xs font-bold uppercase mb-2 tracking-widest">
          Audio & Reproducción
        </Text>
        <SettingItem
          title="Calidad de Streaming"
          value="Automática"
          icon="cellular-outline"
        />
        <SettingItem
          title="Descargas"
          value="Alta Calidad"
          icon="arrow-down-circle-outline"
        />
        <SettingItem title="Crossfade" value="5s" icon="options-outline" />

        <Text className="text-zinc-500 text-xs font-bold uppercase mb-2 mt-8 tracking-widest">
          Aplicación
        </Text>
        <SettingItem title="Idioma" value="Español" icon="language-outline" />
        <SettingItem title="Notificaciones Push" icon="notifications-outline" />

        <Text className="text-zinc-500 text-xs font-bold uppercase mb-2 mt-8 tracking-widest">
          Almacenamiento
        </Text>
        <TouchableOpacity className="flex-row items-center py-4 border-b border-zinc-900">
          <View className="bg-zinc-900 w-10 h-10 rounded-full items-center justify-center mr-4">
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </View>
          <Text className="text-white text-base font-medium flex-1">
            Borrar Caché
          </Text>
          <Text className="text-zinc-500 text-sm">124 MB</Text>
        </TouchableOpacity>

        <View className="mt-10 items-center mb-8">
          <Text className="text-zinc-600 text-xs">
            Versión 1.0.2 (Build 2024)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
