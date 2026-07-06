import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../../../src/core/config";
import { createMemoryStore } from "../../../src/core/state";
import { handleAutoDownloaderEvent } from "../../../src/seanime/hooks";

const event = () => ({ next: vi.fn(), torrent: { infoHash: "HASH", name: "Anime 01" }, rule: { animeTitle: "Anime" }, episode: 1, downloaded: true, isSimulation: true });
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

describe("simulation smoke safety", () => {
  it("ignores simulations in production", () => {
    const e = event(); const result = handleAutoDownloaderEvent(e, DEFAULT_CONFIG, createMemoryStore(), logger, false);
    expect(e.next).toHaveBeenCalledOnce(); expect(result.tracked).toBeUndefined();
  });

  it("tracks and injects completion only with both explicit dev switches", () => {
    const config = { ...DEFAULT_CONFIG, dev: { enableSimulationSmokeMode: true, allowSimulationNotifications: true, useEmptyNativeSimulationFallback: false, simulationDelaySeconds: 3 } };
    const result = handleAutoDownloaderEvent(event(), config, createMemoryStore(), logger, true);
    expect(result.tracked?.isSimulationSmoke).toBe(true); expect(result.simulationSnapshot?.progress).toBe(0);
  });
});
