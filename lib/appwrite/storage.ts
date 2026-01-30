import { ID } from "react-native-appwrite";
import * as ImagePicker from "expo-image-picker";
// 🔥 FIX: Usamos la API legacy para evitar el error de deprecación en Expo 52+
import * as FileSystem from "expo-file-system/legacy";
import { storage, appwriteConfig, databases } from "./config";

export const pickMedia = async (type: "image" | "video") => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        type === "video"
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      return result.assets[0];
    }
    return null;
  } catch (error) {
    console.log("Error seleccionando media:", error);
    return null;
  }
};

export async function uploadFile(
  file: any,
  type?: "image" | "video",
  bucketId?: string,
) {
  if (!file) return;

  const fileName =
    file.fileName ||
    (type === "video" ? `video_${Date.now()}.mp4` : `image_${Date.now()}.jpg`);
  const mimeType =
    file.mimeType || (type === "video" ? "video/mp4" : "image/jpeg");

  const asset = {
    name: fileName,
    type: mimeType,
    size: file.fileSize || 0,
    uri: file.uri,
  };

  const targetBucket = bucketId || appwriteConfig.storageId;

  try {
    const uploadedFile = await storage.createFile(
      targetBucket,
      ID.unique(),
      asset,
    );

    const fileUrl = `${appwriteConfig.endpoint}/storage/buckets/${targetBucket}/files/${uploadedFile.$id}/view?project=${appwriteConfig.projectId}`;

    return fileUrl;
  } catch (error) {
    console.error("Error uploadFile:", error);
    throw new Error(String(error));
  }
}

// 🔥 FIX: Subida robusta para iOS con corrección de tamaño y MIME
export async function uploadVoiceNote(uri: string) {
  try {
    // Usamos el FileSystem legacy corregido
    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists) {
      throw new Error("El archivo de audio no existe");
    }

    const asset = {
      name: `voice_vibe_${Date.now()}.m4a`,
      // audio/mp4 es el estándar que AVPlayer de iOS prefiere para contenedores m4a
      type: "audio/mp4",
      uri: uri,
      size: fileInfo.size,
    };

    const BUCKET_ID = "697bd3c5002810325c4a";

    const file = await storage.createFile(BUCKET_ID, ID.unique(), asset);

    // Usamos /download para asegurar que recibimos el archivo completo
    const fileUrl = `${appwriteConfig.endpoint}/storage/buckets/${BUCKET_ID}/files/${file.$id}/download?project=${appwriteConfig.projectId}`;

    return fileUrl;
  } catch (error) {
    console.error("Error uploading voice vibe:", error);
    throw error;
  }
}

export async function deleteComment(commentId: string) {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      commentId,
    );
    return true;
  } catch (error) {
    console.log("Error deleting comment:", error);
    throw new Error(String(error));
  }
}
