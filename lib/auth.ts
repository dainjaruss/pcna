import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import fs from 'fs'

// Support reading JWT secret from a file for vault-ready configuration.
let ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'change-this-secret'
if (process.env.JWT_SECRET_FILE) {
  try {
    // read file synchronously at startup
    const s = fs.readFileSync(process.env.JWT_SECRET_FILE, 'utf8').trim()
    if (s) ACCESS_TOKEN_SECRET = s
  } catch (e) {
    // fallback to env var
  }
}
const ACCESS_EXPIRES_IN = process.env.ACCESS_EXPIRES_IN || '24h' // per requirement
const REFRESH_EXPIRES_DAYS = parseInt(process.env.REFRESH_EXPIRES_DAYS || '30', 10)

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10)
}

export function comparePassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash)
}

export function signAccessToken(payload: Record<string, any>) {
  return (jwt as any).sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_EXPIRES_IN })
}

export function verifyAccessToken(token: string) {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as Record<string, any>
  } catch (e) {
    return null
  }
}

function hashTokenRaw(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function createRefreshTokenForUser(userId: string) {
  const token = crypto.randomBytes(64).toString('hex')
  const tokenHash = hashTokenRaw(token)
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000)
  const rt = await prisma.refreshToken.create({ data: { tokenHash, userId, expiresAt } })
  return { token, tokenHash, expiresAt, id: rt.id }
}

export async function rotateRefreshToken(oldTokenHash: string, userId: string) {
  // revoke old token and create new one
  await prisma.refreshToken.updateMany({ where: { tokenHash: oldTokenHash }, data: { revoked: true } })
  return createRefreshTokenForUser(userId)
}

export async function findRefreshTokenByHash(tokenHash: string) {
  return prisma.refreshToken.findUnique({ where: { tokenHash } })
}

export function setAuthCookies(res: any, accessToken: string, refreshToken: string, refreshExpiresAt: Date) {
  // res is NextResponse
  // Hardening: use SameSite=strict for access token and secure flag in production.
  res.cookies.set('access_token', accessToken, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60, // seconds
  })
  // Refresh token may be slightly longer-lived; keep strict to prevent CSRF.
  res.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    expires: refreshExpiresAt,
  })
}

export function clearAuthCookies(res: any) {
  res.cookies.delete('access_token', { path: '/' })
  res.cookies.delete('refresh_token', { path: '/' })
}

export function getAuthFromRequest(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  if (auth) {
    const parts = auth.split(' ')
    if (parts.length === 2) return verifyAccessToken(parts[1])
  }
  // fallback to cookie
  try {
    const cookieHeader = req.headers.get('cookie') || ''
    const match = cookieHeader.split(';').map(s=>s.trim()).find(s=>s.startsWith('access_token='))
    if (match) {
      const val = match.split('=')[1]
      return verifyAccessToken(val)
    }
  } catch (e) {
    // ignore
  }
  return null
}
