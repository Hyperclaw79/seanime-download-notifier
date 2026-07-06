import type { TorrentState } from "./state";

export function removeExpiredNotified(state: TorrentState, retentionDays: number, now = new Date()): TorrentState {
  const cutoff = now.getTime() - retentionDays * 86_400_000;
  return Object.fromEntries(Object.entries(state).filter(([, record]) => {
    if (!record.notifiedAt) return true;
    const timestamp = Date.parse(record.notifiedAt);
    return Number.isNaN(timestamp) || timestamp >= cutoff;
  }));
}
