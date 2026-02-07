import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  FlatList,
  Animated,
  useWindowDimensions,
  Image,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import { useColorScheme } from "nativewind";

import {
  getDeezerChartPlaylists,
  getDeezerChartTracks,
  getDeezerPlaylistTracks,
  searchSongs,
} from "@/lib/appwrite/utils";
import { useFeed } from "@/context/FeedProvider";
import { useModal } from "@/context/ModalContext";
import { AudioActions, useAudioContext } from "@/context/AudioContext";

import { tStatic } from "@/context/LanguageContext";
type ChipType = "mood" | "genre";

type Chip = {
  id: string;
  label: string;
  type: ChipType;
  accent: string;
  // Prefer chart playlists (much more recognizable music than raw search)
  playlistKeywords: string[];
  // Fallback search queries (only used if chart playlists fail)
  queries: string[];
};

type Track = {
  id: string;
  title: string;
  artist: string;
  cover?: string;
  preview?: string;
  duration?: number;
  rank?: number;
  album?: any;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_TRACKS = 12;

const CHIPS: Chip[] = [
  {
    id: "mood_energy",
    label: "Energía",
    type: "mood",
    accent: "#F59E0B",
    playlistKeywords: ["workout", "gym", "cardio", "running", "energy", "power", "dance"],
    queries: ["workout hits", "energia gym", "power run", "dance cardio"],
  },
  {
    id: "mood_chill",
    label: "Relajación",
    type: "mood",
    accent: "#60A5FA",
    playlistKeywords: ["chill", "relax", "lofi", "lo-fi", "ambient", "calm"],
    queries: ["lofi chill", "relaxing vibes", "ambient chill", "chillhop"],
  },
  {
    id: "mood_party",
    label: "Fiesta",
    type: "mood",
    accent: "#A855F7",
    playlistKeywords: ["party", "fiesta", "dance", "club", "hits"],
    queries: ["party hits", "fiesta mix", "dance hits", "club bangers"],
  },
  {
    id: "mood_focus",
    label: "Enfoque",
    type: "mood",
    accent: "#22C55E",
    playlistKeywords: ["focus", "study", "concentration", "deep focus", "instrumental"],
    queries: ["focus study", "deep focus", "concentration music", "instrumental focus"],
  },
  {
    id: "mood_romance",
    label: "Romántico",
    type: "mood",
    accent: "#EC4899",
    playlistKeywords: ["love", "romance", "romantic", "slow", "valentine", "balada"],
    queries: ["romantic hits", "love songs", "baladas romanticas", "slow jams"],
  },
  {
    id: "mood_nostalgia",
    label: "Nostalgia",
    type: "mood",
    accent: "#F97316",
    playlistKeywords: ["80", "90", "throwback", "classics", "nostalgia"],
    queries: ["80s hits", "90s hits", "throwback", "clasicos"],
  },
  {
    id: "genre_latino",
    label: "Urbano Latino",
    type: "genre",
    accent: "#FB7185",
    playlistKeywords: ["latin", "latino", "reggaeton", "urbano", "dembow", "trap"],
    queries: ["latin urban", "reggaeton hits", "trap latino", "dembow"],
  },
  {
    id: "genre_pop",
    label: "Pop",
    type: "genre",
    accent: "#38BDF8",
    playlistKeywords: ["pop", "top pop", "pop hits", "hits"],
    queries: ["pop hits", "top pop", "pop viral", "pop 2024"],
  },
  {
    id: "genre_rock",
    label: "Rock",
    type: "genre",
    accent: "#EF4444",
    playlistKeywords: ["rock", "alternative", "indie", "classics"],
    queries: ["rock classics", "alternative rock", "indie rock", "rock hits"],
  },
  {
    id: "genre_hiphop",
    label: "Hip-Hop",
    type: "genre",
    accent: "#FBBF24",
    playlistKeywords: ["hip hop", "hip-hop", "rap", "trap"],
    queries: ["hip hop hits", "rap hits", "trap hits", "hip hop viral"],
  },
  {
    id: "genre_edm",
    label: "Electrónica",
    type: "genre",
    accent: "#A78BFA",
    playlistKeywords: ["dance", "edm", "electronic", "house", "techno"],
    queries: ["edm hits", "electronic dance", "house hits", "techno essentials"],
  },
  {
    id: "genre_kpop",
    label: "K-Pop",
    type: "genre",
    accent: "#C084FC",
    playlistKeywords: ["k-pop", "kpop", "k pop"],
    queries: ["kpop hits", "k-pop trending", "kpop essentials", "kpop viral"],
  },
];

function mapTrack(t: any): Track {
  return {
    id: String(t?.id ?? ""),
    title: t?.title ?? "",
    artist: t?.artist?.name || t?.artist || "",
    cover: t?.cover || t?.album?.cover_xl || t?.album?.cover_medium,
    preview: t?.preview,
    duration: t?.duration,
    rank: t?.rank,
    album: t?.album,
  };
}

function normalizeAndTake(tracks: any[], seen: Set<string>, max: number): Track[] {
  const out: Track[] = [];
  for (const raw of tracks || []) {
    // Deezer sometimes returns non-playable tracks
    if (raw?.readable === false) continue;
    const tr = mapTrack(raw);
    if (!tr.id || seen.has(tr.id)) continue;
    if (!tr.preview || typeof tr.preview !== "string") continue;
    if (!tr.title || !tr.artist) continue;
    seen.add(tr.id);
    out.push(tr);
    if (out.length >= max) break;
  }
  // If rank exists, prefer higher rank (more popular)
  const hasRank = out.some((t) => typeof t.rank === "number");
  return hasRank ? [...out].sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0)) : out;
}

function scorePlaylistTitle(title: string, keywords: string[]) {
  const t = (title || "").toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    const k = kw.toLowerCase();
    if (!k) continue;
    if (t.includes(k)) score += 3;
  }
  // small boost if it looks like a "hits" editorial playlist
  if (t.includes("hit")) score += 1;
  if (t.includes("top")) score += 1;
  return score;
}

async function fetchBetterTracksForChip(
  chip: Chip,
  ctx: {
    getChartPlaylistsCached: () => Promise<Array<{ id: number; title: string }>>;
    getPlaylistTracksCached: (playlistId: number) => Promise<any[]>;
  },
): Promise<Track[]> {
  const seen = new Set<string>();

  // 1) Try to find a relevant TOP playlist from charts (best quality)
  const playlists = await ctx.getChartPlaylistsCached();
  let best: { id: number; title: string } | null = null;
  let bestScore = 0;
  for (const p of playlists || []) {
    const s = scorePlaylistTitle(p.title, chip.playlistKeywords);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }

  if (best && bestScore >= 3) {
    const plTracks = await ctx.getPlaylistTracksCached(best.id);
    const picked = normalizeAndTake(plTracks, seen, MAX_TRACKS);
    if (picked.length > 0) {
      // If the playlist is a bit short/unusable (no previews), fill with global chart tracks.
      if (picked.length < MAX_TRACKS) {
        const chart = await getDeezerChartTracks(60);
        const fill = normalizeAndTake(chart, seen, MAX_TRACKS - picked.length);
        picked.push(...fill);
      }
      if (picked.length >= 6) return picked.slice(0, MAX_TRACKS);
    }
  }

  // 2) Fallback: global chart tracks (still highly recognizable)
  const chart = await getDeezerChartTracks(60);
  const pickedChart = normalizeAndTake(chart, seen, MAX_TRACKS);
  if (pickedChart.length >= 8) return pickedChart;

  // 3) Last fallback: curated search queries
  const out: Track[] = [];
  for (const q of chip.queries) {
    const res = await searchSongs(q);
    const picked = normalizeAndTake(res, seen, MAX_TRACKS - out.length);
    out.push(...picked);
    if (out.length >= MAX_TRACKS) break;
  }
  return out;
}

export default function MoodGenreRecommendations({
  initialChipId,
}: {
  initialChipId?: string;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== "light";

  const { width: screenWidth } = useWindowDimensions();

  const { setViralSongToUse } = useFeed();
  const { setPostModalVisible } = useModal();
  const audio = useAudioContext();

  const [activeChipId, setActiveChipId] = useState<string>(
    initialChipId || CHIPS[0].id,
  );
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheRef = useRef<Map<string, { ts: number; tracks: Track[] }>>(
    new Map(),
  );
  const reqIdRef = useRef<number>(0);

  // shared Deezer chart caches (avoid re-fetching across chips)
  const chartPlaylistsRef = useRef<{ ts: number; playlists: Array<{ id: number; title: string }> } | null>(
    null,
  );
  const playlistTracksRef = useRef<Map<string, { ts: number; tracks: any[] }>>(new Map());

  const getChartPlaylistsCached = useCallback(async () => {
    const cached = chartPlaylistsRef.current;
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.playlists;
    // More playlists = higher chance of matching a relevant "Top" editorial playlist
    const playlists = await getDeezerChartPlaylists(120);
    chartPlaylistsRef.current = { ts: Date.now(), playlists };
    return playlists;
  }, []);

  const getPlaylistTracksCached = useCallback(async (playlistId: number) => {
    const key = String(playlistId);
    const cached = playlistTracksRef.current.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.tracks;
    const tracks = await getDeezerPlaylistTracks(playlistId, 60);
    playlistTracksRef.current.set(key, { ts: Date.now(), tracks });
    return tracks;
  }, []);

  // Fade-in for the rail when results load
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const activeChip = useMemo(
    () => CHIPS.find((c) => c.id === activeChipId) || CHIPS[0],
    [activeChipId],
  );

  // Chips: un solo horizontal scroll (sin paginación). Mantén 2 filas (moods arriba, géneros abajo).
  const chipColumns = useMemo(() => {
    const moods = CHIPS.filter((c) => c.type === "mood");
    const genres = CHIPS.filter((c) => c.type === "genre");
    const cols: Array<{ top?: Chip; bottom?: Chip }> = [];
    const n = Math.max(moods.length, genres.length);
    for (let i = 0; i < n; i++) {
      cols.push({ top: moods[i], bottom: genres[i] });
    }
    return cols;
  }, []);

  const openPostWithSong = useCallback(
    (song: Track) => {
      try {
        if (audio.currentPlayingId && audio.isPlaying) {
          void AudioActions.pauseTrack();
        }
      } catch {}
      setViralSongToUse(song);
      setPostModalVisible(true);
    },
    [audio.currentPlayingId, audio.isPlaying, setPostModalVisible, setViralSongToUse],
  );

  const togglePlay = useCallback(async (song: Track) => {
    if (!song.preview) return;
    const state = AudioActions.getState();
    const isThis = state.currentPlayingId === song.id;

    if (isThis && state.isPlaying) {
      await AudioActions.pauseTrack();
      return;
    }

    await AudioActions.playTrack(song.id, song.preview, {
      title: song.title,
      artist: song.artist,
      cover: song.cover,
    });
  }, []);

  useEffect(() => {
    const cached = cacheRef.current.get(activeChipId);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setTracks(cached.tracks);
      setError(null);
      try {
        cached.tracks.slice(0, 2).forEach((t) => {
          if (t.preview) AudioActions.prefetchTrack(t.preview);
        });
      } catch {}
      return;
    }

    let alive = true;
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);

    // soften-out while loading, then fade-in when ready
    try {
      fadeAnim.stopAnimation();
      fadeAnim.setValue(0.55);
    } catch {}

    (async () => {
      try {
        const res = await fetchBetterTracksForChip(activeChip, {
          getChartPlaylistsCached,
          getPlaylistTracksCached,
        });
        if (!alive || reqId !== reqIdRef.current) return;
        cacheRef.current.set(activeChipId, { ts: Date.now(), tracks: res });
        setTracks(res);
        try {
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }).start();
        } catch {}
        try {
          res.slice(0, 2).forEach((t) => {
            if (t.preview) AudioActions.prefetchTrack(t.preview);
          });
        } catch {}
      } catch {
        if (!alive || reqId !== reqIdRef.current) return;
        setTracks([]);
        setError("No se pudieron cargar recomendaciones.");
      } finally {
        if (!alive || reqId !== reqIdRef.current) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [activeChipId, activeChip]);

  // ---- Bottom sheet ("Más") ----
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["85%"], []);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CHIPS;
    return CHIPS.filter((c) => c.label.toLowerCase().includes(q));
  }, [search]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
      />
    ),
    [],
  );

  const divider = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const CHIP_GAP = 12;
  const CHIP_ROW_GAP = 10;
  // chip width tuned for 2 columns visible on most phones
  const chipWidth = Math.min((screenWidth - 32 - CHIP_GAP) / 2, 190);

  const TRACK_W = 158;
  const TRACK_GAP = 16;

  return (
    <View className="mt-2 mb-6">
      {/* Header (flat, no container) */}
      <View className="px-4 pt-2 pb-2 flex-row items-start justify-between">
        <View className="flex-row items-center flex-1 pr-3">
          <Ionicons name="sparkles" size={18} color={isDark ? "#A78BFA" : "#6D28D9"} />
          <View className="ml-2 flex-1">
            <Text className={`${isDark ? "text-white" : "text-black"} font-black text-base`}>{tStatic("ui.s_f40d5ede")}</Text>
            <Text className="text-zinc-400 text-xs mt-0.5">{tStatic("ui.s_b0c28ea0")}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => sheetRef.current?.present()}
          hitSlop={10}
          style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
          className="flex-row items-center"
        >
          <Text className={`${isDark ? "text-white" : "text-black"} font-bold text-xs mr-1`}>{tStatic("ui.s_f1caef3b")}</Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={isDark ? "#fff" : "#000"}
          />
        </Pressable>
      </View>

      {/* Chips (un solo horizontal scroll, 2 filas) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10 }}
      >
        <View className="flex-row">
          {chipColumns.map((col, i) => {
            const top = col.top;
            const bottom = col.bottom;
            if (!top && !bottom) return null;

            return (
              <View key={`chip_col_${i}`} style={{ marginRight: i === chipColumns.length - 1 ? 0 : CHIP_GAP }}>
                {top ? (
                  <ChipButton
                    chip={top}
                    selected={top.id === activeChipId}
                    onPress={() => setActiveChipId(top.id)}
                    width={chipWidth}
                  />
                ) : null}

                {bottom ? (
                  <View style={{ marginTop: CHIP_ROW_GAP }}>
                    <ChipButton
                      chip={bottom}
                      selected={bottom.id === activeChipId}
                      onPress={() => setActiveChipId(bottom.id)}
                      width={chipWidth}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Tracks rail */}
      <View className="px-4 pb-2">
        <View className="flex-row items-center justify-between mb-2">
          <Text className={`${isDark ? "text-white" : "text-black"} font-extrabold`}>
            {activeChip.label}
          </Text>

          {loading ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color={isDark ? "#A78BFA" : "#6D28D9"} />
              <Text className="text-zinc-400 text-xs ml-2">{tStatic("ui.s_3a2c2589")}</Text>
            </View>
          ) : error ? (
            <Text className="text-red-400 text-xs">{error}</Text>
          ) : null}
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
          {loading && tracks.length === 0 ? (
            <SkeletonRail />
          ) : tracks.length === 0 ? (
            <View className="py-5 pr-6">
              <Text className="text-zinc-400 text-sm">{tStatic("ui.s_207b4a8c")}</Text>
            </View>
          ) : (
            <FlatList
              data={tracks}
              horizontal
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
              snapToInterval={TRACK_W + TRACK_GAP}
              decelerationRate="fast"
              renderItem={({ item: t }) => {
                const isThis = audio.currentPlayingId === t.id;
                const playing = isThis && audio.isPlaying;
                const buffering = isThis && (audio.isLoading || audio.isBuffering);

                return (
                  <TrackCard
                    track={t}
                    accent={activeChip.accent}
                    isPlaying={playing}
                    isBuffering={buffering}
                    onPlay={() => void togglePlay(t)}
                    onUseSound={() => openPostWithSong(t)}
                  />
                );
              }}
            />
          )}
        </Animated.View>
      </View>

      {/* subtle section divider */}
      <View className="mx-4 mt-2 h-px" style={{ backgroundColor: divider }} />

      {/* Bottom sheet: full list + search */}
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: isDark ? "#444" : "#bbb" }}
        backgroundStyle={{ backgroundColor: isDark ? "#0B0B0F" : "#FFFFFF" }}
      >
        <View className="px-5 pt-4 pb-2">
          <Text className={`${isDark ? "text-white" : "text-black"} font-black text-xl`}>{tStatic("ui.s_d96b6b7e")}</Text>
          <View
            className="mt-3 flex-row items-center rounded-2xl border px-3 py-2"
            style={{
              borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            }}
          >
            <Ionicons name="search" size={16} color={isDark ? "#aaa" : "#666"} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={tStatic("ui.s_7ae8b433")}
              placeholderTextColor={isDark ? "#666" : "#999"}
              className={`${isDark ? "text-white" : "text-black"} flex-1 ml-2`}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row flex-wrap">
            {filtered.map((c) => (
              <ChipButton
                key={c.id}
                chip={c}
                selected={c.id === activeChipId}
                onPress={() => {
                  setActiveChipId(c.id);
                  sheetRef.current?.dismiss();
                }}
                compact
              />
            ))}
          </View>
        </ScrollView>
      </BottomSheetModal>
    </View>
  );
}

function ChipButton({
  chip,
  selected,
  onPress,
  compact,
  width,
}: {
  chip: Chip;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
  width?: number;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== "light";

  const bg = selected
    ? isDark
      ? "rgba(167,139,250,0.18)"
      : "rgba(109,40,217,0.12)"
    : isDark
      ? "rgba(255,255,255,0.06)"
      : "rgba(0,0,0,0.04)";

  const border = selected
    ? isDark
      ? "rgba(167,139,250,0.45)"
      : "rgba(109,40,217,0.35)"
    : isDark
      ? "rgba(255,255,255,0.08)"
      : "rgba(0,0,0,0.08)";

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      className={`${compact ? "mr-2 mb-2" : width ? "" : "mr-3"}`}
      style={({ pressed }) => ({
        transform: [{ scale: pressed ? 0.98 : 1 }],
        width,
        minWidth: width ? undefined : compact ? 106 : 118,
      })}
    >
      <View
        className="rounded-full overflow-hidden"
        style={{ backgroundColor: bg, borderWidth: 1, borderColor: border }}
      >
        <View className="flex-row items-center px-3 py-2">
          <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: chip.accent }} />
          <Text
            className={`${isDark ? "text-white" : "text-black"} font-bold text-sm`}
            numberOfLines={1}
          >
            {chip.label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function TrackCard({
  track,
  accent,
  isPlaying,
  isBuffering,
  onPlay,
  onUseSound,
}: {
  track: Track;
  accent: string;
  isPlaying: boolean;
  isBuffering: boolean;
  onPlay: () => void;
  onUseSound: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== "light";

  const border = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";

  return (
    <View className="mr-4" style={{ width: 158 }}>
      <Pressable
        onPress={onPlay}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        className="rounded-2xl overflow-hidden"
      >
        {track.cover ? (
          <Image
            source={{ uri: track.cover }}
            style={{ width: 158, height: 158 }}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={["rgba(94, 23, 235, 0.45)", "rgba(0,0,0,0.9)"]}
            style={{ width: 158, height: 158, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="musical-note" size={38} color="#fff" />
          </LinearGradient>
        )}

        {/* Play button overlay */}
        <View
          style={{
            position: "absolute",
            right: 10,
            bottom: 10,
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.18)",
            backgroundColor: "rgba(0,0,0,0.35)",
          }}
        >
          {isBuffering ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={18}
              color="#fff"
              style={{ marginLeft: isPlaying ? 0 : 1 }}
            />
          )}
        </View>
      </Pressable>

      {/* Meta */}
      <View
        className="mt-2"
        style={{
          borderBottomWidth: 0,
        }}
      >
        <Text
          className={`${isDark ? "text-white" : "text-black"} font-extrabold text-sm`}
          numberOfLines={1}
        >
          {track.title}
        </Text>
        <Text className={`${isDark ? "text-zinc-400" : "text-zinc-600"} text-xs`} numberOfLines={1}>
          {track.artist}
        </Text>

        <Pressable
          onPress={onUseSound}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          className="mt-2 flex-row items-center self-start"
        >
          <View
            className="px-2.5 py-1.5 rounded-full flex-row items-center"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              borderWidth: 1,
              borderColor: border,
            }}
          >
            <Ionicons name="musical-notes" size={13} color={isDark ? "#fff" : "#111"} />
            <Text
              className={`${isDark ? "text-white" : "text-black"} font-bold text-xs ml-1.5`}
            >{tStatic("ui.s_e445a869")}</Text>
          </View>

          {/* tiny accent dot */}
          <View className="ml-2 w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
        </Pressable>
      </View>
    </View>
  );
}

function SkeletonRail() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== "light";
  const tile = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";

  return (
    <View className="flex-row">
      {[0, 1, 2].map((i) => (
        <View key={i} className="mr-4" style={{ width: 158 }}>
          <View
            className="rounded-2xl"
            style={{ width: 158, height: 158, backgroundColor: tile }}
          />
          <View className="mt-2" style={{ width: 140, height: 10, backgroundColor: tile, borderRadius: 6 }} />
          <View className="mt-2" style={{ width: 100, height: 10, backgroundColor: tile, borderRadius: 6, opacity: 0.8 }} />
          <View className="mt-3" style={{ width: 96, height: 26, backgroundColor: tile, borderRadius: 999 }} />
        </View>
      ))}
    </View>
  );
}