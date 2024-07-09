import {
  Client,
  Account,
  Avatars,
  Databases,
  Query,
} from "react-native-appwrite";
import { ID } from "react-native-appwrite";

export const appwriteConfig = {
  endpoint: "https://cloud.appwrite.io/v1",
  platform: "com.gammes.mood",
  projectId: "6689e59b000acd6caf6f",
  databaseId: "6689e7cc002bf2740136",
  usersCollectionId: "6689e818000ae6ccbdec",
  postsCollectionId: "6689e9a5003e7426666e",
};

const client = new Client();

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
    err;
    throw new Error();
  }
};

export const signInn = async (email: string, password: string) => {
  try {
    const session = await account.createEmailPasswordSession(email, password);

    return session;
  } catch (err) {
    console.log(err);
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
