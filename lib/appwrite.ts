import { ImagePickerAsset } from "expo-image-picker";
import {
  Client,
  Account,
  Avatars,
  Databases,
  Query,
  AppwriteException,
  Storage,
  ID,
  Models,
} from "react-native-appwrite";

// Configuración
export const appwriteConfig = {
  endpoint: "https://cloud.appwrite.io/v1",
  platform: "com.gammes.mood",
  projectId: "6689e59b000acd6caf6f",
  databaseId: "6689e7cc002bf2740136",
  usersCollectionId: "6689e818000ae6ccbdec",
  postsCollectionId: "6689e9a5003e7426666e",
  storageId: "66a51c310032319c09d0",
};

// Inicialización de Servicios
const client = new Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

const account = new Account(client);
const avatars = new Avatars(client); // Renombrado de 'pfp' a 'avatars' para claridad
const databases = new Databases(client);
const storage = new Storage(client);

// --- Funciones de Autenticación ---

export const createUser = async (
  email: string,
  password: string,
  name: string,
  username: string
) => {
  try {
    const newAccount = await account.create(ID.unique(), email, password, name);

    if (!newAccount) throw new Error("Error creating account");

    // getInitials devuelve una URL, la convertimos a string
    const avatarUrl = avatars.getInitials(name).toString();

    // Iniciamos sesión automáticamente
    await signInn(email, password);

    // Guardamos los datos extra en la base de datos
    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(),
      {
        accId: newAccount.$id,
        email,
        name,
        pfp: avatarUrl,
        username,
      }
    );

    return newUser;
  } catch (err) {
    throw new Error((err as AppwriteException).message);
  }
};

export const signInn = async (email: string, password: string) => {
  try {
    // 1. Intento normal
    const session = await account.createEmailPasswordSession(email, password);
    return session;
  } catch (err) {
    const error = err as AppwriteException;

    // 2. Lógica de reintento si hay sesión activa
    if (
      error.message?.includes("session is active") ||
      error.message?.includes("prohibited") ||
      error.code === 409
    ) {
      console.log("⚠️ Sesión activa detectada. Limpiando...");

      try {
        await account.deleteSession("current");
        const session = await account.createEmailPasswordSession(
          email,
          password
        );
        return session;
      } catch (retryError) {
        throw new Error((retryError as AppwriteException).message);
      }
    }

    throw new Error(error.message);
  }
};

export const signOut = async () => {
  try {
    const session = await account.deleteSession("current");
    return session;
  } catch (error) {
    throw new Error((error as AppwriteException).message);
  }
};

// Add this to your lib/appwrite.ts
export const updateProfile = async (updates: {
  name?: string;
  username?: string;
}) => {
  try {
    const currentUser = await getCurrentUser(); // Get current session data
    if (!currentUser) throw new Error("User not found");

    const result = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      currentUser.$id, // Use the document ID to update
      updates
    );

    return result;
  } catch (err) {
    console.error("Error updating profile:", err);
    throw err;
  }
};

export const getCurrentUser = async () => {
  try {
    // Paso 1: Verificar si hay sesión de Auth
    const currentAccount = await account.get();
    console.log("✅ Sesión Auth activa:", currentAccount.$id);

    if (!currentAccount) throw new Error("No active session");

    // Paso 2: Buscar datos en la Base de Datos
    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal("accId", currentAccount.$id)]
    );

    if (!currentUser || currentUser.documents.length === 0) {
      console.log(
        "⚠️ ¡ALERTA! El usuario existe en Auth pero NO tiene documento en la Base de Datos."
      );
      return null;
    }

    console.log(
      "✅ Usuario encontrado en DB:",
      currentUser.documents[0].username
    );
    return currentUser.documents[0];
  } catch (error) {
    console.log("❌ Error en getCurrentUser:", error); // <-- Aquí verás el error real
    return null;
  }
};

// --- Funciones de Archivos / Imágenes ---

export const updateImage = async (asset: ImagePickerAsset) => {
  try {
    // 1. Subir la imagen al Storage
    const fileUrl = await uploadImageAsync(asset);
    if (!fileUrl) throw new Error("Image upload failed");

    // 2. Obtener usuario actual
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User not found");

    // 3. Actualizar el documento del usuario con la nueva URL
    const result = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      currentUser.$id,
      { pfp: fileUrl }
    );

    console.log("Image updated successfully:", result);
    return result;
  } catch (err) {
    console.error("Error in updateImage:", err);
    throw err;
  }
};

const uploadImageAsync = async (asset: ImagePickerAsset) => {
  try {
    const file = await prepareNativeFile(asset);

    const response = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      file
    );

    // getFileView devuelve una URL object, la convertimos a string
    const fileUrl = storage
      .getFileView(appwriteConfig.storageId, response.$id)
      .toString();

    return fileUrl;
  } catch (err) {
    console.error("Error uploading image:", err);
    throw err;
  }
};

// Función auxiliar para preparar el archivo para React Native
// Appwrite espera un objeto específico en RN, no un Blob estándar de web
const prepareNativeFile = async (asset: ImagePickerAsset) => {
  try {
    const uri = asset.uri;
    const name = asset.fileName || `image_${Date.now()}.jpg`;
    const type = asset.mimeType || "image/jpeg";
    const size = asset.fileSize || 0;

    return {
      name,
      type,
      size,
      uri,
    };
  } catch (err) {
    console.error("Error preparing file:", err);
    throw err;
  }
};
