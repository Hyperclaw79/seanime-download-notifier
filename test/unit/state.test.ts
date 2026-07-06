import { describe, expect, it } from "vitest";
import { createMemoryStore, pendingTorrents, TorrentState, trackTorrent } from "../../src/core/state";
import { deepStrictEqual } from "assert";

describe("tracking state", () => {
  it("de-duplicates hashes case-insensitively", () => {
    const torrent = { hash: "ABC", name: "Episode", source: "auto_downloader" as const, addedAt: "2026-01-01T00:00:00Z", notifyAttempts: 0 };
    const first = trackTorrent({}, torrent);
    const second = trackTorrent(first.state, { ...torrent, hash: "abc" });
    expect(first.added).toBe(true);
    expect(second.added).toBe(false);
    expect(Object.keys(second.state)).toEqual(["abc"]);
  });

  it("keeps memory-store snapshots isolated from callers", () => {
    const store = createMemoryStore();
    const torrent = { hash: "abc", name: "Episode", source: "auto_downloader" as const, addedAt: "2026-01-01T00:00:00Z", notifyAttempts: 0 };
    store.save({ abc: torrent });
    const loaded = store.load();
    loaded.abc!.name = "mutated";
    expect(store.load().abc?.name).toBe("Episode");
  });
});

describe("pendingTorrents", () => {
  it("returns only torrents without a notifiedAt timestamp", () => {
    const state: TorrentState = {
      "hash-1": {
        hash: "hash-1",
        name: "First",
        source: "auto_downloader",
        addedAt: "2024-01-01T00:00:00.000Z",
        notifyAttempts: 0,
        notifiedAt: "2024-01-01T01:00:00.000Z",
      },
      "hash-2": {
        hash: "hash-2",
        name: "Second",
        source: "auto_downloader",
        addedAt: "2024-01-01T00:00:00.000Z",
        notifyAttempts: 0,
      },
      "hash-3": {
        hash: "hash-3",
        name: "Third",
        source: "auto_downloader",
        addedAt: "2024-01-01T00:00:00.000Z",
        notifyAttempts: 0,
        notifiedAt: "2024-01-01T02:00:00.000Z",
      },
    };

    const pending = pendingTorrents(state);

    deepStrictEqual(
      pending.map((record) => record.hash),
      ["hash-2"],
    );
  });
});