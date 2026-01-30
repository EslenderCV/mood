import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Image } from "expo-image";

interface UserSuggestionsProps {
  suggestions: any[];
  onSelectUser: (username: string) => void;
  styles: any;
}

export const UserSuggestions = ({
  suggestions,
  onSelectUser,
  styles,
}: UserSuggestionsProps) => {
  if (suggestions.length === 0) return null;

  return (
    <View
      className="w-full border-t border-b"
      style={{
        backgroundColor: styles.suggestionBg,
        borderColor: styles.borderColor,
        maxHeight: 180,
      }}
    >
      <FlatList
        data={suggestions}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onSelectUser(item.username)}
            className="flex-row items-center px-4 py-3 border-b"
            style={{ borderColor: styles.borderColor }}
          >
            <Image
              source={{ uri: item.pfp }}
              style={{ width: 32, height: 32, borderRadius: 999 }}
              className="mr-3 bg-zinc-800"
              contentFit="cover"
            />
            <Text
              className="font-bold text-sm"
              style={{ color: styles.textColor }}
            >
              {item.username}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};
