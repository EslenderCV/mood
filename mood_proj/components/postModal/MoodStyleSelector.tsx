import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { useColorScheme } from "nativewind";

import { tStatic } from "@/context/LanguageContext";
interface MoodStyleSelectorProps {
  moodStyle: "standard" | "card";
  setMoodStyle: (style: "standard" | "card") => void;
}

const MoodStyleSelector = React.memo(
  ({ moodStyle, setMoodStyle }: MoodStyleSelectorProps) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";
    const subTextColor = isDark ? "#A1A1AA" : "#71717A";

    return (
      <View className="flex-row gap-3 mb-4 px-2">
        <TouchableOpacity
          onPress={() => setMoodStyle("standard")}
          className={`flex-1 py-2 rounded-lg border items-center ${
            moodStyle === "standard"
              ? "bg-zinc-800 border-zinc-600"
              : "bg-transparent border-zinc-800"
          }`}
        >
          <Text
            style={{
              color: moodStyle === "standard" ? "white" : subTextColor,
              fontWeight: "bold",
            }}
          >{tStatic("ui.s_69d611f2")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMoodStyle("card")}
          className={`flex-1 py-2 rounded-lg border items-center ${
            moodStyle === "card"
              ? "bg-[#5E17EB] border-[#5E17EB]"
              : "bg-transparent border-zinc-800"
          }`}
        >
          <Text
            style={{
              color: moodStyle === "card" ? "white" : subTextColor,
              fontWeight: "bold",
            }}
          >{tStatic("ui.s_263746fa")}</Text>
        </TouchableOpacity>
      </View>
    );
  },
);


MoodStyleSelector.displayName = "MoodStyleSelector";

export default MoodStyleSelector;