import { useCallback, useEffect } from "react";

import { Query } from "react-native-appwrite";

import { appwriteConfig, databases, getFollowedUserIds, getStories, getUser } from "@/lib/appwrite";
import { MoodSessionManager } from "@/src/brain/session/MoodSessionManager";

const MOOD_OFFICIAL_ID = "696b571b00112fd5c1e9";

export const useHomeAuxData = ({
  userId,
  user,
  myFollowedIds,
  setMyFollowedIds,
  setLocalData,
  setSmartSuggestions,
  fetchCounts,
  lastFetchTimeRef,
  isMounted,
}: {
  userId: string | undefined;
  user: any;
  myFollowedIds: string[];
  setMyFollowedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setLocalData: React.Dispatch<React.SetStateAction<any>>;
  setSmartSuggestions: React.Dispatch<React.SetStateAction<any[]>>;
  fetchCounts: (uId: string) => Promise<void>;
  lastFetchTimeRef: React.MutableRefObject<number>;
  isMounted: React.MutableRefObject<boolean>;
}) => {
  const fetchStoriesInternal = useCallback(
    async (uId: string) => {
      try {
        const blocked = new Set<string>(user?.blockedUsers || []);
        const storiesDocs = await getStories(uId);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentStories = storiesDocs.filter((doc: any) => new Date(doc.$createdAt) > oneDayAgo);

        const uniqueUserIds = new Set<string>();
        const userMap = new Map<string, any>();
        if (user) userMap.set(uId, { ...user });

        recentStories.forEach((doc: any) => {
          if (!doc.user) return;
          const storyUserId = typeof doc.user === "object" ? doc.user.$id : doc.user;
          if (storyUserId && blocked.has(storyUserId)) return;

          if (typeof doc.user === "object" && doc.user.$id) userMap.set(doc.user.$id, doc.user);
          else if (typeof doc.user === "string" && doc.user !== uId) uniqueUserIds.add(doc.user);
        });

        const idsToFetch = Array.from(uniqueUserIds).filter((id) => !userMap.has(id) && !blocked.has(id));
        if (idsToFetch.length > 0) {
          await Promise.all(
            idsToFetch.map(async (id) => {
              try {
                const u = await getUser(id);
                if (u) userMap.set(id, u);
              } catch {
                // ignore
              }
            }),
          );
        }

        const groups: Record<string, any> = {};
        recentStories.forEach((doc: any) => {
          const storyUserId = typeof doc.user === "object" ? doc.user.$id : doc.user;
          if (blocked.has(storyUserId)) return;
          const userData =
            userMap.get(storyUserId) ||
            (typeof doc.user === "object"
              ? doc.user
              : { $id: storyUserId, username: "Usuario", name: "Usuario" });

          if (!groups[storyUserId]) groups[storyUserId] = { userId: storyUserId, user: userData, stories: [] };
          groups[storyUserId].stories.push(doc);
        });

        return Object.values(groups);
      } catch {
        return [];
      }
    },
    [user],
  );

  const fetchAuxiliaryData = useCallback(
    async (force = false) => {
      if (!userId) return;

      const now = Date.now();
      if (!force && now - lastFetchTimeRef.current < 5000) return;
      lastFetchTimeRef.current = now;

      try {
        const officialStoriesRes = await databases
          .listDocuments(appwriteConfig.databaseId, appwriteConfig.storiesCollectionId, [Query.equal("user", MOOD_OFFICIAL_ID)])
          .catch(() => ({ documents: [] as any[] }));
        if (!isMounted.current) return;

        const myStories: any[] = await fetchStoriesInternal(userId);
        if (!isMounted.current) return;

        const officialDocs = officialStoriesRes.documents;
        if (officialDocs.length > 0) {
          let officialUserData: any = {
            $id: MOOD_OFFICIAL_ID,
            username: "Mood",
            name: "Mood Team",
            avatar: null,
            isVerified: true,
          };

          if (userId === MOOD_OFFICIAL_ID && user) officialUserData = user;
          else {
            try {
              const fetchedMood = await getUser(MOOD_OFFICIAL_ID);
              if (fetchedMood) officialUserData = fetchedMood;
            } catch {
              // ignore
            }
          }

          const officialGroup = { userId: MOOD_OFFICIAL_ID, user: officialUserData, stories: officialDocs };

          const officialGroupIndex = myStories.findIndex((g) => g.userId === MOOD_OFFICIAL_ID);
          if (officialGroupIndex !== -1) myStories.splice(officialGroupIndex, 1);
          myStories.unshift(officialGroup);
        }

        // Bring my group to front (after official)
        const myGroupIndex = myStories.findIndex((g) => g.userId === userId);
        if (myGroupIndex > 0) {
          const myGroup = myStories.splice(myGroupIndex, 1)[0];
          const insertIndex =
            myStories.length > 0 && myStories[0].userId === MOOD_OFFICIAL_ID && userId !== MOOD_OFFICIAL_ID ? 1 : 0;
          myStories.splice(insertIndex, 0, myGroup);
        }

        setLocalData((prev: any) => ({ ...prev, groupedStories: myStories }));

        // Smart user suggestions (brain-based)
        try {
          const usersRes = await databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.usersCollectionId, [
            Query.limit(60),
            Query.orderDesc("$createdAt"),
          ]);

          const brain = MoodSessionManager.getInstance();
          const blocked = new Set<string>(user?.blockedUsers || []);
          const candidates = usersRes.documents
            .filter((u: any) => {
              if (u.$id === userId) return false;
              if (myFollowedIds.includes(u.$id)) return false;
              if (blocked.has(u.$id)) return false;
              const affinity = brain.getCreatorAffinity(u.$id);
              if (affinity < -0.5) return false;
              return true;
            })
            .sort((a: any, b: any) => brain.getCreatorAffinity(b.$id) - brain.getCreatorAffinity(a.$id));

          if (isMounted.current) setSmartSuggestions(candidates);
        } catch {
          // ignore
        }

        await fetchCounts(userId);
      } catch {
        // ignore
      }
    },
    [userId, user, myFollowedIds, fetchStoriesInternal, fetchCounts, isMounted, lastFetchTimeRef, setLocalData, setSmartSuggestions],
  );

  // Follow graph bootstrap
  useEffect(() => {
    let isActive = true;
    const fetchFollows = async () => {
      if (!userId) return;
      try {
        const ids = await getFollowedUserIds(userId);
        if (isActive && isMounted.current) setMyFollowedIds(ids);
      } catch {
        // ignore
      }
    };

    void fetchFollows();
    return () => {
      isActive = false;
    };
  }, [userId]);

  useEffect(() => {
    if (userId) void fetchAuxiliaryData();
  }, [userId, fetchAuxiliaryData]);

  return { fetchAuxiliaryData, MOOD_OFFICIAL_ID };
};
