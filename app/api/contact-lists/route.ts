import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import ContactList from '@/models/ContactList'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const ContactListSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  description: z.string().optional(),
  emails: z.array(z.string().email('Invalid email format')).default([]),
  phones: z.array(z.string()).default([]),
  webhooks: z.array(z.string().url('Invalid webhook URL')).default([]),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const contactLists = await ContactList.find({}).sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      data: contactLists,
    })
  } catch (error) {
    console.error('Error fetching contact lists:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contact lists' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = ContactListSchema.parse(body)

    await connectDB()
    const contactList = await ContactList.create(validatedData)

    return NextResponse.json({
      success: true,
      data: contactList,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating contact list:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create contact list' },
      { status: 500 }
    )
  }
}
