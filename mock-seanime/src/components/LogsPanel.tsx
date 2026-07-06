import type { Log } from "../types";
export function LogsPanel({logs}:{logs:Log[]}){return <section className="panel logs"><header><div><h3>Activity log</h3><p>Redacted, runtime-safe diagnostics</p></div><span className="live">LIVE</span></header><div>{logs.map((log,i)=><p key={i} data-tone={log.tone}><time>{log.time}</time><i/>{log.message}</p>)}</div></section>}
