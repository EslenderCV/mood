/**
 * Small, testable helpers for ShazamKit flows.
 *
 * These helpers are intentionally framework-agnostic (no React / no native imports)
 * so they can be unit-tested in Jest.
 */

export type ShazamMatch = {
  title?: string | null;
  artist?: string | null;
  artworkURL?: string | null;
  appleMusicID?: string | number | null;
  shazamID?: string | number | null;
};

export type ShazamDetected = {
  title: string;
  artist: string;
  artworkURL?: string;
};

export type DeezerLikeSong = {
  title: string;
  artist: string;
  preview: string | null;
  [k: string]: any;
};

export function buildShazamQuery(title?: string, artist?: string) {
  return `${String(title ?? "").trim()} ${String(artist ?? "").trim()}`.trim();
}

export function toShazamDetected(match: ShazamMatch): ShazamDetected {
  const title = String(match.title ?? "").trim();
  const artist = String(match.artist ?? "").trim();
  const artworkURL = String(match.artworkURL ?? "").trim();

  return {
    title: title || "Canción detectada",
    artist: artist || "Artista",
    artworkURL: artworkURL || undefined,
  };
}

export function buildFallbackSongFromShazamMatch(
  match: ShazamMatch,
  now: () => number = Date.now,
) {
  const title = String(match.title ?? "").trim();
  const artist = String(match.artist ?? "").trim();
  const artworkURL = String(match.artworkURL ?? "").trim();

  const idPart = match.appleMusicID ?? match.shazamID ?? now();

  return {
    id: `shazam:${idPart}`,
    title: title || "Canción detectada",
    artist: artist || "Artista",
    cover: artworkURL || "",
    preview: null,
    isExplicit: false,
  };
}

function normalize(str: string) {
  return String(str)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // remove (...) e.g. (remix)
    .replace(/\[[^\]]*\]/g, " ") // remove [...]
    .replace(/\b(feat|ft|featuring)\b\.?/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(str: string) {
  const n = normalize(str);
  return new Set(n ? n.split(" ") : []);
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Pick a "best" Deezer-like match for a Shazam detection.
 *
 * Premium rules (simple + predictable):
 * - Prefer items with a preview.
 * - Prefer higher token similarity on title and artist.
 * - Stable tie-breaker: first in list.
 */
export function pickBestDeezerMatch<T extends DeezerLikeSong>(
  results: T[],
  detected: { title: string; artist: string },
): T | null {
  if (!Array.isArray(results) || results.length === 0) return null;

  const titleTokens = tokenSet(detected.title);
  const artistTokens = tokenSet(detected.artist);

  let best: T | null = null;
  let bestScore = -Infinity;

  for (const item of results) {
    const hasPreview = !!item.preview;
    const tScore = jaccard(titleTokens, tokenSet(item.title));
    const aScore = jaccard(artistTokens, tokenSet(item.artist));

    // Weight preview heavily, then title, then artist.
    const score = (hasPreview ? 10 : 0) + tScore * 5 + aScore * 3;

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return best ?? results[0] ?? null;
}
