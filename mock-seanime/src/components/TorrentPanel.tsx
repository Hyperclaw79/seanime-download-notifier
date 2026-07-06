import type { Torrent } from "../types";

export function TorrentPanel({ torrents, onComplete, onCleanup, harness = false }: { torrents: Torrent[]; onComplete: (hash: string) => void; onCleanup: () => void; harness?: boolean }) {
  return <section className="panel tracked-panel">
    <header><div><h3>Tracked torrents</h3><p>Current Auto Downloader-owned records and delivery state.</p></div>{harness && <button data-testid="retention-cleanup" onClick={onCleanup}>Run cleanup</button>}</header>
    <div className="torrent-list">
      {!torrents.length && <div className="empty">No Auto Downloader torrents are currently tracked.</div>}
      {torrents.map(torrent => <article data-testid="torrent-row" key={torrent.hash}>
        <div className="cover">{torrent.name.slice(0, 1)}</div>
        <div className="torrent-main">
          <div className="torrent-heading"><b>{torrent.name}</b><span data-tone={torrent.notified ? "success" : torrent.lastError ? "error" : "info"}>{torrent.notified ? "Notified" : torrent.lastError ? "Delivery error" : "Tracking"}</span>{torrent.isSimulation && <span>Simulation</span>}</div>
          <div className="progress"><i style={{ width: `${torrent.progress * 100}%` }} /></div>
          <small>{Math.round(torrent.progress * 100)}% · {torrent.status} · {torrent.attempts} delivery attempt{torrent.attempts === 1 ? "" : "s"}</small>
          {torrent.lastError && <p className="torrent-error">{torrent.lastError}</p>}
        </div>
        {harness && <button data-testid="complete-torrent" onClick={() => onComplete(torrent.hash)}>Complete</button>}
      </article>)}
    </div>
  </section>;
}
