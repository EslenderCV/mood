import * as SecureStore from "expo-secure-store";
import { account } from "./appwrite";

const ACCOUNTS_STORAGE_KEY = "mood_stored_accounts";

export interface StoredAccount {
  userId: string;
  name: string;
  username: string;
  pfp: string;
  sessionSecret: string;
}

export const AccountManager = {
  async getStoredAccounts(): Promise<StoredAccount[]> {
    try {
      const data = await SecureStore.getItemAsync(ACCOUNTS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  /**
   * 🔥 Actualizado: Ahora recibe el secret directamente del login
   */
  async saveCurrentAccount(passedSecret?: string) {
    try {
      const currentUser = await account.get();
      let secret = passedSecret;

      // Si no se pasó el secreto, intentamos obtenerlo (puede fallar en algunos SDKs)
      if (!secret) {
        const session = await account.getSession("current");
        secret = session.secret;
      }

      if (!secret) throw new Error("No se pudo obtener el secreto de sesión");

      const { getUser } = require("./appwrite");
      const userDoc = await getUser(currentUser.$id);

      const accounts = await this.getStoredAccounts();

      const newAccount: StoredAccount = {
        userId: currentUser.$id,
        name: userDoc?.name || currentUser.name,
        username: userDoc?.username || "",
        pfp: userDoc?.pfp || "",
        sessionSecret: secret,
      };

      const filteredAccounts = accounts.filter(
        (acc) => acc.userId !== newAccount.userId,
      );
      const updatedAccounts = [...filteredAccounts, newAccount];

      await SecureStore.setItemAsync(
        ACCOUNTS_STORAGE_KEY,
        JSON.stringify(updatedAccounts),
      );
      return updatedAccounts;
    } catch (error) {
      console.error("Error al guardar cuenta:", error);
      return [];
    }
  },

  async switchAccount(userId: string) {
    try {
      const accounts = await this.getStoredAccounts();
      const target = accounts.find((acc) => acc.userId === userId);

      if (!target || !target.sessionSecret)
        throw new Error("Datos de sesión inválidos");

      await account.deleteSession("current").catch(() => {});
      await account.createSession(target.userId, target.sessionSecret);

      return true;
    } catch (error) {
      console.error("Error al cambiar de cuenta:", error);
      return false;
    }
  },

  async logoutAll() {
    try {
      await account.deleteSessions().catch(() => {});
      await SecureStore.deleteItemAsync(ACCOUNTS_STORAGE_KEY);
      return true;
    } catch (error) {
      return false;
    }
  },
};
