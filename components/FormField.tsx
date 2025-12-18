import { View, Text, TextInput, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

interface FormFieldProps {
  value: string;
  placeholder: string;
  handleChangeText: (text: string) => void;
  otherStyles?: string;
  secureTextEntry?: boolean;
}

const FormField = ({
  value,
  placeholder,
  handleChangeText,
  otherStyles,
  secureTextEntry,
}: FormFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className={`space-y-2 ${otherStyles}`}>
      <View className="flex-row bg-gray/40 w-[300px] h-[40px] px-4 rounded border-2 border-gray/20 focus:border-primaryy items-center">
        <TextInput
          className="flex-1 text-white text-sm"
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#7B7B8B"
          onChangeText={handleChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          autoCapitalize="none"
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              color="#6D6D6D"
              size={20}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default FormField;
