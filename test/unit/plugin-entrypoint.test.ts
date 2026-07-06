import { readFileSync } from "node:fs";
import vm from "node:vm";
import { buildSync } from "esbuild";
import { describe, expect, it, vi } from "vitest";
import { createManifest } from "../../scripts/manifest-shared";

function pluginPayload(development: boolean): string {
  const result = buildSync({
    entryPoints: ["src/plugin.ts"],
    bundle: true,
    format: "iife",
    platform: "neutral",
    target: "es2020",
    define: {
      __SEANIME_NOTIFIER_DEVELOPMENT__: development ? "true" : "false",
      __SEANIME_NOTIFIER_ICON_URL__: JSON.stringify("https://git.example.test/team/notifier/raw/branch/main/assets/logo.png"),
    },
    write: false,
  });
  return result.outputFiles[0]?.text ?? "";
}

const developmentPayload = () => pluginPayload(true);
const productionPayload = () => pluginPayload(false);

function functionSource(payload: string, functionName: string): string {
  const start = payload.indexOf(`function ${functionName}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const bodyStart = payload.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < payload.length; index += 1) {
    const char = payload[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return payload.slice(start, index + 1);
  }
  throw new Error(`Could not extract ${functionName}`);
}

function functionBody(payload: string, functionName: string): string {
  const start = payload.indexOf(`function ${functionName}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const bodyStart = payload.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < payload.length; index += 1) {
    const char = payload[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return payload.slice(bodyStart + 1, index);
  }
  throw new Error(`Could not extract ${functionName} body`);
}

function installSharedProvider(payload: string, globals: Record<string, unknown>, additionalAdapters: unknown[] = []): void {
  const adapterFactory = vm.runInNewContext(`(${functionSource(payload, "createDiscordIsolatedAdapter")})`, globals) as () => unknown;
  const metadataFactory = vm.runInNewContext(`(${functionSource(payload, "createNotificationMetadataHelpers")})`, globals) as () => unknown;
  const providerConfigurationFactory = vm.runInNewContext(`(${functionSource(payload, "createProviderConfigurationHelpers")})`, globals) as () => unknown;
  const shared = {
    use: (name: string): unknown => {
      if (name === "download-notifier-provider-discord") return adapterFactory();
      if (name === "download-notifier-provider-catalog") return [...catalogFactory() as unknown[], ...additionalAdapters];
      if (name === "download-notifier-notification-metadata") return metadataFactory();
      if (name === "download-notifier-provider-configuration") return providerConfigurationFactory();
      throw new Error(`Unknown shared factory: ${name}`);
    }
  };
  Object.assign(globals, { $shared: shared });
  const catalogFactory = vm.runInNewContext(`(${functionSource(payload, "createProviderCatalog")})`, globals) as () => unknown;
}

describe("Seanime deployable entrypoint", () => {
  it("keeps the public entrypoint small and registers isolated callbacks directly", () => {
    const source = readFileSync("src/plugin.ts", "utf8");
    expect(source).toContain("$app.onAutoDownloaderAfterDownloadTorrent(autoDownloaderAfterDownloadTorrent");
    expect(source).toContain("$app.onAutoDownloaderRunCompleted(autoDownloaderRunCompleted");
    expect(source).toContain("$ui.register(registerDownloadNotifierUi");
    expect(source).not.toContain("startPlugin");
  });

  it("does not call outer runtime helpers from isolated callback bodies", () => {
    const payload = developmentPayload();
    const uiBody = functionBody(payload, "registerDownloadNotifierUi");
    const hookBody = functionBody(payload, "autoDownloaderAfterDownloadTorrent");
    const runCompletedBody = functionBody(payload, "autoDownloaderRunCompleted");

    expect(payload).not.toContain("startPlugin");
    expect(uiBody).not.toContain("handleAutoDownloaderEvent");
    expect(uiBody).not.toContain("startPlugin");
    expect(hookBody).not.toContain("handleAutoDownloaderEvent");
    expect(hookBody).not.toContain("startPlugin");
    expect(runCompletedBody).not.toContain("startPlugin");
  });

  it("keeps provider-specific config and delivery behind the shared provider adapter", () => {
    const payload = developmentPayload();
    const uiBody = functionBody(payload, "registerDownloadNotifierUi");

    expect(uiBody).toContain('$shared.use("download-notifier-provider-catalog")');
    expect(uiBody.toLowerCase()).not.toContain("discord");
    expect(uiBody).not.toContain("Discord webhook URL");
    expect(uiBody).not.toContain("discord.com/api/webhooks");
    expect(uiBody).not.toContain("buildDiscordPayload");
    expect(uiBody).not.toContain("refreshWebview");
  });

  it("executes every shared helper factory as an isolated IIFE without module closures", () => {
    const payload = developmentPayload();
    const globals = { Set, Map, Object, Array, String, Boolean, Number, JSON, Error, Promise };
    for (const name of ["createDiscordIsolatedAdapter", "createNotificationMetadataHelpers", "createProviderConfigurationHelpers"]) {
      const factory = vm.runInNewContext(`(${functionSource(payload, name)})`, globals) as () => unknown;
      expect(() => factory()).not.toThrow();
    }
    const uiBody = functionBody(payload, "registerDownloadNotifierUi");
    expect(uiBody).not.toContain("createDiscordIsolatedAdapter");
    expect(uiBody).not.toContain("createNotificationMetadataHelpers");
    expect(uiBody).not.toContain("createProviderConfigurationHelpers");
    expect(uiBody).not.toContain("languageNames");
  });


  it("keeps constants required by isolated callback bodies inside those bodies", () => {
    const payload = developmentPayload();
    const uiBody = functionBody(payload, "registerDownloadNotifierUi");
    const hookBody = functionBody(payload, "autoDownloaderAfterDownloadTorrent");
    const runCompletedBody = functionBody(payload, "autoDownloaderRunCompleted");

    expect(uiBody).toContain('const POLL_NOW_KEY = "download-notifier-poll-now"');
    expect(uiBody).toContain('const SIMULATION_SNAPSHOT_KEY = "download-notifier-simulation-snapshot"');
    expect(uiBody).toContain('const STATE_KEY = "download-notifier-state-v1"');
    expect(hookBody).toContain('const POLL_NOW_KEY = "download-notifier-poll-now"');
    expect(hookBody).toContain('const SIMULATION_SNAPSHOT_KEY = "download-notifier-simulation-snapshot"');
    expect(hookBody).toContain('const STATE_KEY = "download-notifier-state-v1"');
    expect(runCompletedBody).toContain('const EMPTY_NATIVE_SIMULATION_KEY = "download-notifier-empty-native-simulation"');
  });

  it("keeps hook registration outside the UI callback", () => {
    const payload = developmentPayload();
    const uiRegisterIndex = payload.indexOf("$ui.register");
    const hookIndexAfterUiRegister = payload.indexOf("$app.onAutoDownloaderAfterDownloadTorrent", uiRegisterIndex);
    const runCompletedIndexAfterUiRegister = payload.indexOf("$app.onAutoDownloaderRunCompleted", uiRegisterIndex);
    expect(hookIndexAfterUiRegister).toBe(-1);
    expect(runCompletedIndexAfterUiRegister).toBe(-1);
  });

  it("uses a full screen webview for provider management instead of a drawer", () => {
    const payload = developmentPayload();
    const uiBody = functionBody(payload, "registerDownloadNotifierUi");

    expect(uiBody).toContain('slot: "screen"');
    expect(uiBody).toContain("ctx.newWebview");
    expect(uiBody).not.toContain("isDrawer: true");
    expect(uiBody).not.toContain("getScreenPath");
    expect(uiBody).toContain('"seanime-download-notifier-dev" : "seanime-download-notifier"');
    expect(uiBody).toContain("iconUrl: trayIconUrl");
    expect(payload).toContain("development smoke test");
    expect(payload).toContain("native simulation fallback");
  });

  it("executes both registered callbacks in fresh runtimes without outer bindings", () => {
    const payload = developmentPayload();
    const stored = new Map<string, unknown>();
    const signals = new Map<string, unknown>();
    const globals = {
      $storage: { get: (key: string) => stored.get(key), set: (key: string, value: unknown) => stored.set(key, value) },
      $store: { set: (key: string, value: unknown) => signals.set(key, value), watch: () => undefined },
      $getUserPreference: () => undefined,
      console: { log: () => undefined, warn: () => undefined, error: () => undefined },
      setInterval: () => undefined,
      Date,
      Map,
      Number: Object.freeze({}),
      Object,
      Array,
      String,
      Boolean,
      JSON,
      Error,
      Promise,
    };
    installSharedProvider(payload, globals);

    const hook = vm.runInNewContext(`(${functionSource(payload, "autoDownloaderAfterDownloadTorrent")})`, globals) as (event: unknown) => void;
    hook({ next: () => undefined, downloaded: true, torrent: { hash: "ABC", name: "Example" } });
    expect(stored.get("download-notifier-state-v1")).toMatchObject({ abc: { name: "Example" } });
    expect(signals.has("download-notifier-poll-now")).toBe(true);

    const runCompleted = vm.runInNewContext(`(${functionSource(payload, "autoDownloaderRunCompleted")})`, globals) as (event: unknown) => void;
    runCompleted({ next: () => undefined, isSimulation: true, downloadedCount: 0, queuedCount: 0, delayedCount: 0 });
    expect(signals.has("download-notifier-empty-native-simulation")).toBe(true);

    const ui = vm.runInNewContext(`(${functionSource(payload, "registerDownloadNotifierUi")})`, globals) as (context: unknown) => void;
    expect(() => ui({})).not.toThrow();
    expect(stored.get("download-notifier-provider-config-v1")).toEqual({ version: 1, providers: [] });
  });

  it("keeps real and simulated tracks separate even when they share a torrent hash", () => {
    const payload = developmentPayload();
    const stored = new Map<string, unknown>();
    const globals = {
      $storage: { get: (key: string) => stored.get(key), set: (key: string, value: unknown) => stored.set(key, value) },
      $store: { set: () => undefined },
      $getUserPreference: (key: string) => key === "devSimulationDelaySeconds" ? "0" : "true",
      console: { log: () => undefined, warn: () => undefined },
      Date, Object, String, Boolean,
    };
    const hook = vm.runInNewContext(`(${functionSource(payload, "autoDownloaderAfterDownloadTorrent")})`, globals) as (event: unknown) => void;

    hook({ next: () => undefined, downloaded: true, torrent: { hash: "ABC", name: "Real torrent" } });
    hook({ next: () => undefined, downloaded: true, isSimulation: true, torrent: { hash: "ABC", name: "Simulated torrent" } });

    expect(stored.get("download-notifier-state-v1")).toMatchObject({
      abc: { name: "Real torrent" },
      "smoke:hook:abc": { name: "Simulated torrent", isSimulationSmoke: true },
    });
  });

  it("empty native simulation signals through store only", () => {
    const signals = new Map<string, unknown>();
    const stored = new Map<string, unknown>();
    let nextCalls = 0;
    const runCompleted = vm.runInNewContext(`(${functionSource(developmentPayload(), "autoDownloaderRunCompleted")})`, {
      $store: { set: (key: string, value: unknown) => signals.set(key, value) },
      $storage: { get: (key: string) => stored.get(key), set: (key: string, value: unknown) => stored.set(key, value) },
      Date,
    }) as (event: unknown) => void;

    runCompleted({ next: () => { nextCalls += 1; }, rules: [{ mediaId: 123, episodeNumbers: [4] }], isSimulation: true, downloadedCount: 0, queuedCount: 0, delayedCount: 0 });
    expect(nextCalls).toBe(1);
    expect(signals.get("download-notifier-empty-native-simulation")).toMatchObject({
      downloadedCount: 0, queuedCount: 0, delayedCount: 0,
      rules: [{ mediaId: 123, episodeNumbers: [4] }],
    });
  });

  it("keeps the empty native simulation fallback development-only", async () => {
    const payload = productionPayload();
    const stored = new Map<string, unknown>([["download-notifier-provider-config-v1", { version: 1, providers: [] }]]);
    const watchers = new Map<string, (value: unknown) => void>();
    const globals = {
      $storage: { get: (key: string) => stored.get(key), set: (key: string, value: unknown) => stored.set(key, value) },
      $store: { watch: (key: string, callback: (value: unknown) => void) => watchers.set(key, callback) },
      $getUserPreference: (key: string) => key === "devSimulationDelaySeconds" ? "0" : "true",
      console: { log: () => undefined, warn: () => undefined, error: () => undefined },
      setInterval: () => undefined,
      Date, Map, Number, Object, Array, String, Boolean, JSON, Error, Promise,
    };
    installSharedProvider(payload, globals);
    const ui = vm.runInNewContext(`(${functionSource(payload, "registerDownloadNotifierUi")})`, globals) as (context: unknown) => void;
    ui({ torrentClient: { getTorrents: async () => [{ hash: "ABC", name: "Completed", progress: 1, status: "seeding" }] } });
    watchers.get("download-notifier-empty-native-simulation")?.({ at: "2026-01-02T00:00:00.000Z", rules: [{ mediaId: 123, episodeNumbers: [7] }] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(stored.has("download-notifier-state-v1")).toBe(false);
  });

  it("does not overwrite a real tracked record during native simulation fallback", async () => {
    const payload = developmentPayload();
    const realRecord = { hash: "abc", name: "Real download", source: "auto_downloader", addedAt: "2026-01-01T00:00:00.000Z", notifyAttempts: 0 };
    const stored = new Map<string, unknown>([
      ["download-notifier-provider-config-v1", { version: 1, providers: [] }],
      ["download-notifier-state-v1", { abc: realRecord }],
    ]);
    const watchers = new Map<string, (value: unknown) => void>();
    const globals = {
      $storage: { get: (key: string) => stored.get(key), set: (key: string, value: unknown) => stored.set(key, value) },
      $store: { watch: (key: string, callback: (value: unknown) => void) => watchers.set(key, callback) },
      $getUserPreference: (key: string) => key === "devSimulationDelaySeconds" ? "0" : "true",
      console: { log: () => undefined, warn: () => undefined, error: () => undefined },
      setInterval: () => undefined,
      Date, Map, Number, Object, Array, String, Boolean, JSON, Error, Promise,
    };
    installSharedProvider(payload, globals);
    const ui = vm.runInNewContext(`(${functionSource(payload, "registerDownloadNotifierUi")})`, globals) as (context: unknown) => void;
    let torrentReads = 0;
    ui({ torrentClient: { getTorrents: async () => (++torrentReads === 1 ? [] : [{ hash: "ABC", name: "Completed", progress: 1, status: "seeding" }]) } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    watchers.get("download-notifier-empty-native-simulation")?.({ at: "2026-01-02T00:00:00.000Z", rules: [{ mediaId: 123, episodeNumbers: [7] }] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(stored.get("download-notifier-state-v1")).toMatchObject({
      abc: realRecord,
      "smoke:native:123:7:2026-01-02T00:00:00.000Z": { hash: "abc", mediaId: 123, episodeNumber: 7, isNativeSimulationFallback: true },
    });
  });

  it("preserves a previous smoke record when native fallback runs again", async () => {
    const payload = developmentPayload();
    const stored = new Map<string, unknown>([
      ["download-notifier-provider-config-v1", { version: 1, providers: [] }],
      ["download-notifier-state-v1", { "smoke:native:456:4:previous-run": { trackId: "old-smoke", hash: "def", name: "Previous Anime · Episode 4", animeTitle: "Previous Anime", source: "auto_downloader", mediaId: 456, episodeNumber: 4, addedAt: new Date().toISOString(), notifyAttempts: 1, notifiedAt: new Date().toISOString(), isSimulationSmoke: true, isNativeSimulationFallback: true } }],
    ]);
    const watchers = new Map<string, (value: unknown) => void>();
    const globals = {
      $storage: { get: (key: string) => stored.get(key), set: (key: string, value: unknown) => stored.set(key, value) },
      $store: { watch: (key: string, callback: (value: unknown) => void) => watchers.set(key, callback) },
      $getUserPreference: (key: string) => key === "devSimulationDelaySeconds" ? "0" : "true",
      console: { log: () => undefined, warn: () => undefined, error: () => undefined },
      setInterval: () => undefined,
      Date, Map, Number, Object, Array, String, Boolean, JSON, Error, Promise,
    };
    installSharedProvider(payload, globals);
    const ui = vm.runInNewContext(`(${functionSource(payload, "registerDownloadNotifierUi")})`, globals) as (context: unknown) => void;
    ui({ torrentClient: { getTorrents: async () => [{ hash: "ABC", name: "Reusable completed torrent", progress: 1, status: "seeding" }] } });
    watchers.get("download-notifier-empty-native-simulation")?.({ at: "2026-01-03T00:00:00.000Z", rules: [{ mediaId: 123, episodeNumbers: [7] }] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(stored.get("download-notifier-state-v1")).toMatchObject({
      "smoke:native:456:4:previous-run": { name: "Previous Anime · Episode 4", mediaId: 456, episodeNumber: 4 },
      "smoke:native:123:7:2026-01-03T00:00:00.000Z": { name: "Native simulation fallback", mediaId: 123, episodeNumber: 7, notifyAttempts: 0, isSimulationSmoke: true, isNativeSimulationFallback: true },
    });
  });

  it("does not resurrect legacy preferences after the provider list is intentionally emptied", () => {
    const payload = developmentPayload();
    const stored = new Map<string, unknown>([["download-notifier-provider-config-v1", { version: 1, providers: [] }]]);
    const globals = {
      $storage: { get: (key: string) => stored.get(key), set: (key: string, value: unknown) => stored.set(key, value) },
      $store: { watch: () => undefined },
      $getUserPreference: (key: string) => key === "discordWebhookUrl" ? "https://discord.com/api/webhooks/legacy" : key === "discordEnabled" ? "true" : undefined,
      console: { log: () => undefined, warn: () => undefined, error: () => undefined },
      setInterval: () => undefined,
      Date, Map, Number, Object, Array, String, Boolean, JSON, Error, Promise,
    };
    installSharedProvider(payload, globals);
    const ui = vm.runInNewContext(`(${functionSource(payload, "registerDownloadNotifierUi")})`, globals) as (context: unknown) => void;
    ui({});
    expect(stored.get("download-notifier-provider-config-v1")).toEqual({ version: 1, providers: [] });
  });

  it("enriches native fallback smoke notifications from the simulated rule", async () => {
    const payload = developmentPayload();
    const stored = new Map<string, unknown>([
      ["download-notifier-provider-config-v1", {
        version: 1, providers: [{
          id: "discord-main", type: "discord", enabled: true, label: "Discord",
          config: { webhookUrl: "https://discord.com/api/webhooks/test", mention: "", includeTorrentName: true, includeContentPath: false, includeTimestamp: true, embedStyle: "detailed" },
        }]
      }],
    ]);
    const watchers = new Map<string, (value: unknown) => void>();
    const requests: Array<{ body: string }> = [];
    const runtimeUpdates: Array<{ tracksHtml: string }> = [];
    const globals = {
      $storage: { get: (key: string) => stored.get(key), set: (key: string, value: unknown) => stored.set(key, value) },
      $store: { watch: (key: string, callback: (value: unknown) => void) => watchers.set(key, callback) },
      $getUserPreference: (key: string) => key === "devSimulationDelaySeconds" ? "0" : ["enabled", "downloadCompletedEnabled", "devEnableSimulationSmokeMode", "devAllowSimulationNotifications", "devUseEmptyNativeSimulationFallback"].includes(key) ? "true" : undefined,
      console: { log: () => undefined, warn: () => undefined, error: () => undefined },
      setInterval: () => undefined,
      Date, Map, Number, Object, Array, String, Boolean, JSON, Error, Promise,
    };
    installSharedProvider(payload, globals);
    const ui = vm.runInNewContext(`(${functionSource(payload, "registerDownloadNotifierUi")})`, globals) as (context: unknown) => void;
    ui({
      newWebview: () => ({
        setContent: () => undefined,
        update: () => undefined,
        channel: { on: () => undefined, send: (event: string, value: { tracksHtml: string }) => { if (event === "runtime-update") runtimeUpdates.push(value); } },
      }),
      torrentClient: { getTorrents: async () => [{ hash: "ABC", name: "[Probe] Completely Unrelated Show S02E01 1080p WEB-DL AAC2.0 H.264 {Tags:A=ja;S=en,es,fr,de;}", progress: 1, status: "seeding", size: "1.4 GiB", contentPath: "/anime/unrelated.mkv" }] },
      anime: {
        getAnimeEntry: async () => ({ media: { title: { userPreferred: "Enriched Anime" }, coverImage: { extraLarge: "https://images.example/cover.jpg" }, format: "TV", seasonYear: 2026, meanScore: 82, duration: 24, genres: ["Action", "Fantasy"] }, nextEpisode: { episodeNumber: 2 } }),
        getEpisodeCollection: async () => ({ episodes: [{ episodeNumber: 2, episodeMetadata: { title: "The Journey", image: "https://images.example/episode.jpg", hasImage: true } }] }),
      },
      fetch: async (_url: string, init: { body: string }) => { requests.push(init); return { ok: true, status: 204 }; },
    });
    watchers.get("download-notifier-empty-native-simulation")?.({ at: "2026-01-04T00:00:00.000Z", rules: [{ mediaId: 123, episodeNumbers: [] }] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(requests).toHaveLength(1);
    const request = JSON.parse(requests[0]!.body);
    expect(request).toMatchObject({
      embeds: [{
        title: expect.stringContaining("native simulation fallback"),
        fields: expect.arrayContaining([
          { name: "Anime", value: "Enriched Anime", inline: true },
          { name: "Episode", value: "2 · The Journey", inline: true },
          { name: "Torrent", value: "Enriched Anime · Episode 2" },
        ]),
        thumbnail: { url: "https://images.example/cover.jpg" },
        image: { url: "https://images.example/episode.jpg" },
      }]
    });
    expect(JSON.stringify(request)).not.toContain("Completely Unrelated Show");
    expect(JSON.stringify(request)).not.toContain("1.4 GiB");
    expect(JSON.stringify(request)).not.toContain("/anime/unrelated.mkv");
    expect(runtimeUpdates.some((update) => update.tracksHtml.includes("0%"))).toBe(true);
    expect(runtimeUpdates.some((update) => update.tracksHtml.includes("100%"))).toBe(true);
    expect(stored.get("download-notifier-state-v1")).toMatchObject({
      "smoke:native:123:2:2026-01-04T00:00:00.000Z": { name: "Enriched Anime · Episode 2", animeTitle: "Enriched Anime", episodeNumber: 2 },
    });
    expect(runtimeUpdates.some((update) => update.tracksHtml.includes("Enriched Anime") && update.tracksHtml.includes('class="track-episode">Episode 2'))).toBe(true);
  });

  it("preserves a different track added while provider delivery is in flight", async () => {
    const payload = developmentPayload();
    const firstTrack = {
      trackId: "torrent:aaa:1", hash: "aaa", name: "First", source: "auto_downloader",
      addedAt: "2026-01-01T00:00:00.000Z", notifyAttempts: 0,
    };
    const secondTrack = {
      trackId: "torrent:bbb:2", hash: "bbb", name: "Second", source: "auto_downloader",
      addedAt: "2026-01-01T00:01:00.000Z", notifyAttempts: 0,
    };
    const stored = new Map<string, unknown>([
      ["download-notifier-state-v1", { aaa: firstTrack }],
      ["download-notifier-provider-config-v1", {
        version: 1, providers: [{
          id: "discord-main", type: "discord", enabled: true, label: "Discord",
          config: { webhookUrl: "https://discord.com/api/webhooks/test", mention: "", includeTorrentName: true, includeContentPath: false, includeTimestamp: true, embedStyle: "detailed" },
        }]
      }],
    ]);
    let releaseDelivery!: () => void;
    const deliveryStarted = new Promise<void>((resolveStarted) => {
      releaseDelivery = () => undefined;
      const globals = {
        $storage: { get: (key: string) => stored.get(key), set: (key: string, value: unknown) => stored.set(key, value) },
        $store: { watch: () => undefined },
        $getUserPreference: (key: string) => ["enabled", "downloadCompletedEnabled"].includes(key) ? "true" : undefined,
        console: { log: () => undefined, warn: () => undefined, error: () => undefined },
        setInterval: () => undefined,
        Date, Map, Number, Object, Array, String, Boolean, JSON, Error, Promise,
      };
      installSharedProvider(payload, globals);
      const ui = vm.runInNewContext(`(${functionSource(payload, "registerDownloadNotifierUi")})`, globals) as (context: unknown) => void;
      ui({
        torrentClient: { getTorrents: async () => [{ hash: "AAA", name: "First", progress: 1, status: "seeding" }] },
        fetch: async () => {
          resolveStarted();
          await new Promise<void>((resolve) => { releaseDelivery = resolve; });
          return { ok: true, status: 204 };
        },
      });
    });

    await deliveryStarted;
    stored.set("download-notifier-state-v1", { ...(stored.get("download-notifier-state-v1") as object), bbb: secondTrack });
    releaseDelivery();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(stored.get("download-notifier-state-v1")).toMatchObject({
      aaa: { notifiedAt: expect.any(String) },
      bbb: secondTrack,
    });
  });

  it("keeps two naturally completed torrents paired with their own metadata and payload", async () => {
    const payload = developmentPayload();
    const stored = new Map<string, unknown>([
      ["download-notifier-state-v1", {
        aaa: { trackId: "torrent:aaa:1", hash: "aaa", name: "Alpha Show S01E03 1080p WEB-DL", source: "auto_downloader", mediaId: 101, episodeNumber: 3, addedAt: "2026-01-01T00:00:00.000Z", notifyAttempts: 0 },
        bbb: { trackId: "torrent:bbb:2", hash: "bbb", name: "Beta Show S02E07 720p BluRay", source: "auto_downloader", mediaId: 202, episodeNumber: 7, addedAt: "2026-01-01T00:01:00.000Z", notifyAttempts: 0 },
      }],
      ["download-notifier-provider-config-v1", {
        version: 1, providers: [{
          id: "discord-main", type: "discord", enabled: true, label: "Discord",
          config: { webhookUrl: "https://discord.com/api/webhooks/test", mention: "", includeTorrentName: true, includeContentPath: true, includeTimestamp: true, embedStyle: "detailed" },
        }]
      }],
    ]);
    const requests: Array<{ body: string }> = [];
    const globals = {
      $storage: { get: (key: string) => stored.get(key), set: (key: string, value: unknown) => stored.set(key, value) },
      $store: { watch: () => undefined },
      $getUserPreference: (key: string) => ["enabled", "downloadCompletedEnabled"].includes(key) ? "true" : undefined,
      console: { log: () => undefined, warn: () => undefined, error: () => undefined },
      setInterval: () => undefined,
      Date, Map, Number, Object, Array, String, Boolean, JSON, Error, Promise,
    };
    installSharedProvider(payload, globals);
    const ui = vm.runInNewContext(`(${functionSource(payload, "registerDownloadNotifierUi")})`, globals) as (context: unknown) => void;
    ui({
      torrentClient: {
        getTorrents: async () => [
          { hash: "AAA", name: "Alpha Show S01E03 1080p WEB-DL", progress: 1, status: "seeding", contentPath: "/anime/alpha-03.mkv" },
          { hash: "BBB", name: "Beta Show S02E07 720p BluRay", progress: 1, status: "seeding", contentPath: "/anime/beta-07.mkv" },
        ]
      },
      anime: {
        getAnimeEntry: async (mediaId: number) => ({ media: { title: { userPreferred: mediaId === 101 ? "Alpha Anime" : "Beta Anime" } } }),
        getEpisodeCollection: async (mediaId: number) => ({ episodes: [{ episodeNumber: mediaId === 101 ? 3 : 7, episodeMetadata: { title: mediaId === 101 ? "Alpha Episode" : "Beta Episode" } }] }),
      },
      fetch: async (_url: string, init: { body: string }) => { requests.push(init); return { ok: true, status: 204 }; },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(requests).toHaveLength(2);
    const payloads = requests.map((request) => JSON.stringify(JSON.parse(request.body)));
    expect(payloads).toEqual(expect.arrayContaining([
      expect.stringContaining("Alpha Anime"),
      expect.stringContaining("Beta Anime"),
    ]));
    const alphaPayload = payloads.find((request) => request.includes("Alpha Anime")) ?? "";
    const betaPayload = payloads.find((request) => request.includes("Beta Anime")) ?? "";
    expect(alphaPayload).toContain("Alpha Show S01E03");
    expect(alphaPayload).toContain("Alpha Episode");
    expect(alphaPayload).toContain("/anime/alpha-03.mkv");
    expect(alphaPayload).not.toContain("Beta");
    expect(betaPayload).toContain("Beta Show S02E07");
    expect(betaPayload).toContain("Beta Episode");
    expect(betaPayload).toContain("/anime/beta-07.mkv");
    expect(betaPayload).not.toContain("Alpha");
    expect(stored.get("download-notifier-state-v1")).toMatchObject({
      aaa: { notifiedAt: expect.any(String) },
      bbb: { notifiedAt: expect.any(String) },
    });
  });

  it("renders the full-page webview content and removes legacy simulation probes", async () => {
    const payload = developmentPayload();
    const stored = new Map<string, unknown>([
      ["download-notifier-provider-config-v1", { version: 1, providers: [] }],
      ["download-notifier-state-v1", {
        tracked: { hash: "secret-hash", name: "Example S01E01", source: "auto_downloader", addedAt: "2026-01-01T00:00:00.000Z", lastSeenProgress: 0.5, lastSeenStatus: "downloading", notifyAttempts: 0 },
        "smoke:native-fallback": { trackId: "smoke:black-torch", hash: "probe", name: "Native simulation fallback", source: "auto_downloader", mediaId: 999, episodeNumber: 1, addedAt: "2026-01-02T00:00:00.000Z", lastSeenProgress: 1, lastSeenStatus: "seeding", notifyAttempts: 1, notifiedAt: "2026-01-02T00:01:00.000Z", isSimulationSmoke: true, isNativeSimulationFallback: true },
        "legacy-probe": { hash: "old-probe", name: "Unrelated completed torrent", source: "auto_downloader", addedAt: "2025-12-01T00:00:00.000Z", notifyAttempts: 1, notifiedAt: "2025-12-01T00:01:00.000Z", isSimulationSmoke: true, isNativeSimulationFallback: true },
      }],
      ["download-notifier-activity-v1", [{ at: "2026-01-01T00:00:00.000Z", level: "info", message: "event=provider_delivery_succeeded trackKey=tracked" }]],
    ]);
    let content: (() => string) | undefined;
    const globals = {
      $storage: { get: (key: string) => stored.get(key), set: (key: string, value: unknown) => stored.set(key, value) },
      $store: { watch: () => undefined },
      $getUserPreference: () => undefined,
      console: { log: () => undefined, warn: () => undefined, error: () => undefined },
      setInterval: () => undefined,
      Date, Map, Number, Object, Array, String, Boolean, JSON, Error, Promise,
    };
    installSharedProvider(payload, globals);
    const ui = vm.runInNewContext(`(${functionSource(payload, "registerDownloadNotifierUi")})`, globals) as (context: unknown) => void;
    ui({
      newWebview: () => ({
        setContent: (callback: () => string) => { content = callback; },
        update: () => undefined,
        channel: { on: () => undefined, send: () => undefined },
      }),
      newTray: () => ({ onClick: () => undefined, updateBadge: () => undefined }),
      screen: { navigateTo: () => undefined },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(content).toBeTypeOf("function");
    const html = content?.() ?? "";
    expect(html).toContain("Provider management");
    expect(html).toContain("Development tools");
    expect(html).toContain('class="layout"');
    expect(html).toContain("Tracked torrents");
    expect(html).toContain("Example S01E01");
    expect(html).toContain("50%");
    expect(html).toContain("Activity log");
    expect(html).toContain(".badge{white-space:nowrap}");
    expect(html).toContain("Completion notification delivered successfully.");
    expect(html).toContain("retained across plugin reloads");
    expect(html).not.toContain("secret-hash");
    expect(html).not.toContain("Unrelated completed torrent");
    expect(html).not.toContain("Native simulation fallback");
    expect(stored.get("download-notifier-state-v1")).not.toHaveProperty("legacy-probe");
    expect(stored.get("download-notifier-state-v1")).not.toHaveProperty("smoke:native-fallback");
  });

  it("allows only one configured record for each provider type", () => {
    const payload = developmentPayload();
    const stored = new Map<string, unknown>([["download-notifier-provider-config-v1", { version: 1, providers: [] }]]);
    const handlers = new Map<string, (payload: unknown) => void>();
    const warnings: string[] = [];
    let content: (() => string) | undefined;
    const globals = {
      $storage: { get: (key: string) => stored.get(key), set: (key: string, value: unknown) => stored.set(key, value) },
      $store: { watch: () => undefined }, $getUserPreference: () => undefined,
      console: { log: () => undefined, warn: () => undefined, error: () => undefined }, setInterval: () => undefined,
      Date, Map, Set, Number, Object, Array, String, Boolean, JSON, Error, Promise,
    };
    installSharedProvider(payload, globals);
    const ui = vm.runInNewContext(`(${functionSource(payload, "registerDownloadNotifierUi")})`, globals) as (context: unknown) => void;
    ui({
      newWebview: () => ({ setContent: (callback: () => string) => { content = callback; }, update: () => undefined, channel: { on: (name: string, handler: (value: unknown) => void) => handlers.set(name, handler), send: () => undefined } }),
      toast: { success: () => undefined, warning: (message: string) => warnings.push(message) },
    });
    handlers.get("add")?.({ type: "discord" });
    handlers.get("add")?.({ type: "discord" });
    handlers.get("save-provider")?.({ id: "discord-second", type: "discord", enabled: false, config: {} });
    const document = stored.get("download-notifier-provider-config-v1") as { providers: unknown[] };
    expect(document.providers).toHaveLength(1);
    expect(JSON.parse(stored.get("download-notifier-provider-config-v1-json") as string)).toMatchObject({ providers: [{ id: "discord-main" }] });
    expect(warnings).toEqual(["Discord is already configured"]);
    expect(content?.()).toContain('<option value="">All provider types configured</option>');
    expect(content?.()).toContain('id="provider-type" disabled');
    expect(content?.()).toContain('data-global-action="add" disabled');
  });

  it("restores provider configuration from its durable JSON backup", () => {
    const payload = developmentPayload();
    const backup = { version: 1, providers: [{ id: "discord-main", type: "discord", enabled: true, label: "Discord", config: { webhookUrl: "https://example.test/hook" } }] };
    const stored = new Map<string, unknown>([["download-notifier-provider-config-v1-json", JSON.stringify(backup)]]);
    let content: (() => string) | undefined;
    const globals = {
      $storage: { get: (key: string) => stored.get(key), set: (key: string, value: unknown) => stored.set(key, value) },
      $store: { watch: () => undefined }, $getUserPreference: () => undefined,
      console: { log: () => undefined, warn: () => undefined, error: () => undefined }, setInterval: () => undefined,
      Date, Map, Set, Number, Object, Array, String, Boolean, JSON, Error, Promise,
    };
    installSharedProvider(payload, globals);
    const ui = vm.runInNewContext(`(${functionSource(payload, "registerDownloadNotifierUi")})`, globals) as (context: unknown) => void;
    ui({ newWebview: () => ({ setContent: (callback: () => string) => { content = callback; }, update: () => undefined, channel: { on: () => undefined, send: () => undefined } }) });
    expect(content?.()).toContain("Discord webhook URL");
    expect(content?.()).toContain("1 provider");
  });

  it("persists per-provider receipts and retries only failed provider records", async () => {
    const payload = developmentPayload();
    const stored = new Map<string, unknown>([
      ["download-notifier-provider-config-v1", {
        version: 1, providers: [
          { id: "discord-main", type: "discord", enabled: true, label: "Discord", config: { webhookUrl: "https://example.test/hook", mention: "", embedStyle: "detailed", includeTorrentName: true, includeContentPath: false, includeTimestamp: true } },
          { id: "email-main", type: "email", enabled: true, label: "Email", config: {} },
        ]
      }],
      ["download-notifier-state-v1", { abc: { hash: "abc", name: "Anime 01", source: "auto_downloader", addedAt: "2026-01-01T00:00:00Z", notifyAttempts: 0 } }],
    ]);
    const watchers = new Map<string, () => void>();
    const emailSend = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const emailAdapter = {
      type: "email", label: "Email", fields: [], create: () => ({ id: "email-main", type: "email", enabled: false, label: "Email", config: {} }),
      normalize: (value: unknown) => value, isReady: (provider: { enabled: boolean }) => provider.enabled, send: emailSend,
    };
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    const globals = {
      $storage: { get: (key: string) => stored.get(key), set: (key: string, value: unknown) => stored.set(key, value) },
      $store: { watch: (key: string, callback: () => void) => watchers.set(key, callback) }, $getUserPreference: () => undefined,
      console: { log: () => undefined, warn: () => undefined, error: () => undefined }, setInterval: () => undefined,
      Date, Map, Set, Number, Object, Array, String, Boolean, JSON, Error, Promise,
    };
    installSharedProvider(payload, globals, [emailAdapter]);
    const ui = vm.runInNewContext(`(${functionSource(payload, "registerDownloadNotifierUi")})`, globals) as (context: unknown) => void;
    ui({ torrentClient: { getTorrents: async () => [{ hash: "abc", name: "Anime 01", progress: 1, status: "seeding" }] }, fetch: fetcher });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetcher).toHaveBeenCalledOnce();
    expect(emailSend).toHaveBeenCalledOnce();
    expect(stored.get("download-notifier-state-v1")).toMatchObject({ abc: { providerReceipts: { "discord-main": expect.any(String) } } });
    expect((stored.get("download-notifier-state-v1") as { abc: { notifiedAt?: string } }).abc.notifiedAt).toBeUndefined();
    watchers.get("download-notifier-poll-now")?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetcher).toHaveBeenCalledOnce();
    expect(emailSend).toHaveBeenCalledTimes(2);
    expect(stored.get("download-notifier-state-v1")).toMatchObject({ abc: { notifiedAt: expect.any(String), providerReceipts: { "discord-main": expect.any(String), "email-main": expect.any(String) } } });
  });

  it("preserves opaque provider records whose adapters are unavailable", () => {
    const payload = developmentPayload();
    const unknown = { id: "future-main", type: "future", enabled: true, label: "Future", config: { secret: "kept" } };
    const stored = new Map<string, unknown>([["download-notifier-provider-config-v1", { version: 1, providers: [unknown] }]]);
    const handlers = new Map<string, (payload: unknown) => void>();
    const globals = {
      $storage: { get: (key: string) => stored.get(key), set: (key: string, value: unknown) => stored.set(key, value) }, $store: { watch: () => undefined },
      $getUserPreference: () => undefined, console: { log: () => undefined, warn: () => undefined, error: () => undefined }, setInterval: () => undefined,
      Date, Map, Set, Number, Object, Array, String, Boolean, JSON, Error, Promise,
    };
    installSharedProvider(payload, globals);
    const ui = vm.runInNewContext(`(${functionSource(payload, "registerDownloadNotifierUi")})`, globals) as (context: unknown) => void;
    ui({ newWebview: () => ({ setContent: () => undefined, update: () => undefined, channel: { on: (name: string, handler: (value: unknown) => void) => handlers.set(name, handler), send: () => undefined } }) });
    handlers.get("add")?.({ type: "discord" });
    expect(stored.get("download-notifier-provider-config-v1")).toMatchObject({ providers: [unknown, { id: "discord-main", type: "discord" }] });
  });

  it("keeps provider-specific settings out of the manifest root preferences", () => {
    const production = JSON.stringify(createManifest({
      rawBaseUrl: "https://raw.githubusercontent.com/Hyperclaw79/seanime-download-notifier/main",
      manifestURI: "https://github.com/Hyperclaw79/seanime-download-notifier/releases/download/v1.0.0/seanime-download-notifier.json",
      payloadURI: "https://github.com/Hyperclaw79/seanime-download-notifier/releases/download/v1.0.0/plugin.js",
    }));
    const development = readFileSync("seanime-download-notifier-dev.example.json", "utf8");
    for (const payload of [production, development]) {
      expect(payload).not.toContain("discordEnabled");
      expect(payload).not.toContain("discordWebhookUrl");
      expect(payload).not.toContain("discordEmbedStyle");
    }
  });

});
