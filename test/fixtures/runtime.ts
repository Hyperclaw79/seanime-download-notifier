import { vi } from "vitest";
import type { AutoDownloaderEvent } from "../../src/core/events";

export const autoEvent = (overrides: Partial<AutoDownloaderEvent> = {}): AutoDownloaderEvent => ({
  next: vi.fn(), torrent: { infoHash: "ABC", name: "Anime - 01" }, rule: { animeTitle: "Anime" }, episode: 1,
  downloaded: true, isSimulation: false, ...overrides,
});
