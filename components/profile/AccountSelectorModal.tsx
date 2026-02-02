import React, {useEffect, useState, useCallback} from "react";
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
import { account, getUser, appwriteConfig, databases } from "@/lib/appwrite";
import { Query } from "react-native-appwrite";

interface AccountSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

const AccountSelectorModal = ({
  visible,
  onClose,
}: AccountSelectorModalProps) => {
  const { user, setUser, setLoggedIn, setIsSwitching } = useGlobalContext();
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useLanguage();
// --- LÓGICA DE NEGOCIO ---
  const smartFetchUser = useCallback(async (id: string) => {
    try {
      const doc = await getUser(id);
      if (doc) return doc;
    } catch {}

    try {
      const list = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        [Query.equal("accId", id)]
      );
      if (list.documents.length > 0) return list.documents[0];
    } catch {}

    return null;
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const stored = await AccountManager.getStoredAccounts();
      setAccounts(stored);

      if (stored.length > 0) {
        const freshAccounts = await Promise.all(
          stored.map(async (acc) => {
            try {
              const userDoc = await smartFetchUser(acc.userId);
              if (userDoc) {
                const validPfp = (userDoc.pfp && userDoc.pfp.trim() !== "")
                  ? userDoc.pfp 
                  : `https://cloud.appwrite.io/v1/avatars/initials?name=${encodeURIComponent(userDoc.name)}&project=${appwriteConfig.projectId}`;

                return {
                  ...acc,
                  userId: userDoc.$id,
                  name: userDoc.name || acc.name,
                  username: userDoc.username || "", 
                  pfp: validPfp,
                };
              }
            } catch {}
            return acc;
          })
        );
        setAccounts(freshAccounts);
        await AccountManager.updateAccountsList(freshAccounts);
      }
    } catch (error) {
      console.error("Error al cargar cuentas:", error);
    }
  }, [smartFetchUser]);

  useEffect(() => {
    if (visible) {
      void loadAccounts();
    }
  }, [visible, loadAccounts]);

  const handleSwitchAccount = async (targetAccount: StoredAccount) => {
    // 🔥 CORRECCIÓN TS: Usamos (user as any).accId para evitar el error de tipos
    // ya que sabemos que en la DB el campo existe aunque la interfaz diga 'accountId'.
    const userAccId = user ? (user as any).accId : null;
    const isSameUser = user && (targetAccount.userId === user.$id || targetAccount.userId === userAccId);

    if (isSameUser) {
      onClose();
      return;
    }

    setSwitchingId(targetAccount.userId);
    if (setIsSwitching) setIsSwitching(true);
    onClose();

    try {
      await account.deleteSession("current").catch(() => {});
      setUser(null);
      setLoggedIn(false);

      router.replace({
        pathname: "/signIn",
        params: { email: targetAccount.email }
      });

    } catch (error) {
      console.error("Error al cambiar cuenta:", error);
      router.replace("/signIn");
    } finally {
      setSwitchingId(null);
      setTimeout(() => {
        if (setIsSwitching) setIsSwitching(false);
      }, 1000);
    }
  };

  const handleAddAccount = async () => {
    if (setIsSwitching) setIsSwitching(true);
    onClose();
    setUser(null);
    setLoggedIn(false);
    try {
      await account.deleteSession("current");
    } catch {}
    router.replace("/signIn");
    setTimeout(() => { if (setIsSwitching) setIsSwitching(false); }, 1000);
  };

  const handleLogoutAll = () => {
    Alert.alert(
      t("auth.logoutTitle") || "Cerrar sesión",
      t("auth.logoutConfirm") || "¿Cerrar todas las sesiones?",
      [
        { text: t("common.cancel") || "Cancelar", style: "cancel" },
        {
          text: t("profile.logoutAll") || "Cerrar todas",
          style: "destructive",
          onPress: async () => {
            if (setIsSwitching) setIsSwitching(true);
            onClose();
            await AccountManager.logoutAll();
            setUser(null);
            setLoggedIn(false);
            router.replace("/signIn");
            setTimeout(() => { if (setIsSwitching) setIsSwitching(false); }, 1000);
          },
        },
      ],
    );
  };

  // --- RENDERIZADO PREMIUM ---

  const renderAccountItem = ({ item }: { item: StoredAccount }) => {
    // 🔥 CORRECCIÓN TS AQUÍ TAMBIÉN
    const userAccId = user ? (user as any).accId : null;
    const isSameUser = user && (item.userId === user.$id || item.email === user.email || item.userId === userAccId);
    
    const imageUri = (item.pfp && item.pfp.length > 5) ? item.pfp : null;
    const imageSource = imageUri ? { uri: imageUri } : require("@/assets/noPfp.jpg");
    const subtitle = (item.username && item.username.trim() !== "") ? `@${item.username}` : item.email;

    return (
      <TouchableOpacity
        onPress={() => handleSwitchAccount(item)}
        disabled={switchingId !== null}
        activeOpacity={0.7}
        className={`flex-row items-center justify-between p-4 mb-3 rounded-2xl border ${
          isSameUser 
            ? "bg-[#5E17EB]/10 border-[#5E17EB]/50" 
            : "bg-zinc-900/50 border-white/5"
        }`}
      >
        <View className="flex-row items-center gap-4 flex-1">
          <View className={`p-[2px] rounded-full ${isSameUser ? "bg-[#5E17EB]" : "bg-transparent"}`}>
            <Image
              source={imageSource}
              className="w-12 h-12 rounded-full bg-zinc-800"
              resizeMode="cover"
            />
          </View>
          
          <View className="flex-1">
            <Text className={`text-base font-bold ${isSameUser ? "text-white" : "text-zinc-300"}`} numberOfLines={1}>
              {item.name || t("common.user") || "Usuario"}
            </Text>
            <Text className="text-zinc-500 text-xs font-medium mt-0.5" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>

        <View className="ml-2">
          {switchingId === item.userId ? (
            <ActivityIndicator color="#5E17EB" size="small" />
          ) : isSameUser ? (
            <View className="bg-[#5E17EB] w-6 h-6 rounded-full items-center justify-center shadow-lg shadow-[#5E17EB]/50">
               <View className="w-2 h-2 bg-white rounded-full" />
            </View>
          ) : (
            <View className="w-6 h-6 rounded-full border border-zinc-700" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/80" onPress={onClose}>
        <View className="flex-1 justify-end">
          <Pressable
            className="bg-[#0f0f0f] rounded-t-[32px] overflow-hidden border-t border-white/10"
            onPress={(e) => e.stopPropagation()}
            style={{ maxHeight: '85%' }}
          >
            <View className="absolute top-0 left-0 right-0 h-[1px] bg-[#5E17EB]/30" />
            
            <View className="w-full items-center pt-3 pb-2">
               <View className="w-10 h-1 bg-zinc-800 rounded-full" />
            </View>

            <View className="px-6 pb-6 pt-2">
              <Text className="text-white text-2xl font-bold tracking-tight text-center">
                {t("profile.switchAccount") || "Cuentas"}
              </Text>
              <Text className="text-zinc-500 text-sm text-center mt-1">
                {t("profile.manageSubtitle") || "Administra tus perfiles de Mood"}
              </Text>
            </View>

            <FlatList
              data={accounts}
              keyExtractor={(item) => item.userId}
              renderItem={renderAccountItem}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View className="h-1" />}
            />

            <View className="px-6 pb-10 pt-4 bg-[#0f0f0f] border-t border-white/5">
              <TouchableOpacity
                onPress={handleAddAccount}
                activeOpacity={0.8}
                className="flex-row items-center justify-center gap-3 py-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 mb-3"
              >
                <Ionicons name="add-circle-outline" size={24} color="white" />
                <Text className="text-white font-semibold text-base">
                  {t("profile.addAccount") || "Añadir otra cuenta"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLogoutAll}
                activeOpacity={0.7}
                className="flex-row items-center justify-center gap-2 py-3"
              >
                <Text className="text-[#ff4444] font-medium text-sm opacity-80">
                  {t("profile.logoutAll") || "Cerrar sesión en todos los dispositivos"}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

export default AccountSelectorModal;