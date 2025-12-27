import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthFromRequest, hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const bodySchema = z.object({ password: z.string().min(6) })

export async function POST(req: Request) {
  const auth = getAuthFromRequest(req as any)
  if (!auth?.sub) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  try {
    const body = await req.json()
    const parsed = bodySchema.parse(body)
    await prisma.user.update({ where: { id: auth.sub }, data: { passwordHash: hashPassword(parsed.password) } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Invalid request' }, { status: 400 })
  }
}
