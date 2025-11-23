// backend/src/services/googleFlightsService.js
// Google Flights API - BACKUP ONLY (150 req/month)
import cache from './cacheService.js';
import { logger } from './logger.js';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'google-flights2.p.rapidapi.com';

// Cache TTL - Longer cache for backup API
const CACHE_TTL = 3600 * 24; // 24 hours

/**
 * Search flights using Google Flights (BACKUP ONLY - use when Amadeus fails)
 */
export async function searchGoogleFlights({
  departureId,
  arrivalId,
  departureDate,
  returnDate = null,
  adults = 1,
  travelClass = 'ECONOMY',
}) {
  const startTime = Date.now();

  if (!RAPIDAPI_KEY) {
    console.warn('⚠️  RAPIDAPI_KEY not set, cannot search Google Flights');
    return null;
  }

  // Generate cache key
  const cacheKey = `google_flights:${departureId}:${arrivalId}:${departureDate}:${returnDate}:${adults}`;

  // Try cache first
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    console.log(`✅ Google Flights: Cache hit for ${departureId} → ${arrivalId}`);
    return cachedData;
  }

  try {
    console.log(`🔥 USING GOOGLE FLIGHTS BACKUP API (quota: 150/month)`);

    logger.logAmadeusAPI({
      operation: 'Google Flights - Backup Search',
      params: {
        from: departureId,
        to: arrivalId,
        departure: departureDate,
        return: returnDate,
        adults,
      },
    });

    const url = `https://${RAPIDAPI_HOST}/api/v1/searchFlights`;
    const params = new URLSearchParams({
      departure_id: departureId,
      arrival_id: arrivalId,
      outbound_date: departureDate,
      ...(returnDate && { return_date: returnDate }),
      adults: adults.toString(),
      travel_class: travelClass,
      currency: 'EUR',
      language_code: 'fr-FR',
      country_code: 'FR',
      search_type: 'best',
    });

    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    });

    if (!response.ok) {
      throw new Error(`Google Flights API error: ${response.status}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    if (!data.data || !data.data.flights || data.data.flights.length === 0) {
      logger.logAmadeusAPI({
        operation: 'Google Flights - No Results',
        params: { from: departureId, to: arrivalId },
        results: [],
        duration,
      });
      return null;
    }

    // Parse results
    const flights = parseGoogleFlights(data.data.flights);

    logger.logAmadeusAPI({
      operation: 'Google Flights - Success (BACKUP)',
      params: { from: departureId, to: arrivalId },
      results: {
        flightCount: flights.length,
        cheapestPrice: flights.length > 0 ? Math.min(...flights.map(f => f.price)) : 0,
      },
      duration,
    });

    // Cache for longer (backup API)
    await cache.set(cacheKey, flights, CACHE_TTL);
    console.log(`✅ Google Flights: Cached ${flights.length} flights (BACKUP)`);

    return flights;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Google Flights error for ${departureId} → ${arrivalId}:`, error);

    logger.logAmadeusAPI({
      operation: 'Google Flights - Error',
      params: { from: departureId, to: arrivalId },
      error: error.message,
      duration,
    });

    return null;
  }
}

/**
 * Parse Google Flights results to match our format
 */
function parseGoogleFlights(flights) {
  return flights.map(flight => ({
    price: parseFloat(flight.price),
    currency: flight.currency || 'EUR',
    segments: flight.segments?.map(seg => ({
      departure: seg.departure_airport?.code,
      arrival: seg.arrival_airport?.code,
      departureTime: seg.departure_time,
      arrivalTime: seg.arrival_time,
      carrier: seg.airline?.code,
      flightNumber: seg.flight_number,
      duration: seg.duration,
    })) || [],
    totalDuration: flight.total_duration,
    validatingAirline: flight.airline_logo?.name || 'Multiple',
    cabinClass: flight.travel_class || 'ECONOMY',
    source: 'google_flights_backup',
  }));
}

/**
 * Convert IATA airport code to Google Flights ID
 * (Google uses airport codes directly for most cases)
 */
export function iataToGoogleId(iataCode) {
  // Google Flights uses airport codes directly
  return iataCode;
}

export default {
  searchGoogleFlights,
  iataToGoogleId,
};
