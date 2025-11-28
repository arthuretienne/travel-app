// backend/src/services/airScraperService.js
// Air Scraper API integration for real-time flight data from Skyscanner

import axios from 'axios';
import * as cache from '../utils/cache.js';

const AIR_SCRAPER_API_KEY = process.env.AIR_SCRAPER_API_KEY;
const BASE_URL = 'https://sky-scrapper.p.rapidapi.com';

const CACHE_TTL = {
  AIRPORT_SEARCH: 10080, // 7 days (airports don't change)
  FLIGHT_SEARCH: 360,    // 6 hours (prices change often)
  PRICE_CALENDAR: 720,   // 12 hours (less volatile)
  FLIGHT_EVERYWHERE: 720, // 12 hours
};

/**
 * Search for airport by name or IATA code
 * @param {string} query - Airport name or code (e.g., "Paris", "CDG")
 * @param {string} locale - Locale (default: 'fr-FR')
 * @returns {Promise<Array>} Array of airports with skyId and entityId
 */
export async function searchAirport(query, locale = 'fr-FR') {
  const cacheKey = `airport:${query}:${locale}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchAirport`, {
      params: {
        query: query,
        locale: locale,
      },
      headers: {
        'x-rapidapi-key': AIR_SCRAPER_API_KEY,
        'x-rapidapi-host': 'sky-scrapper.p.rapidapi.com',
      },
    });

    if (response.data?.status && response.data?.data) {
      const airports = response.data.data.map(airport => ({
        skyId: airport.skyId,
        entityId: airport.entityId,
        name: airport.presentation?.title || airport.name,
        type: airport.navigation?.entityType, // CITY, AIRPORT
        iata: airport.iata,
        location: airport.location,
      }));

      // Cache for 7 days
      cache.set(cacheKey, airports, CACHE_TTL.AIRPORT_SEARCH);

      console.log(`✈️  Found ${airports.length} airports for "${query}"`);
      return airports;
    }

    console.warn(`⚠️  No airports found for "${query}"`);
    return [];

  } catch (error) {
    console.error(`❌ searchAirport failed for "${query}":`, error.response?.data?.message || error.message);
    throw new Error(`Failed to search airport: ${error.message}`);
  }
}

/**
 * Search flights between two locations
 * @param {Object} params - Flight search parameters
 * @param {string} params.originQuery - Origin city/airport name
 * @param {string} params.destinationQuery - Destination city/airport name
 * @param {string} params.date - Departure date (YYYY-MM-DD)
 * @param {number} params.adults - Number of adults (default: 1)
 * @param {string} params.cabinClass - Cabin class (economy, business, first)
 * @param {string} params.currency - Currency code (EUR, USD)
 * @param {string} params.market - Market (fr-FR, en-US)
 * @returns {Promise<Object>} Flight search results
 */
export async function searchFlights({
  originQuery,
  destinationQuery,
  date,
  adults = 1,
  cabinClass = 'economy',
  currency = 'EUR',
  market = 'fr-FR',
  countryCode = 'FR',
}) {
  const cacheKey = `flights:${originQuery}:${destinationQuery}:${date}:${adults}:${cabinClass}:${currency}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    // Step 1: Get airport IDs
    const [originAirports, destAirports] = await Promise.all([
      searchAirport(originQuery, market),
      searchAirport(destinationQuery, market),
    ]);

    if (!originAirports.length || !destAirports.length) {
      throw new Error('Could not find origin or destination airport');
    }

    // Prefer AIRPORT over CITY for better results
    const origin = originAirports.find(a => a.type === 'AIRPORT') || originAirports[0];
    const destination = destAirports.find(a => a.type === 'AIRPORT') || destAirports[0];

    console.log(`🔍 Searching flights: ${origin.name} → ${destination.name} on ${date}`);

    // Step 2: Search flights using v1 API
    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchFlights`, {
      params: {
        originSkyId: origin.skyId,
        destinationSkyId: destination.skyId,
        originEntityId: origin.entityId,
        destinationEntityId: destination.entityId,
        date: date,
        cabinClass: cabinClass,
        adults: String(adults),
        sortBy: 'best',
        currency: currency,
        market: market,
        countryCode: countryCode,
      },
      headers: {
        'x-rapidapi-key': AIR_SCRAPER_API_KEY,
        'x-rapidapi-host': 'sky-scrapper.p.rapidapi.com',
      },
    });

    if (response.data?.status && response.data?.data?.itineraries) {
      const flights = response.data.data.itineraries.map(itinerary => {
        const outboundLeg = itinerary.legs?.[0];
        const returnLeg = itinerary.legs?.[1]; // If round-trip

        return {
          id: itinerary.id,
          price: {
            amount: itinerary.price?.raw || 0,
            formatted: itinerary.price?.formatted || 'N/A',
            currency: currency,
          },
          outbound: outboundLeg ? {
            departure: outboundLeg.departure,
            arrival: outboundLeg.arrival,
            origin: outboundLeg.origin?.displayCode,
            destination: outboundLeg.destination?.displayCode,
            durationMinutes: outboundLeg.durationInMinutes,
            stops: outboundLeg.stopCount || 0,
            carriers: outboundLeg.carriers?.marketing?.map(c => ({
              id: c.id,
              name: c.name,
              logo: c.logoUrl,
            })) || [],
          } : null,
          return: returnLeg ? {
            departure: returnLeg.departure,
            arrival: returnLeg.arrival,
            origin: returnLeg.origin?.displayCode,
            destination: returnLeg.destination?.displayCode,
            durationMinutes: returnLeg.durationInMinutes,
            stops: returnLeg.stopCount || 0,
            carriers: returnLeg.carriers?.marketing?.map(c => ({
              id: c.id,
              name: c.name,
              logo: c.logoUrl,
            })) || [],
          } : null,
        };
      });

      const result = {
        origin: {
          name: origin.name,
          skyId: origin.skyId,
          iata: origin.iata,
        },
        destination: {
          name: destination.name,
          skyId: destination.skyId,
          iata: destination.iata,
        },
        date: date,
        flights: flights,
        count: flights.length,
      };

      // Cache for 6 hours
      cache.set(cacheKey, result, CACHE_TTL.FLIGHT_SEARCH);

      console.log(`✅ Found ${flights.length} flights from ${origin.name} to ${destination.name}`);
      return result;
    }

    console.warn(`⚠️  No flights found for ${originQuery} → ${destinationQuery} on ${date}`);
    return {
      origin: { name: origin.name },
      destination: { name: destination.name },
      date: date,
      flights: [],
      count: 0,
    };

  } catch (error) {
    console.error(`❌ searchFlights failed:`, error.response?.data || error.message);
    throw new Error(`Failed to search flights: ${error.message}`);
  }
}

/**
 * Get price calendar for a route (find cheapest dates)
 * @param {Object} params - Price calendar parameters
 * @param {string} params.originQuery - Origin city/airport
 * @param {string} params.destinationQuery - Destination city/airport
 * @param {number} params.year - Year (e.g., 2025)
 * @param {number} params.month - Month (1-12)
 * @param {string} params.currency - Currency code
 * @param {string} params.market - Market
 * @returns {Promise<Object>} Price calendar data
 */
export async function getPriceCalendar({
  originQuery,
  destinationQuery,
  year,
  month,
  currency = 'EUR',
  market = 'fr-FR',
}) {
  const cacheKey = `priceCalendar:${originQuery}:${destinationQuery}:${year}-${month}:${currency}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    // Get airport IDs
    const [originAirports, destAirports] = await Promise.all([
      searchAirport(originQuery, market),
      searchAirport(destinationQuery, market),
    ]);

    if (!originAirports.length || !destAirports.length) {
      throw new Error('Could not find origin or destination airport');
    }

    // Prefer AIRPORT over CITY
    const origin = originAirports.find(a => a.type === 'AIRPORT') || originAirports[0];
    const destination = destAirports.find(a => a.type === 'AIRPORT') || destAirports[0];

    const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;

    console.log(`📅 Getting price calendar: ${origin.name} → ${destination.name} for ${year}-${month}`);

    const response = await axios.get(`${BASE_URL}/api/v1/flights/getPriceCalendar`, {
      params: {
        originSkyId: origin.skyId,
        destinationSkyId: destination.skyId,
        fromDate: fromDate,
        currency: currency,
        market: market,
      },
      headers: {
        'x-rapidapi-key': AIR_SCRAPER_API_KEY,
        'x-rapidapi-host': 'sky-scrapper.p.rapidapi.com',
      },
    });

    if (response.data?.status && response.data?.data?.month?.days) {
      const days = response.data.data.month.days
        .filter(day => day.price && day.price > 0)
        .map(day => ({
          date: day.day,
          price: day.price,
        }));

      const result = {
        origin: { name: origin.name, skyId: origin.skyId },
        destination: { name: destination.name, skyId: destination.skyId },
        year: year,
        month: month,
        days: days,
        cheapestDate: days.length > 0 ? days.reduce((min, day) => day.price < min.price ? day : min) : null,
        priceRange: days.length > 0 ? {
          min: Math.min(...days.map(d => d.price)),
          max: Math.max(...days.map(d => d.price)),
          avg: Math.round(days.reduce((sum, d) => sum + d.price, 0) / days.length),
        } : null,
      };

      // Cache for 12 hours
      cache.set(cacheKey, result, CACHE_TTL.PRICE_CALENDAR);

      console.log(`✅ Price calendar: cheapest ${result.cheapestDate?.date} at €${result.cheapestDate?.price}`);
      return result;
    }

    console.warn(`⚠️  No price calendar data available`);
    return {
      origin: { name: origin.name },
      destination: { name: destination.name },
      year,
      month,
      days: [],
      cheapestDate: null,
      priceRange: null,
    };

  } catch (error) {
    console.error(`❌ getPriceCalendar failed:`, error.response?.data || error.message);
    throw new Error(`Failed to get price calendar: ${error.message}`);
  }
}

/**
 * Search flights to anywhere from origin (for "Surprise me" mode)
 * @param {Object} params - Search parameters
 * @param {string} params.originQuery - Origin city/airport
 * @param {number} params.maxPrice - Maximum price filter
 * @param {string} params.currency - Currency code
 * @param {string} params.market - Market
 * @returns {Promise<Array>} List of affordable destinations
 */
export async function searchFlightEverywhere({
  originQuery,
  maxPrice = 500,
  currency = 'EUR',
  market = 'fr-FR',
}) {
  const cacheKey = `everywhere:${originQuery}:${maxPrice}:${currency}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    // Get origin airport
    const originAirports = await searchAirport(originQuery, market);

    if (!originAirports.length) {
      throw new Error('Could not find origin airport');
    }

    // Prefer AIRPORT over CITY (or use CITY for better coverage)
    const origin = originAirports.find(a => a.type === 'CITY') || originAirports[0];

    console.log(`🌍 Searching destinations from ${origin.name} under €${maxPrice}`);

    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchFlightEverywhere`, {
      params: {
        originSkyId: origin.skyId,
        currency: currency,
        anytime: 'true',
      },
      headers: {
        'x-rapidapi-key': AIR_SCRAPER_API_KEY,
        'x-rapidapi-host': 'sky-scrapper.p.rapidapi.com',
      },
    });

    if (response.data?.status && response.data?.data?.results) {
      const destinations = response.data.data.results
        .filter(dest => dest.price?.amount && dest.price.amount <= maxPrice)
        .map(dest => ({
          name: dest.content?.location?.name || 'Unknown',
          skyId: dest.content?.location?.skyId,
          country: dest.content?.location?.country,
          price: {
            amount: dest.price.amount,
            formatted: `€${dest.price.amount}`,
            currency: currency,
          },
          image: dest.content?.image?.url,
        }))
        .sort((a, b) => a.price.amount - b.price.amount);

      // Cache for 12 hours
      cache.set(cacheKey, destinations, CACHE_TTL.FLIGHT_EVERYWHERE);

      console.log(`✅ Found ${destinations.length} destinations under €${maxPrice}`);
      return destinations;
    }

    console.warn(`⚠️  No destinations found`);
    return [];

  } catch (error) {
    console.error(`❌ searchFlightEverywhere failed:`, error.response?.data || error.message);
    throw new Error(`Failed to search destinations: ${error.message}`);
  }
}

export default {
  searchAirport,
  searchFlights,
  getPriceCalendar,
  searchFlightEverywhere,
};
