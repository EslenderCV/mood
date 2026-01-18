import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AccountManager, StoredAccount } from "@/lib/accountManager";
import { useGlobalContext } from "@/context/GlobalProvider";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";
import { account } from "@/lib/appwrite";

interface AccountSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

const AccountSelectorModal = ({
  visible,
  onClose,
}: AccountSelectorModalProps) => {
  const { user, checkAuth, setUser, setLoggedIn } = useGlobalContext();
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    if (visible) {
      loadAccounts();
    }
  }, [visible]);

  const loadAccounts = async () => {
    try {
      const stored = await AccountManager.getStoredAccounts();
      setAccounts(stored);
    } catch (error) {
      console.error("Error al cargar cuentas:", error);
    }
  };

  const handleSwitchAccount = async (targetUserId: string) => {
    if (targetUserId === user?.$id) {
      onClose();
      return;
    }

    setSwitchingId(targetUserId);

    try {
      const success = await AccountManager.switchAccount(targetUserId);

      if (success) {
        await checkAuth();
        onClose();
      } else {
        setUser(null);
        setLoggedIn(false);
        onClose();
        Alert.alert(
          t("auth.sessionExpiredTitle") || "Sesión expirada",
          t("auth.sessionExpiredMsg") ||
            "Por favor, inicia sesión de nuevo en esta cuenta.",
        );
        router.replace("/signIn");
      }
    } catch (error) {
      console.error("Error al cambiar de cuenta:", error);
      router.replace("/signIn");
    } finally {
      setSwitchingId(null);
    }
  };

  const handleAddAccount = () => {
    // 1. Cerramos el modal visualmente primero
    onClose();

    // 2. Limpiamos el estado global inmediatamente
    setUser(null);
    setLoggedIn(false);

    // 3. Ejecutamos el cierre de sesión en "segundo plano" (sin await)
    // para no bloquear la navegación si el servidor tarda en responder.
    account.deleteSession("current").catch(() => {});

    // 4. Forzamos la navegación con un pequeño timeout para asegurar que
    // el modal se ha desmontado correctamente.
    setTimeout(() => {
      router.replace("/signIn");
    }, 100);
  };

  const handleLogoutAll = () => {
    Alert.alert(
      "Cerrar todas las sesiones",
      "¿Estás seguro de que quieres cerrar sesión en todas las cuentas?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar todas",
          style: "destructive",
          onPress: async () => {
            onClose();
            await AccountManager.logoutAll();
            setUser(null);
            setLoggedIn(false);
            router.replace("/signIn");
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/50" onPress={onClose}>
        <View className="flex-1 justify-end">
          <Pressable
            className="bg-[#121212] rounded-t-[30px] p-6 pb-12"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="w-12 h-1.5 bg-zinc-800 rounded-full self-center mb-6" />

            <Text className="text-white text-xl font-bold mb-6 text-center">
              {t("profile.switchAccount") || "Cambiar cuenta"}
            </Text>

            <FlatList
              data={accounts}
              keyExtractor={(item) => item.userId}
              renderItem={({ item }) => {
                const isActive = item.userId === user?.$id;
                return (
                  <TouchableOpacity
                    onPress={() => handleSwitchAccount(item.userId)}
                    disabled={switchingId !== null}
                    className="flex-row items-center justify-between py-4"
                  >
                    <View className="flex-row items-center gap-4">
                      <Image
                        source={
                          item.pfp
                            ? { uri: item.pfp }
                            : require("@/assets/noPfp.jpg")
                        }
                        className="w-14 h-14 rounded-full border border-zinc-800"
                      />
                      <View>
                        <Text className="text-white font-bold text-base">
                          {item.name}
                        </Text>
                        <Text className="text-zinc-500 text-sm">
                          @{item.username}
                        </Text>
                      </View>
                    </View>

                    {switchingId === item.userId ? (
                      <ActivityIndicator color="#5E17EB" />
                    ) : isActive ? (
                      <View className="bg-[#5E17EB] rounded-full p-1">
                        <Ionicons name="checkmark" size={20} color="white" />
                      </View>
                    ) : (
                      <View className="w-6 h-6 rounded-full border-2 border-zinc-800" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              onPress={handleAddAccount}
              className="flex-row items-center gap-4 py-6 mt-2 border-t border-zinc-900"
            >
              <View className="w-14 h-14 rounded-full border-2 border-dashed border-zinc-800 justify-center items-center">
                <Ionicons name="add" size={30} color="white" />
              </View>
              <Text className="text-white font-semibold text-base">
                {t("profile.addAccount") || "Añadir cuenta de Mood"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogoutAll}
              className="flex-row items-center gap-4 py-4"
            >
              <Ionicons name="log-out-outline" size={28} color="#EF4444" />
              <Text className="text-[#EF4444] font-semibold text-base">
                Cerrar sesión en todas
              </Text>
            </TouchableOpacity>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

export default AccountSelectorModal;
