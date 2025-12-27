import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma';

// GET /api/settings/emails - Get all email recipients
export async function GET() {
  try {
    const recipients = await prisma.emailRecipient.findMany({
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json(recipients);
  } catch (error) {
    console.error('Error fetching email recipients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email recipients' },
      { status: 500 }
    );
  }
}

// POST /api/settings/emails - Add email recipient
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }
    
    const recipient = await prisma.emailRecipient.create({
      data: { email, active: true }
    });
    
    return NextResponse.json(recipient, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }
    console.error('Error adding email recipient:', error);
    return NextResponse.json(
      { error: 'Failed to add email recipient' },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/emails - Remove email recipient
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing recipient ID' },
        { status: 400 }
      );
    }
    
    await prisma.emailRecipient.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing email recipient:', error);
    return NextResponse.json(
      { error: 'Failed to remove email recipient' },
      { status: 500 }
    );
  }
}
