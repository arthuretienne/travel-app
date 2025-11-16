/**
 * Rate limiter pour respecter les limites Amadeus API
 *
 * Limites Amadeus (environnement test):
 * - 10 requêtes par seconde
 * - 100 requêtes par minute
 * - 1000 requêtes par heure
 */
export class RateLimiter {
  private requestTimestamps: number[] = [];
  private readonly maxPerSecond = 10;
  private readonly maxPerMinute = 100;
  private readonly maxPerHour = 1000;

  /**
   * Attend si nécessaire pour respecter les rate limits
   */
  async waitIfNeeded(): Promise<void> {
    const now = Date.now();

    // Nettoyer les vieux timestamps
    this.cleanOldTimestamps(now);

    // Vérifier les limites
    const waitTime = this.calculateWaitTime(now);

    if (waitTime > 0) {
      console.log(`[RateLimit] Waiting ${waitTime}ms to respect rate limits`);
      await this.sleep(waitTime);
    }

    // Enregistrer cette requête
    this.requestTimestamps.push(now);
  }

  /**
   * Calcule le temps d'attente nécessaire
   */
  private calculateWaitTime(now: number): number {
    const oneSecondAgo = now - 1000;
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    const lastSecond = this.requestTimestamps.filter((t) => t > oneSecondAgo);
    const lastMinute = this.requestTimestamps.filter((t) => t > oneMinuteAgo);
    const lastHour = this.requestTimestamps.filter((t) => t > oneHourAgo);

    // Vérifier limite par seconde
    if (lastSecond.length >= this.maxPerSecond) {
      const oldestInSecond = Math.min(...lastSecond);
      return oldestInSecond + 1000 - now;
    }

    // Vérifier limite par minute
    if (lastMinute.length >= this.maxPerMinute) {
      const oldestInMinute = Math.min(...lastMinute);
      return oldestInMinute + 60000 - now;
    }

    // Vérifier limite par heure
    if (lastHour.length >= this.maxPerHour) {
      const oldestInHour = Math.min(...lastHour);
      return oldestInHour + 3600000 - now;
    }

    return 0;
  }

  /**
   * Nettoie les timestamps de plus d'1 heure
   */
  private cleanOldTimestamps(now: number): void {
    const oneHourAgo = now - 3600000;
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > oneHourAgo);
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Statistiques du rate limiter
   */
  getStats(now: number = Date.now()) {
    const oneSecondAgo = now - 1000;
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    return {
      lastSecond: this.requestTimestamps.filter((t) => t > oneSecondAgo).length,
      lastMinute: this.requestTimestamps.filter((t) => t > oneMinuteAgo).length,
      lastHour: this.requestTimestamps.filter((t) => t > oneHourAgo).length,
      limits: {
        perSecond: this.maxPerSecond,
        perMinute: this.maxPerMinute,
        perHour: this.maxPerHour,
      },
    };
  }

  /**
   * Reset le rate limiter
   */
  reset(): void {
    this.requestTimestamps = [];
  }
}
