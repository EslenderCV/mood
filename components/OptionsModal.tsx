import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

import { tStatic } from "@/context/LanguageContext";
interface OptionsModalProps {
  isVisible: boolean;
  onClose: () => void;
  onDelete: () => void;
  onReport: () => void;
  onBlock?: () => void; // 🔥 NUEVO: Prop para bloquear
  isOwner: boolean;
}

export default function OptionsModal({
  isVisible,
  onClose,
  onDelete,
  onReport,
  onBlock, // Recibimos la función
  isOwner,
}: OptionsModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const bgColor = isDark ? "#18181B" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#09090B";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const dangerColor = "#EF4444";

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-black/60">
          <TouchableWithoutFeedback>
            <View
              className="w-full rounded-t-[30px] px-6 pt-6 pb-10"
              style={{ backgroundColor: bgColor }}
            >
              <View className="items-center mb-6">
                <View className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 opacity-50" />
              </View>

              <Text
                className="text-center font-bold text-lg mb-6"
                style={{ color: textColor }}
              >
                {isOwner ? tStatic("ui.s_13baa745") : tStatic("ui.s_a6f0cb2b")}
              </Text>

              {isOwner && (
                <TouchableOpacity
                  onPress={onDelete}
                  className="flex-row items-center p-4 rounded-2xl border border-red-500/20 bg-red-500/5 mb-3"
                >
                  <View className="w-10 h-10 rounded-full items-center justify-center mr-4 bg-red-500/10">
                    <Ionicons
                      name="trash-outline"
                      size={22}
                      color={dangerColor}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="font-bold text-base"
                      style={{ color: dangerColor }}
                    >{tStatic("ui.s_1451e1c4")}</Text>
                    <Text className="text-xs text-red-400/70">{tStatic("ui.s_114de65f")}</Text>
                  </View>
                </TouchableOpacity>
              )}

              {!isOwner && (
                <>
                  {/* Opción Reportar */}
                  <TouchableOpacity
                    onPress={onReport}
                    className="flex-row items-center p-4 rounded-2xl mb-3"
                    style={{ backgroundColor: isDark ? "#27272A" : "#F4F4F5" }}
                  >
                    <View className="w-10 h-10 rounded-full items-center justify-center mr-4 bg-zinc-200 dark:bg-zinc-700">
                      <Ionicons
                        name="flag-outline"
                        size={22}
                        color={textColor}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="font-bold text-base"
                        style={{ color: textColor }}
                      >{tStatic("ui.s_86d6df01")}</Text>
                      <Text className="text-xs" style={{ color: subTextColor }}>{tStatic("ui.s_36ff3924")}</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={subTextColor}
                    />
                  </TouchableOpacity>

                  {/* 🔥 Opción Bloquear (REQUERIDO POR APPLE) */}
                  <TouchableOpacity
                    onPress={onBlock}
                    className="flex-row items-center p-4 rounded-2xl mb-3"
                    style={{ backgroundColor: isDark ? "#27272A" : "#F4F4F5" }}
                  >
                    <View className="w-10 h-10 rounded-full items-center justify-center mr-4 bg-red-100 dark:bg-red-900/20">
                      <Ionicons
                        name="ban-outline"
                        size={22}
                        color={dangerColor}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="font-bold text-base"
                        style={{ color: dangerColor }}
                      >{tStatic("ui.s_90fe8a93")}</Text>
                      <Text className="text-xs" style={{ color: subTextColor }}>{tStatic("ui.s_29fa9760")}</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                onPress={onClose}
                className="mt-4 py-4 items-center"
              >
                <Text
                  className="font-bold text-base"
                  style={{ color: subTextColor }}
                >{tStatic("ui.s_847607d7")}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}