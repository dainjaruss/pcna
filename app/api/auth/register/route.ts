import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword, signAccessToken, createRefreshTokenForUser, setAuthCookies } from '@/lib/auth'

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = bodySchema.parse(body)

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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid request' }, { status: 400 })
  }
}
