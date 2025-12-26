import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import * as React from "react";
import { useState } from "react";

import { useGlobalContext, User } from "@/context/GlobalProvider";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons"; // Agregamos Feather para más iconos
import * as ImagePicker from "expo-image-picker";
import { updateImage, updateProfile } from "@/lib/appwrite";
import { router, Stack } from "expo-router";

const { width } = Dimensions.get("window");

const EditScreen = () => {
  const { user, setUser } = useGlobalContext();
  const [isSaving, setIsSaving] = useState(false);
  // Estado para controlar el foco de los inputs y cambiar el color del borde
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    username: user?.username || "",
    email: user?.email || "",
  });

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets) {
      try {
        setIsSaving(true);
        const updatedDoc = await updateImage(result.assets[0]);
        if (setUser) setUser(updatedDoc as unknown as User);
        Alert.alert("Éxito", "¡Foto de perfil actualizada!");
      } catch (error) {
        Alert.alert("Error", "No se pudo subir la imagen.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSave = async () => {
    if (formData.username.length < 3) {
      Alert.alert("Error", "El usuario debe tener al menos 3 caracteres.");
      return;
    }
    if (!formData.email.includes("@")) {
      Alert.alert("Error", "Correo inválido.");
      return;
    }

    try {
      setIsSaving(true);

      const updatedDoc = await updateProfile(user?.$id || "", {
        name: formData.name.trim(),
        username: formData.username.toLowerCase().trim(),
        email: formData.email.trim(),
      });

      if (setUser) setUser(updatedDoc as unknown as User);

      Alert.alert("Éxito", "Perfil actualizado.");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Falló la actualización.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- COMPONENTE DE INPUT REUTILIZABLE PARA MANTENER EL CÓDIGO LIMPIO ---
  const InputField = ({
    label,
    value,
    onChangeText,
    icon,
    placeholder,
    type = "text",
    editable = true,
  }: any) => {
    const isFocused = focusedInput === label;
    return (
      <View className="mb-6 w-full">
        <Text className="text-zinc-400 text-xs font-bold mb-2 ml-1 uppercase tracking-wider">
          {label}
        </Text>
        <View
          className={`flex-row items-center bg-zinc-900 border rounded-2xl px-4 h-[58px] transition-all ${
            isFocused ? "border-[#5E17EB]" : "border-zinc-800"
          } ${!editable ? "opacity-60" : ""}`}
        >
          <Feather
            name={icon}
            size={20}
            color={isFocused ? "#5E17EB" : "#A1A1AA"}
            style={{ marginRight: 12 }}
          />
          <TextInput
            className="flex-1 text-white text-base font-medium h-full"
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#52525B"
            autoCapitalize={
              type === "email" || type === "username" ? "none" : "words"
            }
            keyboardType={type === "email" ? "email-address" : "default"}
            onFocus={() => setFocusedInput(label)}
            onBlur={() => setFocusedInput(null)}
            editable={editable}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="bg-black flex-1" edges={["top"]}>
      {/* Configuración del Header nativo */}
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Editar Perfil",
          headerStyle: { backgroundColor: "black" },
          headerTintColor: "white",
          headerTitleStyle: { fontWeight: "bold" },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-4 p-2 bg-zinc-900 rounded-full"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            alignItems: "center",
            paddingVertical: 30,
            paddingHorizontal: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* --- SECCIÓN FOTO --- */}
          <View className="items-center mb-10">
            <View className="relative">
              <View className="p-1 bg-black rounded-full border-2 border-[#5E17EB] shadow-lg shadow-[#5E17EB]/20">
                <Image
                  source={
                    user?.pfp
                      ? { uri: user.pfp }
                      : require("@/assets/noPfp.jpg")
                  }
                  className="w-36 h-36 rounded-full"
                />
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                className="bg-[#5E17EB] absolute bottom-1 right-1 p-3 rounded-full border-4 border-black items-center justify-center"
                onPress={pickImage}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="camera" color="white" size={22} />
                )}
              </TouchableOpacity>
            </View>
            <Text className="text-zinc-500 mt-4 font-medium text-sm">
              Toca el icono para cambiar tu foto
            </Text>
          </View>

          {/* --- FORMULARIO --- */}
          <View className="w-full">
            <InputField
              label="Nombre Completo"
              value={formData.name}
              onChangeText={(text: string) =>
                setFormData({ ...formData, name: text })
              }
              icon="user"
              placeholder="Ej: Eslender Cruz"
            />

            <InputField
              label="Nombre de Usuario"
              value={formData.username}
              onChangeText={(text: string) =>
                setFormData({ ...formData, username: text })
              }
              icon="at-sign"
              placeholder="Ej: slenderc"
              type="username"
            />

            <InputField
              label="Correo Electrónico"
              value={formData.email}
              onChangeText={(text: string) =>
                setFormData({ ...formData, email: text })
              }
              icon="mail"
              placeholder="ejemplo@correo.com"
              type="email"
              // editable={false} // OPCIONAL: Si no quieres que cambien el email, descomenta esto.
            />
          </View>

          {/* --- BOTÓN GUARDAR --- */}
          <TouchableOpacity
            className={`w-full mt-6 h-[58px] items-center justify-center rounded-2xl shadow-lg shadow-[#5E17EB]/30 flex-row ${
              isSaving ? "bg-zinc-800" : "bg-[#5E17EB]"
            }`}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.9}
          >
            {isSaving ? (
              <>
                <ActivityIndicator color="white" className="mr-2" />
                <Text className="text-white font-bold text-lg">
                  Guardando...
                </Text>
              </>
            ) : (
              <Text className="text-white font-bold text-lg tracking-wide">
                GUARDAR CAMBIOS
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EditScreen;
