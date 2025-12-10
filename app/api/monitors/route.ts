import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import MonitorModel from '@/models/Monitor'
import { z } from 'zod'

const createMonitorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Valid URL is required'),
  type: z.enum(['http', 'https']).default('https'),
  interval: z.number().min(30).default(60),
  timeout: z.number().min(5).max(60).default(30),
  contactLists: z.array(z.string()).optional(),
  alerts: z.object({
    email: z.array(z.string().email()).optional(),
    phone: z.array(z.string()).optional(),
    webhook: z.array(z.string().url()).optional(),
  }).optional(),
})

// GET /api/monitors - List all monitors
export async function GET() {
  try {
    await connectDB()
    const monitors = await MonitorModel.find().sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      data: monitors,
    })
  } catch (error) {
    console.error('Error fetching monitors:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch monitors' },
      { status: 500 }
    )
  }
}

// POST /api/monitors - Create a new monitor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createMonitorSchema.parse(body)

    await connectDB()

    const monitor = await MonitorModel.create({
      ...validatedData,
      status: 'paused',
    })

    return NextResponse.json({
      success: true,
      data: monitor,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating monitor:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create monitor' },
      { status: 500 }
    )
  }
}
