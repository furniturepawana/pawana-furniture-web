/**
 * Redis Client Configuration
 *
 * Uses Aiven Valkey (Redis-compatible) for caching.
 * Connection URL should be set in REDIS_URL environment variable.
 *
 * RESILIENCE: If Redis is unreachable or URL is wrong, caching is
 * automatically disabled and the site continues without it.
 */

import Redis from 'ioredis';

let redis = null;
let redisDisabled = false; // Flag to permanently disable after failures
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 2;

// Initialize Redis connection
function initRedis() {
  if (!process.env.REDIS_URL) {
    console.log('⚠️  REDIS_URL not set - caching disabled');
    return null;
  }

  try {
    redis = new Redis(process.env.REDIS_URL, {
      // Aiven requires TLS
      tls: {
        rejectUnauthorized: false // Aiven uses self-signed certs
      },
      // FAIL FAST settings - don't hang the site waiting for Redis
      maxRetriesPerRequest: 1,        // Only try once per request
      retryStrategy: (times) => {
        connectionAttempts++;
        if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
          console.error('❌ Redis: Max connection attempts reached - disabling cache');
          disableRedis();
          return null; // Stop retrying
        }
        return Math.min(times * 200, 1000); // Wait 200ms, 400ms, then max 1s
      },
      connectTimeout: 5000,          // 5 second connection timeout
      commandTimeout: 3000,          // 3 second command timeout
      lazyConnect: true,             // Don't block startup
      enableOfflineQueue: false,     // Don't queue commands when disconnected
    });

    redis.on('connect', () => {
      console.log('✅ Redis connected');
      connectionAttempts = 0; // Reset on successful connection
    });

    redis.on('error', (err) => {
      // Only log if not already disabled
      if (!redisDisabled) {
        console.error('❌ Redis error:', err.message);

        // Auto-disable on connection errors
        if (err.message.includes('ETIMEDOUT') ||
            err.message.includes('ECONNREFUSED') ||
            err.message.includes('ENOTFOUND')) {
          console.log('⚠️  Redis connection failed - check REDIS_URL in .env');
          disableRedis();
        }
      }
    });

    redis.on('close', () => {
      if (!redisDisabled) {
        console.log('⚠️  Redis connection closed');
      }
    });

    return redis;
  } catch (error) {
    console.error('❌ Redis init failed:', error.message);
    return null;
  }
}

// Permanently disable Redis for this session
function disableRedis() {
  if (redisDisabled) return;

  redisDisabled = true;
  if (redis) {
    redis.disconnect();
    redis = null;
  }
  console.log('⚠️  Caching disabled - site will continue without Redis');
}

// Get cached data or fetch from source
async function getOrSet(key, fetchFn, ttlSeconds = 300) {
  // If Redis not available or disabled, just fetch directly
  if (!redis || redisDisabled) {
    return await fetchFn();
  }

  try {
    // Try to get from cache with timeout
    const cached = await Promise.race([
      redis.get(key),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), 2000)
      )
    ]);

    if (cached) {
      return JSON.parse(cached);
    }

    // Not in cache - fetch from source
    const data = await fetchFn();

    // Store in cache (don't await - fire and forget)
    if (redis && !redisDisabled) {
      redis.setex(key, ttlSeconds, JSON.stringify(data)).catch(() => {});
    }

    return data;
  } catch (error) {
    // On any Redis error, fall back to direct fetch
    if (!redisDisabled) {
      console.error('Cache error:', error.message);

      // If we keep getting errors, disable Redis
      if (error.message.includes('max retries') || error.message.includes('timeout')) {
        disableRedis();
      }
    }
    return await fetchFn();
  }
}

// Invalidate cache keys by pattern
async function invalidate(pattern) {
  if (!redis || redisDisabled) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️  Invalidated ${keys.length} cache keys: ${pattern}`);
    }
  } catch (error) {
    // Silently fail - invalidation is not critical
  }
}

// Invalidate specific key
async function del(key) {
  if (!redis || redisDisabled) return;
  try {
    await redis.del(key);
  } catch (error) {
    // Silently fail
  }
}

// Get Redis client (for direct access if needed)
function getClient() {
  return redisDisabled ? null : redis;
}

// Check if Redis is currently active
function isActive() {
  return redis !== null && !redisDisabled;
}

export { initRedis, getOrSet, invalidate, del, getClient, isActive };

