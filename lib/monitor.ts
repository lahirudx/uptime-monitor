import axios, { AxiosError } from 'axios'

export interface MonitorCheckResult {
  success: boolean
  responseTime: number
  statusCode?: number
  error?: string
  timestamp: Date
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
