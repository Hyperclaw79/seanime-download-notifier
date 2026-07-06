declare const $store: {
  set(key: string, value: unknown): void;
};
declare const $storage: {
  get<T>(key: string): T | undefined;
  set(key: string, value: unknown): void;
};
declare const __SEANIME_NOTIFIER_DEVELOPMENT__: boolean;
declare const console: { log(...values: unknown[]): void };

type AutoDownloaderRunCompletedEvent = {
  next(): void;
  rules?: Array<{ mediaId: number; episodeNumbers?: number[] }>;
  isSimulation: boolean;
  downloadedCount: number;
  queuedCount: number;
  delayedCount: number;
};

export function autoDownloaderRunCompleted(event: AutoDownloaderRunCompletedEvent): void {
  const EMPTY_NATIVE_SIMULATION_KEY = "download-notifier-empty-native-simulation";
  const ACTIVITY_KEY = "download-notifier-activity-v1";
  const finite = (value: unknown): value is number => typeof value === "number" && value === value && value !== Infinity && value !== -Infinity;
  const appendActivity = (message: string): void => {
    const entries = $storage.get<Array<{ at: string; level: "info"; message: string }>>(ACTIVITY_KEY) ?? [];
    $storage.set(ACTIVITY_KEY, [{ at: new Date().toISOString(), level: "info", message }, ...entries].slice(0, 30));
  };

  event.next();
  if (!__SEANIME_NOTIFIER_DEVELOPMENT__) return;
  if (!event.isSimulation) return;

  console.log(`[download-notifier] event=native_simulation_completed downloaded=${event.downloadedCount} queued=${event.queuedCount} delayed=${event.delayedCount}`);
  appendActivity(`Native simulation completed: ${event.downloadedCount} downloaded, ${event.queuedCount} queued, ${event.delayedCount} delayed.`);

  if (event.downloadedCount === 0 && event.queuedCount === 0 && event.delayedCount === 0) {
    $store.set(EMPTY_NATIVE_SIMULATION_KEY, {
      at: new Date().toISOString(),
      downloadedCount: event.downloadedCount,
      queuedCount: event.queuedCount,
      delayedCount: event.delayedCount,
      rules: (event.rules ?? []).flatMap((rule) => finite(rule.mediaId)
        ? [{ mediaId: rule.mediaId, episodeNumbers: Array.isArray(rule.episodeNumbers) ? rule.episodeNumbers : [] }]
        : []),
    });
    console.log(`[download-notifier] event=native_simulation_fallback_signaled rules=${(event.rules ?? []).length}`);
    appendActivity("Native simulation found no candidates; requesting the completed-torrent fallback.");
  }
}
