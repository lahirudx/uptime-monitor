import { NextResponse } from 'next/server'
import { runMonitorChecks } from '@/lib/monitor'

// Vercel cron jobs can take up to 60 seconds on Pro plan, 10s on Hobby
export const maxDuration = 60

export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron or has the correct secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // For Vercel Cron, check the Authorization header
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Starting monitor checks from cron...')
    const result = await runMonitorChecks()

    return NextResponse.json({
      message: 'Monitor checks completed',
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron job failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request: Request) {
  return GET(request)
}
