/**
 * Static destination image database
 * High-quality, reliable images from Pexels CDN
 * Used for saved trips, landing page, and fallbacks
 */

const STATIC_DESTINATION_PHOTOS = {
  // Western Europe
  'Paris': 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=800',
  'London': 'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Amsterdam': 'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Brussels': 'https://images.pexels.com/photos/5604935/pexels-photo-5604935.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Luxembourg': 'https://images.pexels.com/photos/15377723/pexels-photo-15377723.jpeg?auto=compress&cs=tinysrgb&w=800',

  // Spain
  'Barcelona': 'https://images.pexels.com/photos/1874675/pexels-photo-1874675.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Madrid': 'https://images.pexels.com/photos/3757144/pexels-photo-3757144.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Seville': 'https://images.pexels.com/photos/6207082/pexels-photo-6207082.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Valencia': 'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=800',

  // Portugal
  'Lisbon': 'https://images.pexels.com/photos/2356059/pexels-photo-2356059.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Porto': 'https://images.pexels.com/photos/2549018/pexels-photo-2549018.jpeg?auto=compress&cs=tinysrgb&w=800',

  // Italy
  'Rome': 'https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Venice': 'https://images.pexels.com/photos/1796736/pexels-photo-1796736.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Florence': 'https://images.pexels.com/photos/1797161/pexels-photo-1797161.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Milan': 'https://images.pexels.com/photos/2706750/pexels-photo-2706750.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Naples': 'https://images.pexels.com/photos/4819033/pexels-photo-4819033.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Amalfi': 'https://images.pexels.com/photos/4846097/pexels-photo-4846097.jpeg?auto=compress&cs=tinysrgb&w=800',

  // Eastern Europe
  'Prague': 'https://images.pexels.com/photos/1850619/pexels-photo-1850619.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Budapest': 'https://images.pexels.com/photos/3587583/pexels-photo-3587583.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Vienna': 'https://images.pexels.com/photos/1493088/pexels-photo-1493088.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Krakow': 'https://images.pexels.com/photos/2157404/pexels-photo-2157404.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Warsaw': 'https://images.pexels.com/photos/3617500/pexels-photo-3617500.jpeg?auto=compress&cs=tinysrgb&w=800',

  // Balkans
  'Dubrovnik': 'https://images.pexels.com/photos/2044434/pexels-photo-2044434.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Split': 'https://images.pexels.com/photos/2440061/pexels-photo-2440061.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Ljubljana': 'https://images.pexels.com/photos/3566187/pexels-photo-3566187.jpeg?auto=compress&cs=tinysrgb&w=800',

  // Greece
  'Athens': 'https://images.pexels.com/photos/772689/pexels-photo-772689.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Santorini': 'https://images.pexels.com/photos/1010657/pexels-photo-1010657.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Mykonos': 'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=800',

  // Scandinavia
  'Copenhagen': 'https://images.pexels.com/photos/2563681/pexels-photo-2563681.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Stockholm': 'https://images.pexels.com/photos/3930091/pexels-photo-3930091.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Oslo': 'https://images.pexels.com/photos/1768478/pexels-photo-1768478.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Helsinki': 'https://images.pexels.com/photos/1538177/pexels-photo-1538177.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Reykjavik': 'https://images.pexels.com/photos/2128028/pexels-photo-2128028.jpeg?auto=compress&cs=tinysrgb&w=800',

  // Germany
  'Berlin': 'https://images.pexels.com/photos/1128408/pexels-photo-1128408.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Munich': 'https://images.pexels.com/photos/3618540/pexels-photo-3618540.jpeg?auto=compress&cs=tinysrgb&w=800',

  // Morocco
  'Marrakech': 'https://images.pexels.com/photos/3889843/pexels-photo-3889843.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Casablanca': 'https://images.pexels.com/photos/4577791/pexels-photo-4577791.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Fez': 'https://images.pexels.com/photos/4577793/pexels-photo-4577793.jpeg?auto=compress&cs=tinysrgb&w=800',

  // Asia
  'Tokyo': 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Kyoto': 'https://images.pexels.com/photos/1440476/pexels-photo-1440476.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Bangkok': 'https://images.pexels.com/photos/1031659/pexels-photo-1031659.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Bali': 'https://images.pexels.com/photos/2166553/pexels-photo-2166553.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Singapore': 'https://images.pexels.com/photos/777059/pexels-photo-777059.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Hong Kong': 'https://images.pexels.com/photos/1337144/pexels-photo-1337144.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Dubai': 'https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg?auto=compress&cs=tinysrgb&w=800',

  // Americas
  'New York': 'https://images.pexels.com/photos/802024/pexels-photo-802024.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Los Angeles': 'https://images.pexels.com/photos/1434580/pexels-photo-1434580.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Miami': 'https://images.pexels.com/photos/421655/pexels-photo-421655.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Mexico City': 'https://images.pexels.com/photos/3290068/pexels-photo-3290068.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Rio de Janeiro': 'https://images.pexels.com/photos/351283/pexels-photo-351283.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Buenos Aires': 'https://images.pexels.com/photos/1060803/pexels-photo-1060803.jpeg?auto=compress&cs=tinysrgb&w=800',

  // Beach destinations
  'Maldives': 'https://images.pexels.com/photos/1287460/pexels-photo-1287460.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Mauritius': 'https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Seychelles': 'https://images.pexels.com/photos/1450353/pexels-photo-1450353.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Tenerife': 'https://images.pexels.com/photos/1450340/pexels-photo-1450340.jpeg?auto=compress&cs=tinysrgb&w=800',
};

// Country fallbacks
const COUNTRY_FALLBACKS = {
  'France': 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Spain': 'https://images.pexels.com/photos/1874675/pexels-photo-1874675.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Italy': 'https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Portugal': 'https://images.pexels.com/photos/2356059/pexels-photo-2356059.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Germany': 'https://images.pexels.com/photos/1128408/pexels-photo-1128408.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Greece': 'https://images.pexels.com/photos/1010657/pexels-photo-1010657.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Croatia': 'https://images.pexels.com/photos/2044434/pexels-photo-2044434.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Morocco': 'https://images.pexels.com/photos/3889843/pexels-photo-3889843.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Japan': 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Thailand': 'https://images.pexels.com/photos/1031659/pexels-photo-1031659.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Indonesia': 'https://images.pexels.com/photos/2166553/pexels-photo-2166553.jpeg?auto=compress&cs=tinysrgb&w=800',
  'USA': 'https://images.pexels.com/photos/802024/pexels-photo-802024.jpeg?auto=compress&cs=tinysrgb&w=800',
  'United States': 'https://images.pexels.com/photos/802024/pexels-photo-802024.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Brazil': 'https://images.pexels.com/photos/351283/pexels-photo-351283.jpeg?auto=compress&cs=tinysrgb&w=800',
  'UAE': 'https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg?auto=compress&cs=tinysrgb&w=800',
  'United Arab Emirates': 'https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Netherlands': 'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Belgium': 'https://images.pexels.com/photos/5604935/pexels-photo-5604935.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Czech Republic': 'https://images.pexels.com/photos/1850619/pexels-photo-1850619.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Czechia': 'https://images.pexels.com/photos/1850619/pexels-photo-1850619.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Hungary': 'https://images.pexels.com/photos/3587583/pexels-photo-3587583.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Austria': 'https://images.pexels.com/photos/1493088/pexels-photo-1493088.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Poland': 'https://images.pexels.com/photos/2157404/pexels-photo-2157404.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Denmark': 'https://images.pexels.com/photos/2563681/pexels-photo-2563681.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Sweden': 'https://images.pexels.com/photos/3930091/pexels-photo-3930091.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Norway': 'https://images.pexels.com/photos/1768478/pexels-photo-1768478.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Finland': 'https://images.pexels.com/photos/1538177/pexels-photo-1538177.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Iceland': 'https://images.pexels.com/photos/2128028/pexels-photo-2128028.jpeg?auto=compress&cs=tinysrgb&w=800',
  'UK': 'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=800',
  'United Kingdom': 'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Singapore': 'https://images.pexels.com/photos/777059/pexels-photo-777059.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Mexico': 'https://images.pexels.com/photos/3290068/pexels-photo-3290068.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Argentina': 'https://images.pexels.com/photos/1060803/pexels-photo-1060803.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Slovenia': 'https://images.pexels.com/photos/3566187/pexels-photo-3566187.jpeg?auto=compress&cs=tinysrgb&w=800',
};

// Generic fallback
const GENERIC_TRAVEL_PHOTO = 'https://images.pexels.com/photos/1008155/pexels-photo-1008155.jpeg?auto=compress&cs=tinysrgb&w=800';

/**
 * Get destination image URL
 * Priority: tripData photo > static city match > country fallback > generic
 *
 * @param {Object} options
 * @param {string} options.city - City name
 * @param {string} options.country - Country name
 * @param {Object} options.tripData - Trip data that might contain photo info
 * @returns {string} Image URL
 */
export function getDestinationImage({ city, country, tripData } = {}) {
  // 1. Check if tripData has a stored photo URL
  if (tripData?.destination?.photo?.url) {
    return tripData.destination.photo.url;
  }
  if (tripData?.photo?.url) {
    return tripData.photo.url;
  }

  // 2. Try exact city match
  const normalizedCity = city?.trim();
  if (normalizedCity && STATIC_DESTINATION_PHOTOS[normalizedCity]) {
    return STATIC_DESTINATION_PHOTOS[normalizedCity];
  }

  // 3. Try fuzzy city match
  if (normalizedCity) {
    const cityLower = normalizedCity.toLowerCase();
    for (const [staticCity, url] of Object.entries(STATIC_DESTINATION_PHOTOS)) {
      if (staticCity.toLowerCase().includes(cityLower) || cityLower.includes(staticCity.toLowerCase())) {
        return url;
      }
    }
  }

  // 4. Try country fallback
  if (country && COUNTRY_FALLBACKS[country]) {
    return COUNTRY_FALLBACKS[country];
  }

  // 5. Generic travel photo
  return GENERIC_TRAVEL_PHOTO;
}

/**
 * Get all available static destinations (for landing page showcase)
 */
export function getFeaturedDestinations() {
  return [
    { city: 'Lisbon', country: 'Portugal', image: STATIC_DESTINATION_PHOTOS['Lisbon'] },
    { city: 'Barcelona', country: 'Spain', image: STATIC_DESTINATION_PHOTOS['Barcelona'] },
    { city: 'Rome', country: 'Italy', image: STATIC_DESTINATION_PHOTOS['Rome'] },
  ];
}

export { STATIC_DESTINATION_PHOTOS, COUNTRY_FALLBACKS, GENERIC_TRAVEL_PHOTO };
