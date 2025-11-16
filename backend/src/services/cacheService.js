// backend/src/services/cacheService.js
// Upstash Redis REST API client

class UpstashCache {
  constructor() {
    this.restUrl = process.env.UPSTASH_REDIS_REST_URL;
    this.restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!this.restUrl || !this.restToken) {
      console.warn('⚠️  Upstash Redis credentials not configured - cache disabled');
      this.enabled = false;
    } else {
      this.enabled = true;
      console.log('✅ Upstash cache service initialized');
    }
  }

  /**
   * Execute a Redis command via REST API
   */
  async execute(command) {
    if (!this.enabled) return null;

    try {
      const response = await fetch(`${this.restUrl}/${command.join('/')}`, {
        headers: {
          Authorization: `Bearer ${this.restToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Upstash error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Upstash cache error:', error.message);
      return null;
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    const result = await this.execute(['GET', key]);
    if (!result) return null;

    try {
      return JSON.parse(result);
    } catch {
      return result;
    }
  }

  /**
   * Set value in cache with optional TTL (in seconds)
   */
  async set(key, value, ttl = null) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    if (ttl) {
      return await this.execute(['SETEX', key, ttl.toString(), stringValue]);
    } else {
      return await this.execute(['SET', key, stringValue]);
    }
  }

  /**
   * Delete key from cache
   */
  async del(key) {
    return await this.execute(['DEL', key]);
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    const result = await this.execute(['EXISTS', key]);
    return result === 1;
  }

  /**
   * Set expiration on existing key (in seconds)
   */
  async expire(key, ttl) {
    return await this.execute(['EXPIRE', key, ttl.toString()]);
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key) {
    return await this.execute(['TTL', key]);
  }

  /**
   * Increment a value
   */
  async incr(key) {
    return await this.execute(['INCR', key]);
  }

  /**
   * Get multiple keys
   */
  async mget(...keys) {
    const result = await this.execute(['MGET', ...keys]);
    if (!result) return [];

    return result.map(item => {
      if (!item) return null;
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    });
  }

  /**
   * Delete multiple keys
   */
  async mdel(...keys) {
    if (keys.length === 0) return 0;
    return await this.execute(['DEL', ...keys]);
  }
}

// Export singleton instance
const cache = new UpstashCache();
export default cache;
