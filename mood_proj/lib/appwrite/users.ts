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

    const avatarUrl = `https://nyc.cloud.appwrite.io/v1/avatars/initials?name=${encodeURIComponent(currentAccount.name)}&project=${appwriteConfig.projectId}`;

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
// --- Account deletion (Apple / Play compliance) ------------------------------

const _DELETE_LIMIT = 100;

// Paginación segura: cursorAfter existe en Appwrite, pero lo dejamos defensivo.
const _cursorAfter = (Query as any).cursorAfter as
  | ((docId: string) => string)
  | undefined;

async function _listAllDocuments(
  collectionId: string,
  baseQueries: string[],
): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | undefined;

  while (true) {
    const queries = [...baseQueries, Query.limit(_DELETE_LIMIT)];

    if (cursor && _cursorAfter) {
      queries.push(_cursorAfter(cursor));
    }

    const res = await databases.listDocuments(
      appwriteConfig.databaseId,
      collectionId,
      queries,
    );

    const docs = res?.documents || [];
    if (docs.length === 0) break;

    out.push(...docs);

    if (!_cursorAfter || docs.length < _DELETE_LIMIT) break;
    cursor = docs[docs.length - 1].$id;
  }

  return out;
}

async function _deleteDocuments(
  collectionId: string,
  docIds: string[],
): Promise<void> {
  for (const id of docIds) {
    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        collectionId,
        id,
      );
    } catch (e) {
      // best-effort: seguimos para no dejar al usuario “atrapado”
    }
  }
}

async function _deleteByQuery(
  collectionId: string,
  baseQueries: string[],
): Promise<void> {
  try {
    const docs = await _listAllDocuments(collectionId, baseQueries);
    if (docs.length === 0) return;
    await _deleteDocuments(
      collectionId,
      docs.map((d: any) => d.$id),
    );
  } catch {
    // best-effort
  }
}

/**
 * Eliminación premium / compliance:
 * - Borra datos del usuario en nuestras colecciones (posts, comments, stories, follows, chats, playlists, notifications, user doc).
 * - Luego intenta borrar la cuenta auth (si el SDK lo soporta), si no, cierra la sesión.
 *
 * Nota: es best-effort por permisos/reglas de seguridad. Siempre intenta dejar al usuario deslogueado.
 */
export async function deleteUserAccountAndData(userId: string) {
  try {
    // 1) Playlists
    await _deleteByQuery(appwriteConfig.playlistsCollectionId, [
      Query.equal("ownerId", userId),
    ]);

    // 2) Stories
    await _deleteByQuery(appwriteConfig.storiesCollectionId, [
      Query.equal("user", userId),
    ]);

    // 3) Chats + Messages
    try {
      const chats = await _listAllDocuments(appwriteConfig.chatsCollectionId, [
        Query.equal("participants", userId),
      ]);

      for (const chat of chats) {
        // Messages del chat
        await _deleteByQuery(appwriteConfig.messagesCollectionId, [
          Query.equal("chatId", chat.$id),
        ]);

        // Chat doc
        try {
          await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.chatsCollectionId,
            chat.$id,
          );
        } catch {}
      }
    } catch {}

    // 4) Posts del usuario + comentarios de esos posts (de cualquier usuario)
    try {
      const posts = await _listAllDocuments(appwriteConfig.postsCollectionId, [
        Query.equal("postedBy", userId),
      ]);

      const postIds = posts.map((p: any) => p.$id);

      // Borrar comentarios por postId (en batches, porque Query.equal acepta array)
      const batchSize = 50;
      for (let i = 0; i < postIds.length; i += batchSize) {
        const batch = postIds.slice(i, i + batchSize);
        await _deleteByQuery(appwriteConfig.commentsCollectionId, [
          Query.equal("postId", batch),
        ]);
      }

      // Borrar posts
      await _deleteDocuments(appwriteConfig.postsCollectionId, postIds);
    } catch {}

    // 5) Comentarios del usuario en posts de otros
    await _deleteByQuery(appwriteConfig.commentsCollectionId, [
      Query.equal("userId", userId),
    ]);

    // 6) Follow relations
    await _deleteByQuery(appwriteConfig.followsCollectionId, [
      Query.equal("followerId", userId),
    ]);
    await _deleteByQuery(appwriteConfig.followsCollectionId, [
      Query.equal("followedId", userId),
    ]);

    // 7) Notifications (como receptor o emisor)
    await _deleteByQuery(appwriteConfig.notificationsCollectionId, [
      Query.equal("userId", userId),
    ]);
    await _deleteByQuery(appwriteConfig.notificationsCollectionId, [
      Query.equal("senderId", userId),
    ]);

    // 8) User document (nuestro perfil en DB)
    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        userId,
      );
    } catch {}

    // 9) Auth account (si existe en el SDK), si no, cerrar sesión
    try {
      const accAny: any = account as any;
      if (typeof accAny.delete === "function") {
        await accAny.delete();
      } else {
        await account.deleteSession("current");
      }
    } catch {
      try {
        await account.deleteSession("current");
      } catch {}
    }

    return true;
  } catch (error: any) {
    throw new Error(error?.message || "delete account failed");
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


// Store preferred language on the user document (used to localize push notifications per recipient).
export async function updateUserLanguage(userId: string, language: string) {
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      userId,
      { language },
    );
    return true;
  } catch {
    // If the attribute does not exist yet in Appwrite, we silently ignore.
    return false;
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
    if (!target) throw new Error("User not found");
    const status = target.isPrivate ? "pending" : "accepted";

    const res = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      ID.unique(),
      { followerId, followedId, status },
    );

    const follower = await getUser(followerId);
    if (follower) {
      const type = target.isPrivate ? "follow_request" : "follow";      await createNotification({
        userId: followedId,
        type: type as any,
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