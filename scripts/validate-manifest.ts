import { existsSync, readFileSync } from "node:fs";

const required = ["id", "name", "version", "manifestURI", "language", "type", "description", "author", "payloadURI", "plugin"] as const;
const requestedFiles = process.argv.slice(2);
const defaultFiles = ["seanime-download-notifier-dev.example.json", ...(existsSync("seanime-download-notifier.json") ? ["seanime-download-notifier.json"] : [])];
for (const filename of requestedFiles.length ? requestedFiles : defaultFiles) {
  const manifest = JSON.parse(readFileSync(filename, "utf8")) as Record<string, unknown>;
  for (const field of required) if (!(field in manifest)) throw new Error(`${filename}: missing ${field}`);
  if (manifest.description !== "Sends notifications when Seanime-tracked torrent downloads complete.") throw new Error(`${filename}: description is not canonical`);
  if (manifest.type !== "plugin" || manifest.language !== "javascript") throw new Error(`${filename}: expected JavaScript plugin`);
  if (!filename.includes("dev")) {
    if ("isDevelopment" in manifest) throw new Error(`${filename}: production manifests must not use isDevelopment`);
    if (!String(manifest.manifestURI).endsWith("/seanime-download-notifier.json")) throw new Error(`${filename}: manifestURI must use the plugin filename`);
    const hostedFields = ["manifestURI", "payloadURI"] as const;
    const origins = new Set(hostedFields.map((field) => new URL(String(manifest[field])).origin));
    if (origins.size !== 1) throw new Error(`${filename}: manifest and payload URLs must use one release origin, found ${[...origins].join(", ")}`);
    const manifestPath = new URL(String(manifest.manifestURI)).pathname;
    const payloadPath = new URL(String(manifest.payloadURI)).pathname;
    if (payloadPath.includes("/releases/download/") && !manifestPath.includes("/releases/download/")) {
      throw new Error(`${filename}: release payloads must update from a release manifest, not a mutable raw branch manifest`);
    }
    if (!String(manifest.icon).endsWith("/assets/logo.png")) throw new Error(`${filename}: icon must point to assets/logo.png on the selected raw host`);
    if (manifest.readme !== `${manifest.website}/wiki`) throw new Error(`${filename}: readme must point to the selected repository wiki`);
  }
  if (filename.includes("dev")) {
    if (manifest.isDevelopment !== true) throw new Error(`${filename}: isDevelopment must be true`);
    if (!/^https?:\/\//.test(String(manifest.icon))) throw new Error(`${filename}: development icon must be an HTTP(S) URL`);
    if (!String(manifest.icon).endsWith("/assets/logo.png")) throw new Error(`${filename}: development icon must point to assets/logo.png`);
    if (manifest.readme !== "") throw new Error(`${filename}: development readme must be empty because local file URLs are unsupported`);
  }
  const serialized = JSON.stringify(manifest);
  if (/discord(?:app)?\.com\/api\/webhooks\/\d+\//i.test(serialized)) throw new Error(`${filename}: contains a webhook secret`);
  console.log(`${filename}: valid`);
}
