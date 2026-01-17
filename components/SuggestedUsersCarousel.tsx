import React from "react";
import { View, Text, FlatList, TouchableOpacity, Image } from "react-native";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";
import { useLanguage } from "@/context/LanguageContext"; // <--- Importar hook

const SuggestedUsersCarousel = ({ users }: { users: any[] }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage(); // <--- Obtener función de traducción

  return (
    <View
      className={`py-5 border-b ${
        isDark ? "border-zinc-800" : "border-zinc-200"
      }`}
    >
      <View className="flex-row justify-between items-center px-5 mb-3">
        <Text
          className={`text-base font-bold ${
            isDark ? "text-white" : "text-black"
          }`}
        >
          {t("home.suggestedUsers")} {/* <--- Texto traducido */}
        </Text>
      </View>
      <FlatList
        horizontal
        data={users}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push(`/user/${item.$id}` as any)}
            className={`mr-3 w-[140px] p-4 rounded-2xl border items-center justify-between h-[180px] ${
              isDark
                ? "bg-[#18181B] border-zinc-800"
                : "bg-zinc-50 border-zinc-200"
            }`}
          >
            <View className="items-center mt-1">
              <Image
                source={
                  item.pfp || item.avatar
                    ? { uri: item.pfp || item.avatar }
                    : require("@/assets/noPfp.jpg")
                }
                className="w-16 h-16 rounded-full bg-zinc-700 mb-2"
              />
              <Text
                className={`font-bold text-sm text-center ${
                  isDark ? "text-white" : "text-black"
                }`}
                numberOfLines={1}
              >
                {item.name || item.username}
              </Text>
              <Text
                className="text-xs text-zinc-500 text-center"
                numberOfLines={1}
              >
                @{item.username}
              </Text>
            </View>
            <TouchableOpacity className="w-full bg-[#5E17EB] py-2 rounded-xl items-center mt-2">
              <Text className="text-white text-xs font-bold">
                {t("common.follow")} {/* <--- Texto traducido */}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};
export default SuggestedUsersCarousel;
