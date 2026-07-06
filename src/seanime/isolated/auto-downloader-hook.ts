declare const __SEANIME_NOTIFIER_DEVELOPMENT__: boolean;
declare const $storage: {
  get<T>(key: string): T | undefined;
  set(key: string, value: unknown): void;
};
declare const $store: {
  set(key: string, value: unknown): void;
};
declare const $getUserPreference: (key: string) => string | undefined;
declare const console: {
  log(...values: unknown[]): void;
  warn(...values: unknown[]): void;
};

type AutoDownloaderHookEvent = {
  next(): void;
  torrent?: { infoHash?: string; hash?: string; name?: string };
  rule?: { mediaId?: number; animeTitle?: string; title?: string };
  episode?: number | string;
  downloaded?: boolean;
  isSimulation?: boolean;
};

type TrackedTorrent = {
  trackId: string;
  hash: string;
  name: string;
  source: "auto_downloader";
  mediaId?: number;
  animeTitle?: string;
  episodeNumber?: number | string;
  addedAt: string;
  notifyAttempts: number;
  isSimulationSmoke?: boolean;
};

type TorrentState = Record<string, TrackedTorrent>;
export function autoDownloaderAfterDownloadTorrent(event: AutoDownloaderHookEvent): void {

  const STATE_KEY = "download-notifier-state-v1";
  const POLL_NOW_KEY = "download-notifier-poll-now";
  const SIMULATION_SNAPSHOT_KEY = "download-notifier-simulation-snapshot";
  const ACTIVITY_KEY = "download-notifier-activity-v1";

  type ActivityEntry = { at: string; level: "info" | "warning" | "error"; message: string };
  function appendActivity(level: ActivityEntry["level"], message: string): void {
    const entries = $storage.get<ActivityEntry[]>(ACTIVITY_KEY) ?? [];
    $storage.set(ACTIVITY_KEY, [{ at: new Date().toISOString(), level, message }, ...entries].slice(0, 30));
  }

  function logInfo(message: string): void {
    console.log(`[download-notifier] ${message}`);
  }

  function logWarn(message: string): void {
    console.warn(`[download-notifier] ${message}`);
  }

  function details(eventName: string, values: Record<string, string | number | boolean | undefined>): string {
    const fields = Object.entries(values).flatMap(([key, value]) => value === undefined ? [] : [`${key}=${JSON.stringify(value)}`]);
    return `event=${eventName}${fields.length ? ` ${fields.join(" ")}` : ""}`;
  }

  function bool(value: unknown, fallback: boolean): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return fallback;
  }

  function normalizeHash(hash: string): string {
    return hash.trim().toLowerCase();
  }

  function loadState(): TorrentState {
    return $storage.get<TorrentState>(STATE_KEY) ?? {};
  }

  function saveState(state: TorrentState): void {
    $storage.set(STATE_KEY, state);
  }

  event.next();

  if (!event.downloaded || !event.torrent) {
    logInfo(details("track_ignored", { reason: "torrent_not_added", simulation: event.isSimulation === true }));
    appendActivity("info", "Auto Downloader finished without adding a torrent.");
    return;
  }

  const hash = normalizeHash(event.torrent.infoHash ?? event.torrent.hash ?? "");
  const name = event.torrent.name ?? "Unknown torrent";
  if (!hash) {
    logWarn(details("track_ignored", { reason: "missing_hash", simulation: event.isSimulation === true }));
    appendActivity("warning", "Auto Downloader added a torrent without a usable hash; it was not tracked.");
    return;
  }

  const isSimulation = event.isSimulation === true;
  const trackKey = isSimulation ? `smoke:hook:${hash}` : hash;
  const smokeModeEnabled = bool($getUserPreference("devEnableSimulationSmokeMode"), false);
  const simulationNotificationsAllowed = bool($getUserPreference("devAllowSimulationNotifications"), false);

  if (isSimulation && (!__SEANIME_NOTIFIER_DEVELOPMENT__ || !smokeModeEnabled)) {
    logInfo(details("simulation_ignored", { reason: "smoke_mode_disabled", hash }));
    appendActivity("info", "Native simulation was ignored because development smoke mode is disabled.");
    return;
  }

  if (isSimulation && !simulationNotificationsAllowed) {
    logInfo(details("simulation_ignored", { reason: "notifications_disabled", hash }));
    appendActivity("info", "Native simulation was ignored because simulation notifications are disabled.");
    return;
  }

  const current = loadState();
  if (current[trackKey]) {
    logInfo(details("track_duplicate", { trackKey, hash, simulation: isSimulation }));
    appendActivity("info", `${isSimulation ? "Simulation" : "Torrent"} already has a tracked record: ${name}`);
    if (isSimulation) $store.set(SIMULATION_SNAPSHOT_KEY, { hash, name, progress: 0, status: "downloading", trackKey });
    else $store.set(POLL_NOW_KEY, new Date().toISOString());
    return;
  }

  const addedAt = new Date().toISOString();
  const record: TrackedTorrent = {
    trackId: `${isSimulation ? "smoke-hook" : "torrent"}:${hash}:${addedAt}`,
    hash,
    name,
    source: "auto_downloader",
    addedAt,
    notifyAttempts: 0,
  };

  if (event.episode !== undefined) record.episodeNumber = event.episode;
  if (event.rule?.mediaId !== undefined) record.mediaId = event.rule.mediaId;
  const animeTitle = event.rule?.animeTitle ?? event.rule?.title;
  if (animeTitle) record.animeTitle = animeTitle;
  if (isSimulation) record.isSimulationSmoke = true;

  saveState({ ...current, [trackKey]: record });
  logInfo(details("track_added", { trackKey, hash, mediaId: record.mediaId, episode: record.episodeNumber, simulation: isSimulation }));
  appendActivity("info", `${isSimulation ? "Simulation tracked" : "Torrent tracked"}: ${record.animeTitle ?? name}${record.episodeNumber !== undefined ? ` · Episode ${record.episodeNumber}` : ""}`);

  if (isSimulation) $store.set(SIMULATION_SNAPSHOT_KEY, { hash, name, progress: 0, status: "downloading", trackKey });
  else $store.set(POLL_NOW_KEY, new Date().toISOString());
}
