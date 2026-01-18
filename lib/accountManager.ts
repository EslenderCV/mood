import * as SecureStore from "expo-secure-store";
import { account, authStore } from "./appwrite"; // 🔥 IMPORTANTE: Importamos authStore

const ACCOUNTS_STORAGE_KEY = "mood_stored_accounts";

export interface StoredAccount {
  userId: string;
  name: string;
  username: string;
  pfp: string;
  sessionSecret: string;
}

export const AccountManager = {
  /**
   * Guarda la cuenta actual.
   * Conecta con authStore para recuperar secretos durante la carga automática.
   */
  async saveCurrentAccount(passedSecret?: string) {
    try {
      const currentUser = await account.get();
      const accounts = await this.getStoredAccounts();

      const existingAccount = accounts.find(
        (acc) => acc.userId === currentUser.$id,
      );

      let secretToUse = passedSecret;

      // 1. Si no nos pasaron secreto, buscamos en el ALMACÉN GLOBAL (El Puente)
      // Esto arregla la condición de carrera al volver del navegador
      if (!secretToUse && authStore.secret) {
        console.log(
          "♻️ AccountManager: Recuperando secreto desde authStore global",
        );
        secretToUse = authStore.secret;
      }

      // 2. Si sigue vacío, intentamos métodos de respaldo
      if (!secretToUse) {
        try {
          // Intentar sacarlo de la sesión activa
          const session = await account.getSession("current");
          if (session.secret) secretToUse = session.secret;
        } catch (e) {}

        // Intentar preservar el que ya teníamos guardado
        if (!secretToUse && existingAccount?.sessionSecret) {
          console.log(
            "♻️ AccountManager: Preservando secreto existente para",
            currentUser.name,
          );
          secretToUse = existingAccount.sessionSecret;
        }
      }

      // 3. BLOQUEO DE SEGURIDAD
      // Si después de todo NO tenemos secreto, abortamos para no corromper datos.
      if (!secretToUse) {
        console.log(
          "⛔ AccountManager: Se intentó guardar sin secreto. Operación cancelada.",
        );
        return accounts;
      }

      const { getUser } = require("./appwrite");
      const userDoc = await getUser(currentUser.$id);

      const newAccount: StoredAccount = {
        userId: currentUser.$id,
        name: userDoc?.name || currentUser.name,
        username: userDoc?.username || "",
        pfp: userDoc?.pfp || "",
        sessionSecret: secretToUse,
      };

      const filteredAccounts = accounts.filter(
        (acc) => acc.userId !== newAccount.userId,
      );
      filteredAccounts.push(newAccount);

      await SecureStore.setItemAsync(
        ACCOUNTS_STORAGE_KEY,
        JSON.stringify(filteredAccounts),
      );

      console.log("✅ AccountManager: Cuenta guardada correctamente.");
      return filteredAccounts;
    } catch (error: any) {
      console.error("Error en AccountManager:", error.message);
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

  async switchAccount(userId: string) {
    try {
      const accounts = await this.getStoredAccounts();
      const target = accounts.find((acc) => acc.userId === userId);

      if (!target || !target.sessionSecret) {
        throw new Error("Re-login requerido");
      }

      await account.deleteSession("current").catch(() => {});
      await account.createSession(target.userId, target.sessionSecret);

      return true;
    } catch (error) {
      console.error("Error cambiando cuenta:", error);
      return false;
    }
  },

  async removeAccount(userId: string) {
    try {
      const accounts = await this.getStoredAccounts();
      const filtered = accounts.filter((acc) => acc.userId !== userId);
      await SecureStore.setItemAsync(
        ACCOUNTS_STORAGE_KEY,
        JSON.stringify(filtered),
      );
      return filtered;
    } catch (error) {
      return [];
    }
  },

  async logoutAll() {
    try {
      await account.deleteSessions().catch(() => {});
      await SecureStore.deleteItemAsync(ACCOUNTS_STORAGE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  },
};
