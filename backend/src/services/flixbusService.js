// backend/src/services/flixbusService.js
import cache from './cacheService.js';
import { logger } from './logger.js';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'flixbus2.p.rapidapi.com';

// Cache TTL - FlixBus schedules change less frequently
const CACHE_TTL = 3600 * 48; // 48 hours

/**
 * Search FlixBus connections between two cities
 */
export async function searchFlixBus({
  fromCity,
  toCity,
  date,
  adults = 1,
}) {
  const startTime = Date.now();

  if (!RAPIDAPI_KEY) {
    console.warn('⚠️  RAPIDAPI_KEY not set, cannot search FlixBus');
    return null;
  }

  // Generate cache key
  const cacheKey = `flixbus:${fromCity}:${toCity}:${date}:${adults}`;

  // Try cache first
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    console.log(`✅ FlixBus: Cache hit for ${fromCity} → ${toCity}`);
    return cachedData;
  }

  try {
    logger.logAmadeusAPI({
      operation: 'FlixBus - Search',
      params: {
        from: fromCity,
        to: toCity,
        date,
        adults,
      },
    });

    // Step 1: Find station IDs
    const fromStationId = await getStationId(fromCity);
    const toStationId = await getStationId(toCity);

    if (!fromStationId || !toStationId) {
      console.log(`⚠️  No FlixBus stations found for ${fromCity} → ${toCity}`);
      return null;
    }

    // Step 2: Search connections
    const url = `https://${RAPIDAPI_HOST}/search`;
    const params = new URLSearchParams({
      from_id: fromStationId,
      to_id: toStationId,
      date: formatDate(date),
      adult: adults,
      currency: 'EUR',
    });

    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    });

    if (!response.ok) {
      throw new Error(`FlixBus API error: ${response.status}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    if (!data.trips || data.trips.length === 0) {
      logger.logAmadeusAPI({
        operation: 'FlixBus - No Results',
        params: { from: fromCity, to: toCity },
        results: [],
        duration,
      });
      return null;
    }

    // Parse results
    const buses = parseFlixBusResults(data.trips, fromCity, toCity);

    logger.logAmadeusAPI({
      operation: 'FlixBus - Success',
      params: { from: fromCity, to: toCity },
      results: {
        tripCount: buses.length,
        cheapestPrice: buses.length > 0 ? Math.min(...buses.map(b => b.price.amount)) : 0,
        averageDuration: buses.length > 0
          ? buses.reduce((sum, b) => sum + b.duration, 0) / buses.length
          : 0,
      },
      duration,
    });

    // Cache results
    await cache.set(cacheKey, buses, CACHE_TTL);
    console.log(`✅ FlixBus: Cached ${buses.length} trips for ${fromCity} → ${toCity}`);

    return buses;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`FlixBus error for ${fromCity} → ${toCity}:`, error);

    logger.logAmadeusAPI({
      operation: 'FlixBus - Error',
      params: { from: fromCity, to: toCity },
      error: error.message,
      duration,
    });

    return null;
  }
}

/**
 * Get station ID from city name
 */
async function getStationId(cityName) {
  const cacheKey = `flixbus:station:${cityName.toLowerCase()}`;

  // Try cache first
  const cachedId = await cache.get(cacheKey);
  if (cachedId) {
    return cachedId;
  }

  try {
    const url = `https://${RAPIDAPI_HOST}/autocomplete/cities`;
    const params = new URLSearchParams({
      query: cityName,
      lang: 'fr',
      country: 'FR',
    });

    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get FlixBus station: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return null;
    }

    const stationId = data[0].id;

    // Cache for 30 days (station IDs don't change)
    await cache.set(cacheKey, stationId, 3600 * 24 * 30);

    return stationId;

  } catch (error) {
    console.error(`Error getting FlixBus station for ${cityName}:`, error);
    return null;
  }
}

/**
 * Parse FlixBus trip results
 */
function parseFlixBusResults(trips, fromCity, toCity) {
  return trips.map(trip => ({
    id: trip.uid,
    from: fromCity,
    to: toCity,
    departure: {
      time: trip.departure.date,
      station: trip.departure.station_name,
    },
    arrival: {
      time: trip.arrival.date,
      station: trip.arrival.station_name,
    },
    duration: calculateDuration(trip.departure.date, trip.arrival.date),
    price: {
      amount: parseFloat(trip.price.total),
      currency: trip.price.currency || 'EUR',
    },
    transfers: trip.transfers || 0,
    available: trip.available || true,
    operator: 'FlixBus',
    type: 'bus',
    amenities: trip.features || [],
    bookingUrl: trip.link || `https://www.flixbus.com`,
  }));
}

/**
 * Calculate duration in minutes
 */
function calculateDuration(departure, arrival) {
  const start = new Date(departure);
  const end = new Date(arrival);
  const diffMs = end - start;
  return Math.round(diffMs / (1000 * 60)); // minutes
}

/**
 * Format date for FlixBus API (DD.MM.YYYY)
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Check if FlixBus is available for a route
 * (Used to suggest bus as alternative to flights for short distances)
 */
export async function isFlixBusAvailable(fromCity, toCity, date) {
  const results = await searchFlixBus({ fromCity, toCity, date });
  return results && results.length > 0;
}

/**
 * Get cheapest FlixBus option
 */
export async function getCheapestFlixBus(fromCity, toCity, date) {
  const results = await searchFlixBus({ fromCity, toCity, date });

  if (!results || results.length === 0) {
    return null;
  }

  // Sort by price
  const sorted = results.sort((a, b) => a.price.amount - b.price.amount);
  return sorted[0];
}

export default {
  searchFlixBus,
  isFlixBusAvailable,
  getCheapestFlixBus,
};
