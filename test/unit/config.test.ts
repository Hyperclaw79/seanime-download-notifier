import { describe, expect, it } from "vitest";
import { configFromPreferences, DEFAULT_CONFIG, normalizeConfig } from "../../src/core/config";

describe("configuration", () => {
  it("uses privacy-safe defaults", () => {
    expect(normalizeConfig({})).toEqual(DEFAULT_CONFIG);
  });

  it("treats omitted input as the default config", () => {
    expect(normalizeConfig(undefined)).toEqual(DEFAULT_CONFIG);
    expect(normalizeConfig(null)).toEqual(DEFAULT_CONFIG);
  });

  it("clamps polling and retention", () => {
    const config = normalizeConfig({ pollIntervalSeconds: 2, retentionDays: 999 });
    expect(config.pollIntervalSeconds).toBe(15);
    expect(config.retentionDays).toBe(365);
  });

  it("accepts manifest string booleans", () => {
    const config = normalizeConfig({ enabled: "false" });
    expect(config.enabled).toBe(false);
  });

  it("normalizes complete global input and malformed scalar values", () => {
    const config = normalizeConfig({
      enabled: 0,
      pollIntervalSeconds: "not-a-number",
      retentionDays: 12.6,
      dev: { enableSimulationSmokeMode: "TRUE", allowSimulationNotifications: true, useEmptyNativeSimulationFallback: "true", simulationDelaySeconds: "8" },
      events: { downloadCompleted: { enabled: false } },
    });

    expect(config).toMatchObject({
      enabled: true,
      pollIntervalSeconds: 30,
      retentionDays: 13,
      dev: { enableSimulationSmokeMode: true, allowSimulationNotifications: true, useEmptyNativeSimulationFallback: true, simulationDelaySeconds: 8 },
      events: { downloadCompleted: { enabled: false } },
    });
  });

  it("maps manifest preferences through the normalizer", () => {
    const preferences = new Map<string, string>([
      ["enabled", "false"], ["pollIntervalSeconds", "45"], ["retentionDays", "7"],
      ["devEnableSimulationSmokeMode", "true"], ["devAllowSimulationNotifications", "true"], ["devUseEmptyNativeSimulationFallback", "true"], ["devSimulationDelaySeconds", "5"],
      ["downloadCompletedEnabled", "false"],
    ]);
    const config = configFromPreferences((key) => preferences.get(key));

    expect(config).toMatchObject({
      enabled: false, pollIntervalSeconds: 45, retentionDays: 7,
      dev: { enableSimulationSmokeMode: true, allowSimulationNotifications: true, useEmptyNativeSimulationFallback: true, simulationDelaySeconds: 5 },
      events: { downloadCompleted: { enabled: false } },
    });
  });
});
