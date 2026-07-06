export const DESCRIPTION = "Sends notifications when Seanime-tracked torrent downloads complete.";
export const DEFAULT_RAW_BASE_URL = "https://raw.githubusercontent.com/Hyperclaw79/seanime-download-notifier/main";

const commonFields = [
  { type: "switch", name: "enabled", label: "Plugin enabled", default: "true" },
  { type: "text", name: "pollIntervalSeconds", label: "Poll interval (seconds, 15-300)", default: "30" },
  { type: "text", name: "retentionDays", label: "Notified record retention (days, 1-365)", default: "30" },
  { type: "switch", name: "downloadCompletedEnabled", label: "Download completed notifications", default: "true" },
];

function repositoryUrlFromRawBase(rawBaseUrl: string): string {
  if (!rawBaseUrl) return repositoryUrlFromRawBase(DEFAULT_RAW_BASE_URL);

  const url = new URL(rawBaseUrl);
  const parts = url.pathname.split("/").filter(Boolean);
  if (url.hostname === "raw.githubusercontent.com" && parts.length >= 3) {
    url.hostname = "github.com";
    url.pathname = `/${parts.slice(0, 2).join("/")}`;
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  }

  const rawIndex = parts.indexOf("raw");
  if (rawIndex >= 2) {
    url.pathname = `/${parts.slice(0, rawIndex).join("/")}`;
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  }

  throw new Error("rawBaseUrl must identify a repository raw-content path");
}

export function iconUrlFromRawBase(rawBaseUrl = DEFAULT_RAW_BASE_URL): string {
  return `${rawBaseUrl.replace(/\/$/, "")}/assets/logo.png`;
}

export function createManifest(options: {
  rawBaseUrl: string;
  development?: boolean;
  payloadURI?: string;
  developmentIconURI?: string;
  manifestURI?: string;
  version?: string;
}) {
  const development = options.development ?? false;
  if (development && !options.developmentIconURI) {
    throw new Error("Development manifests require an icon URI");
  }
  const developmentIconURI = options.developmentIconURI ?? "";
  const rawBaseUrl = (options.rawBaseUrl || DEFAULT_RAW_BASE_URL).replace(/\/$/, "");
  const repositoryUrl = repositoryUrlFromRawBase(rawBaseUrl);
  const payloadURI = options.payloadURI ?? `${rawBaseUrl}/dist/plugin.js`;
  return {
    id: development ? "seanime-download-notifier-dev" : "seanime-download-notifier",
    name: development ? "Seanime Download Notifier Dev" : "Seanime Download Notifier",
    version: options.version ?? "1.0.0",
    manifestURI: development ? "" : options.manifestURI ?? `${rawBaseUrl}/seanime-download-notifier.json`,
    language: "javascript",
    type: "plugin",
    description: DESCRIPTION,
    author: "Hyperclaw79",
    icon: development ? developmentIconURI : iconUrlFromRawBase(rawBaseUrl),
    website: repositoryUrl,
    readme: development ? "" : `${repositoryUrl}/wiki`,
    lang: "en",
    payload: "",
    payloadURI,
    ...(development ? { isDevelopment: true } : {}),
    userConfig: {
      version: 1,
      requiresConfig: false,
      fields: [...commonFields, ...(development ? [
        { type: "switch", name: "devEnableSimulationSmokeMode", label: "Development simulation smoke mode", default: "false" },
        { type: "switch", name: "devAllowSimulationNotifications", label: "Allow development simulation notifications", default: "false" },
        { type: "switch", name: "devUseEmptyNativeSimulationFallback", label: "Use completed torrent fallback when native simulation finds no candidates", default: "false" },
        { type: "text", name: "devSimulationDelaySeconds", label: "Simulation completion delay (seconds, 0-30)", default: "3" },
      ] : [])],
    },
    plugin: { version: "1", permissions: { scopes: ["storage", "torrent-client"], allow: { networkAccess: { allowedDomains: ["https://discord.com"] } } } },
  };
}
