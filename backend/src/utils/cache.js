// backend/src/utils/cache.js
// Cache with Upstash Redis (production) or in-memory fallback (development)

import { Redis } from '@upstash/redis';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = !!(REDIS_URL && REDIS_TOKEN);

let redis = null;
if (useRedis) {
  try {
    redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
    console.log('✅ Cache: Upstash Redis connected');
  } catch (err) {
    console.warn('⚠️ Cache: Redis init failed, falling back to in-memory:', err.message);
  }
}

if (!redis) {
  console.log('ℹ️ Cache: Using in-memory (set UPSTASH_REDIS_REST_URL + TOKEN for Redis)');
}

// ============================================
// In-memory fallback
// ============================================
const memCache = new Map();

function memGet(key) {
  const item = memCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    memCache.delete(key);
    return null;
  }
  return item.value;
}

function memSet(key, value, ttlSeconds) {
  memCache.set(key, {
    value,
    expiry: Date.now() + ttlSeconds * 1000,
  });
}

function memDel(key) {
  memCache.delete(key);
}

function memHas(key) {
  const item = memCache.get(key);
  if (!item) return false;
  if (Date.now() > item.expiry) {
    memCache.delete(key);
    return false;
  }
  return true;
}

function memClear() {
  memCache.clear();
}

function memGetStats() {
  const now = Date.now();
  let valid = 0;
  let expired = 0;
  memCache.forEach((item) => {
    if (now <= item.expiry) valid++;
    else expired++;
  });
  return { total: memCache.size, valid, expired, backend: 'memory' };
}

// Cleanup expired in-memory entries every hour
setInterval(() => {
  const now = Date.now();
  memCache.forEach((item, key) => {
    if (now > item.expiry) memCache.delete(key);
  });
}, 60 * 60 * 1000);

// ============================================
// Unified cache API
// ============================================

/**
 * Get value from cache
 * @param {string} key
 * @returns {Promise<any|null>|any|null}
 */
export function get(key) {
  if (redis) {
    return redis.get(key).then(val => {
      if (val !== null && val !== undefined) {
        console.log(`✅ Cache HIT (Redis): ${key}`);
      }
      return val;
    }).catch(err => {
      console.warn(`⚠️ Redis GET error for ${key}:`, err.message);
      return memGet(key);
    });
  }
  const val = memGet(key);
  if (val !== null) console.log(`✅ Cache HIT (mem): ${key}`);
  return val;
}

/**
 * Set value in cache with TTL
 * @param {string} key
 * @param {any} value
 * @param {number} ttlMinutes - Time to live in minutes
 */
export function set(key, value, ttlMinutes = 60) {
  const ttlSeconds = Math.round(ttlMinutes * 60);
  if (redis) {
    redis.set(key, value, { ex: ttlSeconds }).then(() => {
      console.log(`💾 Cache SET (Redis): ${key} (TTL: ${ttlMinutes}min)`);
    }).catch(err => {
      console.warn(`⚠️ Redis SET error for ${key}:`, err.message);
      memSet(key, value, ttlSeconds);
    });
  } else {
    memSet(key, value, ttlSeconds);
    console.log(`💾 Cache SET (mem): ${key} (TTL: ${ttlMinutes}min)`);
  }
}

/**
 * Delete value from cache
 * @param {string} key
 */
export function del(key) {
  if (redis) {
    redis.del(key).catch(err => {
      console.warn(`⚠️ Redis DEL error for ${key}:`, err.message);
    });
  }
  memDel(key);
}

/**
 * Check if key exists in cache
 * @param {string} key
 * @returns {Promise<boolean>|boolean}
 */
export function has(key) {
  if (redis) {
    return redis.exists(key).then(exists => exists > 0).catch(() => memHas(key));
  }
  return memHas(key);
}

/**
 * Clear all cache
 */
export function clear() {
  if (redis) {
    redis.flushdb().catch(err => {
      console.warn('⚠️ Redis FLUSH error:', err.message);
    });
  }
  memClear();
  console.log('🧹 Cache CLEARED');
}

/**
 * Get cache statistics
 */
export function getStats() {
  if (redis) {
    return redis.dbsize().then(size => ({
      total: size,
      backend: 'redis',
    })).catch(() => memGetStats());
  }
  return memGetStats();
}

/**
 * Cleanup (no-op for Redis since it handles TTL natively)
 */
export function cleanup() {
  if (!redis) {
    const now = Date.now();
    let cleaned = 0;
    memCache.forEach((item, key) => {
      if (now > item.expiry) {
        memCache.delete(key);
        cleaned++;
      }
    });
    if (cleaned > 0) console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
    return cleaned;
  }
  return 0;
}

// Default export for backward compatibility
export default { get, set, del, has, clear, getStats, cleanup };
