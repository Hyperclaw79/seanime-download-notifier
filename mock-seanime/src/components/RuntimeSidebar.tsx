import type { Settings } from "../types";

export function RuntimeSidebar({ settings, pendingCount, development, onPoll }: { settings: Settings; pendingCount: number; development: boolean; onPoll: () => void }) {
  return <>
    <section className="runtime-card panel">
      <h2>Runtime status</h2>
      <p>Only torrents owned by Seanime Auto Downloader are tracked.</p>
      <div className="status-chips"><span>{pendingCount} awaiting delivery</span></div>
    </section>
    {development && <section className="runtime-card panel development-card">
      <header><div><h2>Development tools</h2><p>Exercise the isolated runtime without adding a real download.</p></div><span className="development-badge">Development</span></header>
      <div className="status-chips">
        <span className={settings.smoke ? "success" : "warning"}>Smoke mode {settings.smoke ? "on" : "off"}</span>
        <span className={settings.allowSmoke ? "success" : "warning"}>Delivery {settings.allowSmoke ? "allowed" : "blocked"}</span>
        <span className={settings.useEmptyNativeSimulationFallback ? "success" : "warning"}>Empty-run fallback {settings.useEmptyNativeSimulationFallback ? "on" : "off"}</span>
      </div>
      <button className="poll-button" onClick={onPoll}>Poll tracked downloads now</button>
    </section>}
  </>;
}
