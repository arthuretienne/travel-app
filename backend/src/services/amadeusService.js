// backend/src/services/amadeusService.js
import Amadeus from 'amadeus';
import cache from './cacheService.js';

// NOTE: dotenv est déjà chargé dans server.js
// Les variables d'environnement sont disponibles via process.env

console.log('Amadeus credentials:', {
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

let amadeus;
try {
  // Support both AMADEUS_CLIENT_ID and AMADEUS_API_KEY (for backwards compatibility)
  amadeus = new Amadeus({
    clientId: process.env.AMADEUS_CLIENT_ID || process.env.AMADEUS_API_KEY,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET || process.env.AMADEUS_API_SECRET,
    hostname: 'test' // Use 'production' when ready
  });
  console.log('✅ Amadeus client initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Amadeus client:', error.message);
  // Client will be undefined, but server should still start
}

// Cache TTL constants
const CACHE_TTL = {
  FLIGHT_DESTINATIONS: 3600 * 24, // 24 hours
  FLIGHT_OFFERS: 3600 * 2,        // 2 hours
};

// Pre-screening: Check which destinations have flights within budget
export async function preScreenDestinations(destinations, originCity, userBudget) {
  if (!amadeus) {
    console.warn('Amadeus client not initialized, skipping pre-screening');
    return destinations.slice(0, 5);
  }

  // Generate cache key
  const cacheKey = `flight_destinations:${originCity}:${Math.floor(userBudget * 0.5)}`;

  // Try cache first
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    console.log('✅ Pre-screening: Cache hit for', originCity);
    const availableDestinations = cachedData;
    const filtered = destinations.filter(dest =>
      availableDestinations.includes(dest.iataCode)
    );
    return filtered.slice(0, 5);
  }

  console.log('🔍 Pre-screening destinations with Flight Inspiration API...');

  try {
    // Flight Inspiration API - broad search
    const response = await amadeus.shopping.flightDestinations.get({
      origin: originCity,
      maxPrice: Math.floor(userBudget * 0.5), // Allocate 50% to flights
      oneWay: false
    });

    const availableDestinations = response.data.map(d => d.destination);

    // Cache the result
    await cache.set(cacheKey, availableDestinations, CACHE_TTL.FLIGHT_DESTINATIONS);
    console.log('✅ Pre-screening: Cached destinations for', originCity);

    // Filter Claude's destinations by availability
    const filtered = destinations.filter(dest =>
      availableDestinations.includes(dest.iataCode)
    );

    console.log(`✅ Pre-screening: ${filtered.length}/${destinations.length} destinations have flights`);
    return filtered.slice(0, 5); // Keep top 5
  } catch (error) {
    console.error('Amadeus pre-screening error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
      description: error.description
    });
    // Fallback: return top 5 by AI score if API fails
    return destinations.slice(0, 5);
  }
}

// Detailed search for top destinations
export async function searchFlightOffers(destination, slot, originCity) {
  if (!amadeus) {
    console.warn('Amadeus client not initialized, cannot search flights');
    return null;
  }

  // Generate cache key
  const cacheKey = `flight_offer:${originCity}:${destination.iataCode}:${slot.startDate}:${slot.endDate}`;

  // Try cache first
  const cachedOffer = await cache.get(cacheKey);
  if (cachedOffer) {
    console.log(`✅ Flight offer: Cache hit for ${destination.city}`);
    return cachedOffer;
  }

  try {
    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: originCity,
      destinationLocationCode: destination.iataCode,
      departureDate: slot.startDate,
      returnDate: slot.endDate,
      adults: 1,
      currencyCode: 'EUR',
      max: 3 // Get top 3 offers
    });

    if (!response.data || response.data.length === 0) {
      return null;
    }

    const bestOffer = response.data[0];
    const flightData = {
      price: parseFloat(bestOffer.price.total),
      currency: bestOffer.price.currency,
      segments: bestOffer.itineraries[0].segments.map(seg => ({
        departure: seg.departure.iataCode,
        arrival: seg.arrival.iataCode,
        departureTime: seg.departure.at,
        arrivalTime: seg.arrival.at,
        carrier: seg.carrierCode,
        flightNumber: seg.number,
        duration: seg.duration
      })),
      totalDuration: bestOffer.itineraries[0].duration,
      validatingAirline: bestOffer.validatingAirlineCodes[0]
    };

    // Cache the result
    await cache.set(cacheKey, flightData, CACHE_TTL.FLIGHT_OFFERS);
    console.log(`✅ Flight offer: Cached for ${destination.city}`);

    return flightData;
  } catch (error) {
    console.error(`Flight search error for ${destination.city}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
      description: error.description,
      iataCode: destination.iataCode
    });
    return null;
  }
}

// Estimate hotel cost (simplified - you can add Amadeus Hotel API later)
export function estimateHotelCost(destination, slot, style) {
  const nights = slot.duration - 1; // nights = days - 1
  
  const baseRates = {
    backpacker: 30,
    confort: 80,
    aventure: 50,
    luxe: 200
  };

  const priceMultipliers = {
    1: 2.0,   // Very expensive (Tokyo, NYC)
    2: 1.8,
    3: 1.6,
    4: 1.4,
    5: 1.2,
    6: 1.0,   // Average
    7: 0.85,
    8: 0.7,
    9: 0.6,
    10: 0.5   // Very cheap
  };

  const baseRate = baseRates[style] || 80;
  const multiplier = priceMultipliers[destination.popularityScore] || 1.0;
  
  return Math.round(baseRate * multiplier * nights);
}