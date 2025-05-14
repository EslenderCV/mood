import { ImagePickerAsset } from "expo-image-picker";
import {
  Client,
  Account,
  Avatars,
  Databases,
  Query,
  AppwriteException,
  Storage
} from "react-native-appwrite";
import { ID } from "react-native-appwrite";

export const appwriteConfig = {
  endpoint: "https://cloud.appwrite.io/v1",
  platform: "com.gammes.mood",
  projectId: "6689e59b000acd6caf6f",
  databaseId: "6689e7cc002bf2740136",
  usersCollectionId: "6689e818000ae6ccbdec",
  postsCollectionId: "6689e9a5003e7426666e",
  storageId: "66a51c310032319c09d0",
};

const client = new Client();
const storage = new Storage(client);

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

const account = new Account(client);
const pfp = new Avatars(client);
const databases = new Databases(client);

export const createUser = async (
  email: string,
  password: string,
  name: string,
  username: string
) => {
  try {
    const newAccount = await account.create(ID.unique(), email, password, name);

    if (!newAccount) throw Error;
    const pfpUrl = pfp.getInitials(name);

    await signInn(email, password);

    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(),
      {
        accId: newAccount.$id,
        email,
        name,
        pfp: pfpUrl,
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
    const session = await account.createEmailPasswordSession(email, password);

    return session;
  } catch (err) {
    throw new Error((err as AppwriteException).message);
  }
};

export const getCurrentUser = async () => {
  try {
    const currectAccount = await account.get();

    if (!currectAccount) throw Error;

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal("accId", currectAccount.$id)]
    );
    if (!currentUser) throw Error;

    return currentUser.documents[0];
  } catch (error) {
    error;
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
export const updateImage = async (asset: ImagePickerAsset) => {
  const fileUrl = await uploadImageAsync(asset)
  
  try {
    const currentAccount = await getCurrentUser();

    if(!currentAccount) return

    const result = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      currentAccount?.$id,
      { pfp: fileUrl},
    );

    console.log(result) 
  } catch(err) {
    console.log(err)
  }
  
}

const uploadImageAsync = async (asset: ImagePickerAsset) => {
  try {
    const response = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      await prepareNativeFile(asset)
    )

    const fileUrl = storage.getFileView(
      appwriteConfig.storageId,
      response.$id
    )

    console.log(fileUrl)

    return fileUrl
  } catch (err) {
    console.error(err)
    return Promise.reject(err)
  }
}

const prepareNativeFile = async (
  asset: ImagePickerAsset
): Promise<{ name: string; type: string; size: number; uri: string }> => {
  try {
    const url = new URL(asset.uri)

    return {
      name: url.pathname.split("/").pop()!,
      type: asset.mimeType!,
      size: asset.fileSize!,
      uri: url.href
    } as any;
  } catch (err) {
    console.error(err)
    return Promise.reject(err)
  }
}