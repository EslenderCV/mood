import { coerceOverrides, FLAG_DEFAULTS } from "../src/config/flags";

describe("flags", () => {
  test("coerceOverrides keeps only boolean known keys", () => {
    const raw: any = {
      brainRankingHome: false,
      shimmerSkeleton: true,
      unknownKey: true,
      audioPrefetch: "yes",
    };

    const res = coerceOverrides(raw);
    expect(res).toEqual({
      brainRankingHome: false,
      shimmerSkeleton: true,
    });
  });

  test("defaults are stable", () => {
    expect(typeof FLAG_DEFAULTS.brainRankingHome).toBe("boolean");
    expect(typeof FLAG_DEFAULTS.fadeTransitions).toBe("boolean");
  });
});
