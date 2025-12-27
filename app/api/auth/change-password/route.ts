import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthFromRequest, hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { allowRequest } from '@/lib/rate-limiter'

const bodySchema = z.object({ password: z.string().min(6) })

export async function POST(req: Request) {
  const auth = getAuthFromRequest(req as any)
  if (!auth?.sub) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Rate limit password changes
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'unknown'
  const key = `rl:change-password:${auth.sub}` // Per user rate limiting
  const allowed = await allowRequest(key, 3, 3600) // 3 password changes per hour per user
  if (!allowed) {
    return NextResponse.json({ error: 'Too many password change attempts, try again later' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const parsed = bodySchema.parse(body)
    await prisma.user.update({ where: { id: auth.sub }, data: { passwordHash: hashPassword(parsed.password) } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Invalid request' }, { status: 400 })
  }
}
