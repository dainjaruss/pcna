import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Simple DB check
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', db: 'ok' })
  } catch (e) {
    return NextResponse.json({ status: 'error', db: 'unavailable' }, { status: 503 })
  }
}
