// backend/src/services/amadeusService.js
import Amadeus from 'amadeus';
import cache from './cacheService.js';
import { calculateRealHotelCost } from '../data/realHotelPrices.js';
import { logger } from './logger.js';

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

// Cache TTL constants - Optimized to reduce API calls drastically
const CACHE_TTL = {
  FLIGHT_DESTINATIONS: 3600 * 24 * 7, // 7 days (flight routes don't change often)
  FLIGHT_OFFERS: 3600 * 12,           // 12 hours (prices stable within day)
  HOTELS: 3600 * 24 * 3,              // 3 days (hotel availability relatively stable)
};

// Pre-screening: Check which destinations have flights within budget
export async function preScreenDestinations(destinations, originCity, userBudget) {
  const startTime = Date.now();

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
    logger.logAmadeusAPI({
      operation: 'Flight Inspiration - Pre-screening',
      params: {
        origin: originCity,
        maxPrice: Math.floor(userBudget * 0.5),
        oneWay: false,
        destinationsToCheck: destinations.length
      },
    });

    // Flight Inspiration API - broad search
    const response = await amadeus.shopping.flightDestinations.get({
      origin: originCity,
      maxPrice: Math.floor(userBudget * 0.5), // Allocate 50% to flights
      oneWay: false
    });

    const duration = Date.now() - startTime;
    const availableDestinations = response.data.map(d => d.destination);

    logger.logAmadeusAPI({
      operation: 'Flight Inspiration - Success',
      params: { origin: originCity },
      results: availableDestinations,
      duration,
    });

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
    const duration = Date.now() - startTime;
    console.error('Amadeus pre-screening error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
      description: error.description
    });

    logger.logAmadeusAPI({
      operation: 'Flight Inspiration - Error',
      params: { origin: originCity },
      error: error.message,
      duration,
    });

    // Fallback: return top 5 by AI score if API fails
    return destinations.slice(0, 5);
  }
}

// Detailed search for top destinations
export async function searchFlightOffers(destination, slot, originCity) {
  const startTime = Date.now();

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
    logger.logAmadeusAPI({
      operation: 'Flight Offers Search',
      params: {
        origin: originCity,
        destination: destination.iataCode,
        destinationCity: destination.city,
        departureDate: slot.startDate,
        returnDate: slot.endDate,
        adults: 1,
        max: 3
      },
    });

    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: originCity,
      destinationLocationCode: destination.iataCode,
      departureDate: slot.startDate,
      returnDate: slot.endDate,
      adults: 1,
      currencyCode: 'EUR',
      max: 3 // Get top 3 offers
    });

    const duration = Date.now() - startTime;

    if (!response.data || response.data.length === 0) {
      logger.logAmadeusAPI({
        operation: 'Flight Offers - No Results',
        params: { destination: destination.city },
        results: [],
        duration,
      });
      return null;
    }

    const bestOffer = response.data[0];

    // Extract outbound flight (first itinerary)
    const outboundSegments = bestOffer.itineraries[0].segments.map(seg => ({
      departure: seg.departure.iataCode,
      arrival: seg.arrival.iataCode,
      departureTime: seg.departure.at,
      arrivalTime: seg.arrival.at,
      carrier: seg.carrierCode,
      flightNumber: seg.number,
      duration: seg.duration,
      aircraft: seg.aircraft?.code
    }));

    // Extract return flight (second itinerary if exists)
    const returnSegments = bestOffer.itineraries[1] ? bestOffer.itineraries[1].segments.map(seg => ({
      departure: seg.departure.iataCode,
      arrival: seg.arrival.iataCode,
      departureTime: seg.departure.at,
      arrivalTime: seg.arrival.at,
      carrier: seg.carrierCode,
      flightNumber: seg.number,
      duration: seg.duration,
      aircraft: seg.aircraft?.code
    })) : null;

    const flightData = {
      price: parseFloat(bestOffer.price.total),
      currency: bestOffer.price.currency,
      segments: outboundSegments,
      returnSegments: returnSegments,
      totalDuration: bestOffer.itineraries[0].duration,
      returnDuration: bestOffer.itineraries[1]?.duration,
      validatingAirline: bestOffer.validatingAirlineCodes[0],
      cabinClass: bestOffer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || 'ECONOMY',
      numberOfBookableSeats: bestOffer.numberOfBookableSeats
    };

    // Cache the result
    await cache.set(cacheKey, flightData, CACHE_TTL.FLIGHT_OFFERS);
    console.log(`✅ Flight offer: Cached for ${destination.city}`);

    logger.logAmadeusAPI({
      operation: 'Flight Offers - Success',
      params: { destination: destination.city },
      results: {
        price: flightData.price,
        currency: flightData.currency,
        segments: flightData.segments.length,
        returnSegments: flightData.returnSegments?.length || 0,
        airline: flightData.validatingAirline,
        cabinClass: flightData.cabinClass
      },
      duration: Date.now() - startTime,
    });

    return flightData;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Flight search error for ${destination.city}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code,
      description: error.description,
      iataCode: destination.iataCode
    });

    logger.logAmadeusAPI({
      operation: 'Flight Offers - Error',
      params: { destination: destination.city, iataCode: destination.iataCode },
      error: error.message,
      duration,
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

// Search for actual hotels using Amadeus Hotel API
export async function searchHotels(destination, slot, userPreferences) {
  const startTime = Date.now();

  if (!amadeus) {
    console.warn('Amadeus client not initialized, cannot search hotels');
    return null;
  }

  try {
    // Step 1: Search hotels by city code
    const cityCode = destination.iataCode;

    // Generate cache key
    const cacheKey = `hotels:${cityCode}:${slot.startDate}:${slot.endDate}:${userPreferences.style}`;

    // Try cache first
    const cachedHotels = await cache.get(cacheKey);
    if (cachedHotels) {
      console.log(`✅ Hotels: Cache hit for ${destination.city}`);
      return cachedHotels;
    }

    console.log(`🏨 Searching hotels in ${destination.city}...`);

    logger.logAmadeusAPI({
      operation: 'Hotel Search',
      params: {
        cityCode,
        city: destination.city,
        checkIn: slot.startDate,
        checkOut: slot.endDate,
        style: userPreferences.style,
        nights: slot.duration - 1
      },
    });

    // Search for hotels by city
    const hotelsResponse = await amadeus.referenceData.locations.hotels.byCity.get({
      cityCode: cityCode
    });

    if (!hotelsResponse.data || hotelsResponse.data.length === 0) {
      console.log(`⚠️  No hotels found for ${destination.city}`);
      return null;
    }

    // Get hotel IDs (limit to top 20)
    const hotelIds = hotelsResponse.data.slice(0, 20).map(hotel => hotel.hotelId);

    // Step 2: Get hotel offers with pricing
    const offersResponse = await amadeus.shopping.hotelOffersSearch.get({
      hotelIds: hotelIds.join(','),
      checkInDate: slot.startDate,
      checkOutDate: slot.endDate,
      adults: 1,
      roomQuantity: 1,
      currency: 'EUR',
      bestRateOnly: true
    });

    if (!offersResponse.data || offersResponse.data.length === 0) {
      console.log(`⚠️  No hotel offers found for ${destination.city}`);
      return null;
    }

    // Sort by rating and price
    const topHotels = offersResponse.data
      .filter(hotel => hotel.offers && hotel.offers.length > 0)
      .map(hotel => {
        const bestOffer = hotel.offers[0];
        return {
          hotelId: hotel.hotel.hotelId,
          name: hotel.hotel.name,
          rating: hotel.hotel.rating || 3,
          address: hotel.hotel.address,
          contact: hotel.hotel.contact,
          price: {
            total: parseFloat(bestOffer.price.total),
            currency: bestOffer.price.currency,
            perNight: parseFloat(bestOffer.price.total) / slot.duration
          },
          room: {
            type: bestOffer.room?.type || 'Standard Room',
            description: bestOffer.room?.typeEstimated?.category || 'Room',
            beds: bestOffer.room?.typeEstimated?.beds || 1,
            bedType: bestOffer.room?.typeEstimated?.bedType || 'DOUBLE'
          },
          amenities: hotel.hotel.amenities || [],
          bookingUrl: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotel.hotel.name + ' ' + destination.city)}`,
          checkInDate: slot.startDate,
          checkOutDate: slot.endDate
        };
      })
      .sort((a, b) => {
        // Sort by rating first, then by price
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.price.total - b.price.total;
      })
      .slice(0, 5); // Top 5 hotels

    const hotelData = {
      destination: destination.city,
      checkIn: slot.startDate,
      checkOut: slot.endDate,
      nights: slot.duration - 1,
      hotels: topHotels,
      averagePrice: topHotels.length > 0
        ? Math.round(topHotels.reduce((sum, h) => sum + h.price.total, 0) / topHotels.length)
        : estimateHotelCost(destination, slot, userPreferences.style)
    };

    // Cache the result
    await cache.set(cacheKey, hotelData, CACHE_TTL.HOTELS);
    console.log(`✅ Hotels: Cached for ${destination.city}`);

    logger.logAmadeusAPI({
      operation: 'Hotel Search - Success',
      params: { city: destination.city },
      results: {
        hotelCount: topHotels.length,
        averagePrice: hotelData.averagePrice,
        priceRange: topHotels.length > 0 ? {
          min: Math.min(...topHotels.map(h => h.price.total)),
          max: Math.max(...topHotels.map(h => h.price.total))
        } : null
      },
      duration: Date.now() - startTime,
    });

    return hotelData;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Hotel search error for ${destination.city}:`, {
      message: error.message,
      status: error.response?.status,
      code: error.code,
      description: error.description
    });

    logger.logAmadeusAPI({
      operation: 'Hotel Search - Error',
      params: { city: destination.city },
      error: error.message,
      duration,
    });

    // Fallback to estimation if API fails
    return null;
  }
}

// IMPROVED: Get hotel cost with robust fallback chain
export async function getHotelCostWithFallbacks(destination, slot, userPreferences) {
  // Level 1: Try Amadeus Hotel API (preferred)
  const hotelSearch = await searchHotels(destination, slot, userPreferences);
  if (hotelSearch) {
    console.log(`✅ Hotel pricing: Amadeus API for ${destination.city}`);
    return {
      cost: hotelSearch.averagePrice,
      source: 'amadeus_api',
      confidence: 'high',
      hotels: hotelSearch.hotels
    };
  }

  // Level 2: Use real price database (highly accurate)
  const realPriceData = calculateRealHotelCost(
    destination.city,
    slot.duration,
    userPreferences.style,
    slot.startDate
  );

  if (realPriceData) {
    console.log(`✅ Hotel pricing: Real data for ${destination.city} (${realPriceData.source})`);
    return {
      cost: realPriceData.total,
      source: 'real_market_data',
      confidence: 'high',
      priceDetails: realPriceData
    };
  }

  // Level 3: Fallback to enhanced estimation (last resort)
  const estimatedCost = estimateHotelCost(destination, slot, userPreferences.style);
  console.log(`⚠️  Hotel pricing: Estimation for ${destination.city}`);
  return {
    cost: estimatedCost,
    source: 'estimation',
    confidence: 'medium'
  };
}