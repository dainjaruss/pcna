import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { getRequestMetrics, getCacheMetrics } from '@/lib/metrics';
import os from 'os';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get metrics
    const requestMetrics = getRequestMetrics();
    const cacheMetrics = getCacheMetrics();

    // Calculate response time stats
    const responseTimes = requestMetrics.responseTimes.slice(-100);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
    const minResponseTime = responseTimes.length > 0
      ? Math.min(...responseTimes)
      : 0;
    const maxResponseTime = responseTimes.length > 0
      ? Math.max(...responseTimes)
      : 0;

    // Calculate cache hit rate
    const totalCacheRequests = cacheMetrics.hits + cacheMetrics.misses;
    const cacheHitRate = totalCacheRequests > 0
      ? (cacheMetrics.hits / totalCacheRequests) * 100
      : 0;

    // Get system info
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryPercentage = (usedMemory / totalMemory) * 100;

    const cpuUsage = os.loadavg()[0] * 100 / os.cpus().length;

    const uptimeSeconds = process.uptime();
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptime = days > 0 
      ? `${days}d ${hours}h ${minutes}m`
      : hours > 0 
        ? `${hours}h ${minutes}m`
        : `${minutes}m`;

    return NextResponse.json({
      responseTime: {
        avg: Math.round(avgResponseTime),
        min: Math.round(minResponseTime),
        max: Math.round(maxResponseTime),
      },
      requests: {
        total: requestMetrics.total,
        success: requestMetrics.success,
        errors: requestMetrics.errors,
      },
      cache: {
        hits: cacheMetrics.hits,
        misses: cacheMetrics.misses,
        hitRate: cacheHitRate,
      },
      system: {
        memory: {
          used: formatBytes(usedMemory),
          total: formatBytes(totalMemory),
          percentage: Math.round(memoryPercentage),
        },
        cpu: Math.min(Math.round(cpuUsage), 100),
        uptime,
      },
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}
