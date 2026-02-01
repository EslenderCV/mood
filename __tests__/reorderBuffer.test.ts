import { ReorderBuffer } from "../src/brain/ranking/ReorderBuffer";
import type { RankableItem } from "../src/brain/ranking/ResonanceEngine";

type Item = RankableItem & { score: number };

const makeItem = (id: string, score: number, originalIndex: number): Item => ({
  id,
  score,
  originalIndex,
  creatorId: "creator-" + id,
  features: { energy: score, valence: score },
});


describe("ReorderBuffer", () => {
  test("mergeSortedTail keeps head frozen", () => {
    const items: Item[] = [
      makeItem("a", 1, 0),
      makeItem("b", 2, 1),
      makeItem("c", 3, 2),
      makeItem("d", 4, 3),
      makeItem("e", 5, 4),
    ];

    const buf = new ReorderBuffer<Item>(items);

    // user is viewing index 1 ("b"), safetyMargin=2 => lockBoundary=1+2+1=4
    // mergeSortedTail expects full RankableItem objects, not partials.
    const tail: Item[] = [items[4]];
    buf.mergeSortedTail(1, tail, 2);

    expect(buf.items.map((i) => i.id)).toEqual(["a", "b", "c", "d", "e"]);
  });

  test("getMutableTail excludes frozen zone", () => {
    const items: Item[] = [
      makeItem("a", 1, 5),
      makeItem("b", 2, 6),
      makeItem("c", 3, 7),
      makeItem("d", 4, 8),
      makeItem("e", 5, 9),
    ];

    const buf = new ReorderBuffer<Item>(items);
    const tail = buf.getMutableTail(1, 2); // lockBoundary=4
    expect(tail.map((i) => i.id)).toEqual(["e"]);
  });
});