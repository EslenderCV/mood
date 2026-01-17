import { useState, useEffect } from "react";
import { Alert, Clipboard, Keyboard } from "react-native";
import { useGlobalContext } from "@/context/GlobalProvider";
import { useLanguage } from "@/context/LanguageContext";
import { Databases, Query } from "react-native-appwrite";
import { Audio } from "expo-av";
import {
  getFeedCandidates,
  getFollowedUserIds,
  getUser,
  client,
  appwriteConfig,
  getDeezerTrackUrl,
  followUser,
} from "@/lib/appwrite";
import { parseSongData, normalize, shuffleArray } from "@/utils/exploreHelpers";

const databases = new Databases(client);
const MOOD_OFFICIAL_ID = "696b571b00112fd5c1e9";

export const useExploreLogic = () => {
  const { user } = useGlobalContext();
  const { t } = useLanguage();

  const [activeCategory, setActiveCategory] = useState("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [trendingPeople, setTrendingPeople] = useState<any[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [dailyVibes, setDailyVibes] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [localFollowedIds, setLocalFollowedIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Player States
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<{
    users: any[];
    posts: any[];
    isLoading: boolean;
  }>({ users: [], posts: [], isLoading: false });

  const [isPlayerModalVisible, setIsPlayerModalVisible] = useState(false);
  const [playerInitialIndex, setPlayerInitialIndex] = useState(0);
  const [playerPostsList, setPlayerPostsList] = useState<any[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);

  // UI Modals
  const [isOptionsVisible, setOptionsVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [isShareVisible, setShareVisible] = useState(false);
  const [isViralModalVisible, setViralModalVisible] = useState(false);
  const [isShareSelectorVisible, setShareSelectorVisible] = useState(false);
  const [postToShareData, setPostToShareData] = useState<any>(null);
  const [sharePostId, setSharePostId] = useState<string>("");
  const [shareContacts, setShareContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isCreationVisible, setCreationVisible] = useState(false);
  const [storyInitialSongData, setStoryInitialSongData] = useState<any>(null);

  // --- FILTRO DE CALIDAD ---
  const isHighQualityTrack = (track: any) => {
    const title = track.title.toLowerCase();
    const artist = track.artist.name.toLowerCase();
    const bannedWords = [
      "cover",
      "karaoke",
      "tribute",
      "instrumental",
      "version",
      "slowed",
      "reverb",
      "remix",
      "mix",
    ];
    if (bannedWords.some((word) => title.includes(word))) return false;
    const bannedArtists = [
      "various artists",
      "varios artistas",
      "latino urbano",
      "reggaeton hits",
      "dj",
      "perreo",
    ];
    if (bannedArtists.some((word) => artist.includes(word))) return false;
    if (track.rank < 500000) return false;
    if (!track.preview) return false;
    return true;
  };

  const fetchDailyTrendingVibes = async () => {
    try {
      const response = await fetch(
        `https://api.deezer.com/search?q=(genre:"reggaeton" OR genre:"latin urban" OR label:"rimas")&order=RANKING&limit=100`,
      );
      const data = await response.json();
      if (!data.data || data.data.length === 0) return;

      const highQualityTracks = data.data.filter(isHighQualityTrack);
      const uniqueArtistTracks: any[] = [];
      const seenArtists = new Set();

      for (const track of highQualityTracks) {
        const artistName = track.artist.name;
        if (!seenArtists.has(artistName)) {
          seenArtists.add(artistName);
          uniqueArtistTracks.push(track);
        }
      }

      const pool =
        uniqueArtistTracks.length >= 5 ? uniqueArtistTracks : highQualityTracks;
      const now = new Date();
      const dayIndex = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
      const totalGroups = Math.max(1, Math.floor(pool.length / 5));
      const groupIndex = dayIndex % totalGroups;
      const start = groupIndex * 5;
      const end = start + 5;
      const dailyTracks = pool.slice(start, end);

      const formattedVibes = dailyTracks.map((track: any) => ({
        id: track.id.toString(),
        title: track.title,
        artist: track.artist.name,
        cover: track.album.cover_medium || track.album.cover_big,
        preview: track.preview,
        duration: track.duration,
        postId: "deezer_" + track.id,
        songData: JSON.stringify({
          id: track.id.toString(),
          title: track.title,
          artist: track.artist.name,
          cover: track.album.cover_medium,
          preview: track.preview,
        }),
      }));
      setDailyVibes(formattedVibes);
    } catch (e) {
      console.log("Error fetching Daily Vibes:", e);
    }
  };

  const fetchData = async () => {
    if (posts.length === 0) setIsLoading(true);
    fetchDailyTrendingVibes();

    try {
      const [rawPosts, usersResponse, fetchedFollowedIds] = await Promise.all([
        getFeedCandidates(),
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.usersCollectionId,
          [Query.orderDesc("$createdAt"), Query.limit(100)],
        ),
        user ? getFollowedUserIds(user.$id) : Promise.resolve([]),
      ]);

      const combinedFollowedIds = [
        ...new Set([...fetchedFollowedIds, ...localFollowedIds]),
      ];
      setLocalFollowedIds(combinedFollowedIds);

      const latestUsers = usersResponse.documents;
      const songMap = new Map();
      const artistMap = new Map();

      rawPosts.forEach((post: any) => {
        const song = parseSongData(post.songData);
        if (!song) return;
        const key = `${normalize(song.title)}-${normalize(song.artist)}`;
        const likes = post.likedBy ? post.likedBy.length : 0;
        const score = likes;

        if (songMap.has(key)) {
          songMap.get(key).score += score;
        } else {
          songMap.set(key, {
            ...song,
            id: song.id || song.spotifyId,
            trackId: song.id || song.spotifyId,
            score,
            postId: post.$id,
          });
        }

        const artistKey = normalize(song.artist);
        if (artistMap.has(artistKey)) {
          artistMap.get(artistKey).count += 1;
        } else {
          artistMap.set(artistKey, {
            id: artistKey,
            name: song.artist,
            cover: song.cover,
            count: 1,
          });
        }
      });

      const charts = Array.from(songMap.values()).sort(
        (a: any, b: any) => b.score - a.score,
      );
      const topArtists = Array.from(artistMap.values())
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 20);

      const usersNotFollowed = latestUsers.filter((u: any) => {
        const isMe = u.$id === user?.$id;
        const doIFollow = combinedFollowedIds.includes(u.$id);
        const isMoodTeam = u.$id === MOOD_OFFICIAL_ID;
        return !isMe && !doIFollow && !isMoodTeam;
      });

      const shuffledPeople = shuffleArray([...usersNotFollowed]).slice(0, 20);

      setTopSongs(charts.slice(0, 10));
      setArtists(topArtists);
      setPosts(shuffleArray(rawPosts));
      setTrendingPeople(shuffledPeople);
      setUsers(usersNotFollowed);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const unsubscribe = client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.postsCollectionId}.documents`,
      (response) => {
        if (
          response.events.some(
            (e) =>
              e.includes("update") ||
              e.includes("create") ||
              e.includes("delete"),
          )
        ) {
          fetchData();
        }
      },
    );
    return () => {
      unsubscribe();
    };
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleFollowUser = async (targetUserId: string) => {
    if (!user) return;
    setUsers((prev) => prev.filter((u) => u.$id !== targetUserId));
    setTrendingPeople((prev) => prev.filter((u) => u.$id !== targetUserId));
    setLocalFollowedIds((prev) => [...prev, targetUserId]);
    try {
      await followUser(user.$id, targetUserId);
    } catch (error: any) {
      Alert.alert("Error", "No se pudo completar la acción.");
    }
  };

  const playPreview = async (previewUrl: string, trackId: string) => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setPlayingPreviewId(null);
        if (playingPreviewId === trackId) return;
      }
      let finalUrl = previewUrl;
      if (!finalUrl && trackId) {
        finalUrl = (await getDeezerTrackUrl(trackId)) || "";
      }
      if (!finalUrl) return;
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: finalUrl },
        { shouldPlay: true },
      );
      setSound(newSound);
      setPlayingPreviewId(trackId);
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) setPlayingPreviewId(null);
      });
    } catch (e) {
      console.log(e);
    }
  };

  // --- BUSCADOR INTELIGENTE (Corregido para llenar datos de usuario) ---
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!searchText.trim()) {
        setSearchResults({ users: [], posts: [], isLoading: false });
        return;
      }

      setSearchResults((prev) => ({ ...prev, isLoading: true }));

      try {
        // 1. Buscar USUARIOS (Por username o nombre)
        const usersRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.usersCollectionId,
          [
            Query.or([
              Query.search("username", searchText),
              Query.search("name", searchText),
            ]),
            Query.limit(20),
          ],
        );

        const foundUsers = usersRes.documents;
        const foundUserIds = foundUsers.map((u) => u.$id);

        // Mapa inicial con usuarios encontrados por nombre
        const userMap = new Map();
        foundUsers.forEach((u) => {
          userMap.set(u.$id, {
            $id: u.$id,
            username: u.username,
            name: u.name,
            avatar: u.pfp || u.avatar,
            isVerified: u.isVerified,
          });
        });

        // 2. Buscar POSTS (Texto, Música y Por Creador)
        const queries = [
          // a) Texto del post
          databases
            .listDocuments(
              appwriteConfig.databaseId,
              appwriteConfig.postsCollectionId,
              [Query.search("comment", searchText), Query.limit(20)],
            )
            .catch(() => ({ documents: [] })),

          // b) Música (SongData)
          databases
            .listDocuments(
              appwriteConfig.databaseId,
              appwriteConfig.postsCollectionId,
              [Query.search("songData", searchText), Query.limit(20)],
            )
            .catch(() => ({ documents: [] })),
        ];

        // c) Posts de los usuarios encontrados (si hay)
        if (foundUserIds.length > 0) {
          queries.push(
            databases
              .listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.postsCollectionId,
                [
                  Query.equal("postedBy", foundUserIds),
                  Query.limit(20),
                  Query.orderDesc("$createdAt"),
                ],
              )
              .catch(() => ({ documents: [] })),
          );
        }

        const results = await Promise.all(queries);

        // Combinar todos los posts encontrados
        const combinedPosts = results.flatMap((res) => res?.documents || []);

        // --- AQUÍ ESTÁ EL CAMBIO IMPORTANTE: BUSCAR AUTORES FALTANTES ---

        // Recolectamos IDs de autores de los posts encontrados que NO tenemos aún
        const missingUserIds = new Set<string>();
        combinedPosts.forEach((post) => {
          const creatorId =
            typeof post.postedBy === "string"
              ? post.postedBy
              : post.postedBy?.$id;
          if (creatorId && !userMap.has(creatorId)) {
            missingUserIds.add(creatorId);
          }
        });

        // Si hay autores desconocidos, los buscamos (Fetch paralelo)
        if (missingUserIds.size > 0) {
          const missingIdsArray = Array.from(missingUserIds);
          const fetchedUsers = await Promise.all(
            missingIdsArray.map((id) => getUser(id).catch(() => null)),
          );
          fetchedUsers.forEach((u) => {
            if (u) {
              userMap.set(u.$id, {
                $id: u.$id,
                username: u.username,
                name: u.name,
                avatar: u.pfp || u.avatar,
                isVerified: u.isVerified,
              });
            }
          });
        }

        // 4. Inyectar datos completos en los posts
        const enrichedPosts = combinedPosts.map((post) => {
          let creatorId =
            typeof post.postedBy === "string"
              ? post.postedBy
              : post.postedBy?.$id;

          // Si tenemos el usuario en el mapa, lo usamos
          if (creatorId && userMap.has(creatorId)) {
            return {
              ...post,
              postedBy: userMap.get(creatorId),
            };
          }
          // Si ya venía como objeto, lo dejamos (aunque Appwrite a veces no lo manda completo en search)
          return post;
        });

        // Deduplicar por ID de post
        const uniquePosts = Array.from(
          new Map(enrichedPosts.map((item) => [item.$id, item])).values(),
        );

        setSearchResults({
          users: foundUsers.map((d) => ({
            ...d,
            id: d.$id,
            avatar: d.pfp || d.avatar,
          })),
          posts: uniquePosts,
          isLoading: false,
        });
      } catch (e) {
        console.log("Search error:", e);
        setSearchResults((prev) => ({ ...prev, isLoading: false }));
      }
    }, 600);
    return () => clearTimeout(delay);
  }, [searchText]);

  // Handlers UI
  const handleOpenOptions = (post: any) => {
    setSelectedPost(post);
    setOptionsVisible(true);
  };
  const openShare = async (post: any) => {
    setPostToShareData(post);
    setSharePostId(post.$id);
    setShareSelectorVisible(true);
  };
  const handleShareSearch = async (text: string) => {
    /* ... */
  };
  const handleSendShare = async (userIds: string[], message: string) => {
    setShareSelectorVisible(false);
    Alert.alert("Enviado");
  };
  const handleCopyLink = () => {
    Clipboard.setString("link");
    Alert.alert("Copiado");
  };
  const getViralPostData = () => null;

  return {
    activeCategory,
    setActiveCategory,
    posts,
    trendingPeople,
    topSongs,
    dailyVibes,
    artists,
    users,
    isLoading,
    isRefreshing,
    onRefresh,
    isSearchActive,
    setIsSearchActive,
    searchText,
    setSearchText,
    searchResults,
    isPlayerModalVisible,
    setIsPlayerModalVisible,
    playerInitialIndex,
    setPlayerInitialIndex,
    playerPostsList,
    setPlayerPostsList,
    playingPreviewId,
    playPreview,
    isOptionsVisible,
    setOptionsVisible,
    selectedPost,
    handleOpenOptions,
    isShareVisible,
    setShareVisible,
    isViralModalVisible,
    setViralModalVisible,
    isShareSelectorVisible,
    setShareSelectorVisible,
    postToShareData,
    sharePostId,
    shareContacts,
    isLoadingContacts,
    handleShareSearch,
    handleSendShare,
    openShare,
    isCreationVisible,
    setCreationVisible,
    storyInitialSongData,
    setStoryInitialSongData,
    handleCopyLink,
    getViralPostData,
    user,
    t,
    handleFollowUser,
  };
};
