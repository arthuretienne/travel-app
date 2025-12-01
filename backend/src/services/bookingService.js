// backend/src/services/bookingService.js
// Booking.com API integration for flights and hotels
import axios from 'axios';
import * as cache from '../utils/cache.js';

const BASE_URL = 'https://booking-com15.p.rapidapi.com';
const BOOKING_API_KEY = process.env.BOOKING_API_KEY || 'b723f67a8cmshf49874500229ca8p12d559jsnedd1aee8f4ea';

const CACHE_TTL = {
  DESTINATION_ID: 2592000,  // 30 days (permanent cache for destination IDs)
  FLIGHT_SEARCH: 3600,      // 1 hour (flight prices change)
  HOTEL_SEARCH: 21600,      // 6 hours (hotel prices change)
  HOTEL_DETAILS: 43200,     // 12 hours (details more stable)
};

/**
 * Search destination and get ID (with Redis caching)
 * @param {string} destinationName - City or destination name
 * @returns {Promise<Object>} Destination with id, name, type, country
 */
export async function getDestinationId(destinationName) {
  const cacheKey = `booking:destination:${destinationName.toLowerCase()}`;

  // Check cache first (30 days TTL)
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`✅ Cache HIT for "${destinationName}" → ${cached.id}`);
    return cached;
  }

  console.log(`🔍 Searching destination "${destinationName}"...`);

  try {
    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchDestination`, {
      params: {
        query: destinationName
      },
      headers: {
        'x-rapidapi-key': BOOKING_API_KEY,
        'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
      }
    });

    if (!response.data?.status || !response.data?.data?.length) {
      throw new Error(`No destination found for "${destinationName}"`);
    }

    // Prefer CITY over AIRPORT
    const city = response.data.data.find(d => d.type === 'CITY') || response.data.data[0];

    const destination = {
      id: city.id,
      name: city.name,
      code: city.code,
      type: city.type,
      country: city.country,
      countryName: city.countryName
    };

    // Cache for 30 days
    cache.set(cacheKey, destination, CACHE_TTL.DESTINATION_ID);

    console.log(`📍 Found & cached: ${destination.name} (${destination.id})`);
    return destination;

  } catch (error) {
    console.error(`❌ getDestinationId failed for "${destinationName}":`, error.message);
    throw new Error(`Failed to find destination: ${error.message}`);
  }
}

/**
 * Search flights between two destinations
 * @param {Object} params
 * @param {string} params.fromId - Origin destination ID (e.g., PAR.CITY)
 * @param {string} params.toId - Destination ID (e.g., BCN.CITY)
 * @param {string} params.departDate - Departure date (YYYY-MM-DD)
 * @param {string} params.returnDate - Return date (YYYY-MM-DD) - optional
 * @param {number} params.adults - Number of adults (default: 1)
 * @param {string} params.cabinClass - Cabin class (ECONOMY, BUSINESS, FIRST)
 * @param {string} params.currency - Currency code (EUR, USD, etc.)
 * @returns {Promise<Object>} Flight search results
 */
export async function searchFlights({
  fromId,
  toId,
  departDate,
  returnDate = null,
  adults = 1,
  cabinClass = 'ECONOMY',
  currency = 'EUR',
  sort = 'BEST'
}) {
  const cacheKey = `booking:flights:${fromId}:${toId}:${departDate}:${returnDate}:${adults}:${cabinClass}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`✅ Flight cache HIT: ${fromId} → ${toId}`);
    return cached;
  }

  console.log(`✈️  Searching flights: ${fromId} → ${toId} on ${departDate}`);

  try {
    const params = {
      fromId,
      toId,
      departDate,
      stops: 'none', // Direct flights only for better UX
      pageNo: 1,
      adults,
      sort,
      cabinClass,
      currency_code: currency
    };

    // Add return date if provided
    if (returnDate) {
      params.returnDate = returnDate;
    }

    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchFlights`, {
      params,
      headers: {
        'x-rapidapi-key': BOOKING_API_KEY,
        'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
      },
      timeout: 30000 // 30 second timeout
    });

    if (!response.data?.status) {
      console.warn(`⚠️  No flights found: ${fromId} → ${toId}`);
      return {
        fromId,
        toId,
        departDate,
        returnDate,
        flights: [],
        count: 0
      };
    }

    const flightOffers = response.data.data?.flightOffers || [];

    if (flightOffers.length === 0) {
      console.warn(`⚠️  0 flights returned: ${fromId} → ${toId}`);
      return {
        fromId,
        toId,
        departDate,
        returnDate,
        flights: [],
        count: 0
      };
    }

    // Parse flight offers
    const flights = flightOffers.map(offer => {
      const outbound = offer.segments?.[0];
      const returnSeg = offer.segments?.[1];
      const price = offer.priceBreakdown?.total;

      return {
        token: offer.token,
        price: {
          amount: price?.units || 0,
          currency: price?.currencyCode || currency,
          formatted: `${price?.currencyCode || currency} ${price?.units || 0}`
        },
        outbound: outbound ? {
          departureAirport: outbound.departureAirport?.code,
          arrivalAirport: outbound.arrivalAirport?.code,
          departureTime: outbound.departureTime,
          arrivalTime: outbound.arrivalTime,
          duration: outbound.totalTime,
          airline: outbound.legs?.[0]?.carriersData?.[0]?.name,
          airlineCode: outbound.legs?.[0]?.carriersData?.[0]?.code,
          airlineLogo: outbound.legs?.[0]?.carriersData?.[0]?.logo,
        } : null,
        return: returnSeg ? {
          departureAirport: returnSeg.departureAirport?.code,
          arrivalAirport: returnSeg.arrivalAirport?.code,
          departureTime: returnSeg.departureTime,
          arrivalTime: returnSeg.arrivalTime,
          duration: returnSeg.totalTime,
          airline: returnSeg.legs?.[0]?.carriersData?.[0]?.name,
          airlineCode: returnSeg.legs?.[0]?.carriersData?.[0]?.code,
          airlineLogo: returnSeg.legs?.[0]?.carriersData?.[0]?.logo,
        } : null
      };
    });

    const result = {
      fromId,
      toId,
      departDate,
      returnDate,
      flights,
      count: flights.length
    };

    // Cache for 1 hour
    cache.set(cacheKey, result, CACHE_TTL.FLIGHT_SEARCH);

    console.log(`✅ Found ${flights.length} flights: ${fromId} → ${toId}`);
    return result;

  } catch (error) {
    console.error(`❌ searchFlights failed: ${fromId} → ${toId}`, error.message);
    throw new Error(`Failed to search flights: ${error.message}`);
  }
}

/**
 * Search hotels in a destination
 * @param {Object} params
 * @param {string} params.destinationQuery - City name
 * @param {string} params.arrivalDate - Check-in date (YYYY-MM-DD)
 * @param {string} params.departureDate - Check-out date (YYYY-MM-DD)
 * @param {number} params.adults - Number of adults
 * @param {number} params.rooms - Number of rooms
 * @param {string} params.currency - Currency code
 * @returns {Promise<Object>} Hotel search results
 */
export async function searchHotels({
  destinationQuery,
  arrivalDate,
  departureDate,
  adults = 1,
  rooms = 1,
  currency = 'EUR'
}) {
  const cacheKey = `booking:hotels:${destinationQuery}:${arrivalDate}:${departureDate}:${adults}:${rooms}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`✅ Hotel cache HIT: ${destinationQuery}`);
    return cached;
  }

  console.log(`🏨 Searching hotels in ${destinationQuery}...`);

  try {
    // Step 1: Get destination ID for hotels
    const destResponse = await axios.get(`${BASE_URL}/api/v1/hotels/searchDestination`, {
      params: {
        query: destinationQuery
      },
      headers: {
        'x-rapidapi-key': BOOKING_API_KEY,
        'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
      }
    });

    if (!destResponse.data?.status || !destResponse.data?.data?.length) {
      throw new Error(`Hotel destination not found: ${destinationQuery}`);
    }

    const dest = destResponse.data.data[0];
    const dest_id = dest.dest_id;

    console.log(`📍 Found hotel destination: ${dest.name} (${dest_id})`);

    // Step 2: Search hotels
    const hotelsResponse = await axios.get(`${BASE_URL}/api/v1/hotels/searchHotels`, {
      params: {
        dest_id,
        search_type: 'CITY',
        arrival_date: arrivalDate,
        departure_date: departureDate,
        adults,
        room_qty: rooms,
        page_number: 1,
        units: 'metric',
        temperature_unit: 'c',
        languagecode: 'en-us',
        currency_code: currency
      },
      headers: {
        'x-rapidapi-key': BOOKING_API_KEY,
        'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
      },
      timeout: 30000
    });

    if (!hotelsResponse.data?.status || !hotelsResponse.data?.data?.hotels) {
      console.warn(`⚠️  No hotels found in ${destinationQuery}`);
      return {
        destination: destinationQuery,
        arrivalDate,
        departureDate,
        hotels: [],
        count: 0
      };
    }

    const hotelData = hotelsResponse.data.data.hotels;

    const hotels = hotelData.map(hotel => {
      // Price is in property.priceBreakdown.grossPrice.value
      const grossPrice = hotel.property?.priceBreakdown?.grossPrice?.value || 0;
      const pricePerNight = grossPrice; // This is already the total price for the stay

      return {
        id: hotel.hotel_id,
        name: hotel.property?.name || 'Unknown Hotel',
        stars: hotel.property?.propertyClass || hotel.property?.accuratePropertyClass || 0,
        rating: {
          value: hotel.property?.reviewScore || 0,
          count: hotel.property?.reviewCount || 0
        },
        price: {
          amount: grossPrice,
          currency: hotel.property?.priceBreakdown?.grossPrice?.currency || currency,
          formatted: `${currency} ${Math.round(grossPrice)}`
        },
        pricePerNight: pricePerNight,
        location: destinationQuery,
        photos: hotel.property?.photoUrls || [],
        mainPhoto: hotel.property?.photoUrls?.[0] || null,
        amenities: hotel.property?.amenities || [],
        checkInTime: hotel.property?.checkin?.fromTime,
        checkOutTime: hotel.property?.checkout?.untilTime
      };
    });

    const result = {
      destination: destinationQuery,
      arrivalDate,
      departureDate,
      hotels,
      count: hotels.length
    };

    // Cache for 6 hours
    cache.set(cacheKey, result, CACHE_TTL.HOTEL_SEARCH);

    console.log(`✅ Found ${hotels.length} hotels in ${destinationQuery}`);
    return result;

  } catch (error) {
    console.error(`❌ searchHotels failed for "${destinationQuery}":`, error.message);
    throw new Error(`Failed to search hotels: ${error.message}`);
  }
}

/**
 * Get cheapest flight price for a route (used for budget filtering)
 * @param {string} fromId - Origin ID
 * @param {string} toId - Destination ID
 * @param {string} departDate - Departure date
 * @param {string} returnDate - Return date (optional)
 * @returns {Promise<number>} Cheapest price in EUR
 */
export async function getMinPrice(fromId, toId, departDate, returnDate = null) {
  try {
    const flights = await searchFlights({
      fromId,
      toId,
      departDate,
      returnDate,
      adults: 1,
      cabinClass: 'ECONOMY',
      currency: 'EUR'
    });

    if (flights.count === 0) {
      return null;
    }

    // Return cheapest flight price
    const prices = flights.flights.map(f => f.price.amount);
    return Math.min(...prices);

  } catch (error) {
    console.error(`❌ getMinPrice failed: ${fromId} → ${toId}`, error.message);
    return null;
  }
}

export default {
  getDestinationId,
  searchFlights,
  searchHotels,
  getMinPrice
};
