// backend/src/services/pexelsService.js
import axios from 'axios';
import { logger } from './logger.js';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_API_URL = 'https://api.pexels.com/v1';

/**
 * Search for high-quality destination photos using Pexels
 * @param {string} cityName - City name
 * @param {string} countryName - Country name (optional)
 * @returns {Promise<Object>} Photo data with URLs
 */
export async function getDestinationPhotos(cityName, countryName = '') {
  if (!PEXELS_API_KEY) {
    console.warn('⚠️  Pexels API key not configured, using fallback');
    return getFallbackPhoto(cityName);
  }

  try {
    // Build search query
    const query = countryName
      ? `${cityName} ${countryName} landmark skyline travel`
      : `${cityName} landmark skyline travel`;

    const response = await axios.get(`${PEXELS_API_URL}/search`, {
      headers: {
        'Authorization': PEXELS_API_KEY,
      },
      params: {
        query,
        per_page: 5,
        orientation: 'landscape',
      },
    });

    if (!response.data.photos || response.data.photos.length === 0) {
      console.log(`No Pexels photos found for ${cityName}, using fallback`);
      return getFallbackPhoto(cityName);
    }

    // Get the best quality photo
    const photo = response.data.photos[0];

    logger.logAPICall({
      service: 'Pexels',
      operation: 'Search Photos',
      params: { city: cityName, country: countryName },
      status: 'success',
    });

    return {
      url: photo.src.large2x || photo.src.large,
      medium: photo.src.large || photo.src.medium,
      small: photo.src.medium || photo.src.small,
      thumb: photo.src.small || photo.src.tiny,
      alt: photo.alt || `${cityName} landscape`,
      photographer: {
        name: photo.photographer,
        url: photo.photographer_url,
      },
      pexels_url: photo.url,
    };
  } catch (error) {
    console.error('Pexels API Error:', error.response?.data || error.message);

    logger.logAPICall({
      service: 'Pexels',
      operation: 'Search Photos',
      params: { city: cityName, country: countryName },
      status: 'error',
      error: error.message,
    });

    return getFallbackPhoto(cityName);
  }
}

/**
 * Get multiple photos for a destination (for carousel/gallery)
 * @param {string} cityName - City name
 * @param {string} countryName - Country name (optional)
 * @param {number} count - Number of photos to return
 * @returns {Promise<Array>} Array of photo objects
 */
export async function getDestinationPhotoGallery(cityName, countryName = '', count = 5) {
  if (!PEXELS_API_KEY) {
    console.warn('⚠️  Pexels API key not configured');
    return [getFallbackPhoto(cityName)];
  }

  try {
    const query = countryName
      ? `${cityName} ${countryName} landmark architecture travel`
      : `${cityName} landmark architecture travel`;

    const response = await axios.get(`${PEXELS_API_URL}/search`, {
      headers: {
        'Authorization': PEXELS_API_KEY,
      },
      params: {
        query,
        per_page: count,
        orientation: 'landscape',
      },
    });

    if (!response.data.photos || response.data.photos.length === 0) {
      return [getFallbackPhoto(cityName)];
    }

    return response.data.photos.map(photo => ({
      url: photo.src.large2x || photo.src.large,
      medium: photo.src.large || photo.src.medium,
      small: photo.src.medium || photo.src.small,
      thumb: photo.src.small || photo.src.tiny,
      alt: photo.alt || `${cityName} landscape`,
      photographer: {
        name: photo.photographer,
        url: photo.photographer_url,
      },
      pexels_url: photo.url,
    }));
  } catch (error) {
    console.error('Pexels Gallery Error:', error.response?.data || error.message);
    return [getFallbackPhoto(cityName)];
  }
}

/**
 * Fallback photo database (same as unsplashService for consistency)
 */
function getFallbackPhoto(cityName) {
  const fallbackPhotos = {
    // Western Europe
    'Paris': 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg',
    'London': 'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg',
    'Amsterdam': 'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg',
    'Brussels': 'https://images.pexels.com/photos/5604935/pexels-photo-5604935.jpeg',
    'Luxembourg': 'https://images.pexels.com/photos/15377723/pexels-photo-15377723.jpeg',

    // Southern Europe
    'Barcelona': 'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg',
    'Madrid': 'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg',
    'Seville': 'https://images.pexels.com/photos/6207082/pexels-photo-6207082.jpeg',
    'Valencia': 'https://images.pexels.com/photos/6207082/pexels-photo-6207082.jpeg',
    'Lisbon': 'https://images.pexels.com/photos/2356059/pexels-photo-2356059.jpeg',
    'Porto': 'https://images.pexels.com/photos/1534560/pexels-photo-1534560.jpeg',

    // Italy
    'Rome': 'https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg',
    'Venice': 'https://images.pexels.com/photos/1413814/pexels-photo-1413814.jpeg',
    'Florence': 'https://images.pexels.com/photos/1797161/pexels-photo-1797161.jpeg',
    'Milan': 'https://images.pexels.com/photos/1797161/pexels-photo-1797161.jpeg',
    'Naples': 'https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg',

    // Eastern Europe
    'Prague': 'https://images.pexels.com/photos/1850619/pexels-photo-1850619.jpeg',
    'Budapest': 'https://images.pexels.com/photos/2427456/pexels-photo-2427456.jpeg',
    'Vienna': 'https://images.pexels.com/photos/1470405/pexels-photo-1470405.jpeg',
    'Krakow': 'https://images.pexels.com/photos/2157404/pexels-photo-2157404.jpeg',
    'Warsaw': 'https://images.pexels.com/photos/2157404/pexels-photo-2157404.jpeg',
    'Bucharest': 'https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg',

    // Balkans
    'Ljubljana': 'https://images.pexels.com/photos/3566187/pexels-photo-3566187.jpeg',
    'Zagreb': 'https://images.pexels.com/photos/3566187/pexels-photo-3566187.jpeg',
    'Belgrade': 'https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg',
    'Sarajevo': 'https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg',
    'Dubrovnik': 'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg',

    // Greece
    'Athens': 'https://images.pexels.com/photos/164336/pexels-photo-164336.jpeg',
    'Santorini': 'https://images.pexels.com/photos/164336/pexels-photo-164336.jpeg',
    'Mykonos': 'https://images.pexels.com/photos/164336/pexels-photo-164336.jpeg',

    // Scandinavia
    'Copenhagen': 'https://images.pexels.com/photos/1570610/pexels-photo-1570610.jpeg',
    'Stockholm': 'https://images.pexels.com/photos/1570610/pexels-photo-1570610.jpeg',
    'Oslo': 'https://images.pexels.com/photos/1570610/pexels-photo-1570610.jpeg',
    'Helsinki': 'https://images.pexels.com/photos/1570610/pexels-photo-1570610.jpeg',

    // Germany
    'Berlin': 'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg',
    'Munich': 'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg',
    'Hamburg': 'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg',

    // Caucasus
    'Tbilisi': 'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg',
    'Yerevan': 'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg',
  };

  // Try fuzzy matching
  const normalized = cityName.toLowerCase();
  for (const [city, url] of Object.entries(fallbackPhotos)) {
    if (city.toLowerCase().includes(normalized) || normalized.includes(city.toLowerCase())) {
      return {
        url,
        medium: url,
        small: url,
        thumb: url,
        alt: `${cityName} cityscape`,
        photographer: {
          name: 'Pexels Community',
          url: 'https://pexels.com',
        },
        pexels_url: 'https://pexels.com',
      };
    }
  }

  // Generic travel fallback
  return {
    url: 'https://images.pexels.com/photos/1008155/pexels-photo-1008155.jpeg',
    medium: 'https://images.pexels.com/photos/1008155/pexels-photo-1008155.jpeg',
    small: 'https://images.pexels.com/photos/1008155/pexels-photo-1008155.jpeg',
    thumb: 'https://images.pexels.com/photos/1008155/pexels-photo-1008155.jpeg',
    alt: `${cityName} - Discover this destination`,
    photographer: {
      name: 'Pexels',
      url: 'https://pexels.com',
    },
    pexels_url: 'https://pexels.com',
  };
}

/**
 * Get curated travel photos (for homepage, inspiration)
 * @param {number} count - Number of photos
 * @returns {Promise<Array>} Curated photos
 */
export async function getCuratedTravelPhotos(count = 10) {
  if (!PEXELS_API_KEY) {
    console.warn('⚠️  Pexels API key not configured');
    return [];
  }

  try {
    const response = await axios.get(`${PEXELS_API_URL}/curated`, {
      headers: {
        'Authorization': PEXELS_API_KEY,
      },
      params: {
        per_page: count,
      },
    });

    return response.data.photos.map(photo => ({
      url: photo.src.large2x || photo.src.large,
      medium: photo.src.large || photo.src.medium,
      small: photo.src.medium || photo.src.small,
      thumb: photo.src.small || photo.src.tiny,
      alt: photo.alt || 'Travel inspiration',
      photographer: {
        name: photo.photographer,
        url: photo.photographer_url,
      },
      pexels_url: photo.url,
    }));
  } catch (error) {
    console.error('Pexels Curated Error:', error.message);
    return [];
  }
}
