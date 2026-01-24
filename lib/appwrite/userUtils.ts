import { databases, appwriteConfig } from "./config";

// ✅ Función extraída para romper el ciclo de dependencias
export async function getUser(userId: string) {
  try {
    const user = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
    );
    if (user.isBanned) return null;
    return user;
  } catch (error) {
    return null;
  }
}
