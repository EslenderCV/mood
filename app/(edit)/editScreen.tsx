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
} from "react-native";
import React, { useState } from "react";
import { useGlobalContext, User } from "@/context/GlobalProvider";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather, FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ImagePickerAsset } from "expo-image-picker";
import { updateProfile } from "@/lib/appwrite";
import { router, Stack } from "expo-router";
import { useColorScheme } from "nativewind";

interface FormState {
  name: string;
  username: string;
  email: string;
  preferredPlatform: string;
  pfp: string | ImagePickerAsset | null;
}

const EditScreen = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const inputBg = isDark ? "#18181B" : "#F4F4F5";
  const inputBorder = isDark ? "#27272A" : "#E4E4E7";
  const iconColor = isDark ? "#FFFFFF" : "#000000";
  const backBtnBg = isDark ? "#18181B" : "#F4F4F5";

  const { user, setUser } = useGlobalContext();
  const [isSaving, setIsSaving] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormState>({
    name: user?.name || "",
    username: user?.username || "",
    email: user?.email || "",
    preferredPlatform: user?.preferredPlatform || "spotify",
    pfp: user?.pfp || null,
  });

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setFormData({ ...formData, pfp: result.assets[0] });
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
        preferredPlatform: formData.preferredPlatform,
        pfp: formData.pfp,
      });

      if (setUser) setUser(updatedDoc as unknown as User);

      Alert.alert("Éxito", "Perfil actualizado correctamente.");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Falló la actualización.");
    } finally {
      setIsSaving(false);
    }
  };

  const getImageSource = () => {
    if (
      formData.pfp &&
      typeof formData.pfp === "object" &&
      "uri" in formData.pfp
    ) {
      return { uri: (formData.pfp as ImagePickerAsset).uri };
    }
    if (typeof formData.pfp === "string" && formData.pfp.length > 0) {
      return { uri: formData.pfp };
    }
    return require("@/assets/noPfp.jpg");
  };

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
        <Text
          className="text-xs font-bold mb-2 ml-1 uppercase tracking-wider"
          style={{ color: subTextColor }}
        >
          {label}
        </Text>
        <View
          className={`flex-row items-center border rounded-2xl px-4 h-[58px] transition-all`}
          style={{
            backgroundColor: inputBg,
            borderColor: isFocused ? "#5E17EB" : inputBorder,
            opacity: editable ? 1 : 0.6,
          }}
        >
          <Feather
            name={icon}
            size={20}
            color={isFocused ? "#5E17EB" : subTextColor}
            style={{ marginRight: 12 }}
          />
          <TextInput
            className="flex-1 text-base font-medium h-full"
            style={{ color: textColor }}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={subTextColor}
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
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: bgColor }}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Editar Perfil",
          headerStyle: { backgroundColor: bgColor },
          headerTintColor: textColor,
          headerTitleStyle: { fontWeight: "bold" },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-4 p-2 rounded-full"
              style={{ backgroundColor: backBtnBg }}
            >
              <Ionicons name="arrow-back" size={24} color={iconColor} />
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
          <View className="items-center mb-10">
            <View className="relative">
              <View className="p-1 rounded-full border-2 border-[#5E17EB] shadow-lg shadow-[#5E17EB]/20">
                <Image
                  source={getImageSource()}
                  className="w-36 h-36 rounded-full"
                  style={{ backgroundColor: isDark ? "#27272A" : "#E4E4E7" }}
                  resizeMode="cover"
                />
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                className="bg-[#5E17EB] absolute bottom-1 right-1 p-3 rounded-full border-4 items-center justify-center"
                style={{ borderColor: bgColor }}
                onPress={pickImage}
                disabled={isSaving}
              >
                <Ionicons name="camera" color="white" size={22} />
              </TouchableOpacity>
            </View>
            <Text
              className="mt-4 font-medium text-sm"
              style={{ color: subTextColor }}
            >
              Toca para cambiar foto
            </Text>
          </View>
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
            />
            <View className="mb-6 w-full">
              <Text
                className="text-xs font-bold mb-3 ml-1 uppercase tracking-wider"
                style={{ color: subTextColor }}
              >
                Plataforma de Música Favorita
              </Text>
              <View className="flex-row gap-4">
                <TouchableOpacity
                  onPress={() =>
                    setFormData({ ...formData, preferredPlatform: "spotify" })
                  }
                  className={`flex-1 flex-row items-center justify-center p-4 rounded-2xl border transition-all`}
                  style={{
                    backgroundColor:
                      formData.preferredPlatform === "spotify"
                        ? "rgba(29, 185, 84, 0.1)"
                        : inputBg,
                    borderColor:
                      formData.preferredPlatform === "spotify"
                        ? "#1DB954"
                        : inputBorder,
                  }}
                  activeOpacity={0.8}
                >
                  <FontAwesome5
                    name="spotify"
                    size={24}
                    color={
                      formData.preferredPlatform === "spotify"
                        ? "#1DB954"
                        : subTextColor
                    }
                  />
                  <Text
                    className="ml-2 font-bold"
                    style={{
                      color:
                        formData.preferredPlatform === "spotify"
                          ? "#1DB954"
                          : subTextColor,
                    }}
                  >
                    Spotify
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setFormData({ ...formData, preferredPlatform: "apple" })
                  }
                  className={`flex-1 flex-row items-center justify-center p-4 rounded-2xl border transition-all`}
                  style={{
                    backgroundColor:
                      formData.preferredPlatform === "apple"
                        ? "rgba(250, 36, 60, 0.1)"
                        : inputBg,
                    borderColor:
                      formData.preferredPlatform === "apple"
                        ? "#FA243C"
                        : inputBorder,
                  }}
                  activeOpacity={0.8}
                >
                  <FontAwesome5
                    name="apple"
                    size={24}
                    color={
                      formData.preferredPlatform === "apple"
                        ? "#FA243C"
                        : subTextColor
                    }
                  />
                  <Text
                    className="ml-2 font-bold"
                    style={{
                      color:
                        formData.preferredPlatform === "apple"
                          ? "#FA243C"
                          : subTextColor,
                    }}
                  >
                    Apple Music
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <TouchableOpacity
            className={`w-full mt-2 h-[58px] items-center justify-center rounded-2xl shadow-lg flex-row`}
            style={{
              backgroundColor: isSaving ? "#27272A" : "#5E17EB",
              shadowColor: "#5E17EB",
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 5,
            }}
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
