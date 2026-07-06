/** Creates provider-record persistence helpers inside an isolated Denshi runtime. */
export function createProviderConfigurationHelpers() {
  type Provider = { id: string; type: string; enabled: boolean; label: string; config: Record<string, unknown> };
  type Adapter = { type: string; normalize(value: unknown): Provider | null; migrateLegacy?(getPreference: (key: string) => string | undefined): Provider | null };
  type Document = { version: 1; providers: Provider[] };
  function bind(dependencies: {
    get(): Partial<Document> | undefined; set(document: Document): void; getPreference(key: string): string | undefined;
    adapters: Record<string, Adapter>; bool(value: unknown, fallback: boolean): boolean; onMigrated(count: number): void;
  }) {
    const normalize = (value: unknown): Provider | null => {
      const type = (value as { type?: unknown } | undefined)?.type;
      if (typeof type !== "string" || !type.trim()) return null;
      const adapter = dependencies.adapters[type];
      if (adapter) return adapter.normalize(value);
      const raw = value as Partial<Provider>;
      if (typeof raw.id !== "string" || !raw.id.trim() || typeof raw.config !== "object" || raw.config === null || Array.isArray(raw.config)) return null;
      return { id: raw.id.trim(), type: type.trim(), enabled: dependencies.bool(raw.enabled, false), label: typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : type.trim(), config: raw.config as Record<string, unknown> };
    };
    const load = (): Document => {
      const raw = dependencies.get();
      if (Array.isArray(raw?.providers)) {
        const types = new Set<string>();
        return { version: 1, providers: raw.providers.flatMap((item) => { const provider = normalize(item); if (!provider || types.has(provider.type)) return []; types.add(provider.type); return [provider]; }) };
      }
      const providers = Object.values(dependencies.adapters).flatMap((adapter) => { const provider = adapter.migrateLegacy?.(dependencies.getPreference); return provider ? [provider] : []; });
      const document: Document = { version: 1, providers };
      dependencies.set(document);
      dependencies.onMigrated(providers.length);
      return document;
    };
    const save = (document: Document): void => dependencies.set(document);
    const upsert = (provider: Provider): Document => {
      const current = load();
      const exists = current.providers.some((item) => item.id === provider.id);
      const typeExists = current.providers.some((item) => item.type === provider.type);
      const next: Document = { version: 1, providers: exists ? current.providers.map((item) => item.id === provider.id ? provider : item) : typeExists ? current.providers : [...current.providers, provider] };
      save(next);
      return next;
    };
    const remove = (providerId: string): Document => { const current = load(); const next: Document = { version: 1, providers: current.providers.filter((provider) => provider.id !== providerId) }; save(next); return next; };
    return { normalize, load, save, upsert, remove };
  }
  return { bind };
}
