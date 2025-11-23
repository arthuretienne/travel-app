// backend/src/services/bookingService.js
import cache from './cacheService.js';
import { logger } from './logger.js';

// NOTE: Booking.com API via RapidAPI
// Docs: https://rapidapi.com/apidojo/api/booking-com

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'booking-com.p.rapidapi.com';

// Cache TTL
const CACHE_TTL = {
  HOTELS_SEARCH: 3600 * 24, // 24 hours (hotel availability changes daily)
  HOTEL_DETAILS: 3600 * 24 * 3, // 3 days (hotel info stable)
};

/**
 * Search hotels in a destination
 */
export async function searchHotels({
  cityName,
  checkInDate,
  checkOutDate,
  adults = 1,
  rooms = 1,
  currency = 'EUR',
  locale = 'fr',
}) {
  const startTime = Date.now();

  if (!RAPIDAPI_KEY) {
    console.warn('⚠️  RAPIDAPI_KEY not set, cannot search hotels');
    return null;
  }

  // Generate cache key
  const cacheKey = `booking:hotels:${cityName}:${checkInDate}:${checkOutDate}:${adults}:${rooms}`;

  // Try cache first
  const cachedData = await cache.get(cacheKey);
  if (cachedData) {
    console.log(`✅ Booking.com: Cache hit for ${cityName}`);
    return cachedData;
  }

  try {
    logger.logAmadeusAPI({
      operation: 'Booking.com - Hotel Search',
      params: {
        city: cityName,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        adults,
        rooms,
      },
    });

    // Step 1: Get destination ID (required by Booking.com)
    const destId = await getDestinationId(cityName);
    if (!destId) {
      console.log(`⚠️  No destination ID found for ${cityName}`);
      return null;
    }

    // Step 2: Search hotels
    const searchUrl = `https://${RAPIDAPI_HOST}/v1/hotels/search`;
    const searchParams = new URLSearchParams({
      dest_id: destId,
      dest_type: 'city',
      checkin_date: checkInDate,
      checkout_date: checkOutDate,
      adults_number: adults,
      room_number: rooms,
      filter_by_currency: currency,
      locale: locale,
      order_by: 'popularity', // Sort by popularity first
      units: 'metric',
      page_number: 0,
    });

    const response = await fetch(`${searchUrl}?${searchParams}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    });

    if (!response.ok) {
      throw new Error(`Booking.com API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    if (!data.result || data.result.length === 0) {
      logger.logAmadeusAPI({
        operation: 'Booking.com - No Results',
        params: { city: cityName },
        results: [],
        duration,
      });
      return null;
    }

    // Parse and format results
    const hotels = parseHotels(data.result, checkInDate, checkOutDate);

    logger.logAmadeusAPI({
      operation: 'Booking.com - Success',
      params: { city: cityName },
      results: {
        hotelCount: hotels.length,
        averagePrice: hotels.length > 0
          ? Math.round(hotels.reduce((sum, h) => sum + h.price.total, 0) / hotels.length)
          : 0,
        priceRange: hotels.length > 0 ? {
          min: Math.min(...hotels.map(h => h.price.total)),
          max: Math.max(...hotels.map(h => h.price.total)),
        } : null,
      },
      duration,
    });

    // Cache the result
    await cache.set(cacheKey, hotels, CACHE_TTL.HOTELS_SEARCH);
    console.log(`✅ Booking.com: Cached ${hotels.length} hotels for ${cityName}`);

    return hotels;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Booking.com error for ${cityName}:`, error);

    logger.logAmadeusAPI({
      operation: 'Booking.com - Error',
      params: { city: cityName },
      error: error.message,
      duration,
    });

    return null;
  }
}

/**
 * Get destination ID from city name
 */
async function getDestinationId(cityName) {
  const cacheKey = `booking:dest_id:${cityName.toLowerCase()}`;

  // Try cache first
  const cachedId = await cache.get(cacheKey);
  if (cachedId) {
    return cachedId;
  }

  try {
    const url = `https://${RAPIDAPI_HOST}/v1/hotels/locations`;
    const params = new URLSearchParams({
      name: cityName,
      locale: 'fr',
    });

    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get destination ID: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return null;
    }

    // Find city type destination
    const cityDest = data.find(d => d.dest_type === 'city');
    const destId = cityDest ? cityDest.dest_id : data[0].dest_id;

    // Cache for 30 days (city IDs don't change)
    await cache.set(cacheKey, destId, 3600 * 24 * 30);

    return destId;

  } catch (error) {
    console.error(`Error getting destination ID for ${cityName}:`, error);
    return null;
  }
}

/**
 * Parse hotel results from Booking.com API
 */
function parseHotels(results, checkInDate, checkOutDate) {
  const nights = calculateNights(checkInDate, checkOutDate);

  return results
    .filter(hotel => hotel.price_breakdown && hotel.price_breakdown.gross_price)
    .map(hotel => ({
      id: hotel.hotel_id,
      name: hotel.hotel_name,
      rating: hotel.review_score || 0,
      reviewScore: hotel.review_score_word || 'N/A',
      reviewCount: hotel.review_nr || 0,
      address: {
        street: hotel.address,
        city: hotel.city,
        country: hotel.country_trans,
      },
      coordinates: {
        latitude: hotel.latitude,
        longitude: hotel.longitude,
      },
      price: {
        total: parseFloat(hotel.price_breakdown.gross_price),
        currency: hotel.currencycode,
        perNight: parseFloat(hotel.price_breakdown.gross_price) / nights,
        strikethrough: hotel.price_breakdown.strikethrough_price
          ? parseFloat(hotel.price_breakdown.strikethrough_price)
          : null,
      },
      discount: hotel.price_breakdown.has_discount
        ? {
          percentage: hotel.ribbon_text,
          amount: hotel.price_breakdown.strikethrough_price
            ? parseFloat(hotel.price_breakdown.strikethrough_price) - parseFloat(hotel.price_breakdown.gross_price)
            : 0,
        }
        : null,
      room: {
        type: hotel.unit_configuration_label || 'Standard Room',
        description: hotel.accommodation_type_name || 'Hotel',
      },
      amenities: hotel.hotel_facilities || [],
      distance: {
        fromCenter: hotel.distance,
        unit: hotel.distance_unit || 'km',
      },
      photo: hotel.main_photo_url || hotel.max_photo_url,
      bookingUrl: hotel.url || `https://www.booking.com/hotel/${hotel.hotel_id}.html`,
      checkInDate,
      checkOutDate,
      nights,
      isGenius: hotel.is_genius_deal || false,
      badges: [
        hotel.is_free_cancellable && 'Annulation gratuite',
        hotel.is_genius_deal && 'Genius',
        hotel.preferred && 'Préféré',
      ].filter(Boolean),
    }))
    .slice(0, 10); // Top 10 hotels
}

/**
 * Calculate number of nights between two dates
 */
function calculateNights(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Get hotel cost with Booking.com as primary source
 */
export async function getHotelCostWithBooking({
  cityName,
  checkInDate,
  checkOutDate,
  adults = 1,
  style = 'confort',
}) {
  // Try Booking.com first
  const hotels = await searchHotels({
    cityName,
    checkInDate,
    checkOutDate,
    adults,
    rooms: 1,
  });

  if (hotels && hotels.length > 0) {
    const averagePrice = Math.round(
      hotels.reduce((sum, h) => sum + h.price.total, 0) / hotels.length
    );

    console.log(`✅ Hotel pricing: Booking.com for ${cityName}`);
    return {
      cost: averagePrice,
      source: 'booking_com',
      confidence: 'high',
      hotels: hotels.slice(0, 5),
    };
  }

  // Fallback to estimation
  console.log(`⚠️  Hotel pricing: Estimation for ${cityName} (Booking.com unavailable)`);
  const nights = calculateNights(checkInDate, checkOutDate);
  const estimatedCost = estimateHotelCost(nights, style);

  return {
    cost: estimatedCost,
    source: 'estimation',
    confidence: 'medium',
  };
}

/**
 * Fallback estimation
 */
function estimateHotelCost(nights, style) {
  const baseRates = {
    backpacker: 30,
    adventure: 50,
    confort: 80,
    luxe: 200,
  };

  const baseRate = baseRates[style] || 80;
  return Math.round(baseRate * nights);
}

export default {
  searchHotels,
  getHotelCostWithBooking,
};
