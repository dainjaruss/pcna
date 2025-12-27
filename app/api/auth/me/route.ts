import { NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const auth = getAuthFromRequest(req as any)
  if (!auth?.sub) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: auth.sub }, select: { id: true, email: true, name: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json({ user })
}
