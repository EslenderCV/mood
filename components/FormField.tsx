import { View, TextInput, TouchableOpacity, TextInputProps } from "react-native";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

interface FormFieldProps {
  value: string;
  placeholder: string;
  handleChangeText: (text: string) => void;
  otherStyles?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  // AGREGADOS: Propiedades para el autocompletado
  textContentType?: TextInputProps["textContentType"];
  autoComplete?: TextInputProps["autoComplete"];
}

const FormField = ({
  value,
  placeholder,
  handleChangeText,
  otherStyles,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "none",
  // Recibir las nuevas props
  textContentType,
  autoComplete,
}: FormFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`space-y-2 ${otherStyles}`}>
      <View
        className={`w-full h-14 px-4 rounded-2xl border-2 flex-row items-center transition-all ${
          isFocused
            ? "border-[#5E17EB] bg-black"
            : "border-zinc-800 bg-zinc-900"
        }`}
      >
        <TextInput
          className="flex-1 text-white text-base font-medium"
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#71717A"
          onChangeText={handleChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          // Pasarlas al componente nativo
          textContentType={textContentType}
          autoComplete={autoComplete}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              color={isFocused ? "#5E17EB" : "#71717A"}
              size={22}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default FormField;