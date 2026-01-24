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

    const renderUserItem = ({ item }: { item: any }) => (
      <TouchableOpacity
        onPress={() => onSelectUser(item.username)}
        className="flex-row items-center px-4 py-3 border-b active:bg-zinc-100 dark:active:bg-zinc-800"
        style={{ borderColor }}
      >
        <Image
          source={{ uri: item.pfp }}
          className="w-9 h-9 rounded-full mr-3 bg-zinc-800"
        />
        <View>
          <Text className="font-bold text-sm" style={{ color: textColor }}>
            {item.username}
          </Text>
          <Text className="text-xs" style={{ color: placeholderColor }}>
            {item.name}
          </Text>
        </View>
      </TouchableOpacity>
    );

    return (
      <View className="flex-1">
        <View className="flex-row gap-4 mb-2 h-full">
          <Image
            source={
              user?.pfp ? { uri: user.pfp } : require("@/assets/noPfp.jpg")
            }
            className="w-12 h-12 rounded-full border-2"
            style={{ borderColor: "#5E17EB" }}
          />
          <View className="flex-1 h-full">
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
