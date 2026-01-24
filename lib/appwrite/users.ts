import { Query, ID, AppwriteException } from "react-native-appwrite";
import { databases, appwriteConfig, account } from "./config";
import { uploadFile } from "./storage";
import { createNotification } from "./notifications";
// ✅ IMPORTAR desde utils
import { getUser } from "./userUtils";

// ✅ RE-EXPORTAR para compatibilidad
export { getUser } from "./userUtils";

// Sincronizar usuario
export const syncOrCreateUserDocument = async () => {
  try {
    const currentAccount = await account.get();
    if (!currentAccount) throw new Error("No hay cuenta activa");

    const userContext = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal("accId", currentAccount.$id)],
    );

    if (userContext.documents.length > 0) return userContext.documents[0];

    const avatarUrl = `https://fra.cloud.appwrite.io/v1/avatars/initials?name=${encodeURIComponent(currentAccount.name)}&project=${appwriteConfig.projectId}`;

    return await databases.createDocument(
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
        notificationsEnabled: true,
        blockedUsers: [],
        isBanned: false,
        isPrivate: false,
        isOnline: true, // 🔥 Default online al crear
        lastSeen: new Date().toISOString(),
      },
    );
  } catch (error) {
    console.log("Error sync:", error);
    return null;
  }
};

export async function deleteUserAccount(userId: string) {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
    );
    await account.deleteSession("current");
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateProfile(userId: string, form: any) {
  try {
    let imageUrl = form.pfp;
    if (form.pfp && typeof form.pfp !== "string")
      imageUrl = await uploadFile(form.pfp);
    if (form.name) await account.updateName(form.name).catch(() => {});

    const updates: any = {};
    if (form.name) updates.name = form.name;
    if (form.username) updates.username = form.username;
    if (form.email) updates.email = form.email;
    if (form.preferredPlatform)
      updates.preferredPlatform = form.preferredPlatform;
    if (imageUrl) updates.pfp = imageUrl;
    if (form.isPrivate !== undefined) updates.isPrivate = form.isPrivate;
    if (form.allowTags !== undefined) updates.allowTags = form.allowTags;

    if (form.notificationsEnabled !== undefined)
      updates.notificationsEnabled = form.notificationsEnabled;

    return await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
      updates,
    );
  } catch (error) {
    throw new Error(String(error));
  }
}

export async function updatePrivacy(userId: string, isPrivate: boolean) {
  try {
    return await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
      { isPrivate },
    );
  } catch {
    throw new Error("Error privacy");
  }
}

export async function updateUserPassword(newPass: string, oldPass: string) {
  await account.updatePassword(newPass, oldPass);
  return true;
}

export async function updateImage(file: any) {
  return await uploadFile(file);
}

export async function saveSpotifyTokens(
  userId: string,
  at: string,
  rt: string,
  exp: string,
) {
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
      {
        spotifyAccessToken: at,
        spotifyRefreshToken: rt,
        spotifyTokenExpiration: exp,
        preferredPlatform: "spotify",
      },
    );
    return true;
  } catch {
    throw new Error("Error spotify tokens");
  }
}

export async function setPreferredPlatform(userId: string, platform: string) {
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
      { preferredPlatform: platform },
    );
    return true;
  } catch {
    throw new Error("Error platform");
  }
}

export const getLatestUsers = async () => {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.orderDesc("$createdAt"), Query.limit(20)],
    );
    return result.documents;
  } catch {
    return [];
  }
};

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
      ],
    );
    return users.documents.filter((doc) => doc.allowTags !== false);
  } catch (error) {
    console.log("Error searchUsers:", error);
    return [];
  }
}

// --- FOLLOWS ---
export async function checkFollowStatus(
  followerId: string,
  followingId: string,
) {
  try {
    const res = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [
        Query.equal("followerId", followerId),
        Query.equal("followedId", followingId),
      ],
    );
    return res.documents.length > 0 ? res.documents[0].status : null;
  } catch {
    return null;
  }
}

export async function checkIsFollowing(followerId: string, followedId: string) {
  const status = await checkFollowStatus(followerId, followedId);
  return status === "accepted";
}

export async function getFollowedUserIds(currentUserId: string) {
  try {
    const res = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [
        Query.equal("followerId", currentUserId),
        Query.equal("status", "accepted"),
      ],
    );
    return res.documents.map((d) => d.followedId);
  } catch {
    return [];
  }
}

export async function followUser(followerId: string, followedId: string) {
  try {
    const target = await getUser(followedId);
    if (!target) throw new Error("Usuario no existe");
    const status = target.isPrivate ? "pending" : "accepted";

    const res = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      ID.unique(),
      { followerId, followedId, status },
    );

    const follower = await getUser(followerId);
    if (follower) {
      const type = target.isPrivate ? "follow_request" : "follow";
      const msg = target.isPrivate ? "quiere seguirte" : "comenzó a seguirte";
      await createNotification({
        userId: followedId,
        type: type as any,
        message: msg,
        senderId: followerId,
        senderName: follower.username || follower.name,
        senderAvatar: follower.pfp,
      });
    }
    return res;
  } catch (e: any) {
    throw new Error(e.message);
  }
}

export async function unfollowUser(followerId: string, followedId: string) {
  try {
    const res = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [
        Query.equal("followerId", followerId),
        Query.equal("followedId", followedId),
      ],
    );
    if (res.documents.length > 0) {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.followsCollectionId,
        res.documents[0].$id,
      );
      return true;
    }
    return false;
  } catch (e: any) {
    throw new Error(e.message);
  }
}

export async function getFollowCounts(userId: string) {
  try {
    const f1 = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [Query.equal("followedId", userId), Query.equal("status", "accepted")],
    );
    const f2 = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [Query.equal("followerId", userId), Query.equal("status", "accepted")],
    );
    return { followersCount: f1.total, followingCount: f2.total };
  } catch {
    return { followersCount: 0, followingCount: 0 };
  }
}

export async function getUserFollowers(userId: string) {
  try {
    const res = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [Query.equal("followedId", userId), Query.equal("status", "accepted")],
    );
    const users = await Promise.all(
      res.documents.map((d) => getUser(d.followerId)),
    );
    return users.filter((u: any) => u !== null);
  } catch {
    return [];
  }
}

export async function getUserFollowing(userId: string) {
  try {
    const res = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [Query.equal("followerId", userId), Query.equal("status", "accepted")],
    );
    const users = await Promise.all(
      res.documents.map((d) => getUser(d.followedId)),
    );
    return users.filter((u: any) => u !== null);
  } catch {
    return [];
  }
}

export async function acceptFollowRequest(
  followerId: string,
  myUserId: string,
  notiId: string,
) {
  try {
    const res = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [
        Query.equal("followerId", followerId),
        Query.equal("followedId", myUserId),
        Query.equal("status", "pending"),
      ],
    );
    if (res.documents.length === 0) {
      try {
        await databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.notificationsCollectionId,
          notiId,
        );
      } catch {}
      return true;
    }
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      res.documents[0].$id,
      { status: "accepted" },
    );
    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        notiId,
      );
    } catch {}

    const follower = await getUser(followerId);
    if (follower) {
      await createNotification({
        userId: myUserId,
        type: "follow",
        message: "comenzó a seguirte",
        senderId: followerId,
        senderName: follower.username || follower.name,
        senderAvatar: follower.pfp,
      });
    }
    const me = await getUser(myUserId);
    if (me) {
      await createNotification({
        userId: followerId,
        type: "follow",
        message: "aceptó tu solicitud",
        senderId: myUserId,
        senderName: me.username || me.name,
        senderAvatar: me.pfp,
      });
    }
    return true;
  } catch {
    throw new Error("Error accept");
  }
}

export async function deleteFollowRequest(
  followerId: string,
  myUserId: string,
) {
  try {
    const res = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [
        Query.equal("followerId", followerId),
        Query.equal("followedId", myUserId),
        Query.equal("status", "pending"),
      ],
    );
    if (res.documents.length > 0) {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.followsCollectionId,
        res.documents[0].$id,
      );
    }
    return true;
  } catch {
    throw new Error("Error delete request");
  }
}

export async function blockUser(currentUserId: string, userToBlockId: string) {
  try {
    const user = await getUser(currentUserId);
    if (!user) throw new Error("User not found");

    const blocked = user.blockedUsers || [];
    if (!blocked.includes(userToBlockId)) {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        currentUserId,
        {
          blockedUsers: [...blocked, userToBlockId],
        },
      );
      await unfollowUser(currentUserId, userToBlockId);
      await unfollowUser(userToBlockId, currentUserId);
    }
    return true;
  } catch {
    throw new Error("Error blocking");
  }
}

export async function unblockUser(
  currentUserId: string,
  userToUnblockId: string,
) {
  try {
    const user = await getUser(currentUserId);
    if (!user) throw new Error("User not found");

    const blocked = user.blockedUsers || [];
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      currentUserId,
      {
        blockedUsers: blocked.filter((id: string) => id !== userToUnblockId),
      },
    );
    return true;
  } catch {
    throw new Error("Error unblocking");
  }
}

export async function getBlockedUsersList(currentUserId: string) {
  try {
    const user = await getUser(currentUserId);
    if (!user || !user.blockedUsers) return [];
    const users = await Promise.all(
      user.blockedUsers.map((id: string) => getUser(id)),
    );
    return users.filter((u: any) => u !== null);
  } catch {
    return [];
  }
}

// 🔥🔥 NUEVA FUNCIÓN PARA ACTUALIZAR PRESENCIA (Online/Offline) 🔥🔥
export async function updateUserPresence(userId: string, isOnline: boolean) {
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
      {
        isOnline: isOnline,
        lastSeen: new Date().toISOString(),
      },
    );
  } catch (e) {
    // Si falla silenciosamente no importa, no rompemos la app
    // console.log("Presence Error:", e);
  }
}
