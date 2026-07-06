export interface Torrent { hash: string; name: string; progress: number; status: "downloading" | "seeding" | "paused" | "error"; notified: boolean; attempts: number; addedAt: number; lastError?: string; isSimulation?: boolean; isNativeFallback?: boolean }
export interface Notification { title: string; name: string; simulation?: boolean }
export interface Log { time: string; message: string; tone: "info" | "success" | "warning" | "error" }
export interface DiscordProvider { id: string; type: "discord"; label: string; enabled: boolean; webhook: string; mention: string; embedStyle: "compact" | "detailed"; includeName: boolean; includePath: boolean; includeTimestamp: boolean; providerFails: boolean }
export interface Settings { enabled: boolean; eventEnabled: boolean; smoke: boolean; allowSmoke: boolean; useEmptyNativeSimulationFallback: boolean; interval: number; retention: number; providers: DiscordProvider[] }
