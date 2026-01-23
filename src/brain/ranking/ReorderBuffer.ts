import { RankableItem } from './ResonanceEngine';

/**
 * Manages the "Invisible Buffer".
 * Ensures strictly that items currently on screen or immediately next
 * are NEVER reordered to prevent UI jumping.
 */
export class ReorderBuffer<T extends RankableItem> {
  private _items: T[];

  constructor(initialItems: T[] = []) {
    this._items = initialItems;
  }

  public get items(): T[] {
    return this._items;
  }

  public setItems(items: T[]) {
    this._items = items;
  }

  /**
   * Replaces the tail of the list with sorted items, keeping the head frozen.
   */
  public mergeSortedTail(
    currentViewableIndex: number, 
    sortedTail: T[], 
    safetyMargin: number = 2
  ): void {
    const lockBoundary = Math.min(
      this._items.length,
      currentViewableIndex + safetyMargin + 1
    );

    const head = this._items.slice(0, lockBoundary);
    // Merge: Head (Frozen) + Tail (Reordered)
    this._items = [...head, ...sortedTail];
  }

  /**
   * Extracts items that are safe to reorder (beyond the frozen zone).
   */
  public getMutableTail(currentViewableIndex: number, safetyMargin: number = 2): T[] {
    const lockBoundary = Math.min(
      this._items.length,
      currentViewableIndex + safetyMargin + 1
    );
    return this._items.slice(lockBoundary);
  }
}