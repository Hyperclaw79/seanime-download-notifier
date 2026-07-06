import type { TorrentSnapshot } from "../core/completion";

export const pendingSimulationSnapshot = (hash: string, name: string): TorrentSnapshot => ({ hash, name, progress: 0, status: "downloading" });
export const completedSimulationSnapshot = (hash: string, name: string): TorrentSnapshot => ({ hash, name, progress: 1, status: "seeding" });
