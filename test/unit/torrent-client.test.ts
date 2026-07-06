import { describe, expect, it } from "vitest";
import { normalizeTorrentSnapshots } from "../../src/seanime/torrent-client";

describe("torrent snapshot normalization", () => {
  it("rejects non-arrays and malformed entries", () => {
    expect(normalizeTorrentSnapshots(null)).toEqual([]);
    expect(normalizeTorrentSnapshots([
      null,
      { hash: 1, name: "bad", progress: 1 },
      { hash: "a", name: 2, progress: 1 },
      { hash: "a", name: "bad", progress: "1" },
    ])).toEqual([]);
  });

  it("defaults status and preserves optional content paths", () => {
    expect(normalizeTorrentSnapshots([
      { hash: "a", name: "A", progress: 0.5 },
      { hash: "b", name: "B", progress: 1, status: "seeding", contentPath: "/downloads/B" },
    ])).toEqual([
      { hash: "a", name: "A", progress: 0.5, status: "other" },
      { hash: "b", name: "B", progress: 1, status: "seeding", contentPath: "/downloads/B" },
    ]);
  });
});
