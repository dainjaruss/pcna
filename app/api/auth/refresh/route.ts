import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rotateRefreshToken, signAccessToken, setAuthCookies, inferSecureCookieFlag } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const cookieHeader = (req as any).headers.get('cookie') || ''
    const match = cookieHeader.split(';').map((s: string) => s.trim()).find((s: string) => s.startsWith('refresh_token='))
    if (!match) return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
    const refresh = match.split('=')[1]
    const tokenHash = (await import('crypto')).createHash('sha256').update(refresh).digest('hex')
    const dbToken = await prisma.refreshToken.findUnique({ where: { tokenHash } })
    if (!dbToken || dbToken.revoked) return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 })
    if (new Date() > dbToken.expiresAt) return NextResponse.json({ error: 'Refresh token expired' }, { status: 401 })

    // rotate
    await prisma.refreshToken.update({ where: { id: dbToken.id }, data: { revoked: true } })
    const { token: newRefresh, expiresAt } = await rotateRefreshToken(tokenHash, dbToken.userId)
    const access = signAccessToken({ sub: dbToken.userId })
    const res = NextResponse.json({ ok: true })
    const secureFlag = inferSecureCookieFlag(req)
    setAuthCookies(res, access, newRefresh, expiresAt, { secure: secureFlag })
    return res
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Invalid request' }, { status: 400 })
  }
}
