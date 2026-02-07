import React from "react";
import { View, Text } from "react-native";

import { tStatic } from "@/context/LanguageContext";
interface EmptyCommentsProps {
  t: (key: string) => string;
  styles: any;
}

export const EmptyComments = ({ t, styles }: EmptyCommentsProps) => {
  return (
    <View className="items-center justify-center py-10 opacity-60">
      <Text
        className="text-center font-medium"
        style={{ color: styles.subTextColor }}
      >
        {t("postDetails.emptyComments") || "No hay comentarios aún"}
      </Text>
      <Text
        className="text-center text-xs mt-2 opacity-60"
        style={{ color: styles.subTextColor }}
      >{tStatic("ui.s_bd99de7d")}</Text>
    </View>
  );
};