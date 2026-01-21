import { ID } from "react-native-appwrite";
import * as ImagePicker from "expo-image-picker";
import { storage, appwriteConfig } from "./config";

export const pickMedia = async (type: "image" | "video") => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        type === "video"
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // Importante false para historias
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

// 🔥 FIX: Acepta bucketId y elimina mode=admin
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

  // Usar el bucket específico si se pasa, sino el default
  const targetBucket = bucketId || appwriteConfig.storageId;

  try {
    const uploadedFile = await storage.createFile(
      targetBucket,
      ID.unique(),
      asset,
    );

    // 🔥 CRÍTICO: Eliminado "&mode=admin" para que sea público/legible por el usuario
    const fileUrl = `${appwriteConfig.endpoint}/storage/buckets/${targetBucket}/files/${uploadedFile.$id}/view?project=${appwriteConfig.projectId}`;

    return fileUrl;
  } catch (error) {
    console.error("Error uploadFile:", error);
    throw new Error(String(error));
  }
}
