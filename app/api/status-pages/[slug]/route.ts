import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import StatusPageModel from '@/models/StatusPage'
import MonitorModel from '@/models/Monitor'
import MonitorCheckModel from '@/models/MonitorCheck'
import { calculateUptime } from '@/lib/monitor'

// GET /api/status-pages/[slug] - Get a status page with monitor data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    await connectDB()

    const statusPage = await StatusPageModel.findOne({ slug })

    if (!statusPage) {
      return NextResponse.json(
        { success: false, error: 'Status page not found' },
        { status: 404 }
      )
    }

    // Fetch all monitors for this status page
    const monitors = await MonitorModel.find({
      _id: { $in: statusPage.monitors },
    })

    // Fetch recent checks for each monitor
    const monitorData = await Promise.all(
      monitors.map(async (monitor) => {
        const checks24h = await MonitorCheckModel.find({
          monitorId: monitor._id.toString(),
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }).sort({ timestamp: -1 })

        const uptime = calculateUptime(checks24h)

        return {
          ...monitor.toObject(),
          uptime24h: uptime,
          recentChecks: checks24h.slice(0, 90), // Last 90 checks for the mini chart
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        ...statusPage.toObject(),
        monitors: monitorData,
      },
    })
  } catch (error) {
    console.error('Error fetching status page:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch status page' },
      { status: 500 }
    )
  }
}
