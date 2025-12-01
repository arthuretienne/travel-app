// backend/src/services/hotelService.js
// Hotel search using Air Scraper API (Skyscanner + Booking.com data)
import axios from 'axios';
import * as cache from '../utils/cache.js';

const BASE_URL = 'https://sky-scrapper.p.rapidapi.com';
const AIR_SCRAPER_API_KEY = process.env.AIR_SCRAPER_API_KEY;

const CACHE_TTL = {
  HOTEL_SEARCH: 360,    // 6 hours (prices change often)
  HOTEL_DETAILS: 720,   // 12 hours (details more stable)
};

/**
 * Search for hotels in a destination
 * @param {Object} params
 * @param {string} params.destinationQuery - City or destination name
 * @param {string} params.checkin - Check-in date (YYYY-MM-DD)
 * @param {string} params.checkout - Check-out date (YYYY-MM-DD)
 * @param {number} params.adults - Number of adults (default: 1)
 * @param {string} params.currency - Currency code (EUR, USD)
 * @param {string} params.market - Market (fr-FR, en-US)
 * @returns {Promise<Object>} Hotel search results
 */
export async function searchHotels({
  destinationQuery,
  checkin,
  checkout,
  adults = 1,
  rooms = 1,
  currency = 'EUR',
  market = 'fr-FR',
  countryCode = 'FR',
}) {
  const cacheKey = `hotels:${destinationQuery}:${checkin}:${checkout}:${adults}:${rooms}:${currency}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    // Step 1: Search for destination/hotel entity
    console.log(`🏨 Searching hotels in ${destinationQuery}...`);

    const entityResponse = await axios.get(`${BASE_URL}/api/v2/hotels/searchDestination`, {
      params: {
        query: destinationQuery,
        locale: market,
      },
      headers: {
        'x-rapidapi-key': AIR_SCRAPER_API_KEY,
        'x-rapidapi-host': 'sky-scrapper.p.rapidapi.com',
      },
    });

    if (!entityResponse.data?.status || !entityResponse.data?.data?.length) {
      throw new Error('No destination found');
    }

    const destination = entityResponse.data.data[0]; // Take first result
    console.log(`📍 Found destination: ${destination.name} (${destination.entityId})`);

    // Step 2: Search hotels for this destination
    const hotelsResponse = await axios.get(`${BASE_URL}/api/v2/hotels/searchHotels`, {
      params: {
        entityId: destination.entityId,
        checkin: checkin,
        checkout: checkout,
        adults: String(adults),
        rooms: String(rooms),
        currency: currency,
        market: market,
        countryCode: countryCode,
        sortBy: 'relevance', // or 'price', 'rating', 'stars'
      },
      headers: {
        'x-rapidapi-key': AIR_SCRAPER_API_KEY,
        'x-rapidapi-host': 'sky-scrapper.p.rapidapi.com',
      },
    });

    if (!hotelsResponse.data?.status || !hotelsResponse.data?.data?.hotels) {
      console.warn('No hotels found');
      return {
        destination: {
          name: destination.name,
          entityId: destination.entityId,
        },
        checkin,
        checkout,
        hotels: [],
        count: 0,
      };
    }

    const hotels = hotelsResponse.data.data.hotels.map(hotel => ({
      id: hotel.id,
      name: hotel.name,
      stars: hotel.stars || 0,
      rating: {
        value: hotel.rating?.value || 0,
        count: hotel.rating?.count || 0,
      },
      price: {
        amount: hotel.price?.amount || 0,
        currency: hotel.price?.currency || currency,
        formatted: hotel.price?.formatted || 'N/A',
      },
      pricePerNight: hotel.price?.amount ? Math.round(hotel.price.amount / calculateNights(checkin, checkout)) : 0,
      location: hotel.location || destination.name,
      distance: hotel.distance,
      photos: hotel.images?.map(img => ({
        url: img.url,
        thumbnail: img.thumbnail,
      })) || [],
      mainPhoto: hotel.images?.[0]?.url || null,
      amenities: hotel.amenities || [],
      provider: hotel.provider || 'booking.com',
      bookingLink: hotel.deeplink,
    }));

    const result = {
      destination: {
        name: destination.name,
        entityId: destination.entityId,
      },
      checkin,
      checkout,
      nights: calculateNights(checkin, checkout),
      hotels: hotels,
      count: hotels.length,
    };

    // Cache for 6 hours
    cache.set(cacheKey, result, CACHE_TTL.HOTEL_SEARCH);

    console.log(`✅ Found ${hotels.length} hotels in ${destination.name}`);
    return result;

  } catch (error) {
    console.error(`❌ searchHotels failed for "${destinationQuery}":`, error.response?.data?.message || error.message);
    throw new Error(`Failed to search hotels: ${error.message}`);
  }
}

/**
 * Get hotel details by ID
 * @param {string} hotelId - Hotel ID
 * @param {string} checkin - Check-in date
 * @param {string} checkout - Check-out date
 * @param {number} adults - Number of adults
 * @param {number} rooms - Number of rooms
 * @param {string} currency - Currency code
 * @param {string} market - Market
 * @returns {Promise<Object>} Hotel details
 */
export async function getHotelDetails({
  hotelId,
  checkin,
  checkout,
  adults = 1,
  rooms = 1,
  currency = 'EUR',
  market = 'fr-FR',
}) {
  const cacheKey = `hotel:${hotelId}:${checkin}:${checkout}`;

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${BASE_URL}/api/v2/hotels/getHotelDetails`, {
      params: {
        hotelId,
        checkin,
        checkout,
        adults: String(adults),
        rooms: String(rooms),
        currency,
        market,
      },
      headers: {
        'x-rapidapi-key': AIR_SCRAPER_API_KEY,
        'x-rapidapi-host': 'sky-scrapper.p.rapidapi.com',
      },
    });

    if (!response.data?.status || !response.data?.data) {
      throw new Error('Hotel details not found');
    }

    const hotel = response.data.data;
    const result = {
      id: hotel.id,
      name: hotel.name,
      description: hotel.description,
      stars: hotel.stars,
      rating: hotel.rating,
      price: hotel.price,
      location: hotel.location,
      coordinates: hotel.coordinates,
      photos: hotel.images || [],
      amenities: hotel.amenities || [],
      reviews: hotel.reviews || [],
      bookingLink: hotel.deeplink,
    };

    cache.set(cacheKey, result, CACHE_TTL.HOTEL_DETAILS);
    return result;

  } catch (error) {
    console.error(`❌ getHotelDetails failed for hotel ${hotelId}:`, error.message);
    throw new Error(`Failed to get hotel details: ${error.message}`);
  }
}

/**
 * Helper: Calculate number of nights between checkin and checkout
 */
function calculateNights(checkin, checkout) {
  const checkinDate = new Date(checkin);
  const checkoutDate = new Date(checkout);
  const diffTime = Math.abs(checkoutDate - checkinDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export default {
  searchHotels,
  getHotelDetails,
};
