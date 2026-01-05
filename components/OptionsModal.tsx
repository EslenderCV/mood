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

interface OptionsModalProps {
  isVisible: boolean;
  onClose: () => void;
  onDelete: () => void;
  onReport: () => void;
  isOwner: boolean;
}

export default function OptionsModal({
  isVisible,
  onClose,
  onDelete,
  onReport,
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
                {isOwner ? "Gestionar tu publicación" : "Acciones"}
              </Text>
              {isOwner && (
                <>
                  <TouchableOpacity
                    onPress={onDelete}
                    className="flex-row items-center p-4 rounded-2xl border border-red-500/20 bg-red-500/5"
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
                      >
                        Eliminar publicación
                      </Text>
                      <Text className="text-xs text-red-400/70">
                        Esta acción es irreversible
                      </Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
              {!isOwner && (
                <TouchableOpacity
                  onPress={onReport}
                  className="flex-row items-center p-4 rounded-2xl mb-3"
                  style={{ backgroundColor: isDark ? "#27272A" : "#F4F4F5" }}
                >
                  <View className="w-10 h-10 rounded-full items-center justify-center mr-4 bg-red-100 dark:bg-red-900/30">
                    <Ionicons
                      name="flag-outline"
                      size={22}
                      color={dangerColor}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="font-bold text-base"
                      style={{ color: dangerColor }}
                    >
                      Reportar publicación
                    </Text>
                    <Text className="text-xs" style={{ color: subTextColor }}>
                      Contenido inapropiado, spam, etc.
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={subTextColor}
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={onClose}
                className="mt-6 py-4 items-center"
              >
                <Text
                  className="font-bold text-base"
                  style={{ color: subTextColor }}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
