import { describe, expect, it, vi } from "vitest";
import { createDiscordIsolatedAdapter } from "../../../src/providers/discord";

describe("Discord isolated provider adapter", () => {
  it("owns and normalizes its configuration contract", () => {
    const adapter = createDiscordIsolatedAdapter();
    expect(adapter.fields.map((field) => field.key)).toEqual(["webhookUrl", "mention", "embedStyle", "includeTorrentName", "includeContentPath", "includeTimestamp"]);
    const provider = adapter.create("discord-main");
    expect(provider).toMatchObject({ id: "discord-main", type: "discord", enabled: false, label: "Discord" });
    expect(adapter.normalize(undefined)).toBeNull();
    expect(adapter.normalize({ id: "x", type: "email" })).toBeNull();
    expect(adapter.normalize({ id: " main ", type: "discord", enabled: "true", config: { webhookUrl: " https://example.test/hook ", embedStyle: "compact" } })).toMatchObject({
      id: "main", enabled: true, config: { webhookUrl: "https://example.test/hook", embedStyle: "compact", includeTorrentName: true },
    });
  });

  it("migrates legacy preferences inside the provider boundary", () => {
    const preferences: Record<string, string> = { discordEnabled: "true", discordWebhookUrl: " https://example.test/hook " };
    const adapter = createDiscordIsolatedAdapter();
    expect(adapter.migrateLegacy((key: string) => preferences[key])).toMatchObject({ id: "discord-main", enabled: true, config: { webhookUrl: "https://example.test/hook" } });
    expect(adapter.migrateLegacy(() => undefined)).toBeNull();
  });

  it("builds the enriched payload and delivers it without exposing excluded paths", async () => {
    const adapter = createDiscordIsolatedAdapter();
    const provider = adapter.normalize({ id: "discord-main", type: "discord", enabled: true, config: { webhookUrl: "https://example.test/hook", mention: "<@1>", includeTorrentName: true, includeContentPath: false, includeTimestamp: true, embedStyle: "detailed" } })!;
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    await adapter.send({ torrentName: "Anime S01E01", displayTorrentName: "Anime S01E01", animeTitle: "Anime", episodeNumber: 1, episodeTitle: "Start", animeCoverUrl: "https://img/cover", episodeImageUrl: "https://img/episode", quality: "1080p", contentPath: "/private", completedAt: "2026-01-01T00:00:00Z" }, provider, fetcher);
    const body = JSON.parse(fetcher.mock.calls[0]![1].body as string) as Record<string, unknown>;
    expect(body).toMatchObject({ content: "<@1>", embeds: [{ thumbnail: { url: "https://img/cover" }, image: { url: "https://img/episode" } }] });
    expect(JSON.stringify(body)).toContain("1080p");
    expect(JSON.stringify(body)).not.toContain("/private");
  });

  it("uses torrent fallback text for compact embeds when no anime title exists", async () => {
    const adapter = createDiscordIsolatedAdapter();
    const provider = adapter.normalize({ id: "discord-main", type: "discord", enabled: true, config: { webhookUrl: "https://example.test/hook" } })!;
    const compactProvider = { ...provider, config: { ...provider.config, embedStyle: "compact" } };
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    await adapter.send({ torrentName: "Torrent fallback", completedAt: "now" }, compactProvider, fetcher);
    const body = JSON.parse(fetcher.mock.calls[0]![1].body as string) as Record<string, unknown>;
    expect(body).toMatchObject({ embeds: [{ description: "Torrent fallback" }] });
  });

  it("marks native fallback payloads and reports validation/HTTP failures", async () => {
    const adapter = createDiscordIsolatedAdapter();
    const empty = adapter.create("discord-main");
    await expect(adapter.send({ torrentName: "x", completedAt: "now" }, empty, vi.fn())).rejects.toThrow("not configured");
    const provider = { ...empty, config: { ...empty.config, webhookUrl: "https://example.test/hook" } };
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 429, statusText: "Too Many Requests" });
    await expect(adapter.send({ torrentName: "x", completedAt: "now", isNativeSimulationFallback: true }, provider, fetcher)).rejects.toThrow("HTTP 429 Too Many Requests");
    expect(fetcher.mock.calls[0]![1].body).toContain("native simulation fallback");
  });

  it("covers compact payload options and every optional metadata field", async () => {
    const adapter = createDiscordIsolatedAdapter();
    const provider = adapter.normalize({
      id: "discord-main", type: "discord", enabled: true, config: {
        webhookUrl: "https://example.test/hook", mention: "", includeTorrentName: false,
        includeContentPath: true, includeTimestamp: false, embedStyle: "compact",
      }
    })!;
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    await adapter.send({
      torrentName: "Fallback", animeTitle: "Anime", episodeNumber: 2, animeFormat: "TV_SHORT",
      animeYear: 2026, animeDurationMinutes: 24, animeScore: 82, animeGenres: ["Action", "Fantasy"],
      quality: "1080p", releaseSource: "WEB-DL", videoCodec: "H.264", audioCodec: "AAC",
      torrentSize: "1 GiB", releaseGroup: "Group", audioLanguage: "Japanese",
      subtitleLanguages: "English", contentPath: "/anime/file.mkv", completedAt: "now",
      isSimulationSmoke: true,
    }, provider, fetcher);
    const body = fetcher.mock.calls[0]![1].body as string;
    expect(body).toContain("development smoke test");
    expect(body).not.toContain("/anime/file.mkv");
    expect(body).not.toContain('"timestamp"');
    expect(JSON.parse(body)).toMatchObject({ embeds: [{ description: "Anime", fields: [{ name: "Episode", value: "2", inline: true }] }] });
  });

  it("normalizes defensive defaults and reports readiness", () => {
    const adapter = createDiscordIsolatedAdapter();
    expect(adapter.normalize({ id: " ", type: "discord" })).toBeNull();
    expect(adapter.normalize({ id: "main", type: "discord", enabled: "true" })).toMatchObject({
      id: "main", enabled: true, config: { webhookUrl: "", mention: "", includeTorrentName: true, includeContentPath: false, includeTimestamp: true, embedStyle: "detailed" },
    });
    expect(adapter.normalize({
      id: "main", type: "discord", enabled: "false", config: {
        webhookUrl: 42, mention: 42, includeTorrentName: "invalid", includeContentPath: "true",
        includeTimestamp: "false", embedStyle: "invalid",
      }
    })).toMatchObject({
      enabled: false, config: {
        webhookUrl: "", mention: "", includeTorrentName: true, includeContentPath: true,
        includeTimestamp: false, embedStyle: "detailed",
      }
    });
    expect(adapter.isReady(adapter.create("empty"))).toBe(false);
    expect(adapter.isReady({ ...adapter.create("ready"), enabled: true, config: { webhookUrl: "https://example.test/hook" } })).toBe(true);
  });

  it("migrates all legacy options and omits status text when unavailable", async () => {
    const preferences: Record<string, string> = {
      discordEnabled: "false", discordWebhookUrl: "https://example.test/hook", discordMention: " @here ",
      discordIncludeTorrentName: "false", discordIncludeContentPath: "true",
      discordIncludeTimestamp: "false", discordEmbedStyle: "compact",
    };
    const adapter = createDiscordIsolatedAdapter();
    expect(adapter.migrateLegacy((key: string) => preferences[key])).toMatchObject({
      enabled: false, config: {
        mention: "@here", includeTorrentName: false, includeContentPath: true,
        includeTimestamp: false, embedStyle: "compact",
      }
    });
    const provider = { ...adapter.create("discord-main"), config: { ...adapter.create("discord-main").config, webhookUrl: "https://example.test/hook" } };
    await expect(adapter.send({ torrentName: "x", completedAt: "now" }, provider, vi.fn().mockResolvedValue({ ok: false, status: 500 }))).rejects.toThrow("HTTP 500");
  });
});
