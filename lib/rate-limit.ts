import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiting (for development)
// In production, use Redis or a proper rate limiting service
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100; // requests per window

export function rateLimit(
  request: NextRequest,
  options: { windowMs?: number; maxRequests?: number } = {}
): { success: boolean; response?: NextResponse } {
  const windowMs = options.windowMs || WINDOW_MS;
  const maxRequests = options.maxRequests || MAX_REQUESTS;

  // Get client IP
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown';

  const now = Date.now();
  const key = `${ip}`;

  const current = rateLimitMap.get(key);

  if (!current || now > current.resetTime) {
    // First request or window expired
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return { success: true };
  }

  if (current.count >= maxRequests) {
    // Rate limit exceeded
    const resetTime = new Date(current.resetTime);
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again after ${resetTime.toISOString()}`,
          retryAfter: Math.ceil((current.resetTime - now) / 1000)
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((current.resetTime - now) / 1000).toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': current.resetTime.toString()
          }
        }
      )
    };
  }

  // Increment counter
  current.count++;
  rateLimitMap.set(key, current);

  return { success: true };
}

// Stricter rate limiting for sensitive endpoints
export function strictRateLimit(request: NextRequest) {
  return rateLimit(request, { windowMs: 5 * 60 * 1000, maxRequests: 10 }); // 10 requests per 5 minutes
}

// Very strict rate limiting for auth endpoints
export function authRateLimit(request: NextRequest) {
  return rateLimit(request, { windowMs: 15 * 60 * 1000, maxRequests: 5 }); // 5 requests per 15 minutes
}