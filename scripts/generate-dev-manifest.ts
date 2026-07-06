import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_RAW_BASE_URL, createManifest, iconUrlFromRawBase } from "./manifest-shared";

const payload = resolve("dist/plugin.dev.js");
if (!existsSync(payload)) throw new Error(`Development payload is missing at ${payload}`);
const icon = (process.env.SEANIME_NOTIFIER_DEV_ICON_URL ?? process.env.SEANIME_NOTIFIER_ICON_URL ?? iconUrlFromRawBase(process.env.SEANIME_NOTIFIER_RAW_BASE_URL ?? DEFAULT_RAW_BASE_URL)).replace(/\/$/, "");
if (!/^https?:\/\//.test(icon) || !icon.endsWith("/assets/logo.png")) {
  throw new Error("SEANIME_NOTIFIER_DEV_ICON_URL must be an HTTP(S) URL ending in /assets/logo.png");
}
const output = resolve("seanime-download-notifier-dev.json");
const version = JSON.parse(readFileSync("package.json", "utf8")).version as string;
writeFileSync(output, `${JSON.stringify(createManifest({
  rawBaseUrl: "",
  development: true,
  payloadURI: payload,
  developmentIconURI: icon,
  version,
}), null, 2)}\n`);
console.log(`Created ${output}`);
console.log(`Created the reload-safe Denshi manifest filename. Copy it to %APPDATA%\\Seanime\\extensions\\seanime-download-notifier-dev.json. Its payloadURI is ${payload} and icon is ${icon}`);
console.log("Denshi and a NAS-hosted Seanime are separate plugin runtimes; validate the hosted manifest on NAS before release.");
