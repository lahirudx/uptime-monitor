import { APIGatewayProxyEvent, APIGatewayProxyResult, ScheduledEvent } from 'aws-lambda'

/**
 * Lambda handler for scheduled cron job
 * Triggered by EventBridge (CloudWatch Events) every 1 minute
 * Calls the Amplify API endpoint to trigger monitoring
 */
export async function monitorCron(
  event: ScheduledEvent
): Promise<{ statusCode: number; body: string }> {
  console.log('Cron event triggered:', JSON.stringify(event, null, 2))

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const cronSecret = process.env.CRON_SECRET

    if (!appUrl) {
      throw new Error('NEXT_PUBLIC_APP_URL environment variable is required')
    }

    const apiUrl = `${appUrl}/api/cron/monitor`
    console.log('Calling API:', apiUrl)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (cronSecret) {
      headers['Authorization'] = `Bearer ${cronSecret}`
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
    })

    const result = await response.json()

    console.log('Monitor checks completed:', result)

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Monitor checks completed via Amplify API',
        ...result,
        timestamp: new Date().toISOString(),
      }),
    }
  } catch (error) {
    console.error('Cron job failed:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
    }
  }
}

/**
 * Lambda handler for manual HTTP trigger
 * Can be called via API Gateway for manual checks
 * This also uses the API approach (not direct imports) to keep bundle small
 */
export async function manualCheck(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log('Manual trigger received:', JSON.stringify(event, null, 2))

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const cronSecret = process.env.CRON_SECRET

    if (!appUrl) {
      throw new Error('NEXT_PUBLIC_APP_URL environment variable is required')
    }

    // Verify authorization if CRON_SECRET is set
    const authHeader = event.headers?.authorization || event.headers?.Authorization

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized request')
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }

    const apiUrl = `${appUrl}/api/cron/monitor`
    console.log('Calling API:', apiUrl)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (cronSecret) {
      headers['Authorization'] = `Bearer ${cronSecret}`
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
    })

    const result = await response.json()

    console.log('Monitor checks completed:', result)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Monitor checks completed via API',
        ...result,
        timestamp: new Date().toISOString(),
      }),
    }
  } catch (error) {
    console.error('Manual check failed:', error)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
    }
  }
}
