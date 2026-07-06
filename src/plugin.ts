import { autoDownloaderAfterDownloadTorrent } from "./seanime/isolated/auto-downloader-hook";
import { autoDownloaderRunCompleted } from "./seanime/isolated/auto-downloader-run-completed-hook";
import { registerDownloadNotifierUi } from "./seanime/isolated/ui-runtime";
import { createDiscordIsolatedAdapter } from "./providers/discord";
import { createNotificationMetadataHelpers } from "./seanime/shared/notification-metadata";
import { createProviderConfigurationHelpers } from "./seanime/shared/provider-config";

declare const $app: {
  onAutoDownloaderAfterDownloadTorrent(callback: (event: never) => void): void;
  onAutoDownloaderRunCompleted(callback: (event: never) => void): void;
};
declare const $ui: {
  register(callback: (ctx: never) => void): void;
};
declare const $shared: { define(name: string, factory: () => unknown): void; use<T>(name: string): T };

function createProviderCatalog(): unknown[] {
  return [$shared.use("download-notifier-provider-discord")];
}

function init(): void {
  $shared.define("download-notifier-provider-discord", createDiscordIsolatedAdapter);
  $shared.define("download-notifier-provider-catalog", createProviderCatalog);
  $shared.define("download-notifier-notification-metadata", createNotificationMetadataHelpers);
  $shared.define("download-notifier-provider-configuration", createProviderConfigurationHelpers);
  $app.onAutoDownloaderAfterDownloadTorrent(autoDownloaderAfterDownloadTorrent as never);
  $app.onAutoDownloaderRunCompleted(autoDownloaderRunCompleted as never);
  $ui.register(registerDownloadNotifierUi as never);
}

Object.assign(globalThis, { init });
