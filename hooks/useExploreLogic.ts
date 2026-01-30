import { useState, useEffect, useRef } from "react";
import { Alert, Clipboard, Keyboard } from "react-native";
import { useGlobalContext } from "@/context/GlobalProvider";
import { useLanguage } from "@/context/LanguageContext";
import { Databases, Query, ID } from "react-native-appwrite";
import { Audio } from "expo-av";
import {
  getFeedCandidates,
  getFollowedUserIds,
  getUser,
  client,
  appwriteConfig,
  getDeezerTrackUrl,
  followUser,
  searchPosts, // 🔥 IMPORTAR LA NUEVA FUNCIÓN
} from "@/lib/appwrite";
import { parseSongData, normalize, shuffleArray } from "@/utils/exploreHelpers";

const databases = new Databases(client);
const MOOD_OFFICIAL_ID = "696b571b00112fd5c1e9";

// 🔥 PALABRAS CLAVE PARA DETECTAR MOODS
const MOOD_KEYWORDS = [
  "sad",
  "triste",
  "llorar",
  "cry",
  "depre",
  "happy",
  "feliz",
  "alegre",
  "fiesta",
  "party",
  "gym",
  "entreno",
  "workout",
  "power",
  "energy",
  "energia",
  "chill",
  "relax",
  "calma",
  "paz",
  "love",
  "amor",
  "romantico",
  "focus",
  "estudio",
  "trabajo",
  "enfoque",
];

export const useExploreLogic = () => {
  const { user } = useGlobalContext();
  const { t } = useLanguage();

  // Categorías y Datos
  const [activeCategory, setActiveCategory] = useState("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [trendingPeople, setTrendingPeople] = useState<any[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [dailyVibes, setDailyVibes] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [localFollowedIds, setLocalFollowedIds] = useState<string[]>([]);

  // Estados de Carga
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Búsqueda
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<{
    users: any[];
    posts: any[];
    isLoading: boolean;
  }>({ users: [], posts: [], isLoading: false });

  // Player Feed Modal (Full Screen)
  const [isPlayerModalVisible, setIsPlayerModalVisible] = useState(false);
  const [playerInitialIndex, setPlayerInitialIndex] = useState(0);
  const [playerPostsList, setPlayerPostsList] = useState<any[]>([]);

  // Audio Ref
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);

  // Modals UI
  const [isOptionsVisible, setOptionsVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [isShareVisible, setShareVisible] = useState(false);
  const [isViralModalVisible, setViralModalVisible] = useState(false);
  const [isShareSelectorVisible, setShareSelectorVisible] = useState(false);
  const [postToShareData, setPostToShareData] = useState<any>(null);
  const [sharePostId, setSharePostId] = useState<string>("");
  const [shareContacts, setShareContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  // Creación de contenido
  const [isTrackOptionsVisible, setTrackOptionsVisible] = useState(false);
  const [selectedTrackForAction, setSelectedTrackForAction] =
    useState<any>(null);
  const [isCreationVisible, setCreationVisible] = useState(false);
  const [storyInitialSongData, setStoryInitialSongData] = useState<any>(null);
  const [isPostModalVisible, setIsPostModalVisible] = useState(false);

  // --- AUDIO LOGIC ---
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const playPreview = async (previewUrl: string, trackId: string) => {
    try {
      if (playingPreviewId === trackId) {
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        setPlayingPreviewId(null);
        return;
      }

      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (e) {}
        soundRef.current = null;
        setPlayingPreviewId(null);
      }

      let finalUrl = previewUrl;
      if (!finalUrl && trackId) {
        const deezerUrl = await getDeezerTrackUrl(trackId);
        if (deezerUrl) finalUrl = deezerUrl;
      }

      if (!finalUrl) {
        console.log("No preview URL found for:", trackId);
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: finalUrl },
        { shouldPlay: true },
      );

      soundRef.current = newSound;
      setPlayingPreviewId(trackId);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingPreviewId(null);
          soundRef.current = null;
        }
      });
    } catch (e) {
      console.log("Audio Error:", e);
      setPlayingPreviewId(null);
    }
  };

  // --- CREACIÓN ---
  const openTrackOptions = (trackItem: any) => {
    setSelectedTrackForAction(trackItem);
    setTrackOptionsVisible(true);
  };

  const handleStartStory = () => {
    setTrackOptionsVisible(false);
    let data = selectedTrackForAction;
    if (typeof selectedTrackForAction.songData === "string") {
      try {
        data = JSON.parse(selectedTrackForAction.songData);
      } catch (e) {
        data = selectedTrackForAction;
      }
    } else if (selectedTrackForAction.songData) {
      data = selectedTrackForAction.songData;
    }

    const songForStory = {
      title: data.title || selectedTrackForAction.title,
      artist: data.artist || selectedTrackForAction.artist,
      cover: data.cover || selectedTrackForAction.cover,
      preview: data.preview || selectedTrackForAction.preview,
      spotifyId: data.id || selectedTrackForAction.id,
    };

    setStoryInitialSongData(songForStory);
    setTimeout(() => setCreationVisible(true), 300);
  };

  const handleStartPost = () => {
    setTrackOptionsVisible(false);
    let data = selectedTrackForAction;
    if (typeof selectedTrackForAction.songData === "string") {
      try {
        data = JSON.parse(selectedTrackForAction.songData);
      } catch (e) {
        data = selectedTrackForAction;
      }
    }

    const songForPost = {
      title: data.title || selectedTrackForAction.title,
      artist: data.artist || selectedTrackForAction.artist,
      cover: data.cover || selectedTrackForAction.cover,
      preview: data.preview || selectedTrackForAction.preview,
      id: data.id || selectedTrackForAction.id,
    };

    setSelectedTrackForAction(songForPost);
    setTimeout(() => setIsPostModalVisible(true), 300);
  };

  // --- DATA FETCHING ---
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
        trackId: track.id.toString(),
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
      console.log("Error vibes:", e);
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
      setLocalFollowedIds([
        ...new Set([...fetchedFollowedIds, ...localFollowedIds]),
      ]);
      const latestUsers = usersResponse.documents;
      const songMap = new Map();
      const artistMap = new Map();
      rawPosts.forEach((post: any) => {
        const song = parseSongData(post.songData);
        if (!song) return;
        const key = `${normalize(song.title)}-${normalize(song.artist)}`;
        const likes = post.likedBy ? post.likedBy.length : 0;
        if (songMap.has(key)) songMap.get(key).score += likes;
        else
          songMap.set(key, {
            ...song,
            id: song.id || song.spotifyId,
            trackId: song.id || song.spotifyId,
            score: likes,
            postId: post.$id,
          });

        const artistKey = normalize(song.artist);
        if (artistMap.has(artistKey)) artistMap.get(artistKey).count += 1;
        else
          artistMap.set(artistKey, {
            id: artistKey,
            name: song.artist,
            cover: song.cover,
            count: 1,
          });
      });
      const charts = Array.from(songMap.values()).sort(
        (a: any, b: any) => b.score - a.score,
      );
      const topArtists = Array.from(artistMap.values())
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 20);
      const usersNotFollowed = latestUsers.filter(
        (u: any) =>
          u.$id !== user?.$id &&
          !localFollowedIds.includes(u.$id) &&
          u.$id !== MOOD_OFFICIAL_ID,
      );
      setTopSongs(charts.slice(0, 10));
      setArtists(topArtists);
      setPosts(shuffleArray(rawPosts));
      setTrendingPeople(shuffleArray([...usersNotFollowed]).slice(0, 20));
      setUsers(usersNotFollowed);
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
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
    } catch (e) {
      Alert.alert("Error");
    }
  };

  // 🔥 BUSCADOR INTELIGENTE CON LÓGICA DE MOODS
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!searchText.trim()) {
        setSearchResults({ users: [], posts: [], isLoading: false });
        return;
      }
      setSearchResults((prev) => ({ ...prev, isLoading: true }));
      try {
        // 1. Buscar Usuarios (Siempre útil)
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

        // 2. DETECTOR DE INTENCIÓN: ¿Es un Mood?
        const isMoodSearch = MOOD_KEYWORDS.some((k) =>
          searchText.toLowerCase().includes(k),
        );

        // 3. Buscar Posts usando la función centralizada
        const foundPosts = await searchPosts(searchText, isMoodSearch);

        setSearchResults({
          users: foundUsers.map((d) => ({
            ...d,
            id: d.$id,
            avatar: d.pfp || d.avatar,
          })),
          posts: foundPosts,
          isLoading: false,
        });
      } catch (e) {
        setSearchResults((prev) => ({ ...prev, isLoading: false }));
      }
    }, 600);
    return () => clearTimeout(delay);
  }, [searchText]);

  // Helpers UI
  const handleOpenOptions = (post: any) => {
    setSelectedPost(post);
    setOptionsVisible(true);
  };
  const openShare = async (post: any) => {
    setPostToShareData(post);
    setSharePostId(post.$id);
    setShareSelectorVisible(true);
  };
  const handleShareSearch = async (text: string) => {};
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
    handleCopyLink,
    getViralPostData,
    user,
    t,
    handleFollowUser,
    isTrackOptionsVisible,
    setTrackOptionsVisible,
    selectedTrackForAction,
    openTrackOptions,
    handleStartStory,
    handleStartPost,
    isCreationVisible,
    setCreationVisible,
    storyInitialSongData,
    isPostModalVisible,
    setIsPostModalVisible,
  };
};
