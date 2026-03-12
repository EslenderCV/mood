import { useEffect } from "react";

import { client, appwriteConfig } from "@/lib/appwrite";
import { FeedItem } from "@/context/FeedProvider";
import { EnrichedFeedItem, toRankableFeedItem } from "./homeTypes";

/**
 * Real-time subscriptions:
 * - Notifications / messages counts refresh
 * - Inject own newly created posts into feed immediately
 */
export const useHomeRealtime = ({
  userId,
  user,
  fetchCounts,
  setSortedFeed,
  realtimePostsCacheRef,
}: {
  userId: string | undefined;
  user: any;
  fetchCounts: (uId: string) => Promise<any>;
  setSortedFeed: React.Dispatch<React.SetStateAction<EnrichedFeedItem[]>>;
  realtimePostsCacheRef: React.MutableRefObject<EnrichedFeedItem[]>;
}) => {
  useEffect(() => {
    if (!userId) return;

    const notiChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.notificationsCollectionId}.documents`;
    const msgChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`;
    const postsChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.postsCollectionId}.documents`;

    const unsubscribe = client.subscribe([notiChannel, msgChannel, postsChannel], (response) => {
      const payload = response.payload as any;
      const events = response.events;

      // 1. Notifications
      if (response.channels.includes(notiChannel) && payload.userId === userId) {
        void fetchCounts(userId);
      }

      // 2. Messages (Create OR Update)
      if (response.channels.includes(msgChannel) && payload.receiverId === userId) {
        if (events.some((e) => e.includes(".create") || e.includes(".update"))) {
          void fetchCounts(userId);
        }
      }

      // 3. Posts: if I create a post, prepend instantly
      if (response.channels.includes(postsChannel)) {
        if (events.some((e) => e.includes(".create"))) {
          const creatorId = typeof payload.postedBy === "object" ? payload.postedBy.$id : payload.postedBy;
          if (creatorId === userId) {
            const newFeedItem: FeedItem = {
              _id: payload.$id,
              type: "post",
              data: {
                ...payload,
                postedBy: user,
                creator: user,
              },
            };

            const rankable = toRankableFeedItem(newFeedItem, 0, "realtime_" + Date.now());
            realtimePostsCacheRef.current = [rankable, ...realtimePostsCacheRef.current];
            setSortedFeed((prev) => [rankable, ...prev]);
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userId, user, fetchCounts, setSortedFeed, realtimePostsCacheRef]);
};
