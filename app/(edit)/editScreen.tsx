import {
  View,
  Text,
  ScrollView,
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
import { Ionicons, Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ImagePickerAsset } from "expo-image-picker";
import { updateProfile } from "@/lib/appwrite";
import { router, Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";
import { Image } from "expo-image"; // 🔥 Premium Image
import * as Haptics from "expo-haptics"; // 🔥 Haptics

interface FormState {
  name: string;
  username: string;
  email: string;
  pfp: string | ImagePickerAsset | null;
}

// 🔥 Componente de Input fuera para estabilidad del teclado
const InputField = ({
  label,
  value,
  onChangeText,
  icon,
  placeholder,
  type = "text",
  editable = true,
  focusedInput,
  setFocusedInput,
  colors,
}: any) => {
  const isFocused = focusedInput === label;
  return (
    <View className="mb-6 w-full">
      <Text
        className="text-xs font-bold mb-2 ml-1 uppercase tracking-wider"
        style={{ color: colors.subTextColor }}
      >
        {label}
      </Text>
      <View
        className={`flex-row items-center border rounded-2xl px-4 h-[58px] transition-all`}
        style={{
          backgroundColor: colors.inputBg,
          borderColor: isFocused ? "#5E17EB" : colors.inputBorder,
          opacity: editable ? 1 : 0.6,
        }}
      >
        <Feather
          name={icon}
          size={20}
          color={isFocused ? "#5E17EB" : colors.subTextColor}
          style={{ marginRight: 12 }}
        />
        <TextInput
          className="flex-1 text-base font-medium h-full"
          style={{ color: colors.textColor }}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.subTextColor}
          autoCapitalize={
            type === "email" || type === "username" ? "none" : "words"
          }
          keyboardType={type === "email" ? "email-address" : "default"}
          onFocus={() => {
            Haptics.selectionAsync(); // Feedback al enfocar
            setFocusedInput(label);
          }}
          onBlur={() => setFocusedInput(null)}
          editable={editable}
        />
      </View>
    </View>
  );
};

const EditScreen = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const { t } = useLanguage();

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const inputBg = isDark ? "#18181B" : "#F4F4F5";
  const inputBorder = isDark ? "#27272A" : "#E4E4E7";
  const iconColor = isDark ? "#FFFFFF" : "#000000";
  const backBtnBg = isDark ? "#18181B" : "#F4F4F5";

  const colors = {
    textColor,
    subTextColor,
    inputBg,
    inputBorder,
  };

  const { user, setUser } = useGlobalContext();
  const [isSaving, setIsSaving] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormState>({
    name: user?.name || "",
    username: user?.username || "",
    email: user?.email || "",
    pfp: user?.pfp || null,
  });

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t("editProfile.alerts.errorTitle"),
        t("editProfile.alerts.usernameError"),
      );
      return;
    }
    if (!formData.email.includes("@")) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t("editProfile.alerts.errorTitle"),
        t("editProfile.alerts.emailError"),
      );
      return;
    }

    try {
      setIsSaving(true);
      const updatedDoc = await updateProfile(user?.$id || "", {
        name: formData.name.trim(),
        username: formData.username.toLowerCase().trim(),
        email: formData.email.trim(),
        pfp: formData.pfp,
      });

      if (setUser) setUser(updatedDoc as unknown as User);

      // 🔥 Éxito Táctil
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        t("editProfile.alerts.successTitle"),
        t("editProfile.alerts.successMsg"),
      );
      router.back();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t("editProfile.alerts.errorTitle"),
        error.message || t("editProfile.alerts.errorMsg"),
      );
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

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top"]}
      style={{ backgroundColor: bgColor }}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: t("editProfile.title"),
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
                  style={{
                    width: 144,
                    height: 144,
                    borderRadius: 999,
                    backgroundColor: isDark ? "#27272A" : "#E4E4E7",
                  }}
                  contentFit="cover"
                  transition={500}
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
              {t("editProfile.changePhoto")}
            </Text>
          </View>
          <View className="w-full">
            <InputField
              label={t("editProfile.nameLabel")}
              value={formData.name}
              onChangeText={(text: string) =>
                setFormData({ ...formData, name: text })
              }
              icon="user"
              placeholder={t("editProfile.namePlaceholder")}
              focusedInput={focusedInput}
              setFocusedInput={setFocusedInput}
              colors={colors}
            />

            <InputField
              label={t("editProfile.usernameLabel")}
              value={formData.username}
              onChangeText={(text: string) =>
                setFormData({ ...formData, username: text })
              }
              icon="at-sign"
              placeholder={t("editProfile.usernamePlaceholder")}
              type="username"
              focusedInput={focusedInput}
              setFocusedInput={setFocusedInput}
              colors={colors}
            />

            <InputField
              label={t("editProfile.emailLabel")}
              value={formData.email}
              onChangeText={(text: string) =>
                setFormData({ ...formData, email: text })
              }
              icon="mail"
              placeholder={t("editProfile.emailPlaceholder")}
              type="email"
              focusedInput={focusedInput}
              setFocusedInput={setFocusedInput}
              colors={colors}
            />
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
                  {t("editProfile.savingButton")}
                </Text>
              </>
            ) : (
              <Text className="text-white font-bold text-lg tracking-wide">
                {t("editProfile.saveButton")}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EditScreen;
