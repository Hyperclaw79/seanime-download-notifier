import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AutoDownloaderSimulator } from "./components/AutoDownloaderSimulator";
import { ExtensionsPage } from "./components/ExtensionsPage";
import { LogsPanel } from "./components/LogsPanel";
import { PluginSettings } from "./components/PluginSettings";
import { ProviderPanel } from "./components/ProviderPanel";
import { RuntimeSidebar } from "./components/RuntimeSidebar";
import { Sidebar } from "./components/Sidebar";
import { TorrentPanel } from "./components/TorrentPanel";
import { defaults, loadTorrents, processCompletion, saveTorrents, time } from "./mock-runtime";
import type { DiscordProvider, Log, Notification, Settings, Torrent } from "./types";
import "./styles.css";

const development = import.meta.env.DEV && new URLSearchParams(location.search).get("mode") !== "production";
const harness = development && new URLSearchParams(location.search).get("harness") === "1";

function App() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [torrents, setTorrents] = useState<Torrent[]>(loadTorrents);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [logs, setLogs] = useState<Log[]>([{ time: time(), message: "Plugin runtime started · storage restored", tone: "success" }]);
  const [toast, setToast] = useState("");

  useEffect(() => saveTorrents(torrents), [torrents]);
  const log = (message: string, tone: Log["tone"] = "info") => {
    const redacted = message.replace(/https?:\/\/\S+/gi, "[REDACTED_URL]").replace(/[A-Za-z]:\\\S+|\/(?:data|downloads?|media|mnt|home)\/\S+/gi, "[REDACTED_PATH]");
    setLogs(value => [{ time: time(), message: redacted, tone }, ...value].slice(0, 30));
  };

  const add = (simulation = false) => {
    if (simulation && (!settings.smoke || !settings.allowSmoke)) {
      log("Production safety: simulation event ignored", "warning");
      return;
    }
    const nativeFallback = simulation && settings.useEmptyNativeSimulationFallback;
    const torrent: Torrent = {
      hash: simulation ? "sim-001" : "real-001",
      name: simulation
        ? nativeFallback ? "Frieren S02E01 [Completed torrent fallback]" : "Frieren S02E01 [Simulation]"
        : "Dandadan S02E03 1080p",
      progress: simulation ? 1 : 0.5,
      status: simulation ? "seeding" : "downloading",
      notified: false,
      attempts: 0,
      addedAt: Date.now(),
      ...(simulation ? { isSimulation: true } : {}),
      ...(nativeFallback ? { isNativeFallback: true } : {}),
    };
    if (torrents.some(item => item.hash === torrent.hash)) {
      log(`De-dupe skipped ${torrent.name}`);
      return;
    }
    if (simulation) {
      const result = processCompletion(torrent, settings);
      setTorrents(value => [result.torrent, ...value]);
      if (result.notification) setNotifications(value => [result.notification!, ...value]);
      log(result.log.message, result.log.tone);
    } else {
      setTorrents(value => [torrent, ...value]);
      log(`Tracking Auto Downloader torrent — ${torrent.name}`, "success");
    }
  };

  const complete = (hash: string) => {
    const torrent = torrents.find(item => item.hash === hash);
    if (!torrent) return;
    const result = processCompletion({ ...torrent, progress: 1, status: "seeding" }, settings);
    setTorrents(value => value.map(item => item.hash === hash ? result.torrent : item));
    if (result.notification) setNotifications(value => [result.notification!, ...value]);
    log(result.log.message, result.log.tone);
  };

  const test = (provider: DiscordProvider) => {
    if (provider.providerFails) { log("Test notification failed with HTTP 503", "error"); return; }
    if (!provider.enabled) { log("Test notification blocked — provider disabled", "warning"); return; }
    if (!provider.webhook) { log("Test notification blocked — webhook URL required", "warning"); return; }
    if (development) setNotifications(value => [{ title: "Test notification", name: `${provider.label} is configured correctly` }, ...value]);
    setToast("Test notification sent successfully");
    log("Test notification sent successfully", "success");
    setTimeout(() => setToast(""), 1800);
  };

  const cleanup = () => {
    const cutoff = Date.now() - settings.retention * 86400000;
    setTorrents(value => value.filter(torrent => !torrent.notified || torrent.addedAt >= cutoff));
    log("Retention cleanup completed", "success");
  };

  return <div className="app">
    <Sidebar />
    <main className="plugin-page">
      <ExtensionsPage providerCount={settings.providers.length} enabledCount={settings.providers.filter(provider => provider.enabled).length} pendingCount={torrents.filter(torrent => !torrent.notified).length} />
      <div className="workspace">
        <div className="left">
          <ProviderPanel settings={settings} set={setSettings} notifications={notifications} onTest={test} harness={harness} />
        </div>
        <aside className="right">
          <RuntimeSidebar settings={settings} pendingCount={torrents.filter(torrent => !torrent.notified).length} development={development} onPoll={() => torrents.forEach(torrent => { if (torrent.progress >= 1) complete(torrent.hash); })} />
          {harness && <>
            <PluginSettings settings={settings} set={setSettings} development={development} />
            <AutoDownloaderSimulator onReal={() => add(false)} onSimulation={() => add(true)} onFailed={() => log("Auto Downloader action did not add a torrent — ignored", "warning")} />
          </>}
        </aside>
      </div>
      <div className="runtime-data">
        <TorrentPanel torrents={torrents} onComplete={complete} onCleanup={cleanup} harness={harness} />
        <LogsPanel logs={logs} />
      </div>
    </main>
    <div role="status" aria-live="polite" className={`toast ${toast ? "" : "toast-empty"}`}>{toast ? `✓ ${toast}` : "\u00a0"}</div>
  </div>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
