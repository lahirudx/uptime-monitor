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
    
    let startDate: Date
    let endDate: Date | undefined
    
    // Check if custom date range is provided
    const customStartDate = searchParams.get('startDate')
    const customEndDate = searchParams.get('endDate')
    
    if (customStartDate && customEndDate) {
      // Use custom date range - handle both with and without timezone
      startDate = new Date(customStartDate)
      endDate = new Date(customEndDate)
      
      console.log('Custom date range request:', {
        rawStart: customStartDate,
        rawEnd: customEndDate,
        parsedStart: startDate.toISOString(),
        parsedEnd: endDate.toISOString(),
        isValidStart: !isNaN(startDate.getTime()),
        isValidEnd: !isNaN(endDate.getTime()),
        monitorId: id
      })
    } else {
      // Use hours parameter for relative time range
      const hours = parseInt(searchParams.get('hours') || '24')
      startDate = new Date()
      startDate.setHours(startDate.getHours() - hours)
    }

    const query: any = {
      monitorId: id,
      timestamp: { $gte: startDate },
    }
    
    if (endDate) {
      query.timestamp.$lte = endDate
    }

    console.log('MongoDB query:', JSON.stringify(query))

    const checks = await MonitorCheckModel.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
    
    console.log(`Found ${checks.length} checks`)

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
