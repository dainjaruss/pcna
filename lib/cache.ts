import { redis } from './redis';
import { logCacheOperation } from './logger';
import { recordCacheHit, recordCacheMiss } from './metrics';

interface CacheOptions {
  ttl?: number;        // Time to live in seconds
  tags?: string[];     // Cache tags for invalidation
}

export class Cache {
  // Get cached data or compute if missing
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttl = 300 } = options; // Default 5 minutes
    const startTime = Date.now();

    try {
      // Try to get from cache first
      const cached = await redis.get(key);
      if (cached) {
        recordCacheHit();
        logCacheOperation({
          operation: 'get',
          key,
          hit: true,
          duration: Date.now() - startTime,
        });
        return JSON.parse(cached);
      }

      recordCacheMiss();

      // Fetch fresh data
      const data = await fetcher();

      // Cache the result
      await redis.setex(key, ttl, JSON.stringify(data));
      
      logCacheOperation({
        operation: 'set',
        key,
        duration: Date.now() - startTime,
      });

      return data;
    } catch (error) {
      logCacheOperation({
        operation: 'get',
        key,
        hit: false,
        duration: Date.now() - startTime,
      });
      // Fallback to direct fetch if cache fails
      return await fetcher();
    }
  }

  // Invalidate cache by key or tags
  static async invalidate(keyOrTags: string | string[]): Promise<void> {
    try {
      if (typeof keyOrTags === 'string') {
        await redis.del(keyOrTags);
        logCacheOperation({ operation: 'delete', key: keyOrTags });
      } else {
        // For tags, we'd need a more sophisticated tagging system
        // For now, just handle single keys
        for (const key of keyOrTags) {
          await redis.del(key);
          logCacheOperation({ operation: 'delete', key });
        }
      }
    } catch (error) {
      // Log silently - cache invalidation failures shouldn't break the app
    }
  }

  // Clear all cache (use sparingly)
  static async clearAll(): Promise<void> {
    try {
      await redis.flushall();
      logCacheOperation({ operation: 'invalidate', key: '*' });
    } catch (error) {
      // Log silently
    }
  }

  // Get cache stats
  static async getStats(): Promise<{
    connected: boolean;
    keys: number;
    memory: string;
  }> {
    try {
      const info = await redis.info();
      const connected = true;
      const keys = parseInt(info.match(/keys=(\d+)/)?.[1] || '0');
      const memory = info.match(/used_memory_human:(.+)/)?.[1] || 'unknown';

      return { connected, keys, memory };
    } catch (error) {
      return { connected: false, keys: 0, memory: 'unknown' };
    }
  }
}