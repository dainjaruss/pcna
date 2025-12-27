import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { Cache } from '@/lib/cache'
import { logger } from '@/lib/logger'

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  db: 'ok' | 'error';
  redis: 'ok' | 'error' | 'unknown';
  cache?: {
    connected: boolean;
    keys: number;
    memory: string;
  };
  uptime: number;
  timestamp: string;
  version: string;
}

const startTime = Date.now();

export async function GET() {
  const health: HealthStatus = {
    status: 'ok',
    db: 'ok',
    redis: 'unknown',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  };

  try {
    // Database check
    await prisma.$queryRaw`SELECT 1`;
    health.db = 'ok';
  } catch (e) {
    health.db = 'error';
    health.status = 'degraded';
    logger.error('Health check: Database unavailable', { error: e instanceof Error ? e.message : String(e) });
  }

  try {
    // Redis check
    await redis.ping();
    health.redis = 'ok';
    
    // Get cache stats
    health.cache = await Cache.getStats();
  } catch (e) {
    health.redis = 'error';
    // Redis being down is not critical - cache can be bypassed
    if (health.status === 'ok') {
      health.status = 'degraded';
    }
    logger.warn('Health check: Redis unavailable', { error: e instanceof Error ? e.message : String(e) });
  }

  const statusCode = health.status === 'error' ? 503 : (health.status === 'degraded' ? 200 : 200);
  
  return NextResponse.json(health, { status: statusCode });
}
