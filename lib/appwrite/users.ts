import { Query, ID, AppwriteException } from "react-native-appwrite";
import { databases, appwriteConfig, account } from "./config";
import { uploadFile } from "./storage";
import { createNotification } from "./notifications";

export async function getUser(userId: string) {
  try {
    const user = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId
    );

    if (user.isBanned) {
      return null;
    }
    return user;
  } catch (error) {
    return null;
  }
}

export const syncOrCreateUserDocument = async () => {
  try {
    const currentAccount = await account.get();
    if (!currentAccount) throw new Error("No hay cuenta activa");

    const userContext = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal("accId", currentAccount.$id)]
    );

    if (userContext.documents.length > 0) {
      return userContext.documents[0];
    }

    const avatarUrl = `https://fra.cloud.appwrite.io/v1/avatars/initials?name=${encodeURIComponent(
      currentAccount.name
    )}&project=${appwriteConfig.projectId}`;

    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(),
      {
        accId: currentAccount.$id,
        email: currentAccount.email,
        name: currentAccount.name,
        pfp: avatarUrl,
        username:
          currentAccount.name.replace(/\s+/g, "").toLowerCase() +
          Math.floor(Math.random() * 1000),
        preferredPlatform: "spotify",
        allowTags: true,
        blockedUsers: [],
        isBanned: false,
        isPrivate: false,
      }
    );

    return newUser;
  } catch (error) {
    console.log("Error sincronizando usuario:", error);
    return null;
  }
};

export async function deleteUserAccount(userId: string) {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId
    );
    await account.deleteSession("current");
    return true;
  } catch (error: any) {
    console.error("Error deleting account:", error);
    throw new Error(error.message);
  }
}

export async function updateProfile(userId: string, form: any) {
  try {
    const hasFile = form.pfp && typeof form.pfp !== "string";
    let imageUrl = form.pfp;
    if (hasFile) imageUrl = await uploadFile(form.pfp);

    if (form.name) {
      try {
        await account.updateName(form.name);
      } catch (e) {}
    }

    const updates: any = {};
    if (form.name) updates.name = form.name;
    if (form.username) updates.username = form.username;
    if (form.email) updates.email = form.email;
    if (form.preferredPlatform)
      updates.preferredPlatform = form.preferredPlatform;
    if (imageUrl) updates.pfp = imageUrl;
    if (form.isPrivate !== undefined) updates.isPrivate = form.isPrivate;
    if (form.allowTags !== undefined) updates.allowTags = form.allowTags;

    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
      updates
    );
    return updatedUser;
  } catch (error) {
    throw new Error(String(error));
  }
}

export async function updatePrivacy(userId: string, isPrivate: boolean) {
  try {
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
      { isPrivate: isPrivate }
    );
    return updatedUser;
  } catch (error) {
    throw new Error("No se pudo actualizar la privacidad");
  }
}

export async function updateUserPassword(newPass: string, oldPass: string) {
  try {
    await account.updatePassword(newPass, oldPass);
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateImage(file: any) {
  return await uploadFile(file);
}

export async function saveSpotifyTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiration: string
) {
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
      {
        spotifyAccessToken: accessToken,
        spotifyRefreshToken: refreshToken,
        spotifyTokenExpiration: expiration,
        preferredPlatform: "spotify",
      }
    );
    return true;
  } catch (error: any) {
    console.error("Error guardando tokens:", error);
    throw new Error("No se pudo conectar con Spotify");
  }
}

export async function setPreferredPlatform(
  userId: string,
  platform: "spotify" | "apple" | "mood"
) {
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
      { preferredPlatform: platform }
    );
    return true;
  } catch (error) {
    throw new Error("No se pudo cambiar la preferencia");
  }
}

export const getLatestUsers = async () => {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [
        Query.orderDesc("$createdAt"),
        Query.limit(20),
        Query.notEqual("isBanned", true),
      ]
    );
    return result.documents;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error((error as AppwriteException).message);
  }
};

export async function checkFollowStatus(
  followerId: string,
  followingId: string
) {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [
        Query.equal("followerId", followerId),
        Query.equal("followedId", followingId),
      ]
    );

    if (response.documents.length > 0) {
      return response.documents[0].status;
    } else {
      return null;
    }
  } catch (error) {
    console.log("Error checkFollowStatus:", error);
    return null;
  }
}

export async function checkIsFollowing(followerId: string, followedId: string) {
  try {
    const status = await checkFollowStatus(followerId, followedId);
    return status === "accepted";
  } catch (error) {
    return false;
  }
}

export async function getFollowedUserIds(currentUserId: string) {
  try {
    const follows = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [
        Query.equal("followerId", currentUserId),
        Query.equal("status", "accepted"),
      ]
    );
    return follows.documents.map((doc) => doc.followedId);
  } catch (error) {
    console.log("Error fetching followed users", error);
    return [];
  }
}

export async function followUser(followerId: string, followedId: string) {
  try {
    const targetUser = await getUser(followedId);
    if (!targetUser) throw new Error("Usuario no disponible");

    const isPrivate = targetUser?.isPrivate || false;
    const status = isPrivate ? "pending" : "accepted";

    const result = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      ID.unique(),
      {
        followerId: followerId,
        followedId: followedId,
        status: status,
      }
    );

    try {
      const followerUser = await getUser(followerId);
      if (followerUser) {
        const notiType = isPrivate ? "follow_request" : "follow";
        const notiMsg = isPrivate ? "quiere seguirte" : "comenzó a seguirte";

        await createNotification({
          userId: followedId,
          type: notiType as any,
          message: notiMsg,
          senderId: followerId,
          senderName: followerUser.username || followerUser.name,
          senderAvatar: followerUser.pfp,
        });
      }
    } catch (e) {
      console.log("Error noti follow", e);
    }
    return result;
  } catch (error: any) {
    console.log("Error following user:", error);
    throw new Error(error.message);
  }
}

export async function unfollowUser(followerId: string, followedId: string) {
  try {
    const records = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [
        Query.equal("followerId", followerId),
        Query.equal("followedId", followedId),
      ]
    );
    if (records.documents.length > 0) {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.followsCollectionId,
        records.documents[0].$id
      );
      return true;
    }
    return false;
  } catch (error: any) {
    console.log("Error unfollowing user:", error);
    throw new Error(error.message);
  }
}

export async function getFollowCounts(userId: string) {
  try {
    const followers = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [Query.equal("followedId", userId), Query.equal("status", "accepted")]
    );
    const following = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [Query.equal("followerId", userId), Query.equal("status", "accepted")]
    );
    return { followersCount: followers.total, followingCount: following.total };
  } catch (error) {
    return { followersCount: 0, followingCount: 0 };
  }
}

export async function getUserFollowers(userId: string) {
  if (!userId) return [];
  try {
    const follows = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [Query.equal("followedId", userId), Query.equal("status", "accepted")]
    );
    if (follows.documents.length === 0) return [];

    const followersDetails = await Promise.all(
      follows.documents.map(async (doc) => {
        if (!doc.followerId) return null;
        return await getUser(doc.followerId);
      })
    );
    return followersDetails.filter((u) => u !== null);
  } catch (error) {
    return [];
  }
}

export async function getUserFollowing(userId: string) {
  if (!userId) return [];
  try {
    const follows = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [Query.equal("followerId", userId), Query.equal("status", "accepted")]
    );
    if (follows.documents.length === 0) return [];

    const followingDetails = await Promise.all(
      follows.documents.map(async (doc) => {
        if (!doc.followedId) return null;
        return await getUser(doc.followedId);
      })
    );
    return followingDetails.filter((u) => u !== null);
  } catch (error) {
    return [];
  }
}

export async function acceptFollowRequest(
  followerId: string,
  myUserId: string,
  notificationId: string
) {
  try {
    const records = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [
        Query.equal("followerId", followerId),
        Query.equal("followedId", myUserId),
        Query.equal("status", "pending"),
      ]
    );
    if (records.documents.length === 0) {
      try {
        await databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.notificationsCollectionId,
          notificationId
        );
      } catch (e) {}
      return true;
    }
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      records.documents[0].$id,
      { status: "accepted" }
    );
    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        notificationId
      );
    } catch (e) {}
    const followerUser = await getUser(followerId);
    if (followerUser) {
      await createNotification({
        userId: myUserId,
        type: "follow",
        message: "comenzó a seguirte",
        senderId: followerId,
        senderName: followerUser.username || followerUser.name,
        senderAvatar: followerUser.pfp,
      });
    }
    const myUser = await getUser(myUserId);
    if (myUser) {
      await createNotification({
        userId: followerId,
        type: "follow",
        message: "aceptó tu solicitud de seguimiento",
        senderId: myUserId,
        senderName: myUser.username || myUser.name,
        senderAvatar: myUser.pfp,
      });
    }
    return true;
  } catch (error) {
    throw error;
  }
}

export async function deleteFollowRequest(
  followerId: string,
  myUserId: string
) {
  try {
    const records = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [
        Query.equal("followerId", followerId),
        Query.equal("followedId", myUserId),
        Query.equal("status", "pending"),
      ]
    );
    if (records.documents.length > 0) {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.followsCollectionId,
        records.documents[0].$id
      );
    }
    return true;
  } catch (error) {
    throw new Error();
  }
}

export async function searchUsers(query: string) {
  try {
    const users = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [
        Query.or([
          Query.search("username", query),
          Query.search("name", query),
        ]),
        Query.limit(10),
        Query.notEqual("isBanned", true),
      ]
    );

    const filteredUsers = users.documents.filter((doc) => {
      return doc.allowTags !== false;
    });

    return filteredUsers;
  } catch (error) {
    console.log("Error en searchUsers:", error);
    return [];
  }
}

export async function blockUser(currentUserId: string, userToBlockId: string) {
  try {
    const currentUser = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      currentUserId
    );
    const currentBlocked = currentUser.blockedUsers || [];
    if (currentBlocked.includes(userToBlockId)) return;
    const updatedBlockedList = [...currentBlocked, userToBlockId];
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      currentUserId,
      { blockedUsers: updatedBlockedList }
    );
    await unfollowUser(currentUserId, userToBlockId);
    await unfollowUser(userToBlockId, currentUserId);
    return true;
  } catch (error) {
    throw new Error("Error al bloquear usuario");
  }
}

export async function unblockUser(
  currentUserId: string,
  userToUnblockId: string
) {
  try {
    const currentUser = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      currentUserId
    );
    const currentBlocked = currentUser.blockedUsers || [];
    const updatedBlockedList = currentBlocked.filter(
      (id: string) => id !== userToUnblockId
    );
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      currentUserId,
      { blockedUsers: updatedBlockedList }
    );
    return true;
  } catch (error) {
    throw new Error("Error al desbloquear usuario");
  }
}

export async function getBlockedUsersList(currentUserId: string) {
  try {
    const currentUser = await getUser(currentUserId);
    if (
      !currentUser ||
      !currentUser.blockedUsers ||
      currentUser.blockedUsers.length === 0
    ) {
      return [];
    }

    const blockedIds = currentUser.blockedUsers;
    const promises = blockedIds.map((id: string) => getUser(id));
    const users = await Promise.all(promises);

    return users.filter((u) => u !== null);
  } catch (error) {
    console.log("Error fetching blocked users:", error);
    return [];
  }
}