import React from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";

interface MusicSearchBoxProps {
  query: string;
  setQuery: (q: string) => void;
  isLoading: boolean;
  onClose: () => void;
}

const MusicSearchBox = React.memo(
  ({ query, setQuery, isLoading, onClose }: MusicSearchBoxProps) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";
    const { t } = useLanguage();

    const bgColor = isDark ? "#18181B" : "#F4F4F5";
    const textColor = isDark ? "#FFFFFF" : "#000000";
    const subTextColor = isDark ? "#A1A1AA" : "#71717A";
    const borderColor = isDark ? "#27272A" : "#E4E4E7";
    const accentColor = "#5E17EB";

    return (
      <View
        className="flex-row items-center rounded-2xl px-4 py-1 mb-2 border shadow-sm"
        style={{ backgroundColor: bgColor, borderColor }}
      >
        <Ionicons name="search" color={accentColor} size={22} />
        <TextInput
          placeholder={t("post.searchPlaceholder") || "Buscar canciones..."}
          placeholderTextColor={subTextColor}
          className="flex-1 py-3 ml-3 text-[16px] font-medium"
          style={{ color: textColor }}
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCorrect={false}
          selectionColor={accentColor}
        />
        {isLoading ? (
          <ActivityIndicator size="small" color={accentColor} />
        ) : (
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={22} color={subTextColor} />
          </TouchableOpacity>
        )}
      </View>
    );
  },
);

export default MusicSearchBox;
