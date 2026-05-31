// Smallest check interval (seconds) a user may set on a monitor. Enforced at
// the API (zod) and model (mongoose) layers, and surfaced to the dashboard
// form via the config Context so the input reflects it. Operators raise this
// in production (e.g. 300) to cap load; default 30.
//
// Server-only — read on the server and passed to the client through
// <Providers config={...}> (see app/layout.tsx + components/providers.tsx),
// NOT via NEXT_PUBLIC_, so the same image serves any configured value.
export const MIN_MONITOR_INTERVAL_SECONDS = Math.max(
  1,
  parseInt(process.env.MONITOR_MIN_INTERVAL_SECONDS || '30', 10)
)

// Default interval for a newly created monitor — never below the configured
// minimum.
export const DEFAULT_MONITOR_INTERVAL_SECONDS = Math.max(60, MIN_MONITOR_INTERVAL_SECONDS)

// Largest request timeout (seconds) a user may set on a monitor. Caps how long
// a single check can run, which also bounds the cron lock TTL (see
// lib/monitor.ts). Enforced at the API + model layers and surfaced to the
// form. Default 60.
export const MAX_MONITOR_TIMEOUT_SECONDS = Math.max(
  5,
  parseInt(process.env.MONITOR_MAX_TIMEOUT_SECONDS || '60', 10)
)

// Default request timeout for a newly created monitor — never above the cap.
export const DEFAULT_MONITOR_TIMEOUT_SECONDS = Math.min(30, MAX_MONITOR_TIMEOUT_SECONDS)
