import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import StatusPageModel from '@/models/StatusPage'
import { z } from 'zod'

const createStatusPageSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  title: z.string().min(1),
  description: z.string().optional(),
  monitors: z.array(z.string()),
  branding: z.object({
    logo: z.string().optional(),
    primaryColor: z.string().optional(),
  }).optional(),
})

// GET /api/status-pages - List all status pages
export async function GET() {
  try {
    await connectDB()
    const statusPages = await StatusPageModel.find().sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      data: statusPages,
    })
  } catch (error) {
    console.error('Error fetching status pages:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch status pages' },
      { status: 500 }
    )
  }
}

// POST /api/status-pages - Create a new status page
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createStatusPageSchema.parse(body)

    await connectDB()

    // Check if slug already exists
    const existing = await StatusPageModel.findOne({ slug: validatedData.slug })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A status page with this slug already exists' },
        { status: 400 }
      )
    }

    const statusPage = await StatusPageModel.create(validatedData)

    return NextResponse.json({
      success: true,
      data: statusPage,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating status page:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create status page' },
      { status: 500 }
    )
  }
}
