import { Cache } from '@/lib/cache';
import { redis } from '@/lib/redis';

// Mock Redis
jest.mock('@/lib/redis', () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    flushall: jest.fn().mockResolvedValue('OK'),
    info: jest.fn().mockResolvedValue('# Server\nredis_version:7.0.0\nused_memory_human:1M\nkeys=100'),
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logCacheOperation: jest.fn(),
}));

describe('Cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrSet', () => {
    it('should return cached data when available', async () => {
      const cachedData = { name: 'test', value: 123 };
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));

      const fetcher = jest.fn().mockResolvedValue({ name: 'fresh', value: 456 });
      const result = await Cache.getOrSet('test-key', fetcher);

      expect(result).toEqual(cachedData);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should fetch and cache data when not in cache', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);

      const freshData = { name: 'fresh', value: 456 };
      const fetcher = jest.fn().mockResolvedValue(freshData);
      const result = await Cache.getOrSet('test-key', fetcher);

      expect(result).toEqual(freshData);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(redis.setex).toHaveBeenCalledWith(
        'test-key',
        300,
        JSON.stringify(freshData)
      );
    });

    it('should use custom TTL', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);

      const fetcher = jest.fn().mockResolvedValue({ data: 'test' });
      await Cache.getOrSet('test-key', fetcher, { ttl: 600 });

      expect(redis.setex).toHaveBeenCalledWith(
        'test-key',
        600,
        expect.any(String)
      );
    });

    it('should fallback to fetcher on cache error', async () => {
      (redis.get as jest.Mock).mockRejectedValue(new Error('Redis connection failed'));

      const freshData = { data: 'fallback' };
      const fetcher = jest.fn().mockResolvedValue(freshData);
      const result = await Cache.getOrSet('test-key', fetcher);

      expect(result).toEqual(freshData);
      expect(fetcher).toHaveBeenCalled();
    });
  });

  describe('invalidate', () => {
    it('should delete a single key', async () => {
      await Cache.invalidate('test-key');
      expect(redis.del).toHaveBeenCalledWith('test-key');
    });

    it('should delete multiple keys', async () => {
      await Cache.invalidate(['key1', 'key2', 'key3']);
      expect(redis.del).toHaveBeenCalledTimes(3);
    });
  });

  describe('clearAll', () => {
    it('should flush all keys', async () => {
      await Cache.clearAll();
      expect(redis.flushall).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const stats = await Cache.getStats();

      expect(stats).toHaveProperty('connected');
      expect(stats).toHaveProperty('keys');
      expect(stats).toHaveProperty('memory');
    });

    it('should handle connection errors gracefully', async () => {
      (redis.info as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const stats = await Cache.getStats();

      expect(stats.connected).toBe(false);
      expect(stats.keys).toBe(0);
    });
  });
});
