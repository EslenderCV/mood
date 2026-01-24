import React from "react";
import {
  View,
  Image,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
} from "react-native";
import { useColorScheme } from "nativewind";
import { useLanguage } from "@/context/LanguageContext";
// 🔥 IMPORTAMOS EL OPTIMIZADOR
import { getOptimizedImageUrl } from "@/lib/appwrite/imageOptimizer";

interface PostComposerProps {
  user: any;
  text: string;
  onChangeText: (text: string) => void;
  showSuggestions: boolean;
  suggestions: any[];
  onSelectUser: (username: string) => void;
}

const PostComposer = React.memo(
  ({
    user,
    text,
    onChangeText,
    showSuggestions,
    suggestions,
    onSelectUser,
  }: PostComposerProps) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";
    const { t } = useLanguage();

    const textColor = isDark ? "#FFFFFF" : "#000000";
    const placeholderColor = isDark ? "#71717A" : "#A1A1AA";
    const borderColor = isDark ? "#27272A" : "#E4E4E7";

    const selectionColor = "#5E17EB";

    // 🔥 GENERAMOS LA URL OPTIMIZADA (Avatar pequeño: 100x100 es suficiente)
    const optimizedAvatar = getOptimizedImageUrl(user?.pfp, 100, 100);

    const renderUserItem = ({ item }: { item: any }) => (
      <TouchableOpacity
        onPress={() => onSelectUser(item.username)}
        className="flex-row items-center p-3 border-b"
        style={{ borderColor }}
      >
        <Image
          // Usamos el optimizador aquí también para las sugerencias
          source={{ uri: getOptimizedImageUrl(item.pfp, 80, 80) }}
          className="w-8 h-8 rounded-full bg-zinc-200"
        />
        <View className="ml-3">
          <Text className="font-bold" style={{ color: textColor }}>
            {item.name}
          </Text>
          <Text className="text-xs" style={{ color: placeholderColor }}>
            @{item.username}
          </Text>
        </View>
      </TouchableOpacity>
    );

    return (
      <View className="flex-1 w-full">
        <View className="flex-row items-start w-full">
          <Image
            // 🔥 USAMOS LA IMAGEN OPTIMIZADA
            source={
              optimizedAvatar
                ? { uri: optimizedAvatar }
                : require("@/assets/noPfp.jpg")
            }
            className="w-12 h-12 rounded-full border-[1px]"
            style={{ borderColor: "#5E17EB" }}
          />
          <View className="flex-1 h-full ml-3">
            <TextInput
              placeholder={t("post.placeholder")}
              placeholderTextColor={placeholderColor}
              multiline
              style={{
                color: textColor,
                fontSize: 20,
                lineHeight: 28,
                minHeight: 120,
                textAlignVertical: "top",
              }}
              value={text}
              onChangeText={onChangeText}
              selectionColor={selectionColor}
              autoFocus={true}
            />
          </View>
        </View>
        {showSuggestions && (
          <View
            className="absolute top-16 left-12 right-0 rounded-2xl border overflow-hidden max-h-48 shadow-lg z-50"
            style={{
              backgroundColor: isDark ? "#1E1E20" : "#FFFFFF",
              borderColor,
            }}
          >
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.$id}
              renderItem={renderUserItem}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}
      </View>
    );
  },
);

export default PostComposer;
