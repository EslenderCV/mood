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

export async function uploadFile(file: any, type?: "image" | "video") {
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

  try {
    const uploadedFile = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      asset,
    );

    const fileUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storageId}/files/${uploadedFile.$id}/view?project=${appwriteConfig.projectId}&mode=admin`;

    return fileUrl;
  } catch (error) {
    console.error("Error uploadFile:", error);
    throw new Error(String(error));
  }
}