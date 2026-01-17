// backend/src/services/pexelsService.js
import axios from 'axios';

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
 * Curated static photo database for top destinations
 * High-quality, reliable images that won't break
 * Using Pexels CDN with optimized sizes
 */
const STATIC_DESTINATION_PHOTOS = {
  // Western Europe
  'Paris': {
    url: 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'London': {
    url: 'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Amsterdam': {
    url: 'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Brussels': {
    url: 'https://images.pexels.com/photos/5604935/pexels-photo-5604935.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/5604935/pexels-photo-5604935.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Luxembourg': {
    url: 'https://images.pexels.com/photos/15377723/pexels-photo-15377723.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/15377723/pexels-photo-15377723.jpeg?auto=compress&cs=tinysrgb&w=400',
  },

  // Southern Europe - Spain
  'Barcelona': {
    url: 'https://images.pexels.com/photos/1874675/pexels-photo-1874675.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1874675/pexels-photo-1874675.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Madrid': {
    url: 'https://images.pexels.com/photos/3757144/pexels-photo-3757144.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/3757144/pexels-photo-3757144.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Seville': {
    url: 'https://images.pexels.com/photos/6207082/pexels-photo-6207082.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/6207082/pexels-photo-6207082.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Valencia': {
    url: 'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=400',
  },

  // Portugal
  'Lisbon': {
    url: 'https://images.pexels.com/photos/2356059/pexels-photo-2356059.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/2356059/pexels-photo-2356059.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Porto': {
    url: 'https://images.pexels.com/photos/2549018/pexels-photo-2549018.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/2549018/pexels-photo-2549018.jpeg?auto=compress&cs=tinysrgb&w=400',
  },

  // Italy
  'Rome': {
    url: 'https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Venice': {
    url: 'https://images.pexels.com/photos/1796736/pexels-photo-1796736.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1796736/pexels-photo-1796736.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Florence': {
    url: 'https://images.pexels.com/photos/1797161/pexels-photo-1797161.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1797161/pexels-photo-1797161.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Milan': {
    url: 'https://images.pexels.com/photos/2706750/pexels-photo-2706750.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/2706750/pexels-photo-2706750.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Naples': {
    url: 'https://images.pexels.com/photos/4819033/pexels-photo-4819033.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/4819033/pexels-photo-4819033.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Amalfi': {
    url: 'https://images.pexels.com/photos/4846097/pexels-photo-4846097.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/4846097/pexels-photo-4846097.jpeg?auto=compress&cs=tinysrgb&w=400',
  },

  // Eastern Europe
  'Prague': {
    url: 'https://images.pexels.com/photos/1850619/pexels-photo-1850619.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1850619/pexels-photo-1850619.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Budapest': {
    url: 'https://images.pexels.com/photos/3587583/pexels-photo-3587583.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/3587583/pexels-photo-3587583.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Vienna': {
    url: 'https://images.pexels.com/photos/1493088/pexels-photo-1493088.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1493088/pexels-photo-1493088.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Krakow': {
    url: 'https://images.pexels.com/photos/2157404/pexels-photo-2157404.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/2157404/pexels-photo-2157404.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Warsaw': {
    url: 'https://images.pexels.com/photos/3617500/pexels-photo-3617500.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/3617500/pexels-photo-3617500.jpeg?auto=compress&cs=tinysrgb&w=400',
  },

  // Balkans
  'Dubrovnik': {
    url: 'https://images.pexels.com/photos/2044434/pexels-photo-2044434.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/2044434/pexels-photo-2044434.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Split': {
    url: 'https://images.pexels.com/photos/2440061/pexels-photo-2440061.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/2440061/pexels-photo-2440061.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Ljubljana': {
    url: 'https://images.pexels.com/photos/3566187/pexels-photo-3566187.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/3566187/pexels-photo-3566187.jpeg?auto=compress&cs=tinysrgb&w=400',
  },

  // Greece
  'Athens': {
    url: 'https://images.pexels.com/photos/772689/pexels-photo-772689.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/772689/pexels-photo-772689.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Santorini': {
    url: 'https://images.pexels.com/photos/1010657/pexels-photo-1010657.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1010657/pexels-photo-1010657.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Mykonos': {
    url: 'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=400',
  },

  // Scandinavia
  'Copenhagen': {
    url: 'https://images.pexels.com/photos/2563681/pexels-photo-2563681.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/2563681/pexels-photo-2563681.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Stockholm': {
    url: 'https://images.pexels.com/photos/3930091/pexels-photo-3930091.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/3930091/pexels-photo-3930091.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Oslo': {
    url: 'https://images.pexels.com/photos/1768478/pexels-photo-1768478.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1768478/pexels-photo-1768478.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Helsinki': {
    url: 'https://images.pexels.com/photos/1538177/pexels-photo-1538177.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1538177/pexels-photo-1538177.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Reykjavik': {
    url: 'https://images.pexels.com/photos/2128028/pexels-photo-2128028.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/2128028/pexels-photo-2128028.jpeg?auto=compress&cs=tinysrgb&w=400',
  },

  // Germany
  'Berlin': {
    url: 'https://images.pexels.com/photos/1128408/pexels-photo-1128408.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1128408/pexels-photo-1128408.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Munich': {
    url: 'https://images.pexels.com/photos/3618540/pexels-photo-3618540.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/3618540/pexels-photo-3618540.jpeg?auto=compress&cs=tinysrgb&w=400',
  },

  // Morocco & North Africa
  'Marrakech': {
    url: 'https://images.pexels.com/photos/3889843/pexels-photo-3889843.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/3889843/pexels-photo-3889843.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Casablanca': {
    url: 'https://images.pexels.com/photos/4577791/pexels-photo-4577791.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/4577791/pexels-photo-4577791.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Fez': {
    url: 'https://images.pexels.com/photos/4577793/pexels-photo-4577793.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/4577793/pexels-photo-4577793.jpeg?auto=compress&cs=tinysrgb&w=400',
  },

  // Asia
  'Tokyo': {
    url: 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Kyoto': {
    url: 'https://images.pexels.com/photos/1440476/pexels-photo-1440476.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1440476/pexels-photo-1440476.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Bangkok': {
    url: 'https://images.pexels.com/photos/1031659/pexels-photo-1031659.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1031659/pexels-photo-1031659.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Bali': {
    url: 'https://images.pexels.com/photos/2166553/pexels-photo-2166553.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/2166553/pexels-photo-2166553.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Singapore': {
    url: 'https://images.pexels.com/photos/777059/pexels-photo-777059.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/777059/pexels-photo-777059.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Hong Kong': {
    url: 'https://images.pexels.com/photos/1337144/pexels-photo-1337144.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1337144/pexels-photo-1337144.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Dubai': {
    url: 'https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg?auto=compress&cs=tinysrgb&w=400',
  },

  // Americas
  'New York': {
    url: 'https://images.pexels.com/photos/802024/pexels-photo-802024.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/802024/pexels-photo-802024.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Los Angeles': {
    url: 'https://images.pexels.com/photos/1434580/pexels-photo-1434580.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1434580/pexels-photo-1434580.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Miami': {
    url: 'https://images.pexels.com/photos/421655/pexels-photo-421655.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/421655/pexels-photo-421655.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Mexico City': {
    url: 'https://images.pexels.com/photos/3290068/pexels-photo-3290068.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/3290068/pexels-photo-3290068.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Rio de Janeiro': {
    url: 'https://images.pexels.com/photos/351283/pexels-photo-351283.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/351283/pexels-photo-351283.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Buenos Aires': {
    url: 'https://images.pexels.com/photos/1060803/pexels-photo-1060803.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1060803/pexels-photo-1060803.jpeg?auto=compress&cs=tinysrgb&w=400',
  },

  // Islands & Beach destinations
  'Maldives': {
    url: 'https://images.pexels.com/photos/1287460/pexels-photo-1287460.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1287460/pexels-photo-1287460.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Mauritius': {
    url: 'https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Seychelles': {
    url: 'https://images.pexels.com/photos/1450353/pexels-photo-1450353.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1450353/pexels-photo-1450353.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Canary Islands': {
    url: 'https://images.pexels.com/photos/1450340/pexels-photo-1450340.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1450340/pexels-photo-1450340.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  'Tenerife': {
    url: 'https://images.pexels.com/photos/1450340/pexels-photo-1450340.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
    thumb: 'https://images.pexels.com/photos/1450340/pexels-photo-1450340.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
};

// Generic fallback by country/region
const COUNTRY_FALLBACKS = {
  'France': 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Spain': 'https://images.pexels.com/photos/1874675/pexels-photo-1874675.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Italy': 'https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Portugal': 'https://images.pexels.com/photos/2356059/pexels-photo-2356059.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Germany': 'https://images.pexels.com/photos/1128408/pexels-photo-1128408.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Greece': 'https://images.pexels.com/photos/1010657/pexels-photo-1010657.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Croatia': 'https://images.pexels.com/photos/2044434/pexels-photo-2044434.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Morocco': 'https://images.pexels.com/photos/3889843/pexels-photo-3889843.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Japan': 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Thailand': 'https://images.pexels.com/photos/1031659/pexels-photo-1031659.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Indonesia': 'https://images.pexels.com/photos/2166553/pexels-photo-2166553.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'USA': 'https://images.pexels.com/photos/802024/pexels-photo-802024.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'United States': 'https://images.pexels.com/photos/802024/pexels-photo-802024.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'Brazil': 'https://images.pexels.com/photos/351283/pexels-photo-351283.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
  'UAE': 'https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750',
};

// Generic travel fallback
const GENERIC_TRAVEL_PHOTO = 'https://images.pexels.com/photos/1008155/pexels-photo-1008155.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750';

/**
 * Get static photo for a destination (fast, reliable)
 * @param {string} cityName - City name
 * @param {string} countryName - Country name (optional, for fallback)
 * @returns {Object} Photo data
 */
export function getStaticPhoto(cityName, countryName = '') {
  // Try exact city match first
  const normalizedCity = cityName?.trim();
  if (normalizedCity && STATIC_DESTINATION_PHOTOS[normalizedCity]) {
    const photo = STATIC_DESTINATION_PHOTOS[normalizedCity];
    return {
      url: photo.url,
      medium: photo.url,
      small: photo.thumb,
      thumb: photo.thumb,
      alt: `${normalizedCity} cityscape`,
      photographer: { name: 'Pexels', url: 'https://pexels.com' },
      source: 'static',
    };
  }

  // Try fuzzy match on city name
  const cityLower = normalizedCity?.toLowerCase() || '';
  for (const [city, photo] of Object.entries(STATIC_DESTINATION_PHOTOS)) {
    if (city.toLowerCase().includes(cityLower) || cityLower.includes(city.toLowerCase())) {
      return {
        url: photo.url,
        medium: photo.url,
        small: photo.thumb,
        thumb: photo.thumb,
        alt: `${city} cityscape`,
        photographer: { name: 'Pexels', url: 'https://pexels.com' },
        source: 'static',
      };
    }
  }

  // Try country fallback
  if (countryName && COUNTRY_FALLBACKS[countryName]) {
    return {
      url: COUNTRY_FALLBACKS[countryName],
      medium: COUNTRY_FALLBACKS[countryName],
      small: COUNTRY_FALLBACKS[countryName],
      thumb: COUNTRY_FALLBACKS[countryName],
      alt: `${countryName} landscape`,
      photographer: { name: 'Pexels', url: 'https://pexels.com' },
      source: 'country_fallback',
    };
  }

  // Generic travel photo
  return {
    url: GENERIC_TRAVEL_PHOTO,
    medium: GENERIC_TRAVEL_PHOTO,
    small: GENERIC_TRAVEL_PHOTO,
    thumb: GENERIC_TRAVEL_PHOTO,
    alt: `${cityName || 'Travel'} destination`,
    photographer: { name: 'Pexels', url: 'https://pexels.com' },
    source: 'generic',
  };
}

/**
 * Fallback photo database - now uses static photos
 */
function getFallbackPhoto(cityName, countryName = '') {
  return getStaticPhoto(cityName, countryName);
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
