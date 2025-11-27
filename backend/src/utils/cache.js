// backend/src/utils/cache.js
// Simple in-memory cache with TTL support

class InMemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if expired/not found
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiry) {
      this.delete(key);
      return null;
    }

    console.log(`✅ Cache HIT: ${key}`);
    return item.value;
  }

  /**
   * Set value in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlMinutes - Time to live in minutes
   */
  set(key, value, ttlMinutes = 60) {
    const expiry = Date.now() + ttlMinutes * 60 * 1000;

    this.cache.set(key, {
      value,
      expiry,
      createdAt: new Date().toISOString(),
    });

    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set auto-cleanup timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttlMinutes * 60 * 1000);

    this.timers.set(key, timer);

    console.log(`💾 Cache SET: ${key} (TTL: ${ttlMinutes}min)`);
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);

    // Clear timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }

    console.log(`🗑️  Cache DELETE: ${key}`);
  }

  /**
   * Check if key exists in cache (not expired)
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    // Check if expired
    if (Date.now() > item.expiry) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache
   */
  clear() {
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();

    this.cache.clear();
    console.log('🧹 Cache CLEARED');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const entries = Array.from(this.cache.entries());
    const now = Date.now();

    const validEntries = entries.filter(([_, item]) => now <= item.expiry);
    const expiredEntries = entries.filter(([_, item]) => now > item.expiry);

    return {
      total: this.cache.size,
      valid: validEntries.length,
      expired: expiredEntries.length,
      keys: validEntries.map(([key]) => key),
    };
  }

  /**
   * Clean expired entries (manual cleanup)
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    this.cache.forEach((item, key) => {
      if (now > item.expiry) {
        this.delete(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
    }

    return cleaned;
  }
}

// Singleton instance
const cache = new InMemoryCache();

// Export helper functions
export function get(key) {
  return cache.get(key);
}

export function set(key, value, ttlMinutes = 60) {
  cache.set(key, value, ttlMinutes);
}

export function del(key) {
  cache.delete(key);
}

export function has(key) {
  return cache.has(key);
}

export function clear() {
  cache.clear();
}

export function getStats() {
  return cache.getStats();
}

export function cleanup() {
  return cache.cleanup();
}

// Run cleanup every hour
setInterval(() => {
  cache.cleanup();
}, 60 * 60 * 1000);

export default cache;
