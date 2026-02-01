import React, { useEffect, useState, useMemo } from "react";
import { Text, TouchableOpacity } from "react-native";
import { useColorScheme } from "nativewind";
import { databases, appwriteConfig } from "@/lib/appwrite";
import { useLanguage } from "@/context/LanguageContext";
import { StackedAvatars } from "./StackedAvatars";
import { Query } from "react-native-appwrite";

interface SocialContextProps {
  likedBy: any[];
  currentUserId: string;
  onPress: () => void;
}

export const SocialContext: React.FC<SocialContextProps> = ({
  likedBy,
  currentUserId,
  onPress,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "#FFFFFF" : "#09090B";
  const subTextColor = isDark ? "#A1A1AA" : "#71717A";
  const { t } = useLanguage();

  const [users, setUsers] = useState<any[]>([]);

  // 1. Filtramos: Sacamos mi propio ID y tomamos los primeros 3 IDs ajenos
  const targetIds = useMemo(() => {
    if (!Array.isArray(likedBy) || likedBy.length === 0) return [];

    return likedBy
      .map((u) => (typeof u === "object" ? u.$id : u)) // Aseguramos que sea string ID
      .filter((id) => id && id !== currentUserId)
      .slice(0, 3);
  }, [likedBy, currentUserId]);

  useEffect(() => {
    let isMounted = true;

    const fetchUsersBatch = async () => {
      if (targetIds.length === 0) return;

      // Si ya tenemos los objetos completos (porque el feed los trajo), no hacemos fetch
      const alreadyPopulated = likedBy.filter(
        (u) => typeof u === "object" && targetIds.includes(u.$id),
      );
      if (alreadyPopulated.length >= targetIds.length) {
        if (isMounted) setUsers(alreadyPopulated);
        return;
      }

      // Si faltan datos, hacemos UNA sola petición para traerlos todos juntos
      try {
        const response = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.usersCollectionId,
          [Query.equal("$id", targetIds)],
        );
        if (isMounted) {
          setUsers(response.documents);
        }
      } catch (e) {
        console.log("Error loading social context", e);
      }
    };

    fetchUsersBatch();
    return () => {
      isMounted = false;
    };
  }, [targetIds]);

  // Si no hay likes (o solo estoy yo), no mostramos nada aquí
  const countExcludingMe = Math.max(
    0,
    likedBy.length - (likedBy.includes(currentUserId) ? 1 : 0),
  );
  if (countExcludingMe === 0) return null;

  // Esperamos a tener al menos un usuario cargado para mostrar nombre
  if (users.length === 0) {
    // Opcional: Podrías mostrar "2 likes" genérico mientras carga,
    // pero mejor retornamos null para evitar saltos visuales feos.
    return null;
  }

  const firstUser = users[0];
  const othersCount = Math.max(0, countExcludingMe - 1);
  const avatarList = users.map((u) => u.avatar || u.pfp);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className="w-full flex-row items-center mt-3" // mt-3 para separar un poco más
    >
      <StackedAvatars avatars={avatarList} limit={3} size={20} />

      <Text
        style={{ color: subTextColor, fontSize: 13, flex: 1 }}
        numberOfLines={1}
      >
        <Text style={{ fontWeight: "600", color: textColor }}>
          {firstUser.username || firstUser.name}
        </Text>
        {othersCount > 0 && (
          <Text>
            {" "}
            {t("common.and") || "and"}{" "}
            <Text style={{ fontWeight: "600", color: textColor }}>
              {othersCount} {t("common.others") || "others"}
            </Text>
          </Text>
        )}{" "}
        {t("feed.likedThis") || "liked this"}
      </Text>
    </TouchableOpacity>
  );
};
