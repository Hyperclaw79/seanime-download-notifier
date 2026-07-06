/** Durable lifecycle record for one Auto Downloader-owned torrent track. */
export interface TrackedTorrent {
  trackId?: string;
  hash: string;
  name: string;
  source: "auto_downloader";
  mediaId?: number;
  animeTitle?: string;
  episodeNumber?: number | string;
  contentPath?: string;
  addedAt: string;
  completedAt?: string;
  notifiedAt?: string;
  lastSeenProgress?: number;
  lastSeenStatus?: string;
  notifyAttempts: number;
  lastNotifyAttemptAt?: string;
  lastNotifyError?: string;
  providerReceipts?: Record<string, string>;
  isSimulationSmoke?: boolean;
}

export type TorrentState = Record<string, TrackedTorrent>;

/** Storage boundary used by the lifecycle engine. Implementations must persist whole snapshots. */
export interface StateStore {
  load(): TorrentState;
  save(state: TorrentState): void;
}

export const normalizeHash = (hash: string): string => hash.trim().toLowerCase();

/** Adds a normalized hash exactly once and returns an immutable state snapshot. */
export function trackTorrent(state: TorrentState, torrent: TrackedTorrent): { state: TorrentState; added: boolean } {
  const hash = normalizeHash(torrent.hash);
  if (!hash || state[hash]) return { state, added: false };
  return { state: { ...state, [hash]: { ...torrent, hash } }, added: true };
}

/** Returns records that have not completed successful delivery to every enabled provider. */
export const pendingTorrents = (state: TorrentState): TrackedTorrent[] =>
  Object.values(state).filter((record) => !record.notifiedAt);

/** Creates an isolated in-memory store for tests and embedders. */
export function createMemoryStore(initial: TorrentState = {}): StateStore {
  let state = structuredClone(initial);
  return { load: () => structuredClone(state), save: (next) => { state = structuredClone(next); } };
}
