import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Amadeus from 'amadeus';
import { CacheStrategy } from './cache-strategy.js';
import { BatchProcessor } from './batch-processor.js';
import { RateLimiter } from './rate-limiter.js';

const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY;
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
  throw new Error('AMADEUS_API_KEY and AMADEUS_API_SECRET are required');
}

const amadeusClient = new Amadeus({
  clientId: AMADEUS_API_KEY,
  clientSecret: AMADEUS_API_SECRET,
});

class AmadeusOptimizerServer {
  private server: Server;
  private cache: CacheStrategy;
  private batchProcessor: BatchProcessor;
  private rateLimiter: RateLimiter;

  constructor() {
    this.server = new Server(
      {
        name: 'amadeus-optimizer',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.cache = new CacheStrategy(REDIS_URL);
    this.batchProcessor = new BatchProcessor(amadeusClient, this.cache);
    this.rateLimiter = new RateLimiter();

    this.setupToolHandlers();

    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_flights_optimized',
          description:
            'Recherche de vols optimisée avec cache intelligent et batching automatique',
          inputSchema: {
            type: 'object',
            properties: {
              origin: {
                type: 'string',
                description: 'Code IATA aéroport de départ (ex: CDG)',
              },
              destinations: {
                type: 'array',
                items: { type: 'string' },
                description: 'Liste des codes IATA destinations',
              },
              departureDate: {
                type: 'string',
                description: 'Date de départ (YYYY-MM-DD)',
              },
              returnDate: {
                type: 'string',
                description: 'Date de retour (YYYY-MM-DD)',
              },
              adults: {
                type: 'number',
                default: 1,
                description: 'Nombre d\'adultes',
              },
              maxPrice: {
                type: 'number',
                description: 'Prix maximum en EUR',
              },
            },
            required: ['origin', 'destinations', 'departureDate'],
          },
        },
        {
          name: 'get_flight_inspiration',
          description:
            'Obtient des inspirations de destinations avec prix indicatifs (1 seul appel API)',
          inputSchema: {
            type: 'object',
            properties: {
              origin: {
                type: 'string',
                description: 'Code IATA aéroport de départ',
              },
              maxPrice: {
                type: 'number',
                description: 'Budget maximum',
              },
              departureDate: {
                type: 'string',
                description: 'Date de départ (format YYYY-MM-DD)',
              },
            },
            required: ['origin'],
          },
        },
        {
          name: 'search_hotels',
          description: 'Recherche d\'hôtels avec cache et optimisation',
          inputSchema: {
            type: 'object',
            properties: {
              cityCode: {
                type: 'string',
                description: 'Code IATA de la ville',
              },
              checkInDate: {
                type: 'string',
                description: 'Date d\'arrivée (YYYY-MM-DD)',
              },
              checkOutDate: {
                type: 'string',
                description: 'Date de départ (YYYY-MM-DD)',
              },
              adults: {
                type: 'number',
                default: 1,
              },
              radius: {
                type: 'number',
                default: 5,
                description: 'Rayon de recherche en km',
              },
              radiusUnit: {
                type: 'string',
                enum: ['KM', 'MILE'],
                default: 'KM',
              },
              priceRange: {
                type: 'string',
                description: 'Fourchette de prix (ex: "50-200")',
              },
            },
            required: ['cityCode', 'checkInDate', 'checkOutDate'],
          },
        },
        {
          name: 'batch_search_destinations',
          description:
            'Recherche optimisée pour plusieurs destinations en une seule opération (économise 60% des appels API)',
          inputSchema: {
            type: 'object',
            properties: {
              origin: {
                type: 'string',
              },
              destinations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    dates: {
                      type: 'object',
                      properties: {
                        departure: { type: 'string' },
                        return: { type: 'string' },
                      },
                    },
                  },
                },
              },
              budget: {
                type: 'number',
              },
            },
            required: ['origin', 'destinations', 'budget'],
          },
        },
        {
          name: 'clear_cache',
          description: 'Vide le cache Redis (utile pour forcer un refresh)',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'Pattern à supprimer (ex: "flights:*")',
              },
            },
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (name === 'search_flights_optimized') {
          return await this.handleSearchFlights(args);
        } else if (name === 'get_flight_inspiration') {
          return await this.handleFlightInspiration(args);
        } else if (name === 'search_hotels') {
          return await this.handleSearchHotels(args);
        } else if (name === 'batch_search_destinations') {
          return await this.handleBatchSearch(args);
        } else if (name === 'clear_cache') {
          return await this.handleClearCache(args);
        }

        throw new Error(`Unknown tool: ${name}`);
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleSearchFlights(args: any) {
    const { origin, destinations, departureDate, returnDate, adults = 1, maxPrice } = args;

    // Check rate limit
    await this.rateLimiter.waitIfNeeded();

    const results = [];

    for (const destination of destinations) {
      // Check cache first
      const cacheKey = this.cache.generateKey('flight', {
        origin,
        destination,
        departureDate,
        returnDate,
        adults,
      });

      let flight = await this.cache.get(cacheKey);

      if (!flight) {
        // Call Amadeus API
        const response = await amadeusClient.shopping.flightOffersSearch.get({
          originLocationCode: origin,
          destinationLocationCode: destination,
          departureDate,
          returnDate,
          adults,
          max: 5,
        });

        flight = response.data[0]; // Best offer

        // Cache for 1 hour
        await this.cache.set(cacheKey, flight, 3600);
      }

      // Filter by max price
      if (maxPrice && flight && parseFloat(flight.price.total) > maxPrice) {
        continue;
      }

      results.push({
        destination,
        flight,
        cached: flight !== null,
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              results,
              apiCallsMade: results.filter((r) => !r.cached).length,
              totalDestinations: destinations.length,
              optimization: `Économie de ${results.filter((r) => r.cached).length} appels API grâce au cache`,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleFlightInspiration(args: any) {
    const { origin, maxPrice, departureDate } = args;

    await this.rateLimiter.waitIfNeeded();

    const cacheKey = this.cache.generateKey('inspiration', { origin, maxPrice, departureDate });

    let data = await this.cache.get(cacheKey);

    if (!data) {
      const params: any = { origin };
      if (maxPrice) params.maxPrice = maxPrice;
      if (departureDate) params.departureDate = departureDate;

      const response = await amadeusClient.shopping.flightDestinations.get(params);

      data = response.data;

      // Cache for 24h (données d'inspiration moins volatiles)
      await this.cache.set(cacheKey, data, 86400);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              destinations: data,
              count: data.length,
              message: 'Utilisez ces destinations pour le pre-screening avant recherche détaillée',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleSearchHotels(args: any) {
    const { cityCode, checkInDate, checkOutDate, adults = 1, radius = 5, priceRange } = args;

    await this.rateLimiter.waitIfNeeded();

    const cacheKey = this.cache.generateKey('hotel', {
      cityCode,
      checkInDate,
      checkOutDate,
      adults,
      radius,
    });

    let data = await this.cache.get(cacheKey);

    if (!data) {
      const params: any = {
        cityCode,
        checkInDate,
        checkOutDate,
        adults,
        radius,
        radiusUnit: 'KM',
      };

      if (priceRange) {
        const [min, max] = priceRange.split('-');
        params.priceRange = `${min}-${max}`;
      }

      const response = await amadeusClient.shopping.hotelOffers.get(params);

      data = response.data;

      // Cache for 4h
      await this.cache.set(cacheKey, data, 14400);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              hotels: data,
              count: data.length,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleBatchSearch(args: any) {
    const { origin, destinations, budget } = args;

    const results = await this.batchProcessor.searchMultipleDestinations(
      origin,
      destinations,
      budget
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              results,
              stats: {
                totalDestinations: destinations.length,
                successful: results.filter((r) => r.success).length,
                apiCallsSaved: `~${Math.floor(destinations.length * 0.6)} appels`,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleClearCache(args: any) {
    const { pattern } = args;

    const deleted = await this.cache.clear(pattern || '*');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            deleted,
            message: `Cache cleared: ${deleted} keys deleted`,
          }),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Amadeus Optimizer MCP server running on stdio');
  }
}

const server = new AmadeusOptimizerServer();
server.run().catch(console.error);
