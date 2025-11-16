import Amadeus from 'amadeus';
import PQueue from 'p-queue';
import { CacheStrategy } from './cache-strategy.js';

export class BatchProcessor {
  private amadeusClient: Amadeus;
  private cache: CacheStrategy;
  private queue: PQueue;

  constructor(amadeusClient: Amadeus, cache: CacheStrategy) {
    this.amadeusClient = amadeusClient;
    this.cache = cache;

    // Queue with concurrency limit to respect rate limits
    this.queue = new PQueue({
      concurrency: 5, // Max 5 requêtes simultanées
      interval: 1000, // Sur une fenêtre de 1 seconde
      intervalCap: 10, // Max 10 requêtes par seconde
    });
  }

  /**
   * Recherche optimisée pour plusieurs destinations
   * Utilise le pre-screening puis recherche détaillée uniquement sur le top
   */
  async searchMultipleDestinations(
    origin: string,
    destinations: Array<{
      code: string;
      dates: { departure: string; return?: string };
    }>,
    budget: number
  ): Promise<any[]> {
    console.log(
      `[Batch] Starting search for ${destinations.length} destinations from ${origin}`
    );

    // Étape 1: Pre-screening avec Flight Inspiration (1 seul appel API)
    const inspiration = await this.getFlightInspiration(origin, budget);

    // Filtrer les destinations qui apparaissent dans l'inspiration
    const validDestinations = destinations.filter((dest) =>
      inspiration.some((insp: any) => insp.destination === dest.code)
    );

    console.log(
      `[Batch] Pre-screening: ${validDestinations.length}/${destinations.length} destinations are within budget`
    );

    if (validDestinations.length === 0) {
      return [];
    }

    // Étape 2: Recherche détaillée sur top 3-5 destinations
    const topDestinations = validDestinations.slice(0, 5);

    // Batch les recherches avec la queue
    const results = await Promise.all(
      topDestinations.map((dest) =>
        this.queue.add(() =>
          this.searchFlightWithCache(origin, dest.code, dest.dates, budget)
        )
      )
    );

    console.log(`[Batch] Completed. API calls made: ${this.queue.size}`);

    return results.filter((r) => r !== null);
  }

  /**
   * Recherche un vol avec gestion du cache
   */
  private async searchFlightWithCache(
    origin: string,
    destination: string,
    dates: { departure: string; return?: string },
    maxPrice: number
  ): Promise<any | null> {
    const cacheKey = this.cache.generateKey('flight', {
      origin,
      destination,
      departureDate: dates.departure,
      returnDate: dates.return,
    });

    try {
      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          const params: any = {
            originLocationCode: origin,
            destinationLocationCode: destination,
            departureDate: dates.departure,
            adults: 1,
            max: 3,
          };

          if (dates.return) {
            params.returnDate = dates.return;
          }

          const response = await this.amadeusClient.shopping.flightOffersSearch.get(
            params
          );

          if (response.data && response.data.length > 0) {
            const bestOffer = response.data[0];
            const price = parseFloat(bestOffer.price.total);

            // Filter by budget
            if (price <= maxPrice) {
              return {
                success: true,
                destination,
                flight: bestOffer,
                price,
                cached: false,
              };
            }
          }

          return null;
        },
        3600 // Cache 1h
      );
    } catch (error) {
      console.error(`[Batch] Error searching flight to ${destination}:`, error);
      return {
        success: false,
        destination,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Récupère les inspirations de destinations avec cache
   */
  private async getFlightInspiration(
    origin: string,
    maxPrice: number
  ): Promise<any[]> {
    const cacheKey = this.cache.generateKey('inspiration', { origin, maxPrice });

    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        const response = await this.amadeusClient.shopping.flightDestinations.get({
          origin,
          maxPrice,
        });

        return response.data || [];
      },
      86400 // Cache 24h
    );
  }

  /**
   * Recherche d'hôtels en batch pour plusieurs villes
   */
  async searchHotelsInBatch(
    cities: Array<{
      cityCode: string;
      checkInDate: string;
      checkOutDate: string;
    }>,
    priceRange?: { min: number; max: number }
  ): Promise<any[]> {
    console.log(`[Batch] Searching hotels in ${cities.length} cities`);

    const results = await Promise.all(
      cities.map((city) =>
        this.queue.add(() => this.searchHotelWithCache(city, priceRange))
      )
    );

    return results.filter((r) => r !== null);
  }

  /**
   * Recherche un hôtel avec cache
   */
  private async searchHotelWithCache(
    city: {
      cityCode: string;
      checkInDate: string;
      checkOutDate: string;
    },
    priceRange?: { min: number; max: number }
  ): Promise<any | null> {
    const cacheKey = this.cache.generateKey('hotel', {
      cityCode: city.cityCode,
      checkInDate: city.checkInDate,
      checkOutDate: city.checkOutDate,
      priceRange,
    });

    try {
      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          const params: any = {
            cityCode: city.cityCode,
            checkInDate: city.checkInDate,
            checkOutDate: city.checkOutDate,
            adults: 1,
            radius: 5,
            radiusUnit: 'KM',
          };

          if (priceRange) {
            params.priceRange = `${priceRange.min}-${priceRange.max}`;
          }

          const response = await this.amadeusClient.shopping.hotelOffers.get(params);

          if (response.data && response.data.length > 0) {
            return {
              success: true,
              cityCode: city.cityCode,
              hotels: response.data.slice(0, 5), // Top 5
              cached: false,
            };
          }

          return null;
        },
        14400 // Cache 4h
      );
    } catch (error) {
      console.error(`[Batch] Error searching hotels in ${city.cityCode}:`, error);
      return {
        success: false,
        cityCode: city.cityCode,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Statistiques de la queue
   */
  getQueueStats() {
    return {
      size: this.queue.size,
      pending: this.queue.pending,
      isPaused: this.queue.isPaused,
    };
  }
}
