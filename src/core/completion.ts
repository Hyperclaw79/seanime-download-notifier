export interface TorrentSnapshot {
  hash: string;
  name: string;
  progress: number;
  status: "downloading" | "seeding" | "paused" | "other" | "stopped" | "queued" | "error" | string;
  contentPath?: string;
}

export function isTorrentComplete(torrent: TorrentSnapshot): boolean {
  return Number.isFinite(torrent.progress) && torrent.progress >= 1;
}
