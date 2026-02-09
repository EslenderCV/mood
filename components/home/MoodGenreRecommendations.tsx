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
import AsyncStorage from "@react-native-async-storage/async-storage";

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

// --- Music Provider (Apple Charts + iTunes preview) ---
// Goal: show "today's" (or at least periodically rotating) trending suggestions to everyone,
// without personalizing per user profile, and using reliable, globally-popular catalogs.
// We use Apple Marketing Tools RSS charts (free) to get "most played" songs (updated daily),
// then iTunes Search API lookup to obtain a short preview URL for playback.
// Sources:
// - Apple Marketing Tools RSS (JSON): https://rss.applemarketingtools.com
// - iTunes Search API (lookup): https://itunes.apple.com/lookup (previewUrl field)

const APPLE_RSS_BASE = "https://rss.applemarketingtools.com/api/v2";
const ITUNES_LOOKUP_BASE = "https://itunes.apple.com/lookup";
const ITUNES_SEARCH_BASE = "https://itunes.apple.com/search";

// Storefronts: Dominican Republic first, then a few big catalogs for broader/global variety.
// (More storefronts -> more diverse pool, still trending.)
const STOREFRONTS = ["do", "us", "gb", "es"];

// "Today's suggestions": rotate daily (same list within the same day).
const ROTATION_WINDOW_HOURS = 24;

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_TRACKS = 12;

// --- "Today's suggestions" caching + deterministic per-device shuffle ---
// Goal: suggestions change at least daily, and differ across users (device seed),
// without personalizing by user profile.
const DEVICE_SEED_STORAGE_KEY = "mood:device_seed:v1";
// Bump cache version so older recommendation caches won't keep showing the same list forever.
// Bump cache version whenever the recommendation strategy changes,
// so users don't keep seeing a stale list.
const DAILY_RECS_STORAGE_KEY_PREFIX = "mood:daily_recs:v4";

type DailyStoredRecs = { cycleKey: string; tracks: Track[] };

function getLocalCycleKey(windowHours: number = ROTATION_WINDOW_HOURS): string {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  // Daily rotation (no buckets). If you ever want to rotate more often,
  // set ROTATION_WINDOW_HOURS < 24.
  if (windowHours >= 24) return `${yyyy}-${mm}-${dd}`;

  const hours = d.getHours();
  const bucket = Math.floor(hours / Math.max(windowHours, 1));
  return `${yyyy}-${mm}-${dd}-b${bucket}`;
}

function hashToSeed32(input: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function getOrCreateDeviceSeed(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_SEED_STORAGE_KEY);
    if (existing) return existing;
  } catch {}
  const seed = String(Math.floor(Math.random() * 1_000_000_000));
  try {
    await AsyncStorage.setItem(DEVICE_SEED_STORAGE_KEY, seed);
  } catch {}
  return seed;
}

async function loadDailyRecs(chipId: string): Promise<DailyStoredRecs | null> {
  try {
    const raw = await AsyncStorage.getItem(`${DAILY_RECS_STORAGE_KEY_PREFIX}:${chipId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.cycleKey || !Array.isArray(parsed?.tracks)) return null;
    return parsed as DailyStoredRecs;
  } catch {
    return null;
  }
}

async function saveDailyRecs(chipId: string, cycleKey: string, tracks: Track[]) {
  try {
    const payload: DailyStoredRecs = { cycleKey, tracks };
    await AsyncStorage.setItem(`${DAILY_RECS_STORAGE_KEY_PREFIX}:${chipId}`, JSON.stringify(payload));
  } catch {}
}

// Chips visibles en UI (2 filas: moods arriba, géneros abajo)
// Importante: no cambiar el diseño; solo se usa como "filtro" suave para tendencias.
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
    queries: ["pop hits", "top pop", "pop viral", "pop"],
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
    queries: ["hip hop hits", "rap hits", "trap hits", "hip hop"],
  },
  {
    id: "genre_edm",
    label: "Electrónica",
    type: "genre",
    accent: "#A78BFA",
    playlistKeywords: ["dance", "edm", "electronic", "house", "techno"],
    queries: ["edm hits", "electronic dance", "house hits", "techno"],
  },
  {
    id: "genre_kpop",
    label: "K-Pop",
    type: "genre",
    accent: "#C084FC",
    playlistKeywords: ["k-pop", "kpop", "k pop"],
    queries: ["kpop hits", "k-pop trending", "kpop essentials", "kpop"],
  },
];

// --- Genre separation: strong matching per chip ---
// Apple charts are global "most played" lists. To keep recommendations truly aligned with the selected chip
// (K-Pop, Hip-Hop, Rock, etc.), we do a stricter match on Apple-provided genre names, and if that pool is
// too small we fill using iTunes Search with genre-specific terms (still trending-ish / popular, but accurate).
type ChipMatchConfig = {
  // Tokens that should appear in Apple genre/name/artist text (normalized).
  includeAny: string[];
  // Tokens that should NOT appear (helps avoid bleed between chips).
  excludeAny?: string[];
  // iTunes Search fallback terms to fill up to MAX_TRACKS.
  itunesTerms?: string[];
  // Prefer searching in a specific country catalog (US tends to be more global; DO for local latin picks).
  preferCountry?: "DO" | "US";
};

const CHIP_QUERY_CONFIG: Record<string, ChipMatchConfig> = {
  genre_kpop: {
    includeAny: ["k-pop", "kpop", "korean pop", "korean"],
    itunesTerms: ["k-pop hits", "kpop", "k-pop essentials", "korean pop"],
    preferCountry: "US",
  },
  genre_hiphop: {
    includeAny: ["hip-hop", "hip hop", "rap", "trap"],
    // keep it more global by excluding latin-urban terms here
    excludeAny: ["reggaeton", "dembow", "latin", "urbano"],
    itunesTerms: ["hip-hop hits", "rap hits", "trap hits", "hip hop"],
    preferCountry: "US",
  },
  genre_rock: {
    includeAny: ["rock", "alternative", "alt rock", "indie", "metal", "punk"],
    itunesTerms: ["rock hits", "alternative rock", "indie rock", "rock classics"],
    preferCountry: "US",
  },
  genre_edm: {
    includeAny: ["edm", "electronic", "dance", "house", "techno", "trance"],
    itunesTerms: ["edm hits", "dance hits", "electronic", "house", "techno"],
    preferCountry: "US",
  },
  genre_pop: {
    includeAny: ["pop"],
    itunesTerms: ["pop hits", "top pop", "pop"],
    preferCountry: "US",
  },
  genre_latino: {
    includeAny: ["reggaeton", "dembow", "latin", "urbano", "latin trap", "trap latino"],
    itunesTerms: ["dembow", "reggaeton hits", "latin trap", "urbano latino"],
    preferCountry: "DO",
  },
};

function normalizeForMatch(s?: string): string {
  // Lowercase, strip accents-ish, and normalize punctuation to spaces.
  // (We keep it simple to avoid heavy deps.)
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getMatchConfigForChip(
  chip: Chip,
): Required<Pick<ChipMatchConfig, "includeAny" | "excludeAny" | "itunesTerms" | "preferCountry">> & { strict: boolean } {
  const cfg = CHIP_QUERY_CONFIG[chip.id];
  const includeAny =
    cfg?.includeAny?.length
      ? cfg.includeAny
      : Array.from(
          new Set([
            ...(chip.playlistKeywords || []),
            ...(chip.queries || []),
            chip.label,
          ]),
        );

  const excludeAny = cfg?.excludeAny?.length ? cfg.excludeAny : [];
  const itunesTerms =
    cfg?.itunesTerms?.length
      ? cfg.itunesTerms
      : Array.from(new Set([...(chip.queries || []), chip.label]));

  const preferCountry = cfg?.preferCountry || "US";
  const strict = chip.type === "genre";
  return { includeAny, excludeAny, itunesTerms, preferCountry, strict };
}


type AppleGenre = { genreId?: string; name?: string; url?: string };
type AppleChartItem = {
  id: string;
  name?: string;
  artistName?: string;
  artworkUrl100?: string;
  genres?: AppleGenre[];
};

function safeLower(s?: string) {
  return (s || "").toLowerCase();
}

function buildHaystackFromAppleItem(i: AppleChartItem): string {
  const genres = (i.genres || []).map((g) => g?.name || "").join(" ");
  return `${i.name || ""} ${i.artistName || ""} ${genres}`.toLowerCase();
}

function replaceArtworkSize(url?: string, size: number = 512): string | undefined {
  if (!url || typeof url !== "string") return url;
  // Common patterns from Apple artwork URLs.
  // Examples: .../100x100bb.jpg  or .../100x100bb.png
  return url.replace(/\d+x\d+bb\.(jpg|png)/i, `${size}x${size}bb.$1`);
}

const appleChartCache: Map<string, { ts: number; items: AppleChartItem[] }> = new Map();

async function fetchAppleMostPlayed(storefront: string, limit: number): Promise<AppleChartItem[]> {
  const key = `${storefront}:most-played:${limit}`;
  const cached = appleChartCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.items;

  const url = `${APPLE_RSS_BASE}/${encodeURIComponent(storefront)}/music/most-played/${Math.min(Math.max(limit, 1), 100)}/songs.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Apple charts failed: ${res.status}`);
  const json = await res.json();

  const items: AppleChartItem[] = (json?.feed?.results || [])
    .map((x: any) => ({
      id: String(x?.id ?? ""),
      name: x?.name,
      artistName: x?.artistName,
      artworkUrl100: x?.artworkUrl100,
      genres: x?.genres || [],
    }))
    .filter((x: AppleChartItem) => Boolean(x.id));

  appleChartCache.set(key, { ts: Date.now(), items });
  return items;
}

async function getAppleCandidates(): Promise<AppleChartItem[]> {
  // Merge multiple storefronts, de-dupe by id preserving order.
  const settled = await Promise.allSettled(
    STOREFRONTS.map((sf) => fetchAppleMostPlayed(sf, 100)),
  );

  const merged: AppleChartItem[] = [];
  const seen = new Set<string>();

  for (const part of settled) {
    if (part.status !== "fulfilled") continue;
    for (const item of part.value) {
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  }

  return merged;
}

type ItunesLookupResult = {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
};

async function itunesLookup(ids: string[], countryCode: string = "DO"): Promise<Map<string, ItunesLookupResult>> {
  const clean = (ids || []).map((x) => String(x)).filter(Boolean);
  const out = new Map<string, ItunesLookupResult>();
  if (!clean.length) return out;

  // iTunes lookup supports multiple ids separated by commas.
  const qs = new URLSearchParams();
  qs.set("id", clean.join(","));
  qs.set("entity", "song");
  // country is supported by iTunes Search API (defaults to US if omitted).
  qs.set("country", countryCode);

  const url = `${ITUNES_LOOKUP_BASE}?${qs.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes lookup failed: ${res.status}`);
  const json = await res.json();

  const results: ItunesLookupResult[] = json?.results || [];
  for (const r of results) {
    const id = r?.trackId != null ? String(r.trackId) : "";
    if (!id) continue;
    out.set(id, r);
  }
  return out;
}

async function itunesSearch(
  term: string,
  countryCode: string = "US",
  limit: number = 25,
): Promise<ItunesLookupResult[]> {
  const q = String(term || "").trim();
  if (!q) return [];
  const qs = new URLSearchParams();
  qs.set("term", q);
  qs.set("entity", "song");
  qs.set("media", "music");
  qs.set("limit", String(Math.min(Math.max(limit, 1), 50)));
  qs.set("country", countryCode);

  const url = `${ITUNES_SEARCH_BASE}?${qs.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes search failed: ${res.status}`);
  const json = await res.json();
  return (json?.results || []) as ItunesLookupResult[];
}

function tracksFromItunesResults(
  results: ItunesLookupResult[],
  rand: () => number,
  seen: Set<string>,
  max: number,
): Track[] {
  const items = (results || [])
    .map((r) => {
      const id = r?.trackId != null ? String(r.trackId) : "";
      const title = r?.trackName || "";
      const artist = r?.artistName || "";
      const preview = r?.previewUrl ? String(r.previewUrl).replace(/^http:/i, "https:") : undefined;
      const cover = replaceArtworkSize(
        r?.artworkUrl100 ? String(r.artworkUrl100).replace(/^http:/i, "https:") : undefined,
        512,
      );

      if (!id || !title || !artist || !preview) return null;
      return {
        id,
        title,
        artist,
        preview,
        cover,
        duration: r?.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : undefined,
      } as Track;
    })
    .filter(Boolean) as Track[];

  // deterministic shuffle then take uniques
  shuffleInPlace(items, rand);

  const out: Track[] = [];
  for (const t of items) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function buildTracksFromLookup(
  candidateIds: string[],
  lookupMap: Map<string, ItunesLookupResult>,
  fallbackCandidates: Map<string, AppleChartItem>,
): Track[] {
  const tracks: Track[] = [];
  for (const id of candidateIds) {
    const r = lookupMap.get(id);
    const c = fallbackCandidates.get(id);

    const title = r?.trackName || c?.name || "";
    const artist = r?.artistName || c?.artistName || "";
    const preview = r?.previewUrl ? String(r.previewUrl).replace(/^http:/i, "https:") : undefined;
    const cover = replaceArtworkSize(
      (r?.artworkUrl100 ? String(r.artworkUrl100).replace(/^http:/i, "https:") : undefined) || c?.artworkUrl100,
      512,
    );

    if (!id || !title || !artist || !preview) continue;

    tracks.push({
      id: String(id),
      title,
      artist,
      preview,
      cover,
      duration: r?.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : undefined,
    });
  }
  return tracks;
}

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
  rand: () => number,
): Promise<Track[]> {
  // Fetch trending candidates (charts) and keep them tightly aligned with the selected chip.
  // For genre chips, we match strongly against Apple-provided genre labels and avoid falling back to the full
  // chart list (which caused cross-genre mixes). If the aligned pool is too small, we fill from
  // iTunes Search using genre-specific terms.
  const allCandidates = await getAppleCandidates();

  const { includeAny, excludeAny, itunesTerms, preferCountry, strict } = getMatchConfigForChip(chip);

  const includeNorm = Array.from(
    new Set(
      (includeAny || [])
        .flatMap((k) => String(k || "").split(/\s+/g))
        .map((k) => normalizeForMatch(k))
        .filter((k) => k.length >= 3),
    ),
  );

  const excludeNorm = Array.from(
    new Set(
      (excludeAny || [])
        .flatMap((k) => String(k || "").split(/\s+/g))
        .map((k) => normalizeForMatch(k))
        .filter((k) => k.length >= 3),
    ),
  );

  const matches = (item: AppleChartItem) => {
    const hay = normalizeForMatch(buildHaystackFromAppleItem(item));
    const hasInclude = includeNorm.length ? includeNorm.some((k) => hay.includes(k)) : true;
    const hasExclude = excludeNorm.length ? excludeNorm.some((k) => hay.includes(k)) : false;
    return hasInclude && !hasExclude;
  };

  let filtered = allCandidates.filter(matches);

  // For mood chips (non-strict), if filtering gets too narrow, we can broaden a bit.
  // For genre chips (strict), DO NOT fall back to the full charts, because that breaks the category.
  if (!strict && filtered.length < 25) filtered = allCandidates;

  // Deterministic rotation (cycleKey + device seed): sample from the pool.
  const poolSize = Math.min(filtered.length, 80);
  const pool = filtered.slice(0, poolSize);
  shuffleInPlace(pool, rand);

  // Take more than we need (some lookups may not have previewUrl in the chosen country).
  const candidateIds: string[] = [];
  const fallbackMap = new Map<string, AppleChartItem>();

  for (const item of pool) {
    if (!item?.id) continue;
    if (candidateIds.includes(item.id)) continue;
    candidateIds.push(item.id);
    fallbackMap.set(item.id, item);
    if (candidateIds.length >= 60) break;
  }

  // Lookup previews: try preferred country first (DO for latin, US for global), then fall back to US.
  let lookupMap = await itunesLookup(candidateIds, preferCountry);
  const missing = candidateIds.filter((id) => !lookupMap.has(id));

  if (missing.length) {
    try {
      const fallback = await itunesLookup(missing, "US");
      for (const [k, v] of fallback.entries()) lookupMap.set(k, v);
    } catch {}
  }

  const built = buildTracksFromLookup(candidateIds, lookupMap, fallbackMap);
  const out: Track[] = built.slice(0, MAX_TRACKS);

  // If we still don't have enough (common for stricter genres), fill with iTunes Search.
  if (out.length < MAX_TRACKS) {
    const seen = new Set(out.map((t) => t.id));
    const terms = [...(itunesTerms || [])].map((t) => String(t || "").trim()).filter(Boolean);
    shuffleInPlace(terms, rand);

    // Small number of searches to keep it fast.
    for (const term of terms.slice(0, 3)) {
      if (out.length >= MAX_TRACKS) break;
      try {
        const results = await itunesSearch(term, preferCountry, 35);
        const more = tracksFromItunesResults(results, rand, seen, MAX_TRACKS - out.length);
        out.push(...more);
      } catch {
        // ignore and continue
      }
    }
  }

  // Guarantee max size
  return out.slice(0, MAX_TRACKS);
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
  let alive = true;
  const reqId = ++reqIdRef.current;

  const cycleKey = getLocalCycleKey();
  const dayKey = `${activeChipId}:${cycleKey}`;

  const applyTracks = (list: Track[]) => {
    setTracks(list);
    setError(null);
  };

  // 1) In-memory cache for *today*
  const cached = cacheRef.current.get(dayKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    applyTracks(cached.tracks);
    return () => {
      alive = false;
    };
  }

  setLoading(true);
  setError(null);

  // soften-out while loading, then fade-in when ready
  try {
    fadeAnim.stopAnimation();
    fadeAnim.setValue(0.55);
  } catch {}

  (async () => {
    try {
      // 2) Persistent daily cache ("Today's suggestions") so it doesn't change within the same day.
      const stored = await loadDailyRecs(activeChipId);
      if (!alive || reqId !== reqIdRef.current) return;

      if (stored?.cycleKey === cycleKey && stored.tracks?.length) {
        cacheRef.current.set(dayKey, { ts: Date.now(), tracks: stored.tracks });
        applyTracks(stored.tracks);
        try {
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }).start();
        } catch {}
        return;
      }

      // 3) Fetch trending/curated candidates and pick a deterministic (per-device) shuffled set for today.
      const deviceSeed = await getOrCreateDeviceSeed();
      const seed = hashToSeed32(`${deviceSeed}:${cycleKey}:${activeChipId}`);
      const rand = mulberry32(seed);

      const res = await fetchBetterTracksForChip(activeChip, rand);
      if (!alive || reqId !== reqIdRef.current) return;

      cacheRef.current.set(dayKey, { ts: Date.now(), tracks: res });
      applyTracks(res);
      // Save in background; even if it fails, the UX still works.
      saveDailyRecs(activeChipId, cycleKey, res);

      try {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
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