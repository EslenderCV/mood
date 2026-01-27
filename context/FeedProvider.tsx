import React, { createContext, useContext, useState, useEffect } from "react";
import { Alert } from "react-native";
import {
  getFeedCandidates,
  getLatestUsers,
  createPost as apiCreatePost,
  searchSongs,
} from "@/lib/appwrite";
import { ID } from "react-native-appwrite";

export type FeedItemType = "post" | "suggested_users" | "trending_song";
0;
export interface FeedItem {
  _id: string;
  type: FeedItemType;
  data: any;
  status?: "published" | "uploading" | "error";
}

interface FeedContextType {
  feed: FeedItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  refreshFeed: () => Promise<void>;
  createPostOptimistic: (text: string, songData: any, user: any) => void;
  trackUserInterest: (term: string) => void;
  viralSongToUse: any | null;
  setViralSongToUse: (song: any | null) => void;
}

const FeedContext = createContext<FeedContextType | undefined>(undefined);

const shuffleArray = (array: any[]) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const randomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

export const FeedProvider = ({ children }: { children: React.ReactNode }) => {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userInterests, setUserInterests] = useState<string[]>([]);

  const [viralSongToUse, setViralSongToUse] = useState<any | null>(null);

  const trackUserInterest = (term: string) => {
    if (!term) return;
    setUserInterests((prev) => [term, ...prev].slice(0, 5));
  };

  const A_LIST_ARTISTS = [
    "Bad Bunny",
    "Feid",
    "Karol G",
    "Rauw Alejandro",
    "Peso Pluma",
    "Myke Towers",
    "Eladio Carrión",
    "Mora",
    "Young Miko",
    "Arcángel",
    "Jhayco",
    "Chencho Corleone",
    "Ozuna",
    "Anuel AA",
    "Daddy Yankee",
    "Sech",
    "Quevedo",
    "Bizarrap",
    "Tini",
    "Manuel Turizo",
    "Rochy RD",
    "Tokischa",
    "Cris Mj",
    "Yandel",
    "Wisin",
    "Maluma",
    "J Balvin",
    "Nicky Jam",
    "Rosalía",
    "Shakira",
  ];

  const fetchViralBatch = async () => {
    try {
      const searchSeeds: string[] = [];

      if (userInterests.length > 0 && Math.random() > 0.3) {
        const interest =
          userInterests[Math.floor(Math.random() * userInterests.length)];
        searchSeeds.push(interest);
      }

      while (searchSeeds.length < 3) {
        const randomArtist =
          A_LIST_ARTISTS[Math.floor(Math.random() * A_LIST_ARTISTS.length)];
        if (!searchSeeds.includes(randomArtist)) {
          searchSeeds.push(randomArtist);
        }
      }

      const promises = searchSeeds.map((term) => searchSongs(term));
      const results = await Promise.all(promises);
      const allSongs = results.flat();

      const uniqueSongs: any[] = [];
      const seenArtists = new Set<string>();

      for (const song of allSongs) {
        const artistName = (song.artist?.name || song.artist || "").trim();
        const title = (song.title || "").toLowerCase();

        if (seenArtists.has(artistName)) continue;

        if (
          title.includes("karaoke") ||
          title.includes("instrumental") ||
          title.includes("cover")
        ) {
          continue;
        }

        seenArtists.add(artistName);
        uniqueSongs.push(song);
      }

      return shuffleArray(uniqueSongs);
    } catch (e) {
      console.log("Error fetching viral batch", e);
      return [];
    }
  };

  const mixContent = async (posts: any[]) => {
    const mixedFeed: FeedItem[] = [];

    const shuffledPosts = shuffleArray(posts);

    let suggestedUsers: any[] = [];
    let viralSongsPool: any[] = [];

    try {
      const [users, songs] = await Promise.all([
        getLatestUsers(),
        fetchViralBatch(),
      ]);
      suggestedUsers = users;
      viralSongsPool = songs;
    } catch (e) {
      console.log("Error loading discovery content", e);
    }

    let songPoolIndex = 0;

    const injectionIndices = new Set<number>();
    let currentIndex = randomInt(2, 4);

    while (currentIndex < shuffledPosts.length) {
      injectionIndices.add(currentIndex);
      currentIndex += randomInt(4, 8);
    }

    shuffledPosts.forEach((post, index) => {
      mixedFeed.push({
        _id: post.$id,
        type: "post",
        data: post,
        status: "published",
      });

      if (injectionIndices.has(index)) {
        const injectMusic = Math.random() > 0.3;

        if (injectMusic && viralSongsPool.length > 0) {
          const songToInject =
            viralSongsPool[songPoolIndex % viralSongsPool.length];
          songPoolIndex++;

          mixedFeed.push({
            _id: `viral_${index}_${Date.now()}_${Math.random()}`,
            type: "trending_song",
            data: songToInject,
          });
        } else if (suggestedUsers.length > 0) {
          const randomUsers = shuffleArray(suggestedUsers).slice(0, 6);
          mixedFeed.push({
            _id: `suggestion_${index}_${Date.now()}_${Math.random()}`,
            type: "suggested_users",
            data: randomUsers,
          });
        }
      }
    });

    return mixedFeed;
  };

  const refreshFeed = async () => {
    setIsRefreshing(true);
    try {
      const posts = await getFeedCandidates();
      const newFeed = await mixContent(posts);

      setFeed((prev) => {
        const pending = prev.filter(
          (i) => i.status === "uploading" || i.status === "error",
        );
        return [...pending, ...newFeed];
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const createPostOptimistic = async (
    text: string,
    songData: any,
    user: any,
  ) => {
    if (songData?.artistName) trackUserInterest(songData.artistName);

    const tempId = ID.unique();
    const songString = JSON.stringify(songData);

    const optimisticPost: FeedItem = {
      _id: tempId,
      type: "post",
      status: "uploading",
      data: {
        $id: tempId,
        comment: text,
        songData: songString,
        postedBy: user,
        $createdAt: new Date().toISOString(),
        likedBy: [],
        savedBy: [],
        commentsCount: 0,
        isOptimistic: true,
      },
    };

    setFeed((prev) => [optimisticPost, ...prev]);

    setTimeout(async () => {
      try {
        const response = await apiCreatePost(text, songString, user.$id);
        setFeed((prev) =>
          prev.map((item) => {
            if (item._id === tempId) {
              return {
                ...item,
                _id: response.$id,
                status: "published",
                data: { ...response, postedBy: user },
              };
            }
            return item;
          }),
        );
      } catch (error) {
        console.error("Upload error", error);
        setFeed((prev) =>
          prev.map((item) =>
            item._id === tempId ? { ...item, status: "error" } : item,
          ),
        );
        Alert.alert("Error", "No se pudo publicar.");
      }
    }, 100);
  };

  useEffect(() => {
    refreshFeed();
  }, []);

  return (
    <FeedContext.Provider
      value={{
        feed,
        isLoading,
        isRefreshing,
        refreshFeed,
        createPostOptimistic,
        trackUserInterest,
        viralSongToUse,
        setViralSongToUse,
      }}
    >
      {children}
    </FeedContext.Provider>
  );
};

export const useFeed = () => {
  const context = useContext(FeedContext);
  if (!context) throw new Error("useFeed must be used within a FeedProvider");
  return context;
};
