import type { AutoDownloaderEvent } from "../core/events";
import type { PluginConfig } from "../core/config";
import { trackTorrent, type StateStore, type TrackedTorrent } from "../core/state";
export interface Logger { info(message: string): void; warn(message: string): void; error(message: string): void }

export interface HookResult { tracked?: TrackedTorrent; simulationSnapshot?: { hash: string; name: string; progress: number; status: "downloading" } }

/** Converts a Seanime hook event into a durable track while always continuing the hook chain. */
export function handleAutoDownloaderEvent(event: AutoDownloaderEvent, config: PluginConfig, store: StateStore, logger: Logger, isDevelopment: boolean, now = () => new Date()): HookResult {
  event.next();
  if (!event.downloaded || !event.torrent) { logger.info(`event=track_ignored reason=torrent_not_added simulation=${event.isSimulation === true}`); return {}; }
  const hash = event.torrent.infoHash ?? event.torrent.hash ?? "";
  const name = event.torrent.name ?? "Unknown torrent";
  if (!hash) { logger.warn(`event=track_ignored reason=missing_torrent_hash simulation=${event.isSimulation === true}`); return {}; }
  if (event.isSimulation && (!isDevelopment || !config.dev.enableSimulationSmokeMode)) {
    logger.info(`event=simulation_ignored reason=smoke_mode_disabled hash=${JSON.stringify(hash)}`); return {};
  }
  if (event.isSimulation && !config.dev.allowSimulationNotifications) {
    logger.info(`event=simulation_ignored reason=notifications_disabled hash=${JSON.stringify(hash)}`); return {};
  }
  const record: TrackedTorrent = {
    hash, name, source: "auto_downloader", episodeNumber: event.episode,
    addedAt: now().toISOString(), notifyAttempts: 0,
    ...(event.rule?.mediaId !== undefined ? { mediaId: event.rule.mediaId } : {}),
    ...(event.rule?.animeTitle || event.rule?.title ? { animeTitle: event.rule.animeTitle ?? event.rule.title } : {}),
    ...(event.isSimulation ? { isSimulationSmoke: true } : {}),
  };
  const current = store.load();
  const result = trackTorrent(current, record);
  if (result.added) { store.save(result.state); logger.info(`event=track_added hash=${JSON.stringify(hash.toLowerCase())} simulation=${event.isSimulation === true}`); }
  else logger.info(`event=track_duplicate hash=${JSON.stringify(hash.toLowerCase())} simulation=${event.isSimulation === true}`);
  return {
    ...(result.added ? { tracked: result.state[hash.toLowerCase()] } : {}),
    ...(event.isSimulation ? { simulationSnapshot: { hash, name, progress: 0, status: "downloading" as const } } : {}),
  };
}
