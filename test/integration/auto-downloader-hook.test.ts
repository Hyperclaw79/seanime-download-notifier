import { describe, expect, it, vi } from "vitest";
import { createMemoryStore } from "../../src/core/state";
import { DEFAULT_CONFIG } from "../../src/core/config";
import { handleAutoDownloaderEvent } from "../../src/seanime/hooks";
import type { AutoDownloaderEvent } from "../../src/core/events";

const autoEvent = (overrides: Partial<AutoDownloaderEvent> = {}): AutoDownloaderEvent => ({
  next: vi.fn(), torrent: { infoHash: "ABC", name: "Anime - 01" }, rule: { animeTitle: "Anime" }, episode: 1,
  downloaded: true, isSimulation: false, ...overrides,
});

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
describe("Auto Downloader hook", () => {
  it("tracks real downloaded actions and always continues the hook", () => {
    const event = autoEvent({ rule: { mediaId: 123, animeTitle: "Anime" } }); const store = createMemoryStore();
    const result = handleAutoDownloaderEvent(event, DEFAULT_CONFIG, store, logger, false);
    expect(event.next).toHaveBeenCalledOnce(); expect(result.tracked).toMatchObject({ hash: "abc", mediaId: 123 });
  });

  it("ignores failed or queued actions", () => {
    const result = handleAutoDownloaderEvent(autoEvent({ downloaded: false }), DEFAULT_CONFIG, createMemoryStore(), logger, false);
    expect(result.tracked).toBeUndefined();
  });

  it("rejects missing hashes and disabled simulation paths", () => {
    const missingHash = autoEvent({ torrent: { name: "No hash" } });
    expect(handleAutoDownloaderEvent(missingHash, DEFAULT_CONFIG, createMemoryStore(), logger, true)).toEqual({});

    const simulation = autoEvent({ isSimulation: true });
    expect(handleAutoDownloaderEvent(simulation, DEFAULT_CONFIG, createMemoryStore(), logger, false)).toEqual({});

    const smokeEnabled = {
      ...DEFAULT_CONFIG,
      dev: { enableSimulationSmokeMode: true, allowSimulationNotifications: false, useEmptyNativeSimulationFallback: false, simulationDelaySeconds: 3 },
    };
    expect(handleAutoDownloaderEvent(autoEvent({ isSimulation: true }), smokeEnabled, createMemoryStore(), logger, true)).toEqual({});
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("reason=missing_torrent_hash"));
  });

  it("does not attach anime metadata when no rule title is available", () => {
    const result = handleAutoDownloaderEvent(autoEvent({ rule: {} as never }), DEFAULT_CONFIG, createMemoryStore(), logger, false);
    expect(result.tracked).toMatchObject({ hash: "abc", name: "Anime - 01" });
    expect(result.tracked).not.toHaveProperty("animeTitle");
  });

  it("tracks a development simulation once with fallbacks and returns its snapshot", () => {
    const config = { ...DEFAULT_CONFIG, dev: { enableSimulationSmokeMode: true, allowSimulationNotifications: true, useEmptyNativeSimulationFallback: false, simulationDelaySeconds: 3 } };
    const store = createMemoryStore();
    const first = handleAutoDownloaderEvent(autoEvent({
      isSimulation: true,
      torrent: { hash: "DEF" },
      rule: { title: "Fallback anime" },
    }), config, store, logger, true, () => new Date("2026-02-03T04:05:06Z"));
    const second = handleAutoDownloaderEvent(autoEvent({ isSimulation: true, torrent: { hash: "DEF" } }), config, store, logger, true);

    expect(first.tracked).toMatchObject({ hash: "def", name: "Unknown torrent", animeTitle: "Fallback anime", isSimulationSmoke: true });
    expect(first.simulationSnapshot).toEqual({ hash: "DEF", name: "Unknown torrent", progress: 0, status: "downloading" });
    expect(second.tracked).toBeUndefined();
    expect(second.simulationSnapshot).toBeDefined();
  });
});
