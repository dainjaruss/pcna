import { redis } from './redis';

// Simple fixed-window rate limiter using Redis INCR/EXPIRE.
// key: unique key per client (e.g., ip:login)
// limit: max requests in window
// windowSec: window size in seconds
export async function allowRequest(key: string, limit = 10, windowSec = 60) {
  try {
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, windowSec)
    }
    return count <= limit
  } catch (e) {
    // On Redis error, fail-open to avoid locking out users
    console.error('rate-limiter error', e)
    return true
  }
}

export async function getRequestCount(key: string) {
  try {
    const v = await redis.get(key)
    return parseInt(v || '0', 10)
  } catch (e) {
    return 0
  }
}

export default redis
