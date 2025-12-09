import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import MonitorCheckModel from '@/models/MonitorCheck'

// GET /api/monitors/[id]/checks - Get checks for a monitor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await connectDB()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const hours = parseInt(searchParams.get('hours') || '24')

    const startDate = new Date()
    startDate.setHours(startDate.getHours() - hours)

    const checks = await MonitorCheckModel.find({
      monitorId: id,
      timestamp: { $gte: startDate },
    })
      .sort({ timestamp: -1 })
      .limit(limit)

    return NextResponse.json({
      success: true,
      data: checks,
    })
  } catch (error) {
    console.error('Error fetching checks:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch checks' },
      { status: 500 }
    )
  }
}
