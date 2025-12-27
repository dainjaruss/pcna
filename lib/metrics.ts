// Performance metrics utility
// In production, use Redis or a time-series database for persistence

interface RequestMetrics {
  total: number;
  success: number;
  errors: number;
  responseTimes: number[];
}

interface CacheMetrics {
  hits: number;
  misses: number;
}

const requestMetrics: RequestMetrics = {
  total: 0,
  success: 0,
  errors: 0,
  responseTimes: [],
};

const cacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
};

export function getRequestMetrics(): RequestMetrics {
  return { ...requestMetrics };
}

export function getCacheMetrics(): CacheMetrics {
  return { ...cacheMetrics };
}

export function recordRequest(responseTime: number, isSuccess: boolean): void {
  requestMetrics.total++;
  if (isSuccess) {
    requestMetrics.success++;
  } else {
    requestMetrics.errors++;
  }
  requestMetrics.responseTimes.push(responseTime);
  
  // Keep only last 1000 response times
  if (requestMetrics.responseTimes.length > 1000) {
    requestMetrics.responseTimes = requestMetrics.responseTimes.slice(-1000);
  }
}

export function recordCacheHit(): void {
  cacheMetrics.hits++;
}

export function recordCacheMiss(): void {
  cacheMetrics.misses++;
}

export function resetMetrics(): void {
  requestMetrics.total = 0;
  requestMetrics.success = 0;
  requestMetrics.errors = 0;
  requestMetrics.responseTimes = [];
  cacheMetrics.hits = 0;
  cacheMetrics.misses = 0;
}
