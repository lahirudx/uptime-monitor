import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import MonitorCheckModel from '@/models/MonitorCheck'
import { calculateUptime, calculateAverageResponseTime } from '@/lib/monitor'

// GET /api/monitors/[id]/stats - Get stats for a monitor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()

    const { id } = await params
    const now = new Date()

    // Get checks for different time periods
    const get24hDate = () => {
      const date = new Date(now)
      date.setHours(date.getHours() - 24)
      return date
    }

    const get7dDate = () => {
      const date = new Date(now)
      date.setDate(date.getDate() - 7)
      return date
    }

    const get30dDate = () => {
      const date = new Date(now)
      date.setDate(date.getDate() - 30)
      return date
    }

    const [checks24h, checks7d, checks30d] = await Promise.all([
      MonitorCheckModel.find({
        monitorId: id,
        timestamp: { $gte: get24hDate() },
      }),
      MonitorCheckModel.find({
        monitorId: id,
        timestamp: { $gte: get7dDate() },
      }),
      MonitorCheckModel.find({
        monitorId: id,
        timestamp: { $gte: get30dDate() },
      }),
    ])

    const uptime24h = calculateUptime(checks24h)
    const uptime7d = calculateUptime(checks7d)
    const uptime30d = calculateUptime(checks30d)

    const responseTimes30d = checks30d
      .filter(c => c.success)
      .map(c => c.responseTime)
    const avgResponseTime = calculateAverageResponseTime(responseTimes30d)

    const totalChecks = checks30d.length
    const successfulChecks = checks30d.filter(c => c.success).length
    const failedChecks = totalChecks - successfulChecks

    return NextResponse.json({
      success: true,
      data: {
        monitorId: id,
        uptime24h,
        uptime7d,
        uptime30d,
        avgResponseTime,
        totalChecks,
        successfulChecks,
        failedChecks,
        lastUpdated: now,
      },
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
