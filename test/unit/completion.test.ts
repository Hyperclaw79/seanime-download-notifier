import { describe, expect, it } from "vitest";
import { isTorrentComplete } from "../../src/core/completion";

describe("completion detection", () => {
  it.each([
    [1, "paused", true], [1.2, "stopped", true], [0.99, "seeding", false], [0, "downloading", false],
  ])("uses normalized progress %s at status %s", (progress, status, expected) => {
    expect(isTorrentComplete({ hash: "a", name: "x", progress, status })).toBe(expected);
  });
});
