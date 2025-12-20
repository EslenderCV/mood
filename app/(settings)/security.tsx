import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";

const Security = () => {
  const [biometrics, setBiometrics] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  // Componente Reutilizable para Filas
  const SecurityRow = ({
    icon,
    title,
    subtitle,
    isDanger = false,
    hasSwitch = false,
    value,
    onToggle,
  }: any) => (
    <TouchableOpacity
      disabled={hasSwitch}
      className={`flex-row items-center py-4 border-b border-zinc-900 ${
        hasSwitch ? "" : "active:opacity-50"
      }`}
    >
      <View
        className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${
          isDanger ? "bg-red-500/10" : "bg-zinc-900"
        }`}
      >
        <Ionicons
          name={icon}
          size={20}
          color={isDanger ? "#EF4444" : "#5E17EB"}
        />
      </View>
      <View className="flex-1">
        <Text
          className={`text-base font-semibold ${
            isDanger ? "text-red-500" : "text-white"
          }`}
        >
          {title}
        </Text>
        {subtitle && (
          <Text className="text-zinc-500 text-xs mt-0.5">{subtitle}</Text>
        )}
      </View>
      {hasSwitch ? (
        <Switch
          trackColor={{ false: "#3F3F46", true: "#5E17EB" }}
          thumbColor={value ? "white" : "#f4f3f4"}
          onValueChange={onToggle}
          value={value}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#3F3F46" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-6 py-4 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 p-2 bg-zinc-900 rounded-full"
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">Seguridad</Text>
      </View>

      <ScrollView className="px-6 mt-2">
        {/* Estado de Seguridad */}
        <View className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex-row items-center mb-8">
          <MaterialIcons name="security" size={28} color="#10B981" />
          <View className="ml-3">
            <Text className="text-emerald-500 font-bold text-base">
              Cuenta Protegida
            </Text>
            <Text className="text-emerald-500/70 text-xs">
              No se han detectado amenazas.
            </Text>
          </View>
        </View>

        <Text className="text-zinc-500 text-xs font-bold uppercase mb-2 tracking-widest">
          Acceso
        </Text>
        <SecurityRow
          icon="key-outline"
          title="Contraseña"
          subtitle="Último cambio hace 3 meses"
        />
        <SecurityRow
          icon="finger-print-outline"
          title="FaceID / TouchID"
          hasSwitch
          value={biometrics}
          onToggle={() => setBiometrics(!biometrics)}
        />
        <SecurityRow
          icon="shield-checkmark-outline"
          title="Autenticación de 2 Pasos"
          hasSwitch
          value={twoFactor}
          onToggle={() => setTwoFactor(!twoFactor)}
        />

        <Text className="text-zinc-500 text-xs font-bold uppercase mb-2 mt-8 tracking-widest">
          Dispositivos
        </Text>
        <View className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 mb-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons
                name="phone-portrait-outline"
                size={24}
                color="#71717A"
              />
              <View className="ml-3">
                <Text className="text-white font-bold">iPhone 13 Pro</Text>
                <Text className="text-[#5E17EB] text-xs">
                  Sesión Actual • Santo Domingo
                </Text>
              </View>
            </View>
          </View>
        </View>
        <SecurityRow
          icon="laptop-outline"
          title="Gestionar Dispositivos"
          subtitle="2 sesiones activas"
        />

        <Text className="text-zinc-500 text-xs font-bold uppercase mb-2 mt-6 tracking-widest">
          Zona de Peligro
        </Text>
        <SecurityRow
          icon="log-out-outline"
          title="Cerrar Sesión en Todo"
          isDanger
        />
        <SecurityRow icon="trash-outline" title="Eliminar Cuenta" isDanger />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Security;
