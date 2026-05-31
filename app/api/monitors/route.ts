import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import MonitorModel from '@/models/Monitor'
import OrganizationModel from '@/models/Organization'
import { requireUniversalAuth, getOrganizationFilter, requireRole } from '@/lib/auth-helpers'
import {
  MIN_MONITOR_INTERVAL_SECONDS,
  DEFAULT_MONITOR_INTERVAL_SECONDS,
  MAX_MONITOR_TIMEOUT_SECONDS,
  DEFAULT_MONITOR_TIMEOUT_SECONDS,
} from '@/lib/monitor-config'
import { z } from 'zod'

const createMonitorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Valid URL is required'),
  type: z.enum(['http', 'https']).default('https'),
  interval: z
    .number()
    .min(MIN_MONITOR_INTERVAL_SECONDS, `Interval must be at least ${MIN_MONITOR_INTERVAL_SECONDS}s`)
    .default(DEFAULT_MONITOR_INTERVAL_SECONDS),
  timeout: z
    .number()
    .min(5)
    .max(MAX_MONITOR_TIMEOUT_SECONDS, `Timeout must be at most ${MAX_MONITOR_TIMEOUT_SECONDS}s`)
    .default(DEFAULT_MONITOR_TIMEOUT_SECONDS),
  contactLists: z.array(z.string()).optional(),
  alerts: z.object({
    email: z.array(z.string().email()).optional(),
    phone: z.array(z.string()).optional(),
    webhook: z.array(z.string().url()).optional(),
  }).optional(),
})

// GET /api/monitors - List monitors for current organization
export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireUniversalAuth(request)
    if (error) return error

    await connectDB()

    const monitors = await MonitorModel.find(getOrganizationFilter(user!))
      .sort({ createdAt: -1 })

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

// POST /api/monitors - Create a new monitor in current organization
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireUniversalAuth(request)
    if (error) return error

    // Only owners and admins can create monitors
    const roleError = requireRole(user!, ['owner', 'admin'])
    if (roleError) return roleError

    const body = await request.json()
    const validatedData = createMonitorSchema.parse(body)

    await connectDB()

    // Check organization limits
    const organization = await OrganizationModel.findById(user!.organizationId)
    const monitorCount = await MonitorModel.countDocuments(
      getOrganizationFilter(user!)
    )

    if (monitorCount >= (organization?.settings.maxMonitors || 5)) {
      return NextResponse.json(
        { success: false, error: 'Monitor limit reached for your plan' },
        { status: 403 }
      )
    }

    const monitor = await MonitorModel.create({
      ...validatedData,
      organizationId: user!.organizationId,
      // Start active so the next cron sweep checks it immediately. Begin as
      // 'up' (optimistic) so the first check only alerts on a genuine
      // up->down; starting 'down' would fire a spurious recovery alert when
      // the first check finds it healthy.
      status: 'up',
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
