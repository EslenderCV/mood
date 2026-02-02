import {
  buildFallbackSongFromShazamMatch,
  buildShazamQuery,
  pickBestDeezerMatch,
  toShazamDetected,
} from "../lib/shazam";

describe("shazam helpers", () => {
  test("buildShazamQuery trims and joins title + artist", () => {
    expect(buildShazamQuery("  Monaco  ", "  Bad Bunny ")).toBe(
      "Monaco Bad Bunny",
    );
    expect(buildShazamQuery("", "  Bad Bunny ")).toBe("Bad Bunny");
    expect(buildShazamQuery(undefined, undefined)).toBe("");
  });

  test("toShazamDetected provides safe fallbacks for UI", () => {
    expect(toShazamDetected({ title: "  ", artist: null })).toEqual({
      title: "Canción detectada",
      artist: "Artista",
      artworkURL: undefined,
    });
  });

  test("buildFallbackSongFromShazamMatch prefers appleMusicID then shazamID", () => {
    const withApple = buildFallbackSongFromShazamMatch(
      {
        title: "Monaco",
        artist: "Bad Bunny",
        artworkURL: "https://img",
        appleMusicID: "123",
        shazamID: "999",
      },
      () => 111,
    );

    expect(withApple.id).toBe("shazam:123");
    expect(withApple.preview).toBeNull();
    expect(withApple.cover).toBe("https://img");

    const withShazam = buildFallbackSongFromShazamMatch(
      { title: "Monaco", artist: "Bad Bunny", shazamID: 777 },
      () => 111,
    );
    expect(withShazam.id).toBe("shazam:777");

    const withNow = buildFallbackSongFromShazamMatch(
      { title: "Monaco", artist: "Bad Bunny" },
      () => 999,
    );
    expect(withNow.id).toBe("shazam:999");
  });

  test("pickBestDeezerMatch prefers preview and best similarity", () => {
    const detected = { title: "Monaco", artist: "Bad Bunny" };
    const results = [
      {
        id: "1",
        title: "Monaco",
        artist: "Bad Bunny",
        preview: null,
      },
      {
        id: "2",
        title: "Monaco",
        artist: "Bad Bunny",
        preview: "https://preview",
      },
      {
        id: "3",
        title: "Monaco (Remix)",
        artist: "Bad Bunny feat. Someone",
        preview: "https://preview2",
      },
    ];

    const best = pickBestDeezerMatch(results, detected);
    expect(best?.id).toBe("2");
  });
});
