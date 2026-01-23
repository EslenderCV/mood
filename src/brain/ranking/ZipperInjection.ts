import { RankableItem } from './ResonanceEngine';

/**
 * Utility to inject "Variance" or "Discovery" items into a sorted list.
 */
export class ZipperInjection {
  
  /**
   * Injects exploration items at fixed intervals within the ranked feed.
   */
  static injectVariance<T extends RankableItem>(
    rankedFeed: T[], 
    explorationItems: T[], 
    interval: number = 8
  ): T[] {
    const result = [...rankedFeed];
    let insertedCount = 0;

    explorationItems.forEach((item) => {
      const targetIndex = (insertedCount + 1) * interval;
      
      if (targetIndex < result.length) {
        result.splice(targetIndex, 0, item);
        insertedCount++;
      } else {
        result.push(item);
      }
    });

    return result;
  }
}