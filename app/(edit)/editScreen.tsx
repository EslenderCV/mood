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
import React, { useState } from "react";
import { useGlobalContext, User } from "@/context/GlobalProvider";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { updateImage, updateProfile } from "@/lib/appwrite";
import { router } from "expo-router";

const editScreen = () => {
  const { user, setUser } = useGlobalContext();
  const [isSaving, setIsSaving] = useState(false);

  // Local state for text fields
  const [formData, setFormData] = useState({
    name: user?.name || "",
    username: user?.username || "",
  });

  // 1. Logic to pick and upload image
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      try {
        setIsSaving(true);
        const updatedDoc = await updateImage(result.assets[0]);
        setUser(updatedDoc as unknown as User); // Update global state
        Alert.alert("Success", "Profile picture updated!");
      } catch (error) {
        Alert.alert("Error", "Could not upload image.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  // 2. Logic to save text changes
  const handleSave = async () => {
    // 1. Validation Logic
    if (formData.username.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters.");
      return;
    }

    try {
      setIsSaving(true);

      // 2. Persist to Appwrite
      const updatedDoc = await updateProfile({
        name: formData.name.trim(),
        username: formData.username.toLowerCase().trim(),
      });

      // 3. Sync Global State
      setUser(updatedDoc as unknown as User);

      Alert.alert("Success", "Profile updated successfully!");
      router.back();
    } catch (error) {
      Alert.alert("Error", "This username might already be taken.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="bg-black h-full">
      <ScrollView
        contentContainerStyle={{ alignItems: "center", paddingTop: 20 }}
      >
        {/* Profile Picture Section (RESTORED) */}
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
          Tap icon to change photo
        </Text>

        {/* Form Fields (EDITABLE) */}
        <View className="w-full px-10 mt-12 gap-y-6">
          <View>
            <Text className="text-gray-500 mb-1 ml-1 text-xs font-bold uppercase">
              Display Name
            </Text>
            <TextInput
              className="bg-gray/20 p-4 rounded-xl border border-gray/10 text-white"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <View>
            <Text className="text-gray-500 mb-1 ml-1 text-xs font-bold uppercase">
              Username
            </Text>
            <TextInput
              className="bg-gray/20 p-4 rounded-xl border border-gray/10 text-white"
              value={formData.username}
              onChangeText={(text) =>
                setFormData({ ...formData, username: text })
              }
              autoCapitalize="none"
            />
          </View>
        </View>

        <TouchableOpacity
          className="w-[300px] mt-20 bg-primaryy h-[50px] items-center justify-center rounded-lg"
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text className="text-white font-bold text-lg">SAVE CHANGES</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default editScreen;
