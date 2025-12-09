import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import MonitorModel from '@/models/Monitor'
import { z } from 'zod'

const updateMonitorSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url().optional(),
  type: z.enum(['http', 'https']).optional(),
  interval: z.number().min(30).optional(),
  timeout: z.number().min(5).max(60).optional(),
  status: z.enum(['up', 'down', 'paused']).optional(),
  alerts: z.object({
    email: z.array(z.string().email()).optional(),
    phone: z.array(z.string()).optional(),
    webhook: z.array(z.string().url()).optional(),
  }).optional(),
})

// GET /api/monitors/[id] - Get a specific monitor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await connectDB()
    const monitor = await MonitorModel.findById(id)

    if (!monitor) {
      return NextResponse.json(
        { success: false, error: 'Monitor not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: monitor,
    })
  } catch (error) {
    console.error('Error fetching monitor:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch monitor' },
      { status: 500 }
    )
  }
}

// PUT /api/monitors/[id] - Update a monitor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = updateMonitorSchema.parse(body)

    await connectDB()

    const monitor = await MonitorModel.findByIdAndUpdate(
      id,
      { $set: validatedData },
      { new: true, runValidators: true }
    )

    if (!monitor) {
      return NextResponse.json(
        { success: false, error: 'Monitor not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: monitor,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating monitor:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update monitor' },
      { status: 500 }
    )
  }
}

// DELETE /api/monitors/[id] - Delete a monitor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await connectDB()

    const monitor = await MonitorModel.findByIdAndDelete(id)

    if (!monitor) {
      return NextResponse.json(
        { success: false, error: 'Monitor not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Monitor deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting monitor:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete monitor' },
      { status: 500 }
    )
  }
}
