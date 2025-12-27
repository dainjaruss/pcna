import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { comparePassword, signAccessToken, createRefreshTokenForUser, setAuthCookies } from '@/lib/auth'
import { allowRequest, getRequestCount } from '@/lib/rate-limiter'
import { sanitizeEmail, sanitizePassword } from '@/lib/sanitization'
import { handleApiError } from '@/lib/error-handling'

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export async function POST(req: Request) {
  // Use Redis-backed rate limiter per IP. Falls back to allow on Redis errors.
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'unknown'
  const key = `rl:login:${ip}`
  const allowed = await allowRequest(key, 10, 60)
  if (!allowed) {
    const count = await getRequestCount(key)
    return NextResponse.json({ error: 'Too many login attempts, try again later', attempts: count }, { status: 429 })
  }

  try {
    const body = await req.json()

    // Sanitize inputs
    const sanitizedBody = {
      email: sanitizeEmail(body.email),
      password: sanitizePassword(body.password)
    };

    const parsed = bodySchema.parse(sanitizedBody)

    const user = await prisma.user.findUnique({ where: { email: parsed.email } })
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

    const ok = comparePassword(parsed.password, user.passwordHash)
    if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

    const access = signAccessToken({ sub: user.id, email: user.email })
    const { token: refreshToken, expiresAt } = await createRefreshTokenForUser(user.id)
    const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } })
    setAuthCookies(res, access, refreshToken, expiresAt)
    return res
  } catch (error) {
    return handleApiError(error, 'login')
  }
}
