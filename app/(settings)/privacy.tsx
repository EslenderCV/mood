import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const Privacy = () => {
  const [isPrivate, setIsPrivate] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const [allowTags, setAllowTags] = useState(true);

  const ToggleRow = ({ title, desc, value, onValueChange }: any) => (
    <View className="flex-row items-center justify-between py-4 border-b border-zinc-900">
      <View className="flex-1 pr-4">
        <Text className="text-white font-semibold text-base">{title}</Text>
        <Text className="text-zinc-500 text-xs mt-1 leading-4">{desc}</Text>
      </View>
      <Switch
        trackColor={{ false: "#3F3F46", true: "#5E17EB" }}
        thumbColor={value ? "white" : "#f4f3f4"}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
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
        <Text className="text-white text-2xl font-bold">Privacidad</Text>
      </View>

      <ScrollView className="px-6 mt-4">
        <Text className="text-zinc-500 text-xs font-bold uppercase mb-2 tracking-widest">
          Interacciones Sociales
        </Text>

        <ToggleRow
          title="Cuenta Privada"
          desc="Solo las personas que apruebes podrán ver tus moods y playlists."
          value={isPrivate}
          onValueChange={setIsPrivate}
        />

        <ToggleRow
          title="Actividad de Escucha"
          desc="Muestra lo que estás escuchando en tiempo real en tu perfil."
          value={showActivity}
          onValueChange={setShowActivity}
        />

        <ToggleRow
          title="Permitir Etiquetas"
          desc="Otros usuarios pueden etiquetarte en sus moods."
          value={allowTags}
          onValueChange={setAllowTags}
        />

        <Text className="text-zinc-500 text-xs font-bold uppercase mb-2 mt-8 tracking-widest">
          Datos y Contactos
        </Text>

        <TouchableOpacity className="flex-row items-center py-4 border-b border-zinc-900">
          <Ionicons name="people-circle-outline" size={22} color="white" />
          <Text className="text-white text-base ml-4 flex-1">
            Cuentas Bloqueadas
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#71717A" />
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center py-4 border-b border-zinc-900">
          <Ionicons name="download-outline" size={22} color="white" />
          <Text className="text-white text-base ml-4 flex-1">
            Descargar mis datos
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#71717A" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Privacy;
