import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createManifest } from "./manifest-shared";

const argument = process.argv.find((value) => value.startsWith("--base-url="))?.slice("--base-url=".length);
const rawBaseUrl = (argument ?? process.env.SEANIME_NOTIFIER_RAW_BASE_URL ?? "").replace(/\/$/, "");
if (!/^https?:\/\//.test(rawBaseUrl)) throw new Error("Set SEANIME_NOTIFIER_RAW_BASE_URL or pass --base-url=https://host/owner/repo/raw/branch/main");
const payloadArgument = process.argv.find((value) => value.startsWith("--payload-url="))?.slice("--payload-url=".length);
const payloadURI = payloadArgument ?? process.env.SEANIME_NOTIFIER_PAYLOAD_URL;
if (payloadURI && !/^https?:\/\//.test(payloadURI)) throw new Error("--payload-url must be an HTTP(S) URL");
const manifestArgument = process.argv.find((value) => value.startsWith("--manifest-url="))?.slice("--manifest-url=".length);
const configuredManifestURI = manifestArgument ?? process.env.SEANIME_NOTIFIER_MANIFEST_URL;
const manifestURI = configuredManifestURI ?? (payloadURI ? new URL("seanime-download-notifier.json", payloadURI).toString() : undefined);
if (manifestURI && !/^https?:\/\//.test(manifestURI)) throw new Error("--manifest-url must be an HTTP(S) URL");
const outputArgument = process.argv.find((value) => value.startsWith("--output="))?.slice("--output=".length);
const output = resolve(outputArgument || "seanime-download-notifier.json");
const version = JSON.parse(readFileSync("package.json", "utf8")).version as string;
writeFileSync(output, `${JSON.stringify(createManifest({ rawBaseUrl, ...(payloadURI ? { payloadURI } : {}), ...(manifestURI ? { manifestURI } : {}), version }), null, 2)}\n`);
console.log(`Created ${output} for ${rawBaseUrl}${payloadURI ? ` with payload ${payloadURI}` : ""}${manifestURI ? ` and manifest ${manifestURI}` : ""}`);
