import type { TorrentSnapshot } from "../core/completion";

export const normalizeTorrentSnapshots = (value: unknown): TorrentSnapshot[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const torrent = item as Partial<TorrentSnapshot>;
    if (typeof torrent.hash !== "string" || typeof torrent.name !== "string" || typeof torrent.progress !== "number") return [];
    return [{ hash: torrent.hash, name: torrent.name, progress: torrent.progress, status: torrent.status ?? "other", ...(torrent.contentPath ? { contentPath: torrent.contentPath } : {}) }];
  });
};
