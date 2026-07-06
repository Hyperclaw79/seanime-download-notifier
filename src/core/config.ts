/** Normalized global configuration consumed by the completion runtime. */
export interface PluginConfig {
  enabled: boolean;
  pollIntervalSeconds: number;
  retentionDays: number;
  dev: {
    enableSimulationSmokeMode: boolean;
    allowSimulationNotifications: boolean;
    useEmptyNativeSimulationFallback: boolean;
    simulationDelaySeconds: number;
  };
  events: { downloadCompleted: { enabled: boolean } };
}

export const DEFAULT_CONFIG: PluginConfig = {
  enabled: true,
  pollIntervalSeconds: 30,
  retentionDays: 30,
  dev: { enableSimulationSmokeMode: false, allowSimulationNotifications: false, useEmptyNativeSimulationFallback: false, simulationDelaySeconds: 3 },
  events: { downloadCompleted: { enabled: true } },
};

const bool = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return fallback;
};
const clamp = (value: unknown, min: number, max: number, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
};

/** Validates untrusted preference input and supplies bounded defaults. */
export function normalizeConfig(input: unknown): PluginConfig {
  const raw = (input ?? {}) as Partial<PluginConfig>;
  return {
    enabled: bool(raw.enabled, DEFAULT_CONFIG.enabled),
    pollIntervalSeconds: clamp(raw.pollIntervalSeconds, 15, 300, DEFAULT_CONFIG.pollIntervalSeconds),
    retentionDays: clamp(raw.retentionDays, 1, 365, DEFAULT_CONFIG.retentionDays),
    dev: {
      enableSimulationSmokeMode: bool(raw.dev?.enableSimulationSmokeMode, false),
      allowSimulationNotifications: bool(raw.dev?.allowSimulationNotifications, false),
      useEmptyNativeSimulationFallback: bool(raw.dev?.useEmptyNativeSimulationFallback, false),
      simulationDelaySeconds: clamp(raw.dev?.simulationDelaySeconds, 0, 30, 3),
    },
    events: { downloadCompleted: { enabled: bool(raw.events?.downloadCompleted?.enabled, true) } },
  };
}

/** Reads Seanime's flat manifest preferences into the runtime configuration model. */
export function configFromPreferences(get: (key: string) => string | undefined): PluginConfig {
  return normalizeConfig({
    enabled: get("enabled"),
    pollIntervalSeconds: get("pollIntervalSeconds"),
    retentionDays: get("retentionDays"),
    dev: {
      enableSimulationSmokeMode: get("devEnableSimulationSmokeMode"),
      allowSimulationNotifications: get("devAllowSimulationNotifications"),
      useEmptyNativeSimulationFallback: get("devUseEmptyNativeSimulationFallback"),
      simulationDelaySeconds: get("devSimulationDelaySeconds"),
    },
    events: { downloadCompleted: { enabled: get("downloadCompletedEnabled") } },
  });
}
