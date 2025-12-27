import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { comparePassword, signAccessToken, createRefreshTokenForUser, setAuthCookies, inferSecureCookieFlag } from '@/lib/auth'
import { allowRequest, getRequestCount } from '@/lib/rate-limiter'
import { sanitizeEmail, sanitizePassword } from '@/lib/sanitization'
import { handleApiError } from '@/lib/error-handling'
import { logSecurityEvent, logger } from '@/lib/logger'

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export async function POST(req: Request) {
  // Use Redis-backed rate limiter per IP. Falls back to allow on Redis errors.
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  const key = `rl:login:${ip}`
  const allowed = await allowRequest(key, 10, 60)
  if (!allowed) {
    const count = await getRequestCount(key)
    logSecurityEvent({
      event: 'rate_limit_exceeded',
      ip,
      userAgent,
      details: { attempts: count, endpoint: '/api/auth/login' }
    });
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
    if (!user) {
      logSecurityEvent({
        event: 'login_failure',
        ip,
        userAgent,
        details: { reason: 'user_not_found', email: parsed.email }
      });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const ok = comparePassword(parsed.password, user.passwordHash)
    if (!ok) {
      logSecurityEvent({
        event: 'login_failure',
        userId: user.id,
        ip,
        userAgent,
        details: { reason: 'invalid_password' }
      });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const access = signAccessToken({ sub: user.id, email: user.email })
    const { token: refreshToken, expiresAt } = await createRefreshTokenForUser(user.id)
    
    logSecurityEvent({
      event: 'login_success',
      userId: user.id,
      ip,
      userAgent,
    });
    
    const userSettings = await prisma.userSetting.findUnique({ where: { userId: user.id } })
    const needsOnboarding = !userSettings || (userSettings.preferredCategories?.length || 0) === 0
    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      needsOnboarding
    })
    const secureFlag = inferSecureCookieFlag(req)
    setAuthCookies(res, access, refreshToken, expiresAt, { secure: secureFlag })
    return res
  } catch (error) {
    logger.error('Login error', { error: error instanceof Error ? error.message : String(error) });
    return handleApiError(error, 'login')
  }
}
