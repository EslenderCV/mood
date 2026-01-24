import React, { memo } from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import * as Haptics from "expo-haptics";

interface AdItemProps {
  ad: {
    id: string;
    advertiserName: string;
    advertiserAvatar: string;
    content: string;
    image?: string;
    ctaText: string;
    url: string;
  };
}

const AdItem: React.FC<AdItemProps> = ({ ad }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Colores optimizados (evitamos cálculos complejos)
  const textColor = isDark ? "#FFFFFF" : "#09090B";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const accentColor = "#5E17EB";
  const cardBg = isDark ? "#18181B" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";

  const handlePress = async () => {
    Haptics.selectionAsync();
    try {
      await Linking.openURL(ad.url);
    } catch (e) {
      console.log("Error opening URL");
    }
  };

  return (
    <View className="px-5 py-4 border-b border-transparent">
      {/* HEADER */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <View
            className={`p-[1.5px] rounded-full mr-3 border ${isDark ? "border-zinc-700" : "border-zinc-200"}`}
          >
            <Image
              source={{ uri: ad.advertiserAvatar }}
              className="w-10 h-10 rounded-full bg-zinc-800"
              contentFit="cover"
              // Eliminado transition para scroll más fluido
            />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center">
              <Text
                className="font-bold text-[15px] mr-1"
                style={{ color: textColor }}
              >
                {ad.advertiserName}
              </Text>
              <MaterialIcons name="verified" size={14} color={accentColor} />
            </View>
            <Text
              className="text-[12px] font-semibold tracking-wide"
              style={{ color: subTextColor }}
            >
              Publicidad
            </Text>
          </View>
        </View>

        <TouchableOpacity className="p-2 -mr-2 opacity-50">
          <Ionicons name="ellipsis-horizontal" size={18} color={subTextColor} />
        </TouchableOpacity>
      </View>

      {/* CONTENIDO */}
      <View className="pl-1">
        {/* Texto limitado para evitar re-layouts gigantes */}
        <Text
          className="text-[16px] leading-[24px] mb-3 font-normal"
          style={{ color: textColor }}
          numberOfLines={4}
        >
          {ad.content}
        </Text>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handlePress}
          className="rounded-[24px] overflow-hidden border mb-2 relative"
          style={{
            backgroundColor: cardBg,
            borderColor: cardBorder,
            // Sombra optimizada: Más ligera
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.2 : 0.05,
            shadowRadius: 4,
            elevation: 2, // Menor elevación en Android
          }}
        >
          {ad.image && (
            <View className="relative bg-zinc-800">
              <Image
                source={{ uri: ad.image }}
                className="w-full h-56"
                contentFit="cover"
                cachePolicy="memory-disk" // Cache agresivo
              />
              <View className="absolute top-3 right-3 bg-black/60 px-2 py-1 rounded-md border border-white/10">
                <Text className="text-white text-[10px] font-bold">AD</Text>
              </View>
            </View>
          )}

          <View className="p-4 bg-zinc-900/50 absolute bottom-0 w-full flex-row justify-between items-center">
            <View className="flex-1 mr-4">
              <Text className="text-white font-bold text-[14px] opacity-90">
                {ad.ctaText}
              </Text>
              <Text className="text-zinc-300 text-[11px]" numberOfLines={1}>
                {ad.url.replace(/^https?:\/\//, "")}
              </Text>
            </View>
            <View className="bg-white px-4 py-2 rounded-full">
              <Text className="text-black font-bold text-[12px]">Abrir</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Memoización estricta
export default memo(AdItem, (prev, next) => {
  return prev.ad.id === next.ad.id;
});
