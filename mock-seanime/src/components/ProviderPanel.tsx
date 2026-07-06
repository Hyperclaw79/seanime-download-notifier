import type { DiscordProvider, Notification, Settings } from "../types";
import { createDiscordProvider } from "../mock-runtime";

const Toggle = ({ value, onChange, label, testid }: { value: boolean; onChange: (value: boolean) => void; label: string; testid?: string }) =>
  <button data-testid={testid} role="switch" aria-checked={value} aria-label={label} className={`toggle ${value ? "on" : ""}`} onClick={() => onChange(!value)}><i /></button>;

export function ProviderPanel({ settings, set, notifications, onTest, harness }: { settings: Settings; set: (settings: Settings) => void; notifications: Notification[]; onTest: (provider: DiscordProvider) => void; harness: boolean }) {
  const update = (id: string, patch: Partial<DiscordProvider>) => set({ ...settings, providers: settings.providers.map(provider => provider.id === id ? { ...provider, ...patch } : provider) });
  const remove = (id: string) => set({ ...settings, providers: settings.providers.filter(provider => provider.id !== id) });
  const discordConfigured = settings.providers.some(provider => provider.type === "discord");
  const add = () => {
    if (discordConfigured) return;
    set({ ...settings, providers: [...settings.providers, createDiscordProvider(1)] });
  };

  return <section className="provider-manager" aria-label="Notification providers">
    <div className="add-provider panel">
      <div><h2>Add provider</h2><p>Configure one record for each supported provider type.</p></div>
      <div className="add-provider-controls"><select id="provider-type" aria-label="Provider type" disabled={discordConfigured}><option>Discord</option></select><button data-testid="add-provider" className="primary provider-button" onClick={add} disabled={discordConfigured}>{discordConfigured ? "Configured" : "Add provider"}</button></div>
    </div>
    <div className="provider-segments">
      {settings.providers.map((provider, index) => <article className="provider-segment panel" data-testid="provider-card" key={provider.id}>
        <div className="provider-title"><h2>Discord</h2><Toggle testid={index === 0 ? "provider-enabled" : undefined} label="Enable Discord provider" value={provider.enabled} onChange={enabled => update(provider.id, { enabled })} /></div>
        <label className="provider-field wide-field"><b>Discord webhook URL</b><input aria-label={`Webhook URL ${index + 1}`} type="password" value={provider.webhook} onChange={event => update(provider.id, { webhook: event.target.value })} /></label>
        <div className="provider-form-grid">
          <label className="provider-field"><b>Optional mention</b><input aria-label={`Mention ${index + 1}`} value={provider.mention} onChange={event => update(provider.id, { mention: event.target.value })} /></label>
          <label className="provider-field"><b>Embed style</b><select aria-label={`Embed style ${index + 1}`} value={provider.embedStyle} onChange={event => update(provider.id, { embedStyle: event.target.value as DiscordProvider["embedStyle"] })}><option value="detailed">Detailed</option><option value="compact">Compact</option></select></label>
          <label className="provider-switch"><b>Include torrent name</b><Toggle label={`Include torrent name ${index + 1}`} value={provider.includeName} onChange={includeName => update(provider.id, { includeName })} /></label>
          <label className="provider-switch"><b>Include content path</b><Toggle label={`Include content path ${index + 1}`} value={provider.includePath} onChange={includePath => update(provider.id, { includePath })} /></label>
          <label className="provider-switch"><b>Include timestamp</b><Toggle label={`Include timestamp ${index + 1}`} value={provider.includeTimestamp} onChange={includeTimestamp => update(provider.id, { includeTimestamp })} /></label>
        </div>
        {harness && <label className="failure"><input aria-label={`Provider failure ${index + 1}`} type="checkbox" checked={provider.providerFails} onChange={event => update(provider.id, { providerFails: event.target.checked })} /> Simulate delivery failure</label>}
        <div className="provider-actions"><button className="primary">Save provider</button><button data-testid={index === 0 ? "test-notification" : undefined} onClick={() => onTest(provider)}>Send test</button><button className="danger" onClick={() => remove(provider.id)}>Delete</button></div>
      </article>)}
      {!settings.providers.length && <div className="empty provider-empty">No providers configured. Add Discord to begin.</div>}
    </div>
    {harness && <div className="capture-area panel"><h4>Captured notifications <span>{notifications.length}</span></h4><div data-testid="captured-notifications" className="captures">{notifications.map((notification, index) => <article key={`${notification.name}-${index}`}><div className="discord">●</div><div><b>{notification.title}</b><p>{notification.name}</p><small>Seanime Download Notifier</small></div></article>)}{!notifications.length && <div className="empty">No payloads captured</div>}</div></div>}
  </section>;
}
