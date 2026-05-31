// Restricts who may configure phone (Twilio) notifications.
//
// PHONE_ALERT_ALLOWED_EMAILS is a comma-separated allowlist of emails. When
// empty/unset there is NO restriction (the open-source default — any
// owner/admin can set phone alerts). When set, only those emails may create
// or keep phone numbers on a monitor or contact list; everyone else is
// rejected at the API and the phone inputs are hidden in the dashboard.
//
// Server-only (no NEXT_PUBLIC_ prefix), like lib/monitor-config.ts — the
// allowed flag is computed server-side and passed to the client via Context.
const PHONE_ALERT_ALLOWED_EMAILS: string[] = (process.env.PHONE_ALERT_ALLOWED_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

/** True when an allowlist is configured (phone alerts are gated). */
export function isPhoneAlertRestricted(): boolean {
  return PHONE_ALERT_ALLOWED_EMAILS.length > 0
}

/**
 * Whether the given user email may configure phone notifications.
 * Unrestricted instances always return true.
 */
export function isPhoneAlertAllowed(email?: string | null): boolean {
  if (!isPhoneAlertRestricted()) return true
  return !!email && PHONE_ALERT_ALLOWED_EMAILS.includes(email.toLowerCase())
}
