export function ExtensionsPage({ providerCount, enabledCount, pendingCount }: { providerCount: number; enabledCount: number; pendingCount: number }) {
  return <header className="plugin-hero">
    <div>
      <div className="eyebrow">Provider management</div>
      <h1>Seanime Download Notifier</h1>
      <p>Configure delivery providers for completed Auto Downloader torrents.</p>
    </div>
    <div className="hero-metrics">
      <span className={providerCount ? "success" : "warning"}>{providerCount} provider{providerCount === 1 ? "" : "s"}</span>
      <span>{enabledCount} enabled</span>
      <span>{pendingCount} pending</span>
    </div>
  </header>;
}
