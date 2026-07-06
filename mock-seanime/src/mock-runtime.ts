import type { DiscordProvider, Log, Notification, Settings, Torrent } from "./types";
export const createDiscordProvider = (_index: number): DiscordProvider => ({ id: "discord-main", type: "discord", label: "Discord", enabled: true, webhook: "", mention: "", embedStyle: "detailed", includeName: true, includePath: false, includeTimestamp: true, providerFails: false });
export const defaults: Settings = { enabled: true, eventEnabled: true, smoke: true, allowSmoke: true, useEmptyNativeSimulationFallback: true, interval: 30, retention: 30, providers: [] };
export const loadTorrents = (): Torrent[] => JSON.parse(localStorage.getItem("notifier-torrents") ?? "[]") as Torrent[];
export const saveTorrents = (items: Torrent[]) => localStorage.setItem("notifier-torrents", JSON.stringify(items));
export const time = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
export function processCompletion(torrent: Torrent, settings: Settings): { torrent: Torrent; notification?: Notification; log: Log } {
  if (!settings.enabled || !settings.eventEnabled) return { torrent, log: { time: time(), message: "Polling skipped — plugin or event disabled", tone: "warning" } };
  const provider = settings.providers.find(item => item.enabled && item.webhook);
  if (!provider) return { torrent, log: { time: time(), message: "Completion retained — no enabled provider is configured", tone: "warning" } };
  if (provider.providerFails) return { torrent: { ...torrent, attempts: torrent.attempts + 1, lastError: "Provider delivery failed; retry scheduled." }, log: { time: time(), message: `${provider.label} failed — retry ${torrent.attempts + 1} scheduled`, tone: "error" } };
  if (torrent.notified) return { torrent, log: { time: time(), message: `De-dupe skipped ${torrent.name}`, tone: "info" } };
  const simulationTitle = torrent.isNativeFallback
    ? "Download completed · development smoke test · native simulation fallback"
    : "Download completed · development smoke test";
  const { lastError: _lastError, ...withoutError } = torrent;
  return { torrent: { ...withoutError, notified: true, attempts: torrent.attempts + 1 }, notification: { title: torrent.isSimulation ? simulationTitle : "Download completed", name: torrent.name, ...(torrent.isSimulation ? { simulation: true } : {}) }, log: { time: time(), message: `Notification sent — ${torrent.name}`, tone: "success" } };
}
