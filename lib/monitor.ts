import axios, { AxiosError } from 'axios'
import { RetryConfig } from '@/types'

export interface MonitorCheckResult {
  success: boolean
  responseTime: number
  statusCode?: number
  error?: string
  timestamp: Date
  attemptNumber?: number
}

export function getRetryConfig(): RetryConfig {
  return {
    retryCount: parseInt(process.env.RETRY_COUNT || '1', 10),
    initialDelay: parseInt(process.env.RETRY_INITIAL_DELAY || '1000', 10),
    multiplier: parseFloat(process.env.RETRY_MULTIPLIER || '2'),
    maxDelay: parseInt(process.env.RETRY_MAX_DELAY || '5000', 10),
  }
}

/**
 * Calculate the delay for the next retry attempt using exponential backoff
 * @param attemptNumber - The current retry attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attemptNumber: number, config: RetryConfig): number {
  const delay = config.initialDelay * Math.pow(config.multiplier, attemptNumber)
  return Math.min(delay, config.maxDelay)
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function checkEndpoint(
  url: string,
  timeout: number = 30000
): Promise<MonitorCheckResult> {
  const startTime = Date.now()

  try {
    const response = await axios.get(url, {
      timeout,
      validateStatus: () => true, // Don't throw on any status code
      maxRedirects: 5,
    })

    const responseTime = Date.now() - startTime
    const success = response.status >= 200 && response.status < 400

    return {
      success,
      responseTime,
      statusCode: response.status,
      timestamp: new Date(),
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    const axiosError = error as AxiosError

    return {
      success: false,
      responseTime,
      error: axiosError.message || 'Unknown error',
      statusCode: axiosError.response?.status,
      timestamp: new Date(),
    }
  }
}

/**
 * Enhanced endpoint check with retry logic and exponential backoff
 * Only returns the final result after all retry attempts
 * @param url - The URL to check
 * @param timeout - Request timeout in milliseconds
 * @param config - Retry configuration (uses default if not provided)
 * @returns Final check result after all retries
 */
export async function checkEndpointWithRetry(
  url: string,
  timeout: number = 30000,
  config?: RetryConfig
): Promise<MonitorCheckResult> {
  const retryConfig = config || getRetryConfig()
  const totalAttempts = retryConfig.retryCount + 1
  const overallStartTime = Date.now()

  let lastResult: MonitorCheckResult | null = null

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    const result = await checkEndpoint(url, timeout)
    lastResult = result

    // Success - return immediately with metadata
    if (result.success) {
      return {
        ...result,
        responseTime: Date.now() - overallStartTime,
        attemptNumber: attempt + 1,
      }
    }

    // Not the last attempt - wait before retry
    if (attempt < totalAttempts - 1) {
      const backoffDelay = calculateBackoffDelay(attempt, retryConfig)
      console.log(
        `Check failed for ${url} (attempt ${attempt + 1}/${totalAttempts}). ` +
        `Retrying in ${backoffDelay}ms...`
      )
      await sleep(backoffDelay)
    }
  }

  // All attempts failed - return last result
  return {
    ...lastResult!,
    responseTime: Date.now() - overallStartTime,
    attemptNumber: totalAttempts,
  }
}

export function shouldSendAlert(
  previousStatus: 'up' | 'down',
  currentSuccess: boolean
): boolean {
  // Send alert when status changes from up to down
  return previousStatus === 'up' && !currentSuccess
}

export function calculateAverageResponseTime(responseTimes: number[]): number {
  if (responseTimes.length === 0) return 0
  return responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
}

export function calculateUptime(checks: { success: boolean }[]): number {
  if (checks.length === 0) return 100
  const successful = checks.filter(c => c.success).length
  return (successful / checks.length) * 100
}

/**
 * Expands contact lists to get all emails, phones, and webhooks
 * Merges with direct alerts and removes duplicates
 */
async function expandContactLists(
  contactListIds: string[] | undefined,
  directAlerts: { email?: string[], phone?: string[], webhook?: string[] } | undefined
) {
  const allEmails = new Set<string>(directAlerts?.email || [])
  const allPhones = new Set<string>(directAlerts?.phone || [])
  const allWebhooks = new Set<string>(directAlerts?.webhook || [])

  try {
    if (contactListIds && contactListIds.length > 0) {
      const ContactList = (await import('@/models/ContactList')).default
      const contactLists = await ContactList.find({ _id: { $in: contactListIds } })

      for (const list of contactLists) {
        if (list.emails) {
          list.emails.forEach((email: string) => allEmails.add(email))
        }
        if (list.phones) {
          list.phones.forEach((phone: string) => allPhones.add(phone))
        }
        if (list.webhooks) {
          list.webhooks.forEach((webhook: string) => allWebhooks.add(webhook))
        }
      }
    }
  } catch (error) {
    console.error('Error expanding contact lists:', error)
    // Continue with direct alerts only if contact list expansion fails
  }

  return {
    emails: Array.from(allEmails),
    phones: Array.from(allPhones),
    webhooks: Array.from(allWebhooks),
  }
}

/**
 * Run one full check + status update + alert fan-out for a single monitor.
 * Called from runMonitorChecks via per-monitor setTimeout scheduling.
 */
async function checkSingleMonitor(
  monitor: any,
  Monitor: any,
  MonitorCheck: any,
  sendEmailAlert: any,
  sendTwilioCall: any
) {
  const orgId = monitor.organizationId?.toString() || 'unknown'
  try {
    const now = new Date()
    const lastCheck = monitor.lastCheck ? new Date(monitor.lastCheck) : new Date(0)
    const timeSinceLastCheck = (now.getTime() - lastCheck.getTime()) / 1000 // in seconds

    // Safety gate — should always pass given anchor-based scheduling, but
    // protects against overlapping sweeps if the cron lock ever fails.
    // SWEEP_GRACE_MS of tolerance so a check that fires slightly early (cron
    // jitter) isn't dropped for being a few hundred ms under the interval.
    if (timeSinceLastCheck >= monitor.interval - SWEEP_GRACE_MS / 1000) {
      console.log(`[Org:${orgId}] Checking monitor: ${monitor.name} (${monitor.url})`)

      const checkResult = await checkEndpointWithRetry(
        monitor.url,
        monitor.timeout * 1000
      )

      if (checkResult.attemptNumber && checkResult.attemptNumber > 1) {
        console.log(
          `[Org:${orgId}] Monitor ${monitor.name}: ${checkResult.success ? 'Succeeded' : 'Failed'} ` +
            `after ${checkResult.attemptNumber} attempts`
        )
      }

      await MonitorCheck.create({
        monitorId: monitor._id.toString(),
        success: checkResult.success,
        responseTime: checkResult.responseTime,
        statusCode: checkResult.statusCode,
        error: checkResult.error,
        timestamp: checkResult.timestamp,
        attemptNumber: checkResult.attemptNumber,
      })

      const previousStatus = monitor.status
      const newStatus = checkResult.success ? 'up' : 'down'

      await Monitor.findByIdAndUpdate(monitor._id, {
        status: newStatus,
        lastCheck: now,
      })

      console.log(`[Org:${orgId}] Monitor ${monitor.name}: ${newStatus} (${checkResult.responseTime}ms)`)

      // up -> down: atomic dedupe claim, then fan out alerts.
      if (previousStatus === 'up' && newStatus === 'down') {
        const dedupeBefore = new Date(Date.now() - ALERT_DEDUPE_MS)
        const claimed = await Monitor.findOneAndUpdate(
          {
            _id: monitor._id,
            $or: [
              { lastAlertSentAt: { $exists: false } },
              { lastAlertSentAt: null },
              { lastAlertSentAt: { $lt: dedupeBefore } },
            ],
          },
          { $set: { lastAlertSentAt: new Date() } }
        )
        if (!claimed) {
          console.log(`[Org:${orgId}] Alert deduped for ${monitor.name}: already sent within ${ALERT_DEDUPE_MS / 1000}s`)
          return { success: true, monitorName: monitor.name, deduped: true }
        }

        console.log(`[Org:${orgId}] Sending alerts for ${monitor.name}`)

        const expandedContacts = await expandContactLists(monitor.contactLists, monitor.alerts)

        if (expandedContacts.emails.length > 0) {
          for (const email of expandedContacts.emails) {
            try {
              await sendEmailAlert(monitor.name, monitor.url, checkResult.error || 'Unknown error', email)
              console.log(`[Org:${orgId}] Alert email sent to ${email}`)
            } catch (error) {
              console.error(`[Org:${orgId}] Failed to send email to ${email}:`, error)
            }
          }
        }

        if (expandedContacts.webhooks.length > 0) {
          const { sendWebhookAlert } = await import('./notifications')
          for (const webhookUrl of expandedContacts.webhooks) {
            try {
              await sendWebhookAlert(webhookUrl, monitor.name, monitor.url, checkResult.error || 'Unknown error')
              console.log(`[Org:${orgId}] Webhook alert sent to ${webhookUrl}`)
            } catch (error) {
              console.error(`[Org:${orgId}] Failed to send webhook to ${webhookUrl}:`, error)
            }
          }
        }

        if (expandedContacts.phones.length > 0) {
          for (const phoneNumber of expandedContacts.phones) {
            try {
              await sendTwilioCall({
                to: phoneNumber,
                monitorName: monitor.name,
                url: monitor.url,
                status: 'down',
              })
              console.log(`[Org:${orgId}] Twilio call alert sent to ${phoneNumber}`)
            } catch (error) {
              console.error(`[Org:${orgId}] Failed to send Twilio call to ${phoneNumber}:`, error)
            }
          }
        }

        try {
          const { sendMonitorDownPush } = await import('./fcm')
          await sendMonitorDownPush(
            monitor._id.toString(),
            monitor.name,
            monitor.url,
            checkResult.error || 'Unknown error',
            monitor.organizationId?.toString()
          )
          console.log(`[Org:${orgId}] FCM push notification sent for ${monitor.name} going DOWN`)
        } catch (error) {
          console.error(`[Org:${orgId}] Failed to send FCM push notification:`, error)
        }
      }

      // down -> up: clear dedupe stamp so the next incident alerts immediately, then fan out recovery.
      if (previousStatus === 'down' && newStatus === 'up') {
        await Monitor.findByIdAndUpdate(monitor._id, { $unset: { lastAlertSentAt: 1 } })

        console.log(`[Org:${orgId}] Sending recovery notifications for ${monitor.name}`)

        const expandedContacts = await expandContactLists(monitor.contactLists, monitor.alerts)

        if (expandedContacts.emails.length > 0) {
          const { sendRecoveryNotification } = await import('./notifications')
          for (const email of expandedContacts.emails) {
            try {
              await sendRecoveryNotification(monitor.name, monitor.url, email)
              console.log(`[Org:${orgId}] Recovery email sent to ${email}`)
            } catch (error) {
              console.error(`[Org:${orgId}] Failed to send recovery email to ${email}:`, error)
            }
          }
        }

        try {
          const { sendMonitorRecoveryPush } = await import('./fcm')
          await sendMonitorRecoveryPush(
            monitor._id.toString(),
            monitor.name,
            monitor.url,
            monitor.organizationId?.toString()
          )
          console.log(`[Org:${orgId}] FCM recovery push notification sent for ${monitor.name} going UP`)
        } catch (error) {
          console.error(`[Org:${orgId}] Failed to send FCM recovery push notification:`, error)
        }
      }
    }
    return { success: true, monitorName: monitor.name }
  } catch (error) {
    console.error(`[Org:${orgId}] Error checking monitor ${monitor.name}:`, error)
    return { success: false, monitorName: monitor.name, error }
  }
}

const CRON_LOCK_KEY = 'monitor-cron'
const ALERT_DEDUPE_MS = 5 * 60 * 1000 // suppress repeat DOWN alerts for the same incident
// Window in which checks are scheduled within one cron tick.
//
// CRITICAL: this MUST equal the cron cadence (the interval at which the
// scheduler hits /api/cron/monitor). Each sweep only schedules checks falling
// in [sweepStart, sweepStart + SWEEP_WINDOW_MS); the next sweep must pick up
// exactly where this one stopped:
//   cron every 1 min  -> SWEEP_WINDOW_MS=60000
//   cron every 3 min  -> SWEEP_WINDOW_MS=180000
//   cron every 5 min  -> SWEEP_WINDOW_MS=300000
// If the window is SHORTER than the cadence, the tail of each interval is
// never covered and those monitors silently stop being checked. If it's
// LONGER, monitors get scheduled in overlapping windows (harmless — the
// per-monitor lastCheck gate in checkSingleMonitor dedupes them).
const SWEEP_WINDOW_MS = parseInt(process.env.SWEEP_WINDOW_MS || '60000', 10)
// Tolerance for cron jitter. K8s CronJobs don't fire at exact second
// boundaries, so fixed-width sweep windows anchored to the actual fire time
// don't tile perfectly: a late tick leaves a small uncovered gap, and an
// early tick makes a check fire slightly under `interval` after the last one.
// GRACE both (a) extends each window so the gap is re-covered, and (b)
// loosens the lastCheck gate so a near-on-time check isn't dropped for being
// a few hundred ms early. Without it, monitors whose anchor second sits near
// the window boundary can skip a cycle. 5s is comfortably above typical
// CronJob jitter while staying negligible against a 60s interval.
const SWEEP_GRACE_MS = parseInt(process.env.SWEEP_GRACE_MS || '5000', 10)
// Worst-case time for a single check to finish once it fires. Derived from the
// actual retry config and the schema's max per-monitor timeout, NOT a fixed
// constant — a monitor with timeout=60 and RETRY_COUNT=1 runs ~125s, well past
// the old hardcoded 90s, which would let the cron lock expire mid-sweep while a
// trailing check is still running. Each failed attempt waits up to
// RETRY_MAX_DELAY before the next, so worst case is:
//   maxTimeout × (retries + 1) + retryMaxDelay × retries
const MAX_MONITOR_TIMEOUT_MS = 60 * 1000 // schema cap on monitor.timeout (models/Monitor.ts)
const RETRY_COUNT_FOR_BUDGET = parseInt(process.env.RETRY_COUNT || '1', 10)
const RETRY_MAX_DELAY_FOR_BUDGET = parseInt(process.env.RETRY_MAX_DELAY || '5000', 10)
const MAX_SINGLE_CHECK_MS =
  MAX_MONITOR_TIMEOUT_MS * (RETRY_COUNT_FOR_BUDGET + 1) +
  RETRY_MAX_DELAY_FOR_BUDGET * RETRY_COUNT_FOR_BUDGET
// Lock is held for the whole sweep, so its TTL is derived from the window
// rather than a fixed constant — otherwise raising SWEEP_WINDOW_MS (e.g. to
// 3 min) without bumping the TTL would let the lock expire mid-sweep and a
// second invocation start. window + grace + the longest trailing check.
const CRON_LOCK_TTL_MS = SWEEP_WINDOW_MS + SWEEP_GRACE_MS + MAX_SINGLE_CHECK_MS

/**
 * Try to acquire the cron lock. Returns true if acquired, false if another
 * invocation is already running and the lock is still valid.
 */
async function acquireCronLock(): Promise<boolean> {
  const CronLock = (await import('@/models/CronLock')).default
  const now = new Date()
  const expiresAt = new Date(now.getTime() + CRON_LOCK_TTL_MS)

  try {
    const res = await CronLock.updateOne(
      {
        _id: CRON_LOCK_KEY,
        $or: [
          { expiresAt: { $lt: now } },
          { expiresAt: { $exists: false } },
        ],
      },
      { $set: { acquiredAt: now, expiresAt } },
      { upsert: true }
    )
    return res.upsertedCount > 0 || res.modifiedCount > 0
  } catch (e: unknown) {
    // 11000 = duplicate key: another instance holds an unexpired lock
    if ((e as { code?: number })?.code === 11000) return false
    throw e
  }
}

async function releaseCronLock(): Promise<void> {
  const CronLock = (await import('@/models/CronLock')).default
  try {
    await CronLock.deleteOne({ _id: CRON_LOCK_KEY })
  } catch (e) {
    console.error('Failed to release cron lock (will expire via TTL):', e)
  }
}

/**
 * Main function to run monitor checks for all active monitors
 * This can be called from a cron job, API route, or scheduled task
 */
export async function runMonitorChecks() {
  const { connectDB } = await import('./db')
  const Monitor = (await import('@/models/Monitor')).default
  const MonitorCheck = (await import('@/models/MonitorCheck')).default
  const { sendEmailAlert } = await import('./notifications')
  const { sendTwilioCall } = await import('./twilio')

  await connectDB()

  const acquired = await acquireCronLock()
  if (!acquired) {
    console.log('Monitor check skipped: another invocation is already running')
    return { success: true, skipped: true, reason: 'lock-held' }
  }

  try {
    // Get all active monitors (not paused)
    const monitors = await Monitor.find({
      status: { $in: ['up', 'down'] },
    })

    const sweepStart = Date.now()
    // Extend the window by GRACE so a gap left by a late-firing previous tick
    // is re-covered here. Any monitor this pulls forward from the next window
    // is deduped by the (also grace-tolerant) lastCheck gate.
    const sweepEnd = sweepStart + SWEEP_WINDOW_MS + SWEEP_GRACE_MS
    console.log(
      `Sweep over ${monitors.length} active monitors; window ${SWEEP_WINDOW_MS / 1000}s ` +
        `(+${SWEEP_GRACE_MS / 1000}s grace; must equal cron cadence — set SWEEP_WINDOW_MS to match the CronJob schedule)`
    )

    // Schedule each due firing via setTimeout, anchored to the monitor's
    // createdAt. A monitor created at 13:17:23 with interval=300 will fire
    // at exactly 13:22:23, 13:27:23, etc. Monitors with interval < window
    // can fire more than once per sweep (handled by the inner while loop).
    const scheduled: Promise<void>[] = []
    let scheduledCount = 0

    for (const monitor of monitors) {
      const createdMs = new Date(monitor.createdAt).getTime()
      const intervalMs = monitor.interval * 1000
      const elapsed = sweepStart - createdMs
      let nextDueMs = createdMs + Math.ceil(elapsed / intervalMs) * intervalMs

      while (nextDueMs < sweepEnd) {
        const delay = Math.max(0, nextDueMs - sweepStart)
        const m = monitor // close over a stable reference
        scheduled.push(
          new Promise<void>((resolve) => {
            setTimeout(async () => {
              try {
                await checkSingleMonitor(m, Monitor, MonitorCheck, sendEmailAlert, sendTwilioCall)
              } catch (e) {
                console.error(`Scheduled check threw for ${m.name}:`, e)
              }
              resolve()
            }, delay)
          })
        )
        scheduledCount++
        nextDueMs += intervalMs
      }
    }

    console.log(`Scheduled ${scheduledCount} monitor checks in this window`)
    await Promise.allSettled(scheduled)

    const executionTime = Date.now() - sweepStart
    console.log(
      `Monitor check cycle completed: ${scheduledCount} checks fired in ${executionTime}ms`
    )
    return { success: true, monitorsChecked: scheduledCount, executionTime }
  } catch (error) {
    console.error('Error running monitor checks:', error)
    throw error
  } finally {
    await releaseCronLock()
  }
}
