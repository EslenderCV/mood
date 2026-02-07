import { FeedItem } from "@/context/FeedProvider";
import { MoodSessionManager } from "@/src/brain/session/MoodSessionManager";
import { SeenStateStore } from "@/src/feed/seen/SeenStateStore";
import { FeedSource, MixBandit } from "@/src/feed/brain/MixBandit";
import { parseSongData } from "@/lib/postUtils";

export type RankedCandidate = {
  item: FeedItem;
  postId: string;
  creatorId: string;
  source: FeedSource;
  score: number;
  reasonCodes: string[];
  primaryTag?: string; // for diversity (artist/mood tag)
  tagType?: "mood" | "artist";
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const nowMs = () => Date.now();

const getCreatorId = (post: any): string => {
  return (
    post?.creator?.$id ||
    post?.postedBy?.$id ||
    post?.users?.[0]?.$id ||
    post?.userId ||
    "unknown"
  );
};

const getPostDateMs = (post: any): number => {
  const t = post?.originalTime || post?.$createdAt || 0;
  const d = new Date(t).getTime();
  return Number.isFinite(d) ? d : 0;
};

const getEngagementScore = (post: any): number => {
  const likes = Array.isArray(post?.likedBy) ? post.likedBy.length : 0;
  const saves = Array.isArray(post?.savedBy) ? post.savedBy.length : 0;
  const comments = typeof post?.commentsCount === "number" ? post.commentsCount : 0;

  // saturating transform
  const x = likes * 1.0 + saves * 1.35 + comments * 0.9;
  const k = 18;
  return clamp01(1 - Math.exp(-x / k));
};

const recencyScore = (ageHours: number): number => {
  // exp decay, ~0.5 at 48h, ~0.25 at 96h
  const tau = 48;
  return clamp01(Math.exp(-Math.max(0, ageHours) / tau));
};

const normalizeAffinity = (x: number): number => {
  // x is unbounded-ish (maps store raw), clamp to [0..1] with mild saturation
  return clamp01(x / 1.5);
};

const chooseSource = (args: {
  isFollowedOrMine: boolean;
  ageHours: number;
  engagement: number;
  artistAffinity: number;
  creatorAffinity: number;
  tagAffinity: number;
}): FeedSource => {
  if (args.isFollowedOrMine) return "following";

  // trending: fairly recent + high engagement
  if (args.ageHours <= 36 && args.engagement >= 0.25) return "trending";

  // reco: any affinity or decent engagement
  if (
    args.artistAffinity >= 0.20 ||
    args.creatorAffinity >= 0.20 ||
    args.tagAffinity >= 0.20 ||
    args.engagement >= 0.18
  )
    return "reco";

  return "explore";
};

const allocateCounts = (
  pageSize: number,
  weights: Record<FeedSource, number>,
  opts: { isTopOfFeed: boolean },
): Record<FeedSource, number> => {
  const raw: Record<FeedSource, number> = {
    following: Math.round(pageSize * weights.following),
    reco: Math.round(pageSize * weights.reco),
    trending: Math.round(pageSize * weights.trending),
    explore: Math.round(pageSize * weights.explore),
  };

  // Fix rounding to sum exactly pageSize
  let sum = raw.following + raw.reco + raw.trending + raw.explore;
  const order: FeedSource[] = ["reco", "following", "trending", "explore"];

  while (sum > pageSize) {
    for (const s of order) {
      if (sum <= pageSize) break;
      if (raw[s] > 0) {
        raw[s] -= 1;
        sum -= 1;
      }
    }
  }
  while (sum < pageSize) {
    for (const s of order) {
      if (sum >= pageSize) break;
      raw[s] += 1;
      sum += 1;
    }
  }

  // IG-like: ensure following presence in top page
  if (opts.isTopOfFeed) {
    const minFollowing = Math.min(pageSize, 6);
    if (raw.following < minFollowing) {
      const need = minFollowing - raw.following;
      raw.following += need;
      let remaining = need;
      const donors: FeedSource[] = ["reco", "explore", "trending"];
      for (const d of donors) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, Math.max(0, raw[d] - 1));
        raw[d] -= take;
        remaining -= take;
      }
    }
  }

  // Rebalance
  sum = raw.following + raw.reco + raw.trending + raw.explore;
  while (sum > pageSize) {
    for (const s of order) {
      if (sum <= pageSize) break;
      if (
        raw[s] > 0 &&
        !(opts.isTopOfFeed && s === "following" && raw.following <= 6)
      ) {
        raw[s] -= 1;
        sum -= 1;
      }
    }
  }
  while (sum < pageSize) {
    raw.reco += 1;
    sum += 1;
  }

  return raw;
};

const violatesDiversity = (
  picked: RankedCandidate[],
  cand: RankedCandidate,
): boolean => {
  if (cand.creatorId === "unknown") return false;

  const last1 = picked[picked.length - 1];
  const last2 = picked[picked.length - 2];

  // No more than 2 consecutive by creator
  if (
    last1 &&
    last2 &&
    last1.creatorId === cand.creatorId &&
    last2.creatorId === cand.creatorId
  )
    return true;

  // window of 6: max 2 same creator
  const window = picked.slice(-6);
  const countCreator = window.filter((x) => x.creatorId === cand.creatorId)
    .length;
  if (countCreator >= 2) return true;

  // Tag / mood diversity (anti-fatigue)
  if (cand.primaryTag) {
    const t = cand.primaryTag;
    const isMood = cand.tagType === "mood";

    // No more than 2 consecutive mood tags; artist tags can be a bit looser.
    const maxConsecutive = isMood ? 2 : 3;
    let streak = 0;
    for (let i = picked.length - 1; i >= 0; i--) {
      if (picked[i].primaryTag === t) streak += 1;
      else break;
    }
    if (streak >= maxConsecutive) return true;

    // Window cap (prevents repeating the same mood/artist too frequently)
    const windowSize = 7;
    const maxInWindow = isMood ? 2 : 3;
    const w = picked.slice(-windowSize);
    const countTag = w.filter((x) => x.primaryTag === t).length;
    if (countTag >= maxInWindow) return true;
  }

  return false;
};

export class HomeFeedBrain {
  /**
   * Build a ranked page from a pool of candidates.
   * Client-heavy Phase-2: retrieval is from local pool + getFeedPage pagination.
   */
  public static buildPage(args: {
    candidates: FeedItem[]; // posts only
    userId: string;
    myFollowedIds: string[];
    servedPostIds: Set<string>;
    pageSize: number;
    isTopOfFeed: boolean;
    seen: SeenStateStore;
    bandit: MixBandit;
    session: MoodSessionManager;
  }): RankedCandidate[] {
    const ts = nowMs();

    const scored: RankedCandidate[] = [];

    // 1) score & source classify
    for (const it of args.candidates) {
      if (!it || it.type !== "post") continue;
      const post = it.data;
      const postId = post?.$id;
      if (!postId) continue;
      if (args.servedPostIds.has(postId)) continue;
      if (args.seen.shouldSuppress(postId)) continue;

      const creatorId = getCreatorId(post);
      const isMineOrFollowed =
        creatorId === args.userId || args.myFollowedIds.includes(creatorId);

      const ageHours = (ts - getPostDateMs(post)) / (60 * 60 * 1000);
      const rec = recencyScore(ageHours);
      const eng = getEngagementScore(post);

      const song =
        typeof post?.songData === "string" ? parseSongData(post.songData) : null;
      const artistName = (song?.artistName || song?.artist || "").toString();

      const moodTag = post?.emotionalTag ? String(post.emotionalTag) : undefined;

      const artistAffinity = normalizeAffinity(
        args.session.getArtistAffinity(artistName),
      );
      const creatorAffinity = normalizeAffinity(
        args.session.getCreatorAffinity(creatorId),
      );

      const tagAffinity = moodTag
        ? normalizeAffinity(args.session.getTagAffinity(moodTag))
        : 0;

      const src = chooseSource({
        isFollowedOrMine: isMineOrFollowed,
        ageHours,
        engagement: eng,
        artistAffinity,
        creatorAffinity,
        tagAffinity,
      });

      const penalty = args.seen.penalty(postId, ts);
      const sourceBoost =
        src === "following"
          ? 0.08
          : src === "reco"
            ? 0.05
            : src === "trending"
              ? 0.04
              : 0.0;

      const affinity = clamp01(
        Math.max(artistAffinity, creatorAffinity, tagAffinity),
      );
      const base =
        0.30 * rec +
        0.22 * eng +
        0.34 * affinity +
        0.14 * sourceBoost +
        (isMineOrFollowed ? 0.06 : 0);

      const score = base * (1 - Math.min(0.9, penalty));

      const primaryTag = moodTag
        ? moodTag
        : artistName
          ? String(artistName).toLowerCase()
          : undefined;

      const tagType: RankedCandidate["tagType"] = moodTag
        ? "mood"
        : artistName
          ? "artist"
          : undefined;

      const reasonCodes: string[] = [];
      if (src === "following") reasonCodes.push("FOLLOWING");
      if (src === "reco" && affinity > 0.2) {
        reasonCodes.push(moodTag && tagAffinity >= 0.2 ? "MOOD_AFFINITY" : "AFFINITY");
      }
      if (src === "trending") reasonCodes.push("TRENDING");
      if (penalty > 0.12) reasonCodes.push("SEEN_PENALTY");

      scored.push({
        item: it,
        postId,
        creatorId,
        source: src,
        score,
        reasonCodes,
        primaryTag,
        tagType,
      });
    }

    // 2) group by source, sort by score
    const bySource: Record<FeedSource, RankedCandidate[]> = {
      following: [],
      reco: [],
      trending: [],
      explore: [],
    };

    for (const c of scored) bySource[c.source].push(c);
    for (const s of Object.keys(bySource) as FeedSource[]) {
      bySource[s].sort((a, b) => b.score - a.score);
    }

    // 3) allocate quotas
    const weights = args.bandit.getWeights();
    const targets = allocateCounts(args.pageSize, weights, {
      isTopOfFeed: args.isTopOfFeed,
    });
    const remaining: Record<FeedSource, number> = { ...targets };

    const rankedOut: RankedCandidate[] = [];

    // IG-like top pattern: more following early, but not fixed.
    const topSlots: number[] = args.isTopOfFeed
      ? [0, 2, 5, 7, 10, 13, 17]
      : [];
    const pickOrder: FeedSource[] = ["reco", "following", "trending", "explore"];

    const pickFrom = (preferred?: FeedSource): RankedCandidate | null => {
      const options: FeedSource[] = preferred
        ? [preferred, ...pickOrder.filter((x) => x !== preferred)]
        : pickOrder;

      for (const src of options) {
        if (remaining[src] <= 0) continue;
        const list = bySource[src];

        while (list.length > 0) {
          const cand = list.shift()!;
          if (args.servedPostIds.has(cand.postId)) continue;
          if (violatesDiversity(rankedOut, cand)) continue;
          remaining[src] -= 1;
          return cand;
        }
      }
      return null;
    };

    for (let i = 0; i < args.pageSize; i++) {
      const prefer =
        args.isTopOfFeed && topSlots.includes(i) ? "following" : undefined;
      const cand = pickFrom(prefer);
      if (cand) rankedOut.push(cand);
    }

    // fill if shortages due to diversity/targets
    if (rankedOut.length < args.pageSize) {
      for (const src of pickOrder) {
        const list = bySource[src];
        while (rankedOut.length < args.pageSize && list.length > 0) {
          const cand = list.shift()!;
          if (args.servedPostIds.has(cand.postId)) continue;
          if (violatesDiversity(rankedOut, cand)) continue;
          rankedOut.push(cand);
        }
      }
    }

    return rankedOut;
  }
}
