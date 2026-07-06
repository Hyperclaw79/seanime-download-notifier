/** Self-contained factory: Denshi re-runs it inside each isolated runtime through $shared. */
export function createDiscordIsolatedAdapter() {
  const bool = (value: unknown, fallback: boolean): boolean => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string" && value.toLowerCase() === "true") return true;
    if (typeof value === "string" && value.toLowerCase() === "false") return false;
    return fallback;
  };
  type Stored = { id: string; type: string; enabled: boolean; label: string; config: Record<string, unknown> };
  type Event = {
    torrentName: string; completedAt: string; animeTitle?: string; episodeNumber?: number | string; episodeTitle?: string;
    animeCoverUrl?: string; episodeImageUrl?: string; animeFormat?: string; animeYear?: number; animeDurationMinutes?: number;
    animeScore?: number; animeGenres?: string[]; quality?: string; releaseSource?: string; videoCodec?: string; audioCodec?: string;
    torrentSize?: string; releaseGroup?: string; audioLanguage?: string; subtitleLanguages?: string; displayTorrentName?: string;
    contentPath?: string; isNativeSimulationFallback?: boolean; isSimulationSmoke?: boolean;
  };
  const buildPayload = (event: Event, provider: Stored): unknown => {
    const config = provider.config;
    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];
    if (event.animeTitle) fields.push({ name: "Anime", value: event.animeTitle, inline: true });
    if (event.episodeNumber !== undefined) fields.push({ name: "Episode", value: event.episodeTitle ? `${event.episodeNumber} · ${event.episodeTitle}` : String(event.episodeNumber), inline: true });
    const details = [event.animeFormat?.replace(/_/g, " "), event.animeYear, event.animeDurationMinutes ? `${event.animeDurationMinutes} min` : undefined, event.animeScore !== undefined ? `★ ${(event.animeScore / 10).toFixed(1)}/10` : undefined].filter((value) => value !== undefined);
    if (details.length) fields.push({ name: "Details", value: details.join(" · ") });
    if (event.animeGenres?.length) fields.push({ name: "Genres", value: event.animeGenres.slice(0, 4).join(" · ") });
    const release = [event.quality, event.releaseSource, event.videoCodec, event.audioCodec].filter(Boolean);
    if (release.length) fields.push({ name: "Release", value: release.join(" · ") });
    if (event.torrentSize) fields.push({ name: "Size", value: event.torrentSize, inline: true });
    if (event.releaseGroup) fields.push({ name: "Group", value: event.releaseGroup, inline: true });
    const languages = [event.audioLanguage ? `Audio: ${event.audioLanguage}` : undefined, event.subtitleLanguages ? `Subtitles: ${event.subtitleLanguages}` : undefined].filter(Boolean);
    if (languages.length) fields.push({ name: "Languages", value: languages.join("\n") });
    if (config.includeTorrentName) fields.push({ name: "Torrent", value: event.displayTorrentName ?? event.torrentName });
    if (config.includeContentPath && event.contentPath) fields.push({ name: "Content path", value: event.contentPath });
    return { ...(config.mention ? { content: config.mention } : {}), embeds: [{
      title: event.isNativeSimulationFallback ? "Download completed · development smoke test · native simulation fallback" : event.isSimulationSmoke ? "Download completed · development smoke test" : "Download completed",
      description: config.embedStyle === "compact" ? event.animeTitle ?? event.torrentName : undefined,
      color: 9133302,
      fields: config.embedStyle === "detailed" ? fields : fields.filter((field) => field.name === "Episode"),
      ...(event.animeCoverUrl ? { thumbnail: { url: event.animeCoverUrl } } : {}), ...(event.episodeImageUrl ? { image: { url: event.episodeImageUrl } } : {}),
      ...(config.includeTimestamp ? { timestamp: event.completedAt } : {}), footer: { text: `Seanime Download Notifier · ${provider.label}` },
    }] };
  };
  return {
    type: "discord", label: "Discord",
    fields: [
      { key: "webhookUrl", label: "Discord webhook URL", kind: "password", wide: true }, { key: "mention", label: "Optional mention", kind: "text" },
      { key: "embedStyle", label: "Embed style", kind: "select", options: [{ value: "detailed", label: "Detailed" }, { value: "compact", label: "Compact" }] },
      { key: "includeTorrentName", label: "Include torrent name", kind: "toggle" }, { key: "includeContentPath", label: "Include content path", kind: "toggle" }, { key: "includeTimestamp", label: "Include timestamp", kind: "toggle" },
    ],
    create: (id: string): Stored => ({ id, type: "discord", enabled: false, label: "Discord", config: { webhookUrl: "", mention: "", includeTorrentName: true, includeContentPath: false, includeTimestamp: true, embedStyle: "detailed" } }),
    normalize: (value: unknown): Stored | null => { const raw = value as Partial<Stored> | undefined; if (!raw || raw.type !== "discord" || typeof raw.id !== "string" || !raw.id.trim()) return null; const config = raw.config ?? {}; return { id: raw.id.trim(), type: "discord", enabled: bool(raw.enabled, false), label: "Discord", config: { webhookUrl: typeof config.webhookUrl === "string" ? config.webhookUrl.trim() : "", mention: typeof config.mention === "string" ? config.mention.trim() : "", includeTorrentName: bool(config.includeTorrentName, true), includeContentPath: bool(config.includeContentPath, false), includeTimestamp: bool(config.includeTimestamp, true), embedStyle: config.embedStyle === "compact" ? "compact" : "detailed" } }; },
    migrateLegacy: (getPreference: (key: string) => string | undefined): Stored | null => { const webhookUrl = (getPreference("discordWebhookUrl") ?? "").trim(); const enabled = bool(getPreference("discordEnabled"), false); if (!webhookUrl && !enabled) return null; return { id: "discord-main", type: "discord", enabled, label: "Discord", config: { webhookUrl, mention: (getPreference("discordMention") ?? "").trim(), includeTorrentName: bool(getPreference("discordIncludeTorrentName"), true), includeContentPath: bool(getPreference("discordIncludeContentPath"), false), includeTimestamp: bool(getPreference("discordIncludeTimestamp"), true), embedStyle: getPreference("discordEmbedStyle") === "compact" ? "compact" : "detailed" } }; },
    isReady: (provider: Stored): boolean => provider.enabled && typeof provider.config.webhookUrl === "string" && Boolean(provider.config.webhookUrl),
    send: async (event: unknown, provider: Stored, fetcher: (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; statusText?: string }>): Promise<void> => { const url = provider.config.webhookUrl; if (typeof url !== "string" || !url) throw new Error("Discord webhook is not configured"); const response = await fetcher(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(buildPayload(event as Event, provider)) }); if (!response.ok) throw new Error(`Discord webhook failed with HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`); },
  };
}
