import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";

import { useGlobalContext } from "@/context/GlobalProvider";
import { updateProfile } from "@/lib/appwrite";

const Privacy = () => {
  const { user, setUser } = useGlobalContext();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // --- COLORES BLINDADOS ---
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";
  const iconBg = isDark ? "#27272A" : "#F4F4F5";
  const backIconColor = isDark ? "#FFFFFF" : "#000000";
  const infoBg = isDark ? "#18181B" : "#F0F9FF";
  const infoText = isDark ? "#A1A1AA" : "#0369A1";

  // --- ESTADOS ---
  const [isPrivate, setIsPrivate] = useState((user as any)?.isPrivate || false);
  const [allowTags, setAllowTags] = useState((user as any)?.allowTags ?? true);

  // --- MANEJADORES ---
  const handleTogglePrivate = async (value: boolean) => {
    if (!user) return;
    setIsPrivate(value);
    try {
      await updateProfile(user.$id, { isPrivate: value });
      const updatedUser = { ...user, isPrivate: value };
      if (setUser) setUser(updatedUser as any);
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar la privacidad.");
      setIsPrivate(!value);
    }
  };

  const handleToggleTags = async (value: boolean) => {
    if (!user) return;
    setAllowTags(value);
    try {
      await updateProfile(user.$id, { allowTags: value });
      const updatedUser = { ...user, allowTags: value };
      if (setUser) setUser(updatedUser as any);
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar la configuración.");
      setAllowTags(!value);
    }
  };

  // --- COMPONENTES AUXILIARES ---

  // 1. Fila con Interruptor (Switch)
  const PrivacySwitch = ({
    icon,
    title,
    subtitle,
    value,
    onValueChange,
  }: {
    icon: any;
    title: string;
    subtitle: string;
    value: boolean;
    onValueChange: (val: boolean) => void;
  }) => (
    <View
      className="flex-row items-center py-4 border-b justify-between"
      style={{ borderColor: borderColor }}
    >
      <View className="flex-row items-center flex-1 mr-4">
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-4"
          style={{ backgroundColor: iconBg }}
        >
          <Ionicons name={icon} size={20} color="#5E17EB" />
        </View>
        <View className="flex-1">
          <Text
            className="text-base font-semibold"
            style={{ color: textColor }}
          >
            {title}
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: subTextColor }}>
            {subtitle}
          </Text>
        </View>
      </View>
      <Switch
        trackColor={{ false: isDark ? "#3F3F46" : "#E4E4E7", true: "#5E17EB" }}
        thumbColor={"white"}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );

  // 2. Fila con Navegación (Link)
  const PrivacyLink = ({
    icon,
    title,
    subtitle,
    onPress,
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center py-4 border-b justify-between active:opacity-50"
      style={{ borderColor: borderColor }}
    >
      <View className="flex-row items-center flex-1 mr-4">
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-4"
          style={{ backgroundColor: iconBg }}
        >
          <Ionicons name={icon} size={20} color="#5E17EB" />
        </View>
        <View className="flex-1">
          <Text
            className="text-base font-semibold"
            style={{ color: textColor }}
          >
            {title}
          </Text>
          {subtitle && (
            <Text className="text-xs mt-0.5" style={{ color: subTextColor }}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={subTextColor} />
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <SafeAreaView
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: bgColor }}
      >
        <ActivityIndicator color="#5E17EB" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: bgColor }}>
      {/* HEADER */}
      <View
        className="px-6 py-4 flex-row items-center border-b"
        style={{ borderColor: borderColor }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 p-2 rounded-full"
          style={{ backgroundColor: iconBg }}
        >
          <Ionicons name="arrow-back" size={22} color={backIconColor} />
        </TouchableOpacity>
        <Text className="text-2xl font-bold" style={{ color: textColor }}>
          Privacidad
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6 mt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* SECCIÓN CUENTA */}
        <Text
          className="text-xs font-bold uppercase mb-2 tracking-widest pl-1"
          style={{ color: subTextColor }}
        >
          Privacidad de la Cuenta
        </Text>

        <PrivacySwitch
          icon="lock-closed-outline"
          title="Cuenta Privada"
          subtitle="Solo tus seguidores podrán ver tus fotos y videos."
          value={isPrivate}
          onValueChange={handleTogglePrivate}
        />

        {/* SECCIÓN INTERACCIONES */}
        <Text
          className="text-xs font-bold uppercase mb-2 mt-8 tracking-widest pl-1"
          style={{ color: subTextColor }}
        >
          Interacciones
        </Text>

        <PrivacySwitch
          icon="at-outline"
          title="Permitir Etiquetas"
          subtitle="Permitir que otros te mencionen (@usuario)."
          value={allowTags}
          onValueChange={handleToggleTags}
        />

        <PrivacyLink
          icon="ban-outline"
          title="Usuarios Bloqueados"
          subtitle="Gestionar las cuentas que has bloqueado."
          onPress={() => router.push("/blocked-users")}
        />

        <PrivacySwitch
          icon="eye-off-outline"
          title="Estado en Línea"
          subtitle="Mostrar cuando estás activo en el chat."
          value={true}
          onValueChange={() => {}}
        />

        {/* CAJA DE INFORMACIÓN */}
        <View
          className="mt-6 p-4 rounded-xl border"
          style={{
            backgroundColor: infoBg,
            borderColor: isDark ? borderColor : "transparent",
          }}
        >
          <View className="flex-row items-start">
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={infoText}
              style={{ marginTop: 2 }}
            />
            <Text
              className="ml-2 text-xs flex-1 leading-5"
              style={{ color: infoText }}
            >
              Cuando "Permitir Etiquetas" está desactivado, tu perfil no
              aparecerá en las sugerencias de búsqueda al redactar comentarios,
              y nadie podrá crear un enlace directo a tu perfil mediante una
              mención.
            </Text>
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Privacy;
