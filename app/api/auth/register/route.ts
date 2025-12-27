import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword, signAccessToken, createRefreshTokenForUser, setAuthCookies } from '@/lib/auth'
import { allowRequest, getRequestCount } from '@/lib/rate-limiter'
import { sanitizeEmail, sanitizePassword, sanitizeString } from '@/lib/sanitization'
import { handleApiError } from '@/lib/error-handling'

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
})

export async function POST(req: Request) {
  // Rate limit registration attempts
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'unknown'
  const key = `rl:register:${ip}`
  const allowed = await allowRequest(key, 3, 3600) // 3 registrations per hour
  if (!allowed) {
    const count = await getRequestCount(key)
    return NextResponse.json({ error: 'Too many registration attempts, try again later', attempts: count }, { status: 429 })
  }

  try {
    const body = await req.json()

    // Sanitize inputs
    const sanitizedBody = {
      email: sanitizeEmail(body.email),
      password: sanitizePassword(body.password),
      name: body.name ? sanitizeString(body.name, { maxLength: 100 }) : undefined
    };

    const parsed = bodySchema.parse(sanitizedBody)

    const exists = await prisma.user.findUnique({ where: { email: parsed.email } })
    if (exists) return NextResponse.json({ error: 'User already exists' }, { status: 409 })

    const user = await prisma.user.create({
      data: {
        email: parsed.email,
        passwordHash: hashPassword(parsed.password),
        name: parsed.name,
      },
    })

    const access = signAccessToken({ sub: user.id, email: user.email })
    const { token: refreshToken, expiresAt } = await createRefreshTokenForUser(user.id)
    const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } })
    setAuthCookies(res, access, refreshToken, expiresAt)
    return res
  } catch (error) {
    return handleApiError(error, 'register')
  }
}
