import * as SecureStore from "expo-secure-store";
import { appwriteConfig, getCurrentUser } from "./appwrite";

const ACCOUNTS_STORAGE_KEY = "mood_stored_accounts";

export interface StoredAccount {
  userId: string; // Document ID
  name: string;
  username: string;
  email: string;
  pfp: string;
}

export const AccountManager = {
  /**
   * Guarda la cuenta actual usando el Documento de Usuario real.
   */
  async saveCurrentAccount() {
    try {
      // 1. Obtener documento real del usuario
      const userDoc = await getCurrentUser();
      
      if (!userDoc) {
        return [];
      }

      // 2. Preparar datos
      let username = userDoc.username || "";
      let pfp = userDoc.pfp;

      // 3. Fallback CRÍTICO: Si no hay foto, generamos iniciales
      if (!pfp || pfp.trim() === "") {
        pfp = `https://cloud.appwrite.io/v1/avatars/initials?name=${encodeURIComponent(userDoc.name)}&project=${appwriteConfig.projectId}`;
      }

      const newAccount: StoredAccount = {
        userId: userDoc.$id,
        name: userDoc.name,
        email: userDoc.email, 
        username: username,
        pfp: pfp, // Aquí pfp ya es una URL válida (foto real o iniciales)
      };

      // 4. Actualizar almacenamiento
      const accounts = await this.getStoredAccounts();
      const filteredAccounts = accounts.filter(
        (acc) => acc.email !== newAccount.email // Usamos email como clave única para evitar duplicados por ID
      );
      filteredAccounts.push(newAccount);

      await SecureStore.setItemAsync(
        ACCOUNTS_STORAGE_KEY,
        JSON.stringify(filteredAccounts)
      );

      console.log("✅ AccountManager: Cuenta guardada:", newAccount.name);
      return filteredAccounts;
    } catch (error) {
      console.log("⚠️ Error guardando cuenta:", error);
      return [];
    }
  },

  async getStoredAccounts(): Promise<StoredAccount[]> {
    try {
      const data = await SecureStore.getItemAsync(ACCOUNTS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async updateAccountsList(accounts: StoredAccount[]) {
    try {
      await SecureStore.setItemAsync(
        ACCOUNTS_STORAGE_KEY,
        JSON.stringify(accounts)
      );
    } catch (error) {
      console.log("Error actualizando lista:", error);
    }
  },

  async removeAccount(userId: string) {
    try {
      const accounts = await this.getStoredAccounts();
      const filtered = accounts.filter((acc) => acc.userId !== userId);
      await SecureStore.setItemAsync(ACCOUNTS_STORAGE_KEY, JSON.stringify(filtered));
      return filtered;
    } catch (error) {
      return [];
    }
  },

  async logoutAll() {
    try {
      // Import dinámico para evitar ciclos si es necesario, o import directo
      const { account } = require("./appwrite");
      await SecureStore.deleteItemAsync(ACCOUNTS_STORAGE_KEY);
      await account.deleteSessions().catch(() => {});
      return true;
    } catch (e) {
      return false;
    }
  }
};