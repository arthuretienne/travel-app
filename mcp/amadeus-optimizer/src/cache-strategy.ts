import Redis from 'ioredis';
import crypto from 'crypto';

export class CacheStrategy {
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
  }

  /**
   * Génère une clé de cache unique basée sur les paramètres
   */
  generateKey(type: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, any>);

    const paramsString = JSON.stringify(sortedParams);
    const hash = crypto.createHash('md5').update(paramsString).digest('hex');

    return `amadeus:${type}:${hash}`;
  }

  /**
   * Récupère une valeur depuis le cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      return JSON.parse(data) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Stocke une valeur dans le cache avec TTL adaptatif
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const finalTTL = ttl || this.getAdaptiveTTL(key);
      await this.redis.setex(key, finalTTL, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * TTL adaptatif selon le type de données
   */
  private getAdaptiveTTL(key: string): number {
    if (key.includes(':inspiration:')) {
      return 24 * 3600; // 24h pour les inspirations
    } else if (key.includes(':hotel:')) {
      return 4 * 3600; // 4h pour les hôtels
    } else if (key.includes(':flight:')) {
      return 1 * 3600; // 1h pour les vols
    }
    return 3600; // 1h par défaut
  }

  /**
   * Vérifie si une clé existe
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Supprime une ou plusieurs clés
   */
  async delete(key: string | string[]): Promise<number> {
    try {
      if (Array.isArray(key)) {
        return await this.redis.del(...key);
      }
      return await this.redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
      return 0;
    }
  }

  /**
   * Vide le cache selon un pattern
   */
  async clear(pattern: string = '*'): Promise<number> {
    try {
      const keys = await this.redis.keys(`amadeus:${pattern}`);
      if (keys.length === 0) return 0;

      return await this.redis.del(...keys);
    } catch (error) {
      console.error('Cache clear error:', error);
      return 0;
    }
  }

  /**
   * Récupère des statistiques sur le cache
   */
  async getStats(): Promise<{
    totalKeys: number;
    flightKeys: number;
    hotelKeys: number;
    inspirationKeys: number;
    memoryUsage: string;
  }> {
    try {
      const allKeys = await this.redis.keys('amadeus:*');
      const flightKeys = allKeys.filter((k) => k.includes(':flight:'));
      const hotelKeys = allKeys.filter((k) => k.includes(':hotel:'));
      const inspirationKeys = allKeys.filter((k) => k.includes(':inspiration:'));

      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      return {
        totalKeys: allKeys.length,
        flightKeys: flightKeys.length,
        hotelKeys: hotelKeys.length,
        inspirationKeys: inspirationKeys.length,
        memoryUsage,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        totalKeys: 0,
        flightKeys: 0,
        hotelKeys: 0,
        inspirationKeys: 0,
        memoryUsage: 'error',
      };
    }
  }

  /**
   * Récupère une valeur du cache, ou l'exécute et la met en cache
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute factory
    const value = await factory();

    // Cache result
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Ferme la connexion Redis
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}
