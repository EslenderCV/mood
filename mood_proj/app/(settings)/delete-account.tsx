import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";

import { useLanguage } from "@/context/LanguageContext";
import { useGlobalContext } from "@/context/GlobalProvider";
import { deleteUserAccountAndData } from "@/lib/appwrite/users";
import { normalizeConfirmWord, canDeleteAccount } from "@/src/utils/deleteAccountConfirm";

export default function DeleteAccount() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();
  const { user, setUser, setLoggedIn } = useGlobalContext();

  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmWord = useMemo(() => normalizeConfirmWord(t("deleteAccount.confirmWord")), [t]);

  const canDelete = useMemo(() => canDeleteAccount(confirmText, confirmWord), [confirmText, confirmWord]);

  const bg = isDark ? "#000000" : "#FFFFFF";
  const card = isDark ? "#0A0A0A" : "#F4F4F5";
  const border = isDark ? "#27272A" : "#E4E4E7";
  const text = isDark ? "#FFFFFF" : "#09090B";
  const sub = isDark ? "#A1A1AA" : "#71717A";

  const startDelete = () => {
    if (!user?.$id) return;

    Alert.alert(
      t("deleteAccount.confirmTitle"),
      t("deleteAccount.confirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("deleteAccount.confirmAction"),
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteUserAccountAndData(user.$id);

              // Limpieza local + navegar fuera
              setUser(null);
              setLoggedIn(false);
              router.replace("/signIn");
            } catch (e: any) {
              Alert.alert(
                t("common.error"),
                e?.message || t("deleteAccount.errorGeneric")
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          className="w-10 h-10 items-center justify-center rounded-full active:bg-white/10"
        >
          <Ionicons name="chevron-back" size={22} color={text} />
        </TouchableOpacity>

        <Text
          style={{
            color: text,
            fontSize: 18,
            fontWeight: "700",
            marginLeft: 6,
          }}
        >
          {t("deleteAccount.title")}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
        {/* Warning Card */}
        <View
          style={{
            backgroundColor: card,
            borderWidth: 1,
            borderColor: border,
            borderRadius: 18,
            padding: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="warning" size={20} color="#EF4444" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: text, fontSize: 15, fontWeight: "800" }}>
                {t("deleteAccount.warningTitle")}
              </Text>
              <Text style={{ color: sub, marginTop: 6, lineHeight: 18 }}>
                {t("deleteAccount.warningBody")}
              </Text>
            </View>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: border,
              opacity: 0.8,
              marginVertical: 14,
            }}
          />

          <Text style={{ color: text, fontSize: 13, fontWeight: "700" }}>
            {t("deleteAccount.typeTitle")}
          </Text>
          <Text style={{ color: sub, marginTop: 6, lineHeight: 18 }}>
            {t("deleteAccount.typeBody")}
          </Text>

          <TextInput
            value={confirmText}
            accessibilityLabel={t("deleteAccount.typeInputLabel")}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={confirmWord}
            placeholderTextColor={isDark ? "#52525B" : "#A1A1AA"}
            style={{
              marginTop: 10,
              borderWidth: 1,
              borderColor: canDelete ? "rgba(239, 68, 68, 0.8)" : border,
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: text,
              backgroundColor: isDark ? "#050505" : "#FFFFFF",
              fontWeight: "700",
              letterSpacing: 2,
            }}
          />
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={startDelete}
          accessibilityRole="button"
          accessibilityLabel={t("deleteAccount.action")}
          accessibilityHint={t("deleteAccount.a11yHint")}
          disabled={!canDelete || isDeleting}
          style={{
            marginTop: 14,
            backgroundColor:
              !canDelete || isDeleting ? "rgba(239, 68, 68, 0.35)" : "#EF4444",
            borderRadius: 16,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
          }}
          activeOpacity={0.9}
        >
          {isDeleting ? (
            <View style={{ marginRight: 8 }}>
              <ActivityIndicator color="white" />
            </View>
          ) : (
            <View style={{ marginRight: 8 }}>
              <Ionicons name="trash" size={18} color="white" />
            </View>
          )}
          <Text style={{ color: "white", fontWeight: "800", fontSize: 15 }}>
            {isDeleting ? t("deleteAccount.deleting") : t("deleteAccount.action")}
          </Text>
        </TouchableOpacity>

        <Text style={{ color: sub, marginTop: 12, fontSize: 12, lineHeight: 16 }}>
          {t("deleteAccount.note")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
