import { describe, expect, it } from "vitest";
import { removeExpiredNotified } from "../../src/core/retention";

describe("retention", () => {
  it("removes old notified records and preserves pending records", () => {
    const base = { name: "x", source: "auto_downloader" as const, addedAt: "2025-01-01T00:00:00Z", notifyAttempts: 1 };
    const result = removeExpiredNotified({ old: { ...base, hash: "old", notifiedAt: "2025-01-01T00:00:00Z" }, pending: { ...base, hash: "pending" } }, 30, new Date("2026-01-01T00:00:00Z"));
    expect(result.old).toBeUndefined();
    expect(result.pending).toBeDefined();
  });
});
