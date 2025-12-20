import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
// IMPORTACIÓN CORREGIDA
import * as React from "react";
import { useState } from "react";

import { useGlobalContext, User } from "@/context/GlobalProvider";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { updateImage, updateProfile } from "@/lib/appwrite";
import { router } from "expo-router";

const EditScreen = () => {
  const { user, setUser } = useGlobalContext();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    username: user?.username || "",
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

    try {
      setIsSaving(true);
      const updatedDoc = await updateProfile({
        name: formData.name.trim(),
        username: formData.username.toLowerCase().trim(),
      });

      if (setUser) setUser(updatedDoc as unknown as User);

      Alert.alert("Éxito", "Perfil actualizado correctamente.");
      router.back();
    } catch (error) {
      Alert.alert(
        "Error",
        "Es posible que el nombre de usuario ya esté tomado."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="bg-black h-full">
      <ScrollView
        contentContainerStyle={{ alignItems: "center", paddingTop: 20 }}
      >
        <View className="relative w-[140px] h-[140px]">
          <Image
            source={
              user?.pfp ? { uri: user.pfp } : require("@/assets/noPfp.jpg")
            }
            className="w-full h-full rounded-full border-2 border-primaryy"
          />
          <TouchableOpacity
            activeOpacity={0.9}
            className="bg-primaryy absolute bottom-0 right-0 p-2 rounded-full border-4 border-black"
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

        <Text className="text-gray-400 mt-4 font-medium">
          Toca el icono para cambiar la foto
        </Text>

        <View className="w-full px-10 mt-12 gap-y-6">
          <View>
            <Text className="text-gray-500 mb-1 ml-1 text-xs font-bold uppercase">
              Nombre a mostrar
            </Text>
            <TextInput
              className="bg-gray/20 p-4 rounded-xl border border-gray/10 text-white"
              value={formData.name}
              // TIPADO AGREGADO (text: string)
              onChangeText={(text: string) =>
                setFormData({ ...formData, name: text })
              }
            />
          </View>

          <View>
            <Text className="text-gray-500 mb-1 ml-1 text-xs font-bold uppercase">
              Nombre de usuario
            </Text>
            <TextInput
              className="bg-gray/20 p-4 rounded-xl border border-gray/10 text-white"
              value={formData.username}
              // TIPADO AGREGADO (text: string)
              onChangeText={(text: string) =>
                setFormData({ ...formData, username: text })
              }
              autoCapitalize="none"
            />
          </View>
        </View>

        <TouchableOpacity
          className="w-[300px] mt-20 bg-primaryy h-[50px] items-center justify-center rounded-lg shadow-lg"
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">
              GUARDAR CAMBIOS
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditScreen;
