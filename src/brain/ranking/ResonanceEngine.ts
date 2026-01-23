import { SessionVector } from "../session/SessionVector";

export interface RankableItem {
  id: string;
  creatorId: string;
  features: {
    energy: number;
    valence: number;
    emotionalTag?: string;
  };
  originalIndex: number;
}

export class ResonanceEngine {
  private static calculateRepetitionPenalty(item: RankableItem, recentContext: RankableItem[]): number {
    let penalty = 0;
    const CREATOR_PENALTY = 0.35;
    const TAG_PENALTY = 0.15;

    const lookbackWindow = recentContext.slice(-5);

    for (const contextItem of lookbackWindow) {
      if (contextItem.creatorId === item.creatorId) {
        penalty += CREATOR_PENALTY;
      }
      if (item.features.emotionalTag && contextItem.features.emotionalTag === item.features.emotionalTag) {
        penalty += TAG_PENALTY;
      }
    }
    return Math.min(penalty, 0.8);
  }

  /**
   * Score final: Resonancia - Penalización + Boosts de Afinidad.
   */
  static calculateScore(
    item: RankableItem,
    session: SessionVector,
    recentContext: RankableItem[],
    creatorAffinity?: Map<string, number>,
    tagAffinity?: Map<string, number>
  ): number {
    // 1) Resonancia base (distancia inversa)
    const distance = session.distanceTo(item.features);
    const resonanceScore = 1 / (1 + distance * 2);

    // 2) Penalización por repetición
    const penalty = this.calculateRepetitionPenalty(item, recentContext);

    // 3) Boosts de afinidad
    let boosts = 0;

    if (creatorAffinity && item.creatorId && item.creatorId !== "system") {
      const affinity = creatorAffinity.get(item.creatorId) || 0;
      boosts += Math.max(-0.5, Math.min(0.5, affinity * 0.25));
    }

    if (tagAffinity && item.features.emotionalTag) {
      const affinity = tagAffinity.get(item.features.emotionalTag) || 0;
      boosts += Math.max(-0.5, Math.min(0.5, affinity * 0.2));
    }

    return Math.max(0, resonanceScore - penalty + boosts);
  }

  static rank<T extends RankableItem>(
    mutableTail: T[],
    session: SessionVector,
    recentContext: T[],
    creatorAffinity?: Map<string, number>,
    tagAffinity?: Map<string, number>
  ): T[] {
    const scoredItems = mutableTail.map((item) => ({
      item,
      score: this.calculateScore(item, session, recentContext, creatorAffinity, tagAffinity),
    }));

    scoredItems.sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.01) {
        return b.score - a.score;
      }
      return a.item.originalIndex - b.item.originalIndex;
    });

    return scoredItems.map((wrapper) => wrapper.item);
  }
}
