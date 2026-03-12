import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { tStatic } from "@/context/LanguageContext";
interface UserOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onBlock: () => void;
  username: string;
  isDark: boolean;
}

const UserOptionsModal = ({
  visible,
  onClose,
  onBlock,
  username,
  isDark,
}: UserOptionsModalProps) => {
  const bgColor = isDark ? "#18181B" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const borderColor = isDark ? "#27272A" : "#E4E4E7";

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "center",
          alignItems: "center",
        }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableWithoutFeedback>
          <View
            style={{
              backgroundColor: bgColor,
              width: "85%",
              borderRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: borderColor,
            }}
          >
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center mb-4">
                <Ionicons name="shield-outline" size={32} color="#EF4444" />
              </View>
              <Text
                className="text-xl font-bold text-center mb-2"
                style={{ color: textColor }}
              >{tStatic("ui.s_c1d6a671")}</Text>
              <Text
                className="text-center text-sm px-2"
                style={{ color: subTextColor }}
              >
                {tStatic("ui.s_85d853bf")}{" "}
                <Text className="font-bold">@{username}</Text>? No verán tu
                contenido ni podrán interactuar contigo.
              </Text>
            </View>

            <TouchableOpacity
              onPress={onBlock}
              className="w-full py-4 rounded-xl bg-red-500 mb-3 items-center flex-row justify-center shadow-sm"
            >
              <Ionicons
                name="ban"
                size={20}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text className="text-white font-bold text-base">{tStatic("ui.s_90fe8a93")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              className="w-full py-4 rounded-xl items-center border"
              style={{ borderColor: borderColor }}
            >
              <Text
                className="font-bold text-base"
                style={{ color: textColor }}
              >{tStatic("ui.s_847607d7")}</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
};

export default UserOptionsModal;