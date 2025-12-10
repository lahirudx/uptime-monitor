import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import ContactList from '@/models/ContactList'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const ContactListUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').trim().optional(),
  description: z.string().optional(),
  emails: z.array(z.string().email('Invalid email format')).optional(),
  phones: z.array(z.string()).optional(),
  webhooks: z.array(z.string().url('Invalid webhook URL')).optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await connectDB()
    const contactList = await ContactList.findById(id)

    if (!contactList) {
      return NextResponse.json(
        { success: false, error: 'Contact list not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: contactList,
    })
  } catch (error) {
    console.error('Error fetching contact list:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contact list' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = ContactListUpdateSchema.parse(body)

    await connectDB()
    const contactList = await ContactList.findByIdAndUpdate(
      id,
      validatedData,
      { new: true, runValidators: true }
    )

    if (!contactList) {
      return NextResponse.json(
        { success: false, error: 'Contact list not found' },
        { status: 404 }
      )
    }

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

    console.error('Error updating contact list:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update contact list' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await connectDB()
    const contactList = await ContactList.findByIdAndDelete(id)

    if (!contactList) {
      return NextResponse.json(
        { success: false, error: 'Contact list not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Contact list deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting contact list:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete contact list' },
      { status: 500 }
    )
  }
}
