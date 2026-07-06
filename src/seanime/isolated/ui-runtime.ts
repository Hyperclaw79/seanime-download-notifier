declare const __SEANIME_NOTIFIER_DEVELOPMENT__: boolean;
declare const __SEANIME_NOTIFIER_ICON_URL__: string;
declare const $storage: {
  get<T>(key: string): T | undefined;
  set(key: string, value: unknown): void;
};
declare const $store: {
  watch?<T>(key: string, callback: (value: T) => void): void;
};
declare const $shared: { use<T>(name: string): T };
declare const $getUserPreference: (key: string) => string | undefined;
declare const console: {
  log(...values: unknown[]): void;
  warn(...values: unknown[]): void;
  error(...values: unknown[]): void;
};
declare function setInterval(callback: () => void, delay: number): unknown;
declare function setTimeout(callback: () => void, delay: number): unknown;

type SeanimeUiContext = {
  torrentClient?: { getTorrents?(): Promise<unknown[]> };
  anime?: {
    getAnimeEntry?(mediaId: number): Promise<{
      media?: {
        title?: { userPreferred?: string; english?: string; romaji?: string };
        coverImage?: { extraLarge?: string; large?: string; medium?: string };
        format?: string;
        seasonYear?: number;
        meanScore?: number;
        duration?: number;
        genres?: string[];
      };
      nextEpisode?: { episodeNumber: number };
      downloadInfo?: { episodesToDownload?: Array<{ episodeNumber: number }> };
    }>;
    getEpisodeCollection?(mediaId: number): Promise<{
      episodes?: Array<{ episodeNumber: number; episodeTitle?: string; episodeMetadata?: { title?: string; image?: string; hasImage?: boolean } }>;
    }>;
  };
  setInterval?: (callback: () => void, delay: number) => (() => void) | void;
  setTimeout?: (callback: () => void, delay: number) => unknown;
  fetch?: (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; statusText?: string }>;
  toast?: { success?(message: string): void; warning?(message: string): void; error?(message: string): void };
  newTray?: (options: { tooltipText: string; iconUrl?: string; withContent: boolean; isDrawer?: boolean }) => TrayApi;
  newWebview?: (options: {
    slot: "screen";
    fullWidth?: boolean;
    height?: string;
    sidebar?: { label: string; icon: string };
  }) => WebviewApi;
  screen?: { navigateTo?(path: string): void };
  state?: <T>(initial: T) => { get(): T; set(value: T | ((current: T) => T)): void };
  fieldRef?: <T>(initial?: T) => { current: T; setValue?(value: T): void };
  eventHandler?: (id: string, callback: (...args: unknown[]) => void) => string;
  registerEventHandler?: (id: string, callback: (...args: unknown[]) => void) => void;
};

type TrayApi = {
  render(callback: () => unknown): void;
  update?(): void;
  updateBadge?(badge: { number: number; intent?: "alert" | "info" | "warning" | "success" }): void;
  onClick?(callback: () => void): void;
  stack(...args: unknown[]): unknown;
  flex(...args: unknown[]): unknown;
  div(...args: unknown[]): unknown;
  text(...args: unknown[]): unknown;
  p(...args: unknown[]): unknown;
  span(...args: unknown[]): unknown;
  badge(...args: unknown[]): unknown;
  alert(...args: unknown[]): unknown;
  button(...args: unknown[]): unknown;
  select(...args: unknown[]): unknown;
  switch(...args: unknown[]): unknown;
  input(...args: unknown[]): unknown;
  css(...args: unknown[]): unknown;
};

type WebviewApi = {
  setContent(callback: () => string): void;
  update(): void;
  channel: {
    on(event: string, callback: (payload: unknown) => void): void;
    send(event: string, payload: unknown): void;
  };
};

type TrackedTorrent = {
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
  isNativeSimulationFallback?: boolean;
};

type TorrentState = Record<string, TrackedTorrent>;

type TorrentSnapshot = {
  hash: string;
  name: string;
  progress: number;
  status: string;
  contentPath?: string;
  size?: string;
  trackKey?: string;
};

type ProviderSettings = {
  id: string;
  type: string;
  enabled: boolean;
  label: string;
  config: Record<string, unknown>;
};

type ProviderField = {
  key: string;
  label: string;
  kind: "text" | "password" | "select" | "toggle";
  wide?: boolean;
  options?: Array<{ value: string; label: string }>;
};

type ProviderAdapter = {
  type: string;
  label: string;
  fields: ProviderField[];
  create(id: string): ProviderSettings;
  normalize(value: unknown): ProviderSettings | null;
  migrateLegacy?(getPreference: (key: string) => string | undefined): ProviderSettings | null;
  isReady(provider: ProviderSettings): boolean;
  send(event: unknown, provider: ProviderSettings, fetcher: NonNullable<SeanimeUiContext["fetch"]>): Promise<void>;
};

type NotificationMetadataHelpers = {
  inferTorrentDetails(name: string): {
    displayTorrentName: string; quality?: string; releaseSource?: string; videoCodec?: string; audioCodec?: string;
    audioLanguage?: string; subtitleLanguages?: string; releaseGroup?: string;
  };
};

type ProviderConfigurationHelpers = {
  bind(dependencies: {
    get(): Partial<ProviderConfigDocument> | undefined; set(document: ProviderConfigDocument): void;
    getPreference(key: string): string | undefined; adapters: Record<string, ProviderAdapter>;
    bool(value: unknown, fallback: boolean): boolean; onMigrated(count: number): void;
  }): {
    normalize(value: unknown): ProviderSettings | null; load(): ProviderConfigDocument; save(document: ProviderConfigDocument): void;
    upsert(provider: ProviderSettings): ProviderConfigDocument; remove(providerId: string): ProviderConfigDocument;
  };
};

type ProviderConfigDocument = {
  version: 1;
  providers: ProviderSettings[];
};

type RuntimeConfig = {
  enabled: boolean;
  pollIntervalSeconds: number;
  retentionDays: number;
  downloadCompletedEnabled: boolean;
  providers: ProviderSettings[];
};

export function registerDownloadNotifierUi(ctx: SeanimeUiContext): void {
  const STATE_KEY = "download-notifier-state-v1";
  const PROVIDER_CONFIG_KEY = "download-notifier-provider-config-v1";
  const PROVIDER_CONFIG_BACKUP_KEY = "download-notifier-provider-config-v1-json";
  const POLL_NOW_KEY = "download-notifier-poll-now";
  const SIMULATION_SNAPSHOT_KEY = "download-notifier-simulation-snapshot";
  const EMPTY_NATIVE_SIMULATION_KEY = "download-notifier-empty-native-simulation";
  const ACTIVITY_KEY = "download-notifier-activity-v1";
  const ACTIVITY_LIMIT = 30;
  type ActivityEntry = { at: string; level: "info" | "warning" | "error"; message: string };
  const activity: ActivityEntry[] = ($storage.get<ActivityEntry[]>(ACTIVITY_KEY) ?? []).slice(0, ACTIVITY_LIMIT);
  let publishRuntimeUpdate: (() => void) | undefined;

  function humanizeActivity(message: string): string {
    if (message.startsWith("event=runtime_started")) return `Plugin runtime started${message.includes("development=true") ? " in development mode" : ""}.`;
    if (message.startsWith("event=provider_config_migrated")) return "Provider settings migration completed.";
    if (message.startsWith("event=provider_config_saved")) return "Provider settings saved.";
    if (message.startsWith("event=poll_started")) return "Checking tracked downloads for progress and completion.";
    if (message.startsWith("event=poll_finished")) return "Tracked download check completed.";
    if (message.startsWith("event=poll_skipped reason=already_running")) return "Skipped an overlapping download check.";
    if (message.startsWith("event=track_in_progress")) return "Tracked download is still in progress.";
    if (message.startsWith("event=simulation_probe_selected")) return "Native simulation fallback created a temporary tracked download.";
    if (message.startsWith("event=simulation_delay_started")) return "Development simulation is in progress before completion.";
    if (message.startsWith("event=simulation_delay_completed")) return "Development simulation reached completion.";
    if (message.startsWith("event=provider_delivery_started")) return "Sending a completion notification.";
    if (message.startsWith("event=provider_delivery_succeeded")) return "Completion notification delivered successfully.";
    if (message.startsWith("event=provider_delivery_failed")) return "Completion notification failed and will be retried.";
    if (message.startsWith("event=track_delivery_finished")) return "Tracked download delivery state updated.";
    return message;
  }

  function recordActivity(level: "info" | "warning" | "error", message: string): string {
    const safe = redact(message);
    const stored = $storage.get<ActivityEntry[]>(ACTIVITY_KEY) ?? [];
    const readable = humanizeActivity(safe);
    const previous = stored[0];
    const replacesPrevious = previous?.level === level && humanizeActivity(previous.message) === readable;
    const nextEntry = replacesPrevious
      ? { ...previous, at: new Date().toISOString(), message: readable }
      : { at: new Date().toISOString(), level, message: readable };
    activity.splice(0, activity.length, nextEntry, ...(replacesPrevious ? stored.slice(1) : stored).slice(0, ACTIVITY_LIMIT - 1));
    if (activity.length > ACTIVITY_LIMIT) activity.length = ACTIVITY_LIMIT;
    $storage.set(ACTIVITY_KEY, activity);
    publishRuntimeUpdate?.();
    return safe;
  }

  function logInfo(message: string): void {
    console.log(`[download-notifier] ${recordActivity("info", message)}`);
  }

  function logWarn(message: string): void {
    console.warn(`[download-notifier] ${recordActivity("warning", message)}`);
  }

  function logError(message: string): void {
    console.error(`[download-notifier] ${recordActivity("error", message)}`);
  }

  function redact(message: string): string {
    return message
      .replace(/https?:\/\/[^\s"']+\/api\/webhooks\/[^\s"']+/gi, "[REDACTED_WEBHOOK]")
      .replace(/https?:\/\/[^\s"']+/gi, "[REDACTED_URL]")
      .replace(/\b(webhookUrl|mention|contentPath)=([^\s]+)/gi, "$1=[REDACTED]")
      .replace(/[A-Za-z]:\\[^\s"']+/g, "[REDACTED_PATH]")
      .replace(/\/(?:data|downloads?|media|mnt|home)\/[^\s"']+/gi, "[REDACTED_PATH]");
  }

  function eventDetails(eventName: string, values: Record<string, string | number | boolean | undefined> = {}): string {
    const fields = Object.entries(values).flatMap(([key, value]) => value === undefined ? [] : [`${key}=${JSON.stringify(value)}`]);
    return `event=${eventName}${fields.length ? ` ${fields.join(" ")}` : ""}`;
  }

  function bool(value: unknown, fallback: boolean): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return fallback;
  }

  function clamp(value: unknown, min: number, max: number, fallback: number): number {
    const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? +value : NaN;
    return parsed === parsed && parsed !== Infinity && parsed !== -Infinity ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
  }

  function finite(value: unknown): value is number {
    return typeof value === "number" && value === value && value !== Infinity && value !== -Infinity;
  }

  function normalizeHash(hash: string): string {
    return hash.trim().toLowerCase();
  }

  function loadState(): TorrentState {
    const state = $storage.get<TorrentState>(STATE_KEY) ?? {};
    const migrated = Object.fromEntries(Object.entries(state).filter(([key, record]) => {
      if (!record.isNativeSimulationFallback) return true;
      if (key.startsWith("smoke:native:")) return true;
      if (key !== "smoke:native-fallback") return false;
      return record.name !== "Native simulation fallback" || !record.notifiedAt;
    }));
    if (Object.keys(migrated).length !== Object.keys(state).length) $storage.set(STATE_KEY, migrated);
    return migrated;
  }

  function saveState(state: TorrentState): void {
    $storage.set(STATE_KEY, state);
  }

  const providerAdapters: Record<string, ProviderAdapter> = {};
  for (const adapter of $shared.use<ProviderAdapter[]>("download-notifier-provider-catalog")) {
    providerAdapters[adapter.type] = adapter;
  }
  const { inferTorrentDetails } = $shared.use<NotificationMetadataHelpers>("download-notifier-notification-metadata");
  const providerConfiguration = $shared.use<ProviderConfigurationHelpers>("download-notifier-provider-configuration").bind({
    get: () => {
      const primary = $storage.get<Partial<ProviderConfigDocument>>(PROVIDER_CONFIG_KEY);
      if (primary && Array.isArray(primary.providers)) {
        if (!$storage.get<string>(PROVIDER_CONFIG_BACKUP_KEY)) $storage.set(PROVIDER_CONFIG_BACKUP_KEY, JSON.stringify(primary));
        return primary;
      }
      const backup = $storage.get<string>(PROVIDER_CONFIG_BACKUP_KEY);
      if (typeof backup !== "string" || !backup) return primary;
      try {
        const parsed = JSON.parse(backup) as Partial<ProviderConfigDocument>;
        return Array.isArray(parsed.providers) ? parsed : primary;
      } catch {
        return primary;
      }
    },
    set: (document) => {
      $storage.set(PROVIDER_CONFIG_KEY, document);
      $storage.set(PROVIDER_CONFIG_BACKUP_KEY, JSON.stringify(document));
    },
    getPreference: $getUserPreference, adapters: providerAdapters, bool,
    onMigrated: (count) => logInfo(eventDetails("provider_config_migrated", { providers: count })),
  });
  const normalizeProvider = providerConfiguration.normalize;
  const loadProviderDocument = providerConfiguration.load;
  const upsertProvider = providerConfiguration.upsert;
  const deleteProvider = providerConfiguration.remove;

  function pendingTorrents(state: TorrentState): TrackedTorrent[] {
    return Object.values(state).filter((record) => !record.notifiedAt);
  }

  function pendingEntries(state: TorrentState): Array<[string, TrackedTorrent]> {
    return Object.entries(state).filter(([, record]) => !record.notifiedAt);
  }

  function trackToken(key: string, record: TrackedTorrent): string {
    return record.trackId ?? key;
  }

  function mergeTrackedRecord(key: string, expectedToken: string, record: TrackedTorrent): boolean {
    const latest = loadState();
    const current = latest[key];
    if (!current || trackToken(key, current) !== expectedToken) return false;
    saveState({ ...latest, [key]: record });
    return true;
  }

  function removeExpiredNotified(state: TorrentState, retentionDays: number, now: Date): TorrentState {
    const cutoff = now.getTime() - retentionDays * 86400000;
    return Object.fromEntries(Object.entries(state).filter(([, record]) => {
      if (!record.notifiedAt) return true;
      const timestamp = Date.parse(record.notifiedAt);
      return Number.isNaN(timestamp) || timestamp >= cutoff;
    }));
  }

  function config(): RuntimeConfig {
    return {
      enabled: bool($getUserPreference("enabled"), true),
      pollIntervalSeconds: clamp($getUserPreference("pollIntervalSeconds"), 15, 300, 30),
      retentionDays: clamp($getUserPreference("retentionDays"), 1, 365, 30),
      downloadCompletedEnabled: bool($getUserPreference("downloadCompletedEnabled"), true),
      providers: loadProviderDocument().providers,
    };
  }

  function enabledProviders(cfg: RuntimeConfig): ProviderSettings[] {
    return cfg.providers.filter((provider) => providerAdapters[provider.type]?.isReady(provider));
  }

  function normalizeTorrentSnapshots(value: unknown): TorrentSnapshot[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      const torrent = item as { hash?: unknown; name?: unknown; progress?: unknown; status?: unknown; contentPath?: unknown; size?: unknown };
      if (typeof torrent.hash !== "string" || typeof torrent.name !== "string" || typeof torrent.progress !== "number") return [];
      const snapshot: TorrentSnapshot = {
        hash: torrent.hash,
        name: torrent.name,
        progress: torrent.progress,
        status: typeof torrent.status === "string" ? torrent.status : "other",
      };
      if (typeof torrent.contentPath === "string" && torrent.contentPath) snapshot.contentPath = torrent.contentPath;
      if (typeof torrent.size === "string" && torrent.size) snapshot.size = torrent.size;
      return [snapshot];
    });
  }

  function isTorrentComplete(torrent: TorrentSnapshot): boolean {
    return finite(torrent.progress) && torrent.progress >= 1;
  }

  async function enrichNotification(record: TrackedTorrent, notification: {
    torrentName: string;
    animeTitle?: string;
    episodeNumber?: number | string;
    episodeTitle?: string;
    animeCoverUrl?: string;
    episodeImageUrl?: string;
    animeFormat?: string;
    animeYear?: number;
    animeScore?: number;
    animeDurationMinutes?: number;
    animeGenres?: string[];
    displayTorrentName?: string;
    torrentSize?: string;
    quality?: string;
    releaseSource?: string;
    videoCodec?: string;
    audioCodec?: string;
    audioLanguage?: string;
    subtitleLanguages?: string;
    releaseGroup?: string;
    contentPath?: string;
    completedAt: string;
    isSimulationSmoke?: boolean;
    isNativeSimulationFallback?: boolean;
  }): Promise<void> {
    if (record.mediaId === undefined || !ctx.anime) return;
    try {
      if (typeof ctx.anime.getAnimeEntry === "function") {
        const entry = await ctx.anime.getAnimeEntry(record.mediaId);
        const media = entry?.media;
        const title = media?.title?.userPreferred ?? media?.title?.english ?? media?.title?.romaji;
        const cover = media?.coverImage?.extraLarge ?? media?.coverImage?.large ?? media?.coverImage?.medium;
        if (title) notification.animeTitle = title;
        if (cover) notification.animeCoverUrl = cover;
        if (media?.format) notification.animeFormat = media.format;
        if (media?.seasonYear !== undefined) notification.animeYear = media.seasonYear;
        if (media?.meanScore !== undefined) notification.animeScore = media.meanScore;
        if (media?.duration !== undefined) notification.animeDurationMinutes = media.duration;
        if (media?.genres?.length) notification.animeGenres = media.genres;
      }
      if (record.episodeNumber !== undefined && typeof ctx.anime.getEpisodeCollection === "function") {
        const collection = await ctx.anime.getEpisodeCollection(record.mediaId);
        const episodeNumber = typeof record.episodeNumber === "number" ? record.episodeNumber : +(record.episodeNumber ?? "");
        const episode = collection?.episodes?.find((candidate) => candidate.episodeNumber === episodeNumber);
        const episodeTitle = episode?.episodeMetadata?.title ?? episode?.episodeTitle;
        const episodeImage = episode?.episodeMetadata?.image;
        if (episodeTitle) notification.episodeTitle = episodeTitle;
        if (episodeImage && episode?.episodeMetadata?.hasImage !== false) notification.episodeImageUrl = episodeImage;
      }
    } catch (error) {
      logWarn(`Could not enrich notification metadata for ${record.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  let polling = false;

  async function poll(injected: TorrentSnapshot[] = [], onlyTrackKey?: string): Promise<void> {
    const cfg = config();
    if (!cfg.enabled || !cfg.downloadCompletedEnabled) {
      logInfo(eventDetails("poll_skipped", { reason: "disabled" }));
      return;
    }
    const pending = pendingEntries(loadState()).filter(([key]) => !onlyTrackKey || key === onlyTrackKey);
    if (polling || !pending.length) {
      if (polling) logInfo(eventDetails("poll_skipped", { reason: "already_running" }));
      return;
    }
    polling = true;
    logInfo(eventDetails("poll_started", { tracks: pending.length, injected: injected.length, trackKey: onlyTrackKey }));
    try {
      let snapshots = injected;
      if (!snapshots.length) {
        if (!ctx.torrentClient || typeof ctx.torrentClient.getTorrents !== "function") {
          logWarn("Seanime UI context does not expose torrentClient.getTorrents");
          return;
        }
        snapshots = normalizeTorrentSnapshots(await ctx.torrentClient.getTorrents());
      }

      const providers = enabledProviders(cfg);
      const byHash = new Map(snapshots.map((torrent) => [normalizeHash(torrent.hash), torrent]));
      for (const [trackKey, record] of pending) {
        const expectedToken = trackToken(trackKey, record);
        const snapshot = byHash.get(record.hash);
        if (!snapshot) {
          logWarn(eventDetails("track_snapshot_missing", { trackKey, hash: record.hash }));
          continue;
        }

        let next: TrackedTorrent = { ...record, lastSeenProgress: snapshot.progress, lastSeenStatus: snapshot.status };
        if (snapshot.contentPath && !record.isNativeSimulationFallback) next.contentPath = snapshot.contentPath;
        if (!isTorrentComplete(snapshot)) {
          mergeTrackedRecord(trackKey, expectedToken, next);
          logInfo(eventDetails("track_in_progress", { trackKey, hash: record.hash, progress: snapshot.progress }));
          continue;
        }

        const completedAt = record.completedAt ?? new Date().toISOString();
        next = { ...next, completedAt };

        if (!providers.length) {
          logWarn(eventDetails("delivery_skipped", { trackKey, reason: "no_enabled_provider" }));
          mergeTrackedRecord(trackKey, expectedToken, next);
          continue;
        }

        const notification: {
          torrentName: string;
          animeTitle?: string;
          episodeNumber?: number | string;
          episodeTitle?: string;
          animeCoverUrl?: string;
          episodeImageUrl?: string;
          animeFormat?: string;
          animeYear?: number;
          animeScore?: number;
          animeDurationMinutes?: number;
          animeGenres?: string[];
          displayTorrentName?: string;
          torrentSize?: string;
          quality?: string;
          releaseSource?: string;
          videoCodec?: string;
          audioCodec?: string;
          audioLanguage?: string;
          subtitleLanguages?: string;
          releaseGroup?: string;
          contentPath?: string;
          completedAt: string;
          isSimulationSmoke?: boolean;
          isNativeSimulationFallback?: boolean;
        } = { torrentName: record.isNativeSimulationFallback ? "Native simulation fallback" : record.name, completedAt };
        if (!record.isNativeSimulationFallback) {
          Object.assign(notification, inferTorrentDetails(record.name));
          if (snapshot.size) notification.torrentSize = snapshot.size;
        }
        if (record.animeTitle !== undefined) notification.animeTitle = record.animeTitle;
        if (record.episodeNumber !== undefined) notification.episodeNumber = record.episodeNumber;
        if (next.contentPath !== undefined) notification.contentPath = next.contentPath;
        if (record.isSimulationSmoke !== undefined) notification.isSimulationSmoke = record.isSimulationSmoke;
        if (record.isNativeSimulationFallback !== undefined) notification.isNativeSimulationFallback = record.isNativeSimulationFallback;
        await enrichNotification(record, notification);
        if (notification.animeTitle) next.animeTitle = notification.animeTitle;
        if (record.isNativeSimulationFallback) {
          notification.torrentName = `${notification.animeTitle ?? "Native simulation"}${notification.episodeNumber !== undefined ? ` · Episode ${notification.episodeNumber}` : ""}`;
          next.name = notification.torrentName;
          delete notification.contentPath;
          delete notification.torrentSize;
        }

        const latestBeforeSend = loadState()[trackKey];
        if (!latestBeforeSend || trackToken(trackKey, latestBeforeSend) !== expectedToken) {
          logWarn(eventDetails("delivery_skipped", { trackKey, reason: "stale_track" }));
          continue;
        }

        const attemptAt = new Date().toISOString();
        const providerReceipts = { ...(record.providerReceipts ?? {}) };
        let lastError = "";
        for (const provider of providers.filter((candidate) => !providerReceipts[candidate.id])) {
          try {
            const adapter = providerAdapters[provider.type];
            if (!adapter) throw new Error(`Unsupported provider type: ${provider.type}`);
            if (!ctx.fetch) throw new Error("Seanime fetch API is unavailable");
            logInfo(eventDetails("provider_delivery_started", { trackKey, providerId: provider.id, providerType: provider.type }));
            await adapter.send(notification, provider, ctx.fetch);
            providerReceipts[provider.id] = new Date().toISOString();
            next = { ...next, providerReceipts: { ...providerReceipts } };
            mergeTrackedRecord(trackKey, expectedToken, next);
            logInfo(eventDetails("provider_delivery_succeeded", { trackKey, providerId: provider.id, providerType: provider.type }));
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            lastError = `${provider.label}: ${message}`;
            logError(`${eventDetails("provider_delivery_failed", { trackKey, providerId: provider.id, providerType: provider.type })} error=${JSON.stringify(redact(message))}`);
          }
        }

        next = { ...next, providerReceipts };
        if (providers.every((provider) => Boolean(providerReceipts[provider.id]))) {
          const { lastNotifyError: _previousError, ...withoutError } = next;
          next = { ...withoutError, notifyAttempts: next.notifyAttempts + 1, lastNotifyAttemptAt: attemptAt, notifiedAt: new Date().toISOString() };
        } else {
          next = { ...next, notifyAttempts: next.notifyAttempts + 1, lastNotifyAttemptAt: attemptAt, lastNotifyError: lastError || "At least one provider failed" };
        }
        mergeTrackedRecord(trackKey, expectedToken, next);
        logInfo(eventDetails("track_delivery_finished", { trackKey, deliveredProviders: Object.keys(providerReceipts).length, providers: providers.length }));
      }
      saveState(removeExpiredNotified(loadState(), cfg.retentionDays, new Date()));
      logInfo(eventDetails("poll_finished", { tracks: pending.length }));
    } catch (error) {
      logError(`${eventDetails("poll_failed")} error=${JSON.stringify(redact(error instanceof Error ? error.message : String(error)))}`);
    } finally {
      polling = false;
    }
  }

  async function runEmptyNativeSimulationFallback(signal?: { at?: string; rules?: Array<{ mediaId?: number; episodeNumbers?: number[] }> }): Promise<void> {
    if (!__SEANIME_NOTIFIER_DEVELOPMENT__) return;
    if (!bool($getUserPreference("devEnableSimulationSmokeMode"), false)
      || !bool($getUserPreference("devAllowSimulationNotifications"), false)
      || !bool($getUserPreference("devUseEmptyNativeSimulationFallback"), false)) return;

    if (!ctx.torrentClient || typeof ctx.torrentClient.getTorrents !== "function") {
      logWarn("Native simulation fallback could not access torrentClient.getTorrents.");
      return;
    }

    const snapshots = normalizeTorrentSnapshots(await ctx.torrentClient.getTorrents());
    const completed = snapshots.find((torrent) => isTorrentComplete(torrent) && Boolean(normalizeHash(torrent.hash)));
    if (!completed) {
      const message = "Native simulation found no candidates and no completed torrent was available for fallback.";
      logWarn(message);
      ctx.toast?.warning?.(message);
      return;
    }

    const hash = normalizeHash(completed.hash);
    const addedAt = new Date().toISOString();
    const runId = signal?.at ?? addedAt;

    const record: TrackedTorrent = {
      trackId: `smoke-native:${runId}`,
      hash,
      name: "Native simulation fallback",
      source: "auto_downloader",
      addedAt,
      notifyAttempts: 0,
      isSimulationSmoke: true,
      isNativeSimulationFallback: true,
    };
    const simulationRule = signal?.rules?.find((rule) => finite(rule.mediaId));
    if (simulationRule?.mediaId !== undefined) {
      record.mediaId = simulationRule.mediaId;
      const selectedEpisode = simulationRule.episodeNumbers?.find((episode) => finite(episode));
      if (selectedEpisode !== undefined) record.episodeNumber = selectedEpisode;
      if (typeof ctx.anime?.getAnimeEntry === "function") {
        try {
          const entry = await ctx.anime.getAnimeEntry(simulationRule.mediaId);
          const title = entry?.media?.title?.userPreferred ?? entry?.media?.title?.english ?? entry?.media?.title?.romaji;
          if (title) record.animeTitle = title;
          const fallbackEpisode = entry?.nextEpisode?.episodeNumber ?? entry?.downloadInfo?.episodesToDownload?.[0]?.episodeNumber;
          if (record.episodeNumber === undefined && fallbackEpisode !== undefined) record.episodeNumber = fallbackEpisode;
        } catch (error) {
          logWarn(`Native simulation fallback could not resolve the simulated episode: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    if (record.animeTitle) record.name = `${record.animeTitle}${record.episodeNumber !== undefined ? ` · Episode ${record.episodeNumber}` : ""}`;
    const smokeKey = `smoke:native:${record.mediaId ?? "unknown"}:${record.episodeNumber ?? "unknown"}:${runId}`;
    const latest = loadState();
    saveState({ ...latest, [smokeKey]: record });
    const delaySeconds = clamp($getUserPreference("devSimulationDelaySeconds"), 0, 30, 3);
    logInfo(eventDetails("simulation_probe_selected", { trackKey: smokeKey, mediaId: record.mediaId, delaySeconds }));
    await poll([{ ...completed, progress: 0, status: "downloading" }], smokeKey);
    if (delaySeconds > 0) {
      logInfo(eventDetails("simulation_delay_started", { trackKey: smokeKey, delaySeconds }));
      await new Promise<void>((resolve) => {
        const timeoutFn = typeof ctx.setTimeout === "function" ? ctx.setTimeout : setTimeout;
        timeoutFn(resolve, delaySeconds * 1000);
      });
    }
    logInfo(eventDetails("simulation_delay_completed", { trackKey: smokeKey }));
    await poll([completed], smokeKey);
  }

  function renderProviderManager(): void {
    if (typeof ctx.newWebview !== "function") {
      logWarn("Seanime UI webview API is unavailable; provider settings must be edited from stored plugin configuration");
      return;
    }
    const webview = ctx.newWebview({
      slot: "screen",
      fullWidth: true,
      height: "calc(100vh - 2rem)",
      sidebar: {
        label: "Download Notifier",
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v11m0 0 4-4m-4 4-4-4"/><path d="M5 17v2h14v-2"/><path d="M18 4c1.5.7 2.5 2.1 2.5 3.8"/></svg>',
      },
    });
    const trayIconUrl = __SEANIME_NOTIFIER_ICON_URL__;

    function escapeHtml(value: unknown): string {
      return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
      })[character] ?? character);
    }

    function providerHtml(provider: ProviderSettings): string {
      const checked = (value: boolean) => value ? " checked" : "";
      const adapter = providerAdapters[provider.type];
      if (!adapter) return "";
      const heading = adapter.label;
      const fieldHtml = (field: ProviderField): string => {
        const value = provider.config[field.key];
        if (field.kind === "toggle") return `<label class="toggle"><span>${escapeHtml(field.label)}</span><input data-config-field="${escapeHtml(field.key)}" data-kind="toggle" type="checkbox"${checked(bool(value, false))}></label>`;
        if (field.kind === "select") return `<label${field.wide ? ' class="wide"' : ""}><span>${escapeHtml(field.label)}</span><select data-config-field="${escapeHtml(field.key)}" data-kind="select">${(field.options ?? []).map((option) => `<option value="${escapeHtml(option.value)}"${value === option.value ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select></label>`;
        return `<label${field.wide ? ' class="wide"' : ""}><span>${escapeHtml(field.label)}</span><input data-config-field="${escapeHtml(field.key)}" data-kind="${field.kind}" type="${field.kind}" value="${escapeHtml(value)}"${field.kind === "password" ? ' autocomplete="off"' : ""}></label>`;
      };
      return `<article class="provider-card" data-provider-id="${escapeHtml(provider.id)}" data-provider-type="${escapeHtml(provider.type)}">
        <header><div><h2>${escapeHtml(heading)}</h2></div><input class="provider-enabled" aria-label="Enable ${escapeHtml(heading)} provider" data-field="enabled" type="checkbox"${checked(provider.enabled)}></header>
        <div class="form-grid">
          ${adapter.fields.map(fieldHtml).join("")}
        </div>
        <footer><button data-action="save" class="primary">Save provider</button><button data-action="test">Send test</button><button data-action="delete" class="danger">Delete</button></footer>
      </article>`;
    }

    function trackedTorrentHtml(record: TrackedTorrent): string {
      const progress = Math.max(0, Math.min(100, Math.round((record.lastSeenProgress ?? 0) * 100)));
      const delivery = record.notifiedAt ? "Notified" : record.lastNotifyError ? "Delivery error" : record.completedAt ? "Awaiting delivery" : "Tracking";
      const tone = record.notifiedAt ? "success" : record.lastNotifyError ? "warning" : "info";
      const flags = [record.isSimulationSmoke ? "Simulation" : "", record.isNativeSimulationFallback ? "Fallback" : ""].filter(Boolean);
      const title = record.animeTitle ?? record.name;
      const episode = record.episodeNumber !== undefined ? `<span class="track-episode">Episode ${escapeHtml(String(record.episodeNumber))}</span>` : "";
      return `<article class="track-card"><div class="track-main"><div class="track-heading"><div class="track-title"><strong>${escapeHtml(title)}</strong>${episode}</div><div class="track-badges"><span class="badge ${tone}">${delivery}</span>${flags.map((flag) => `<span class="badge muted">${flag}</span>`).join("")}</div></div><div class="progress" aria-label="${progress}% complete"><i style="width:${progress}%"></i></div><div class="track-meta"><span>${progress}%</span><span>${escapeHtml(record.lastSeenStatus ?? "Waiting for torrent snapshot")}</span><span>${record.notifyAttempts} delivery attempt${record.notifyAttempts === 1 ? "" : "s"}</span></div>${record.lastNotifyError ? `<p class="track-error">${escapeHtml(redact(record.lastNotifyError))}</p>` : ""}</div></article>`;
    }

    function activityHtml(): string {
      if (!activity.length) return '<div class="empty">No runtime activity recorded yet.</div>';
      return activity.map((entry) => `<li class="activity-${entry.level}"><time>${escapeHtml(new Date(entry.at).toLocaleTimeString())}</time><i></i><code>${escapeHtml(humanizeActivity(redact(entry.message)))}</code></li>`).join("");
    }

    function pageHtml(): string {
      const providers = loadProviderDocument().providers;
      const availableAdapters = Object.values(providerAdapters).filter((adapter) => !providers.some((provider) => provider.type === adapter.type));
      const providerOptions = availableAdapters.length
        ? availableAdapters.map((adapter) => `<option value="${escapeHtml(adapter.type)}">${escapeHtml(adapter.label)}</option>`).join("")
        : '<option value="">All provider types configured</option>';
      const state = loadState();
      const tracks = Object.values(state).sort((left, right) => Date.parse(right.addedAt) - Date.parse(left.addedAt));
      const pendingCount = pendingTorrents(state).length;
      const enabledCount = providers.filter((provider) => provider.enabled).length;
      const smokeMode = bool($getUserPreference("devEnableSimulationSmokeMode"), false);
      const smokeNotifications = bool($getUserPreference("devAllowSimulationNotifications"), false);
      const nativeFallback = bool($getUserPreference("devUseEmptyNativeSimulationFallback"), false);
      const developmentPanel = __SEANIME_NOTIFIER_DEVELOPMENT__ ? `<aside class="panel development">
        <div class="section-heading"><div><h2>Development tools</h2><p>Exercise the isolated runtime without adding a real download.</p></div><span class="badge info">Development</span></div>
        <div class="status-row"><span class="badge ${smokeMode ? "success" : "muted"}">Smoke mode ${smokeMode ? "on" : "off"}</span><span class="badge ${smokeNotifications ? "success" : "warning"}">Delivery ${smokeNotifications ? "allowed" : "blocked"}</span><span class="badge ${nativeFallback ? "success" : "muted"}">Empty-run fallback ${nativeFallback ? "on" : "off"}</span></div>
        <button data-global-action="poll">Poll tracked downloads now</button>
      </aside>` : "";
      return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
        :root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;background:#0c0c0d;color:#f5f5f5}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 80% 0%,rgba(109,83,255,.1),transparent 32%),#0c0c0d}button,input,select{font:inherit}.page{max-width:1440px;margin:0 auto;padding:42px 44px 72px}.hero{display:flex;align-items:flex-start;justify-content:space-between;gap:28px;margin-bottom:28px}.hero h1{font-size:clamp(28px,3vw,44px);letter-spacing:-.035em;margin:0 0 10px}.hero p,.section-heading p{color:#92929d;margin:0;line-height:1.55}.metrics{display:flex;gap:10px;flex-wrap:wrap}.badge{display:inline-flex;align-items:center;border:1px solid #34343a;border-radius:999px;padding:6px 11px;font-size:12px;font-weight:700;background:#202024}.badge.success{color:#86efac;border-color:#225d3c}.badge.info{color:#93c5fd;border-color:#2c4d73}.badge.warning{color:#fdba74;border-color:#714829}.badge.muted{color:#b6b6be}.layout{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(300px,.75fr);gap:22px;align-items:start}.panel,.provider-card{border:1px solid #29292e;background:rgba(22,22,24,.94);border-radius:16px;padding:22px}.section-heading,.provider-card header{display:flex;justify-content:space-between;gap:18px;align-items:center}.section-heading h2,.provider-card h2{margin:0;font-size:20px}.add-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;margin-top:20px}label span{display:block;font-size:12px;font-weight:700;margin-bottom:8px;color:#d8d8dd}input,select,button{font:inherit;border:1px solid #333339;border-radius:10px;background:#111113;color:#f3f3f4;min-height:44px;padding:10px 13px}button{cursor:pointer;font-weight:700;background:#252529}button:hover{border-color:#5c52bd;background:#2d2b3b}.primary{background:#6554d9;border-color:#7668e3}.danger{color:#fca5a5}.providers{display:grid;gap:16px;margin-top:18px}.provider-card header{margin-bottom:20px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.form-grid label.wide{grid-column:1/-1}.form-grid input,.form-grid select{width:100%}.form-grid .toggle{display:flex;align-items:center;justify-content:space-between;border-top:1px solid #29292e;padding-top:14px}.form-grid .toggle span{margin:0}.form-grid input[type=checkbox],.provider-enabled{appearance:none;width:42px;min-height:24px;height:24px;padding:0;border-radius:999px;background:#35353a;position:relative}.form-grid input[type=checkbox]:checked,.provider-enabled:checked{background:#6d5ce8}.form-grid input[type=checkbox]:after,.provider-enabled:after{content:"";position:absolute;width:18px;height:18px;top:2px;left:3px;border-radius:50%;background:white;transition:.18s}.form-grid input[type=checkbox]:checked:after,.provider-enabled:checked:after{left:19px}.provider-card footer{display:flex;gap:10px;margin-top:22px}.side{display:grid;gap:16px;position:sticky;top:24px}.status-row{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}.empty{padding:40px;text-align:center;color:#92929d;border:1px dashed #36363d;border-radius:14px}.eyebrow{color:#9b8cff;font-size:12px;text-transform:uppercase;letter-spacing:.14em;font-weight:800;margin-bottom:10px}.runtime-data{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:22px;margin-top:22px}.runtime-data .panel{min-width:0}.runtime-data .section-heading{margin-bottom:18px}.track-list{display:grid;gap:10px}.track-card{border:1px solid #29292e;border-radius:12px;padding:15px;background:#111113}.track-heading{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.track-title{display:grid;gap:4px;min-width:0}.track-heading .track-badges{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.track-heading strong{overflow-wrap:anywhere}.track-episode{color:#92929d;font-size:12px;font-weight:600}.progress{height:6px;margin:14px 0 8px;border-radius:999px;overflow:hidden;background:#29292e}.progress i{display:block;height:100%;background:#7565ea}.track-meta{display:flex;gap:10px;flex-wrap:wrap;color:#92929d;font-size:12px}.track-error{margin:10px 0 0;color:#fdba74;font-size:12px;overflow-wrap:anywhere}.activity-list{list-style:none;margin:0;padding:0;max-height:380px;overflow:auto}.activity-list li{display:grid;grid-template-columns:78px 7px minmax(0,1fr);gap:9px;align-items:start;padding:10px 0;border-bottom:1px solid #29292e}.activity-list li:last-child{border-bottom:0}.activity-list time{color:#777781;font-size:11px}.activity-list i{width:7px;height:7px;margin-top:4px;border-radius:50%;background:#93c5fd}.activity-list .activity-warning i{background:#fdba74}.activity-list .activity-error i{background:#f87171}.activity-list code{color:#c8c8ce;font:11px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:normal;overflow-wrap:anywhere}@media(max-width:900px){.page{padding:28px 18px}.hero{display:block}.metrics{margin-top:18px}.layout,.runtime-data{grid-template-columns:1fr}.side{position:static}.form-grid{grid-template-columns:1fr}.form-grid label.wide{grid-column:auto}}
        .badge{white-space:nowrap}
      </style></head><body><main class="page"><header class="hero"><div><div class="eyebrow">Provider management</div><h1>Seanime Download Notifier</h1><p>Configure delivery providers for completed Auto Downloader torrents.</p></div><div class="metrics"><span class="badge ${providers.length ? "success" : "warning"}">${providers.length} provider${providers.length === 1 ? "" : "s"}</span><span class="badge muted">${enabledCount} enabled</span><span id="pending-metric" class="badge ${pendingCount ? "info" : "muted"}">${pendingCount} pending</span></div></header>
      <div class="layout"><section><div class="panel"><div class="section-heading"><div><h2>Add provider</h2><p>Configure one record for each supported provider type.</p></div></div><div class="add-row"><select id="provider-type"${availableAdapters.length ? "" : " disabled"}>${providerOptions}</select><button class="primary" data-global-action="add"${availableAdapters.length ? "" : " disabled"}>Add provider</button></div></div><div class="providers">${providers.length ? providers.map(providerHtml).join("") : '<div class="empty">No providers configured. Add a provider to begin.</div>'}</div></section><div class="side"><aside class="panel"><div class="section-heading"><div><h2>Runtime status</h2><p>Only torrents owned by Seanime Auto Downloader are tracked.</p></div></div><div class="status-row"><span id="pending-status" class="badge ${pendingCount ? "info" : "muted"}">${pendingCount} awaiting delivery</span></div></aside>${developmentPanel}</div></div><div class="runtime-data"><section class="panel"><div class="section-heading"><div><h2>Tracked torrents</h2><p>Current Auto Downloader-owned records and delivery state.</p></div></div><div id="tracked-list" class="track-list">${tracks.length ? tracks.map(trackedTorrentHtml).join("") : '<div class="empty">No Auto Downloader torrents are currently tracked.</div>'}</div></section><section class="panel"><div class="section-heading"><div><h2>Activity log</h2><p>Recent redacted runtime events, retained across plugin reloads.</p></div><span class="badge muted">Last ${ACTIVITY_LIMIT}</span></div><ol id="activity-list" class="activity-list">${activityHtml()}</ol></section></div></main>
        <script>(()=>{const send=(event,payload)=>window.webview.send(event,payload);window.webview.on("runtime-update",payload=>{const tracks=document.getElementById("tracked-list");const logs=document.getElementById("activity-list");const metric=document.getElementById("pending-metric");const status=document.getElementById("pending-status");if(tracks)tracks.innerHTML=payload.tracksHtml;if(logs)logs.innerHTML=payload.activityHtml;if(metric){metric.textContent=payload.pendingCount+" pending";metric.className="badge "+(payload.pendingCount?"info":"muted")}if(status){status.textContent=payload.pendingCount+" awaiting delivery";status.className="badge "+(payload.pendingCount?"info":"muted")}});const read=(card)=>{const config={};card.querySelectorAll("[data-config-field]").forEach(field=>{config[field.dataset.configField]=field.dataset.kind==="toggle"?field.checked:field.value});return{id:card.dataset.providerId,type:card.dataset.providerType,enabled:card.querySelector('[data-field="enabled"]').checked,config}};document.addEventListener("click",event=>{const button=event.target.closest("button");if(!button)return;const globalAction=button.dataset.globalAction;if(globalAction){send(globalAction,globalAction==="add"?{type:document.getElementById("provider-type").value}:{});return}const card=button.closest("[data-provider-id]");if(!card)return;const action=button.dataset.action;if(action==="delete")send("delete-provider",{id:card.dataset.providerId});else if(action==="save")send("save-provider",read(card));else if(action==="test")send("test-provider",read(card))})})();</script></body></html>`;
    }

    webview.setContent(pageHtml);
    publishRuntimeUpdate = () => {
      const state = loadState();
      const tracks = Object.values(state).sort((left, right) => Date.parse(right.addedAt) - Date.parse(left.addedAt));
      webview.channel.send("runtime-update", {
        tracksHtml: tracks.length ? tracks.map(trackedTorrentHtml).join("") : '<div class="empty">No Auto Downloader torrents are currently tracked.</div>',
        activityHtml: activityHtml(),
        pendingCount: pendingTorrents(state).length,
      });
    };
    webview.channel.on("add", (payload) => {
      const type = (payload as { type?: unknown } | undefined)?.type;
      if (typeof type !== "string") return;
      const adapter = providerAdapters[type];
      if (!adapter) return;
      if (loadProviderDocument().providers.some((provider) => provider.type === type)) {
        ctx.toast?.warning?.(`${adapter.label} is already configured`);
        return;
      }
      upsertProvider(adapter.create(`${type}-main`));
      logInfo(eventDetails("provider_config_saved", { providers: loadProviderDocument().providers.length }));
      webview.update();
      ctx.toast?.success?.(`Added ${adapter.label} provider`);
    });
    webview.channel.on("save-provider", (payload) => {
      const provider = normalizeProvider(payload);
      if (!provider) return;
      upsertProvider(provider);
      logInfo(eventDetails("provider_config_saved", { providers: loadProviderDocument().providers.length }));
      webview.update();
      ctx.toast?.success?.(`Saved ${provider.label}`);
    });
    webview.channel.on("delete-provider", (payload) => {
      const id = (payload as { id?: unknown } | undefined)?.id;
      if (typeof id !== "string") return;
      deleteProvider(id);
      logInfo(eventDetails("provider_config_saved", { providers: loadProviderDocument().providers.length }));
      webview.update();
      ctx.toast?.success?.("Provider deleted");
    });
    webview.channel.on("test-provider", (payload) => {
      const provider = normalizeProvider(payload);
      if (!provider) return;
      upsertProvider(provider);
      const adapter = providerAdapters[provider.type];
      if (!adapter) return;
      if (!ctx.fetch) {
        ctx.toast?.error?.("Test failed: Seanime fetch API is unavailable");
        return;
      }
      void adapter.send({ torrentName: "Seanime Download Notifier test", completedAt: new Date().toISOString() }, provider, ctx.fetch)
        .then(() => ctx.toast?.success?.(`Test notification sent via ${provider.label}`))
        .catch((error) => ctx.toast?.error?.(`Test failed: ${error instanceof Error ? error.message : String(error)}`));
    });
    if (__SEANIME_NOTIFIER_DEVELOPMENT__) {
      webview.channel.on("poll", () => {
        void poll();
        ctx.toast?.success?.("Development poll requested");
      });
    }

    if (typeof ctx.newTray === "function") {
      const tray = ctx.newTray({ tooltipText: "Download Notifier", iconUrl: trayIconUrl, withContent: false });
      const screenPath = `/webview?id=${__SEANIME_NOTIFIER_DEVELOPMENT__ ? "seanime-download-notifier-dev" : "seanime-download-notifier"}`;
      tray.onClick?.(() => ctx.screen?.navigateTo?.(screenPath));
      tray.updateBadge?.({ number: pendingTorrents(loadState()).length, intent: "info" });
    }
  }

  if ($store.watch) {
    $store.watch<string>(POLL_NOW_KEY, () => { void poll(); });
    $store.watch<TorrentSnapshot>(SIMULATION_SNAPSHOT_KEY, (snapshot) => {
      if (snapshot && typeof snapshot.hash === "string") {
        const delaySeconds = clamp($getUserPreference("devSimulationDelaySeconds"), 0, 30, 3);
        void poll([{ ...snapshot, progress: 0, status: "downloading" }], snapshot.trackKey).then(() => {
          const complete = (): void => {
            logInfo(eventDetails("simulation_delay_completed", { trackKey: snapshot.trackKey }));
            void poll([{ ...snapshot, progress: 1, status: "seeding" }], snapshot.trackKey);
          };
          if (delaySeconds <= 0) {
            complete();
            return;
          }
          logInfo(eventDetails("simulation_delay_started", { trackKey: snapshot.trackKey, delaySeconds }));
          const timeoutFn = typeof ctx.setTimeout === "function" ? ctx.setTimeout : setTimeout;
          timeoutFn(complete, delaySeconds * 1000);
        });
      }
    });
    $store.watch<{ at?: string; rules?: Array<{ mediaId?: number; episodeNumbers?: number[] }> }>(EMPTY_NATIVE_SIMULATION_KEY, (signal) => { void runEmptyNativeSimulationFallback(signal); });
  }

  renderProviderManager();

  const intervalFn = typeof ctx.setInterval === "function" ? ctx.setInterval : setInterval;
  intervalFn(() => { void poll(); }, config().pollIntervalSeconds * 1000);
  logInfo(eventDetails("runtime_started", { development: __SEANIME_NOTIFIER_DEVELOPMENT__, pollIntervalSeconds: config().pollIntervalSeconds }));
  ctx.toast?.success?.("Seanime Download Notifier loaded");
  void poll();
}
