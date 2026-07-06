import { build } from "esbuild";
import { DEFAULT_RAW_BASE_URL, createManifest } from "./manifest-shared";

function resolveIconUrl(): string {
  const explicit = process.env.SEANIME_NOTIFIER_ICON_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const rawBaseUrl = process.env.SEANIME_NOTIFIER_RAW_BASE_URL?.trim().replace(/\/$/, "") || DEFAULT_RAW_BASE_URL;
  return createManifest({ rawBaseUrl }).icon;
}

const iconUrl = resolveIconUrl();
if (!/^https?:\/\//.test(iconUrl) || !iconUrl.endsWith("/assets/logo.png")) {
  throw new Error("Plugin icon URL must be an HTTP(S) URL ending in /assets/logo.png");
}

const common = {
  bundle: true,
  entryPoints: ["src/plugin.ts"],
  format: "iife" as const,
  platform: "neutral" as const,
  target: "es2020",
};

await build({
  ...common,
  outfile: "dist/plugin.js",
  define: {
    __SEANIME_NOTIFIER_DEVELOPMENT__: "false",
    __SEANIME_NOTIFIER_ICON_URL__: JSON.stringify(iconUrl),
  },
});

await build({
  ...common,
  outfile: "dist/plugin.dev.js",
  define: {
    __SEANIME_NOTIFIER_DEVELOPMENT__: "true",
    __SEANIME_NOTIFIER_ICON_URL__: JSON.stringify(iconUrl),
  },
});

console.log(`Built plugin bundles with icon ${iconUrl}`);
