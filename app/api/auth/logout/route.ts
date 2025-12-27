import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clearAuthCookies } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const cookieHeader = (req as any).headers.get('cookie') || ''
    const match = cookieHeader.split(';').map((s: string) => s.trim()).find((s: string) => s.startsWith('refresh_token='))
    if (match) {
      const refresh = match.split('=')[1]
      const tokenHash = (await import('crypto')).createHash('sha256').update(refresh).digest('hex')
      await prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revoked: true } })
    }
    const res = NextResponse.json({ ok: true })
    clearAuthCookies(res)
    return res
  } catch (e: any) {
    const res = NextResponse.json({ ok: true })
    clearAuthCookies(res)
    return res
  }
}
