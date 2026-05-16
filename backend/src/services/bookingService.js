// backend/src/services/bookingService.js
// Booking.com API integration for flights and hotels
import axios from 'axios';
import * as cache from '../utils/cache.js';

const BASE_URL = 'https://booking-com15.p.rapidapi.com';
const BOOKING_API_KEY = process.env.BOOKING_API_KEY;

// Booking.com search results return tiny thumbnails (square60 / square200).
// The bstatic CDN serves the SAME image at any size by swapping the size
// segment — upgrade to a large variant so hotel photos aren't pixelated.
function hiResPhoto(url) {
  if (typeof url !== 'string' || !url.includes('bstatic.com')) return url;
  return url.replace(/\/(square\d+|max\d+(?:x\d+)?|source)\//, '/max1024x768/');
}

// Travelpayouts affiliate deeplink wrapper (commission tracking). Env-driven:
// without TP_MARKER the raw URL is returned unchanged so links keep working.
const TP_MARKER = process.env.TP_MARKER || '';
const TP_CAMPAIGN = process.env.TP_CAMPAIGN || '';
const TP_P_BOOKING = process.env.TP_P_BOOKING || '';
function affiliateUrl(targetUrl) {
  if (!targetUrl || !TP_MARKER) return targetUrl;
  const params = new URLSearchParams();
  params.set('marker', TP_MARKER);
  if (TP_P_BOOKING) params.set('p', TP_P_BOOKING);
  if (TP_CAMPAIGN) params.set('campaign_id', TP_CAMPAIGN);
  params.set('u', targetUrl);
  return `https://tp.media/r?${params.toString()}`;
}
if (!BOOKING_API_KEY) {
  console.error('[BookingService] BOOKING_API_KEY not set in environment variables');
}

const CACHE_TTL = {
  DESTINATION_ID: 43200,    // 30 days in minutes (permanent cache for destination IDs)
  FLIGHT_SEARCH: 60,        // 1 hour in minutes (flight prices change)
  HOTEL_SEARCH: 360,        // 6 hours in minutes (hotel prices change)
  HOTEL_DETAILS: 720,       // 12 hours in minutes (details more stable)
};

// IATA code to city name mapping for common airports
// Booking.com API doesn't recognize IATA codes, needs city names
const IATA_TO_CITY = {
  'PAR': 'Paris',
  'CDG': 'Paris',
  'ORY': 'Paris',
  'BVA': 'Paris', // Paris Beauvais (Ryanair hub ~80km north of Paris)
  'LON': 'London',
  'LHR': 'London',
  'LGW': 'London',
  'STN': 'London',
  'LTN': 'London',
  'NYC': 'New York',
  'JFK': 'New York',
  'EWR': 'New York',
  'LGA': 'New York',
  'BCN': 'Barcelona',
  'MAD': 'Madrid',
  'ROM': 'Rome',
  'FCO': 'Rome',
  'CIA': 'Rome',
  'MIL': 'Milan',
  'MXP': 'Milan',
  'LIN': 'Milan',
  'BER': 'Berlin',
  'TXL': 'Berlin',
  'SXF': 'Berlin',
  'AMS': 'Amsterdam',
  'BRU': 'Brussels',
  'VIE': 'Vienna',
  'ZRH': 'Zurich',
  'GVA': 'Geneva',
  'LIS': 'Lisbon',
  'OPO': 'Porto',
  'DUB': 'Dublin',
  'CPH': 'Copenhagen',
  'OSL': 'Oslo',
  'STO': 'Stockholm',
  'ARN': 'Stockholm',
  'HEL': 'Helsinki',
  'ATH': 'Athens',
  'IST': 'Istanbul',
  'PRG': 'Prague',
  'BUD': 'Budapest',
  'WAW': 'Warsaw',
  'KRK': 'Krakow',
  'VCE': 'Venice',
  'FLR': 'Florence',
  'NAP': 'Naples',
  'NCE': 'Nice',
  'MRS': 'Marseille',
  'LYS': 'Lyon',
  'TLS': 'Toulouse',
  'BOD': 'Bordeaux',
  'NTE': 'Nantes',
  'MUC': 'Munich',
  'FRA': 'Frankfurt',
  'DUS': 'Dusseldorf',
  'HAM': 'Hamburg',
  'CGN': 'Cologne',
  'AGP': 'Malaga',
  'PMI': 'Palma de Mallorca',
  'IBZ': 'Ibiza',
  'SVQ': 'Seville',
  'VLC': 'Valencia',
  'BIO': 'Bilbao',
  'EDI': 'Edinburgh',
  'MAN': 'Manchester',
  'BHX': 'Birmingham',
  'GLA': 'Glasgow',
};

/**
 * Extract city name from airport name
 * @param {string} apiName - Name from API (may be airport)
 * @param {string} originalQuery - Original query from user
 * @returns {string} Clean city name
 */
function extractCityName(apiName, originalQuery) {
  // If name contains airport keywords, use original query
  const airportKeywords = ['Airport', 'Aeroporto', 'Aéroport', 'Flughafen', 'Aeropuerto'];
  const hasAirportKeyword = airportKeywords.some(keyword => apiName.includes(keyword));

  if (hasAirportKeyword) {
    return originalQuery; // Return original clean query like "Porto", "Barcelona"
  }

  return apiName; // Already a city name
}

function normalizeDestinationKey(name = '') {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(',')[0]
    .trim();
}

/**
 * Known destination mappings for problematic queries
 * Maps common names to their correct search term for flights API
 */
const DESTINATION_CORRECTIONS = {
  'bali': 'Denpasar',           // Bali → DPS (not Kraków-Balice!)
  'phuket': 'Phuket',           // Works but ensure we get Thailand
  'maldives': 'Male',           // Capital of Maldives
  'santorini': 'Santorini',     // Greek island
  'ibiza': 'Ibiza',             // Spanish island
  'mallorca': 'Palma de Mallorca',
  'majorca': 'Palma de Mallorca',
  'sicily': 'Catania',          // Main airport in Sicily
  'sardinia': 'Cagliari',       // Main airport in Sardinia
  'corsica': 'Ajaccio',         // Main airport in Corsica
  'mauritius': 'Mauritius',     // Booking flight search does not resolve Port Louis reliably
  'seychelles': 'Mahe',         // Main island
  'zanzibar': 'Zanzibar',       // Tanzania
  'canary islands': 'Tenerife', // Main island
  'cape verde': 'Sal',          // Main tourist island / SID airport
  'gran canaria': 'Las Palmas de Gran Canaria',
  'azores': 'Ponta Delgada',    // Main island
  'madeira': 'Funchal',         // Main city
  'djerba': 'Djerba',
  'crete': 'Heraklion',         // Main airport in Crete
  'rhodes': 'Rhodes',           // Greek island
  'corfu': 'Corfu',             // Greek island
  'mykonos': 'Mykonos',         // Greek island
  'oman': 'Muscat',             // Country-level query resolves to Muscat airport
  'fiji': 'Fiji',               // Display as Nadi when NAN is selected
  'barbados': 'Barbados',       // Display as Bridgetown when BGI is selected
  'cayman islands': 'Cayman Islands', // Display as Grand Cayman when GCM is selected
};

const DESTINATION_DISPLAY_NAMES_BY_QUERY = {
  'maldives': 'Male',
  'male': 'Male',
  'seychelles': 'Mahe',
  'mahe': 'Mahe',
  'mauritius': 'Port Louis',
  'oman': 'Muscat',
  'muscat': 'Muscat',
  'fiji': 'Nadi',
  'barbados': 'Bridgetown',
  'cayman islands': 'Grand Cayman',
  'faroe islands': 'Vagar',
  'sri lanka': 'Colombo',
  'new zealand': 'New Plymouth',
  'costa rica': 'San Jose',
  'costa rica (guanacaste)': 'Liberia',
  'japan': 'Tokyo',
  // Skusku 2026-05-14: Malta and Cape Verde slipped through the original
  // normalisation map — Booking returns them as country-named entries which
  // then renders as "Malta (Malta)" / "Cape Verde (Cape Verde)" in the UI
  // and trips the no_null_country quality rule.
  'malta': 'Valletta',
  'cape verde': 'Praia',
  'cabo verde': 'Praia',
  // Other country-level queries Claude tends to suggest:
  'bahrain': 'Manama',
  'brunei': 'Bandar Seri Begawan',
  'qatar': 'Doha',
  'kuwait': 'Kuwait City',
  'andorra': 'Andorra la Vella',
  'liechtenstein': 'Vaduz',
  'luxembourg': 'Luxembourg City',
};

const DESTINATION_DISPLAY_NAMES_BY_CODE = {
  MLE: 'Male',
  SEZ: 'Mahe',
  MRU: 'Port Louis',
  MCT: 'Muscat',
  NAN: 'Nadi',
  BGI: 'Bridgetown',
  GCM: 'Grand Cayman',
  FAE: 'Vagar',
  CMB: 'Colombo',
  NPL: 'New Plymouth',
  SJO: 'San Jose',
  LIR: 'Liberia',
  TYO: 'Tokyo',
  MLA: 'Valletta',           // Malta
  RAI: 'Praia',              // Cape Verde
  SID: 'Sal',                // Cape Verde alt airport
  BAH: 'Manama',             // Bahrain
  BWN: 'Bandar Seri Begawan',// Brunei
  DOH: 'Doha',               // Qatar
  KWI: 'Kuwait City',
  ALV: 'Andorra la Vella',
  LUX: 'Luxembourg City',
};

function getDisplayCityName(selectedDest, originalQuery, resolvedName) {
  const originalKey = normalizeDestinationKey(originalQuery);
  const resolvedKey = normalizeDestinationKey(resolvedName);
  const codeOverride = DESTINATION_DISPLAY_NAMES_BY_CODE[(selectedDest.code || '').toUpperCase()];
  const queryOverride = DESTINATION_DISPLAY_NAMES_BY_QUERY[originalKey] || DESTINATION_DISPLAY_NAMES_BY_QUERY[resolvedKey];

  return codeOverride || queryOverride || extractCityName(selectedDest.name, resolvedName || originalQuery);
}

function normalizeCachedDestination(destination, destinationName) {
  if (!destination) return destination;

  const cityName = getDisplayCityName(destination, destinationName, destination.originalQuery || destinationName);
  if (cityName === destination.cityName) return destination;

  return {
    ...destination,
    cityName,
    originalQuery: destination.originalQuery || destinationName,
  };
}

const EXPECTED_COUNTRIES_BY_DESTINATION = {
  'bali': 'indonesia',
  'denpasar': 'indonesia',
  'phuket': 'thailand',
  'bangkok': 'thailand',
  'tokyo': 'japan',
  'japan': 'japan',
  'maldives': 'maldives',
  'male': 'maldives',
  'marrakech': 'morocco',
  'fez': 'morocco',
  'dubai': 'united arab emirates',
  'cape town': 'south africa',
  'zanzibar': 'tanzania',
  'mauritius': 'mauritius',
  'seychelles': 'seychelles',
  'porto': 'portugal',
  'lisbon': 'portugal',
  'funchal': 'portugal',
  'ponta delgada': 'portugal',
  'valencia': 'spain',
  'seville': 'spain',
  'malaga': 'spain',
  'bilbao': 'spain',
  'palma de mallorca': 'spain',
  'ibiza': 'spain',
  'tenerife': 'spain',
  'gran canaria': 'spain',
  'las palmas de gran canaria': 'spain',
  'cape verde': 'cape verde',
  'sal': 'cape verde',
  'djerba': 'tunisia',
  'hurghada': 'egypt',
  'agadir': 'morocco',
  'faro': 'portugal',
  'barcelona': 'spain',
  'madrid': 'spain',
  'florence': 'italy',
  'bologna': 'italy',
  'naples': 'italy',
  'palermo': 'italy',
  'turin': 'italy',
  'catania': 'italy',
  'cagliari': 'italy',
  'ajaccio': 'france',
  'edinburgh': 'united kingdom',
  'dublin': 'ireland',
  'athens': 'greece',
  'thessaloniki': 'greece',
  'santorini': 'greece',
  'heraklion': 'greece',
  'rhodes': 'greece',
  'corfu': 'greece',
  'mykonos': 'greece',
  'split': 'croatia',
  'dubrovnik': 'croatia',
  'krakow': 'poland',
  'gdansk': 'poland',
  'wroclaw': 'poland',
  'budapest': 'hungary',
  'ljubljana': 'slovenia',
  'sofia': 'bulgaria',
  'tallinn': 'estonia',
  'riga': 'latvia',
  'vilnius': 'lithuania',
  'helsinki': 'finland',
  'stockholm': 'sweden',
  'copenhagen': 'denmark',
  'reykjavik': 'iceland',
  'bergen': 'norway',
  'istanbul': 'turkey',
  'tbilisi': 'georgia',
  'amman': 'jordan',
  'muscat': 'oman',
  'oman': 'oman',
};

function expectedCountryFor(queryName = '') {
  const baseQuery = normalizeDestinationKey(queryName);
  return EXPECTED_COUNTRIES_BY_DESTINATION[baseQuery] || null;
}

function resultCountryName(result) {
  return (result.countryName || result.country || '').toLowerCase();
}

function matchesExpectedCountry(result, expectedCountry) {
  if (!expectedCountry) return true;
  return resultCountryName(result).includes(expectedCountry);
}

/**
 * Check if a destination result matches the expected query
 * Prevents mismatches like "Bali" → "Kraków-Balice"
 */
function isDestinationMatch(result, queryName) {
  const query = queryName.toLowerCase().trim();
  const resultName = (result.name || '').toLowerCase();
  const resultCountry = resultCountryName(result);

  // Extract base query (remove country suffix like "Bali, Indonesia")
  const baseQuery = query.split(',')[0].trim();

  // If we know the expected country, verify it matches
  const expectedCountry = expectedCountryFor(baseQuery);
  if (expectedCountry && !matchesExpectedCountry(result, expectedCountry)) {
    console.log(`   ⚠️ Country mismatch: "${resultName}" is in ${resultCountry}, expected ${expectedCountry}`);
    return false;
  }

  // Check if the result name contains the query (or vice versa)
  // But avoid partial matches like "Bali" matching "Balice"
  if (resultName.includes(baseQuery) || baseQuery.includes(resultName.split(' ')[0])) {
    // Verify it's not a false positive (like Balice for Bali)
    if (baseQuery === 'bali' && resultName.includes('balice')) {
      return false; // Reject Kraków-Balice for Bali query
    }
    return true;
  }

  // For airports, check if the airport is in the expected location
  // E.g., "Ngurah Rai International Airport" for "Bali" query is OK
  if (result.type === 'AIRPORT' && expectedCountry) {
    return resultCountry.includes(expectedCountry);
  }

  return false;
}

/**
 * Search destination and get ID (with Redis caching)
 * @param {string} destinationName - City or destination name
 * @returns {Promise<Object>} Destination with id, name, type, country
 */
export async function getDestinationId(destinationName) {
  // Convert IATA codes to city names (Booking.com doesn't recognize IATA codes)
  const upperName = destinationName.toUpperCase();
  let resolvedName = IATA_TO_CITY[upperName] || destinationName;

  // Apply destination corrections for known problematic queries
  const lowerName = resolvedName.toLowerCase().split(',')[0].trim();
  if (DESTINATION_CORRECTIONS[lowerName]) {
    const corrected = DESTINATION_CORRECTIONS[lowerName];
    console.log(`🔄 Correcting destination "${resolvedName}" → "${corrected}" (known mapping)`);
    resolvedName = corrected;
  }

  if (resolvedName !== destinationName && !DESTINATION_CORRECTIONS[lowerName]) {
    console.log(`🔄 Resolved IATA code "${destinationName}" → "${resolvedName}"`);
  }

  const cacheKey = `booking:destination:${destinationName.toLowerCase()}`;

  // Check cache first (30 days TTL)
  const cached = await cache.get(cacheKey);
  if (cached) {
    console.log(`✅ Cache HIT for "${destinationName}" → ${cached.id}`);
    const normalized = normalizeCachedDestination(cached, destinationName);
    if (normalized !== cached) {
      cache.set(cacheKey, normalized, CACHE_TTL.DESTINATION_ID);
    }
    return normalized;
  }

  console.log(`🔍 Searching destination "${resolvedName}"...`);

  try {
    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchDestination`, {
      params: {
        query: resolvedName
      },
      headers: {
        'x-rapidapi-key': BOOKING_API_KEY,
        'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
      }
    });

    if (!response.data?.status || !response.data?.data?.length) {
      throw new Error(`No destination found for "${resolvedName}"`);
    }

    const results = response.data.data;
    const expectedCountry = expectedCountryFor(destinationName);

    // Smart destination selection:
    // 1. First try to find a CITY that matches the query
    // 2. Then try any result that matches the expected country
    // 3. Fall back to first result only if it passes validation

    let selectedDest = null;

    // Priority 1: CITY type that matches query
    const matchingCity = results.find(d => d.type === 'CITY' && isDestinationMatch(d, destinationName));
    if (matchingCity) {
      selectedDest = matchingCity;
      console.log(`   ✅ Found matching CITY: ${selectedDest.name}`);
    }

    // Priority 2: Any type that matches query (airport, etc.)
    if (!selectedDest) {
      const matchingAny = results.find(d => isDestinationMatch(d, destinationName));
      if (matchingAny) {
        selectedDest = matchingAny;
        console.log(`   ✅ Found matching ${selectedDest.type}: ${selectedDest.name}`);
      }
    }

    // Priority 3: First CITY (if no match found but might be correct)
    if (!selectedDest) {
      const firstCity = results.find(d => d.type === 'CITY' && matchesExpectedCountry(d, expectedCountry));
      if (firstCity) {
        console.log(`   ⚠️ No exact match, using first CITY: ${firstCity.name} (${firstCity.countryName || firstCity.country})`);
        selectedDest = firstCity;
      }
    }

    // Priority 4: First result in the expected country, then first result as last resort
    if (!selectedDest) {
      selectedDest = results.find(d => matchesExpectedCountry(d, expectedCountry)) || results[0];
      console.log(`   ⚠️ No CITY found, using first result: ${selectedDest.name} (${selectedDest.countryName || selectedDest.country})`);
    }

    const destination = {
      id: selectedDest.id,
      name: selectedDest.name,
      code: selectedDest.code,
      type: selectedDest.type,
      country: selectedDest.country,
      countryName: selectedDest.countryName,
      // Add cityName for hotel/attraction searches
      cityName: getDisplayCityName(selectedDest, destinationName, resolvedName),
      flightCode: selectedDest.id, // Explicit flight code for clarity
      originalQuery: destinationName // Keep original query for reference
    };

    // Cache for 30 days
    cache.set(cacheKey, destination, CACHE_TTL.DESTINATION_ID);

    console.log(`📍 Found & cached: ${destination.name} (${destination.id}) → cityName: ${destination.cityName}`);
    return destination;

  } catch (error) {
    console.error(`❌ getDestinationId failed for "${resolvedName}" (original: "${destinationName}"):`, error.message);
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
  const cached = await cache.get(cacheKey);
  if (cached) {
    console.log(`✅ Flight cache HIT: ${fromId} → ${toId}`);
    return cached;
  }

  // ✅ FIX #2: Round-trip with fallback
  if (returnDate) {
    console.log(`✈️  Round-trip search: ${fromId} → ${toId} (${departDate} to ${returnDate})`);

    try {
      // Try round-trip API first
      const result = await searchRoundTripDirect({
        fromId, toId, departDate, returnDate,
        adults, cabinClass, currency, sort
      });

      cache.set(cacheKey, result, CACHE_TTL.FLIGHT_SEARCH);
      return result;

    } catch (error) {
      // If timeout or error, fallback to 2× one-way
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.warn(`⚠️  Round-trip timeout, using 2× one-way fallback`);
      } else {
        console.warn(`⚠️  Round-trip failed (${error.message}), using 2× one-way fallback`);
      }

      const result = await searchTwoOneWayFlights({
        fromId, toId, departDate, returnDate,
        adults, cabinClass, currency, sort
      });

      cache.set(cacheKey, result, CACHE_TTL.FLIGHT_SEARCH);
      return result;
    }
  }

  // One-way search (no changes, works perfectly)
  console.log(`✈️  One-way search: ${fromId} → ${toId} on ${departDate}`);
  return await searchOneWayDirect({
    fromId, toId, departDate,
    adults, cabinClass, currency, sort
  });
}

/**
 * Search round-trip flights (direct API call)
 * @private
 */
async function searchRoundTripDirect({
  fromId, toId, departDate, returnDate,
  adults, cabinClass, currency, sort
}) {
  const params = {
    fromId,
    toId,
    departDate,
    returnDate,
    stops: 'none',
    pageNo: 1,
    adults,
    sort,
    cabinClass,
    currency_code: currency
  };

  const response = await axios.get(`${BASE_URL}/api/v1/flights/searchFlights`, {
    params,
    headers: {
      'x-rapidapi-key': BOOKING_API_KEY,
      'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
    },
    timeout: 30000 // 30s timeout - faster fallback to one-way
  });

  if (!response.data?.status || !response.data?.data?.flightOffers?.length) {
    throw new Error('No round-trip flights found');
  }

  const flights = parseFlightOffers(response.data.data.flightOffers, currency, fromId, toId, departDate, returnDate);

  console.log(`✅ Found ${flights.length} round-trip flights`);

  return {
    fromId,
    toId,
    departDate,
    returnDate,
    flights,
    count: flights.length
  };
}

/**
 * Search one-way flight (direct API call)
 * @private
 */
async function searchOneWayDirect({
  fromId, toId, departDate,
  adults, cabinClass, currency, sort
}) {
  const cacheKey = `booking:flights:${fromId}:${toId}:${departDate}:null:${adults}:${cabinClass}`;

  const cached = await cache.get(cacheKey);
  if (cached) {
    console.log(`✅ Flight cache HIT: ${fromId} → ${toId}`);
    return cached;
  }

  const params = {
    fromId,
    toId,
    departDate,
    stops: 'none',
    pageNo: 1,
    adults,
    sort,
    cabinClass,
    currency_code: currency
  };

  const response = await axios.get(`${BASE_URL}/api/v1/flights/searchFlights`, {
    params,
    headers: {
      'x-rapidapi-key': BOOKING_API_KEY,
      'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
    },
    timeout: 30000
  });

  if (!response.data?.status || !response.data?.data?.flightOffers?.length) {
    console.warn(`⚠️  No flights found: ${fromId} → ${toId}`);
    return {
      fromId,
      toId,
      departDate,
      returnDate: null,
      flights: [],
      count: 0
    };
  }

  const flights = parseFlightOffers(response.data.data.flightOffers, currency, fromId, toId, departDate, null);

  const result = {
    fromId,
    toId,
    departDate,
    returnDate: null,
    flights,
    count: flights.length
  };

  cache.set(cacheKey, result, CACHE_TTL.FLIGHT_SEARCH);

  console.log(`✅ Found ${flights.length} one-way flights`);
  return result;
}

/**
 * Fallback: Search 2× one-way flights and combine cheapest
 * @private
 */
async function searchTwoOneWayFlights({
  fromId, toId, departDate, returnDate,
  adults, cabinClass, currency, sort
}) {
  console.log(`🔄 Searching 2× one-way flights as fallback...`);

  const [outboundResults, returnResults] = await Promise.all([
    searchOneWayDirect({ fromId, toId, departDate, adults, cabinClass, currency, sort }),
    searchOneWayDirect({ fromId: toId, toId: fromId, departDate: returnDate, adults, cabinClass, currency, sort })
  ]);

  if (outboundResults.count === 0 || returnResults.count === 0) {
    console.warn('⚠️  One or both one-way searches returned 0 flights');
    return {
      fromId,
      toId,
      departDate,
      returnDate,
      flights: [],
      count: 0
    };
  }

  // Combine cheapest outbound + cheapest return
  const outboundFlight = outboundResults.flights[0];
  const returnFlight = returnResults.flights[0];

  const combinedFlight = {
    token: `${outboundFlight.token}|${returnFlight.token}`,
    price: {
      amount: outboundFlight.price.amount + returnFlight.price.amount,
      currency: outboundFlight.price.currency,
      formatted: `${outboundFlight.price.currency} ${outboundFlight.price.amount + returnFlight.price.amount}`
    },
    outbound: outboundFlight.outbound,
    return: returnFlight.outbound, // Return flight's outbound is the return segment
    // Booking URLs for each leg
    bookingUrl: `https://www.booking.com/flights?type=ONEWAY&from=${fromId}&to=${toId}&depart_date=${departDate}&adults=1&token=${outboundFlight.token}`
  };

  console.log(`✅ Combined 2× one-way: €${combinedFlight.price.amount} (outbound €${outboundFlight.price.amount} + return €${returnFlight.price.amount})`);

  return {
    fromId,
    toId,
    departDate,
    returnDate,
    flights: [combinedFlight],
    count: 1,
    isCombinedOneWay: true // Flag to indicate this is a fallback
  };
}

/**
 * Parse flight offers from API response
 * @private
 */
function parseFlightOffers(flightOffers, currency, fromId, toId, departDate, returnDate) {
  return flightOffers.map(offer => {
    const outbound = offer.segments?.[0];
    const returnSeg = offer.segments?.[1];
    const price = offer.priceBreakdown?.total;

    // Generate Booking.com flight booking URL
    const bookingUrl = returnDate
      ? `https://www.booking.com/flights?type=ROUNDTRIP&from=${fromId}&to=${toId}&depart_date=${departDate}&return_date=${returnDate}&adults=1&token=${offer.token}`
      : `https://www.booking.com/flights?type=ONEWAY&from=${fromId}&to=${toId}&depart_date=${departDate}&adults=1&token=${offer.token}`;

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
        // totalTime is in seconds, convert to minutes
        duration: Math.round((outbound.totalTime || 0) / 60),
        stops: (outbound.legs?.length || 1) - 1,
        airline: outbound.legs?.[0]?.carriersData?.[0]?.name,
        airlineCode: outbound.legs?.[0]?.carriersData?.[0]?.code,
        airlineLogo: outbound.legs?.[0]?.carriersData?.[0]?.logo,
        // Include all legs for multi-segment flights
        segments: outbound.legs?.map(leg => ({
          departureAirport: leg.departureAirport?.code,
          arrivalAirport: leg.arrivalAirport?.code,
          departureTime: leg.departureTime,
          arrivalTime: leg.arrivalTime,
          duration: Math.round((leg.flightInfo?.elapsedTime || 0) / 60),
          airline: leg.carriersData?.[0]?.name,
          airlineCode: leg.carriersData?.[0]?.code,
          airlineLogo: leg.carriersData?.[0]?.logo,
          flightNumber: leg.flightInfo?.flightNumber,
        })) || [],
      } : null,
      return: returnSeg ? {
        departureAirport: returnSeg.departureAirport?.code,
        arrivalAirport: returnSeg.arrivalAirport?.code,
        departureTime: returnSeg.departureTime,
        arrivalTime: returnSeg.arrivalTime,
        duration: Math.round((returnSeg.totalTime || 0) / 60),
        stops: (returnSeg.legs?.length || 1) - 1,
        airline: returnSeg.legs?.[0]?.carriersData?.[0]?.name,
        airlineCode: returnSeg.legs?.[0]?.carriersData?.[0]?.code,
        airlineLogo: returnSeg.legs?.[0]?.carriersData?.[0]?.logo,
        segments: returnSeg.legs?.map(leg => ({
          departureAirport: leg.departureAirport?.code,
          arrivalAirport: leg.arrivalAirport?.code,
          departureTime: leg.departureTime,
          arrivalTime: leg.arrivalTime,
          duration: Math.round((leg.flightInfo?.elapsedTime || 0) / 60),
          airline: leg.carriersData?.[0]?.name,
          airlineCode: leg.carriersData?.[0]?.code,
          airlineLogo: leg.carriersData?.[0]?.logo,
          flightNumber: leg.flightInfo?.flightNumber,
        })) || [],
      } : null,
      bookingUrl: bookingUrl
    };
  });
}

/**
 * Extract trip context keywords from user's free text description AND trip type selector
 * Used for hotel scoring and filtering
 * @param {string} tripContext - User's free text description (travelVibeDescription)
 * @param {string} tripType - User's selected trip type (solo, couple, family, friends, business)
 * @returns {Object} Extracted context with keywords and scores
 */
function extractTripContext(tripContext, tripType = null) {
  // Initialize with defaults
  let isRomantic = false;
  let isSpa = false;
  let isBusiness = false;
  let isFamily = false;
  let isAdventure = false;
  let isLuxury = false;
  let matchedKeywords = [];

  // First, apply trip type from selector (explicit user choice)
  if (tripType) {
    switch (tripType) {
      case 'couple':
        isRomantic = true;
        matchedKeywords.push('couple');
        break;
      case 'family':
        isFamily = true;
        matchedKeywords.push('family');
        break;
      case 'business':
        isBusiness = true;
        matchedKeywords.push('business');
        break;
      case 'friends':
        // Friends trips: prioritize social/fun amenities but no specific category
        matchedKeywords.push('friends');
        break;
      // 'solo' doesn't set any specific flags
    }
  }

  // Then, enhance with free text analysis if provided (can override or add to selector)
  if (tripContext && typeof tripContext === 'string') {
    const text = tripContext.toLowerCase();

    // Detect trip type/vibe from keywords
    const romanticKeywords = ['romantic', 'romantique', 'couple', 'honeymoon', 'lune de miel', 'anniversary', 'anniversaire', 'amoureux', 'love', 'wife', 'femme', 'husband', 'mari', 'girlfriend', 'copine', 'boyfriend', 'copain', 'valentine', 'saint-valentin'];
    const spaKeywords = ['spa', 'wellness', 'bien-être', 'relax', 'détente', 'massage', 'zen', 'peaceful', 'calm', 'tranquille', 'repos'];
    const businessKeywords = ['business', 'work', 'travail', 'conference', 'conférence', 'meeting', 'réunion', 'professionnel'];
    const familyKeywords = ['family', 'famille', 'kids', 'enfants', 'children', 'baby', 'bébé'];
    const adventureKeywords = ['adventure', 'aventure', 'hiking', 'randonnée', 'sport', 'active', 'actif', 'outdoor', 'plein air'];
    const luxuryKeywords = ['luxury', 'luxe', 'premium', 'upscale', 'haut de gamme', '5 star', '5 étoiles', 'exclusive', 'exclusif', 'birthday', 'anniversaire', '50 ans', '40 ans', '30 ans'];

    // Text analysis can enhance but also override if more specific
    if (romanticKeywords.some(kw => text.includes(kw))) isRomantic = true;
    if (spaKeywords.some(kw => text.includes(kw))) isSpa = true;
    if (businessKeywords.some(kw => text.includes(kw))) isBusiness = true;
    if (familyKeywords.some(kw => text.includes(kw))) isFamily = true;
    if (adventureKeywords.some(kw => text.includes(kw))) isAdventure = true;
    if (luxuryKeywords.some(kw => text.includes(kw))) isLuxury = true;

    // Extract all matched keywords for hotel scoring
    const allKeywords = [...romanticKeywords, ...spaKeywords, ...businessKeywords, ...familyKeywords, ...adventureKeywords, ...luxuryKeywords];
    const textKeywords = allKeywords.filter(kw => text.includes(kw));
    matchedKeywords = [...new Set([...matchedKeywords, ...textKeywords])]; // Dedupe
  }

  // If no context at all, return empty
  if (!tripType && (!tripContext || typeof tripContext !== 'string')) {
    return { keywords: [], isRomantic: false, isSpa: false, isBusiness: false, isFamily: false, isAdventure: false, isLuxury: false };
  }

  console.log(`   🎯 Trip context detected: type=${tripType || 'none'}, romantic=${isRomantic}, spa=${isSpa}, luxury=${isLuxury}, family=${isFamily}, adventure=${isAdventure}`);

  return {
    keywords: matchedKeywords,
    isRomantic,
    isSpa,
    isBusiness,
    isFamily,
    isAdventure,
    isLuxury,
    tripType,
    rawText: tripContext
  };
}

/**
 * Score a hotel based on trip context matching
 * @param {Object} hotel - Hotel data from Booking.com API
 * @param {Object} tripContext - Extracted trip context
 * @returns {number} Score bonus (0-100) based on context match
 */
function scoreHotelByContext(hotel, tripContext) {
  if (!tripContext || !tripContext.keywords?.length) {
    return 0; // No context = no bonus
  }

  let score = 0;
  const hotelName = (hotel.property?.name || '').toLowerCase();
  const hotelAmenities = (hotel.property?.amenities || []).map(a => (typeof a === 'string' ? a : a.name || '').toLowerCase());
  const hotelDescription = (hotel.accessibilityLabel || '').toLowerCase();
  const allHotelText = `${hotelName} ${hotelAmenities.join(' ')} ${hotelDescription}`;

  // Score based on trip context type
  if (tripContext.isRomantic) {
    // Romantic trip: prioritize boutique hotels, suites, romantic vibes
    const romanticAmenities = ['spa', 'jacuzzi', 'suite', 'romantic', 'boutique', 'adults only', 'adult-only', 'honeymoon', 'champagne', 'rooftop', 'view', 'terrace', 'balcon', 'balcony'];
    const romanticMatches = romanticAmenities.filter(a => allHotelText.includes(a)).length;
    score += romanticMatches * 15;

    // Penalize family-oriented hotels
    const familyTerms = ['family', 'famille', 'kids', 'children', 'playground', 'family room', 'bunk bed'];
    const familyMatches = familyTerms.filter(t => allHotelText.includes(t)).length;
    score -= familyMatches * 10;

    // Bonus for higher star ratings (romantic = usually want nicer hotels)
    const stars = hotel.property?.propertyClass || 0;
    if (stars >= 4) score += 20;
    if (stars === 5) score += 15;
  }

  if (tripContext.isSpa) {
    // Spa/wellness trip: prioritize spa facilities
    const spaAmenities = ['spa', 'wellness', 'sauna', 'steam', 'massage', 'jacuzzi', 'hot tub', 'pool', 'piscine', 'fitness', 'gym', 'hammam'];
    const spaMatches = spaAmenities.filter(a => allHotelText.includes(a)).length;
    score += spaMatches * 20;
  }

  if (tripContext.isLuxury) {
    // Luxury/special occasion: prioritize high-end properties
    const luxuryAmenities = ['luxury', 'premium', 'suite', '5 star', 'palace', 'grand', 'royal', 'exclusive', 'concierge', 'butler', 'vip'];
    const luxuryMatches = luxuryAmenities.filter(a => allHotelText.includes(a)).length;
    score += luxuryMatches * 15;

    // Strong bonus for 5-star hotels
    const stars = hotel.property?.propertyClass || 0;
    if (stars === 5) score += 30;
    if (stars === 4) score += 15;

    // Bonus for high ratings
    const rating = hotel.property?.reviewScore || 0;
    if (rating >= 9) score += 20;
    if (rating >= 8.5) score += 10;
  }

  if (tripContext.isFamily) {
    // Family trip: prioritize family-friendly amenities
    const familyAmenities = ['family', 'kids', 'children', 'playground', 'family room', 'crib', 'baby', 'pool', 'kitchen', 'apartment'];
    const familyMatches = familyAmenities.filter(a => allHotelText.includes(a)).length;
    score += familyMatches * 15;
  }

  if (tripContext.isAdventure) {
    // Adventure trip: location matters more than luxury
    const adventureAmenities = ['bike', 'vélo', 'ski', 'hiking', 'outdoor', 'nature', 'mountain', 'beach', 'surf', 'dive'];
    const adventureMatches = adventureAmenities.filter(a => allHotelText.includes(a)).length;
    score += adventureMatches * 15;
  }

  return Math.max(0, Math.min(100, score)); // Cap between 0-100
}

/**
 * Map accommodation preference to hotel search parameters
 * @param {string} accommodationPref - User's accommodation preference
 * @param {number} materialComfort - 0-100 comfort slider
 * @returns {Object} Search parameters for hotel filtering
 */
function getHotelSearchFilters(accommodationPref, materialComfort = 50) {
  // Default filters
  const filters = {
    sort_by: 'popularity', // Default sort
    minStars: 0,
    maxStars: 5,
    minRating: 0, // 0-10 scale
  };

  // Map accommodationPref to filters
  switch (accommodationPref) {
    case 'luxe':
    case 'luxury':
    case '5_star':
      filters.sort_by = 'class_descending'; // Highest stars first
      filters.minStars = 4;
      filters.minRating = 8.0;
      console.log('   🏰 Luxury preference: 4-5 star hotels, rating 8+');
      break;

    case 'confort':
    case 'comfort':
    case '4_star':
    case '3_star':
      filters.sort_by = 'review_score'; // Best rated first
      filters.minStars = 3;
      filters.minRating = 7.0;
      console.log('   🏨 Comfort preference: 3-5 star hotels, rating 7+');
      break;

    case 'budget':
    case 'backpacker':
    case 'hostel':
    case 'routard':
      filters.sort_by = 'price'; // Cheapest first
      filters.minRating = 6.0; // Still maintain minimum quality
      console.log('   🎒 Budget preference: cheapest hotels, rating 6+');
      break;

    case 'airbnb':
    case 'apartment':
    case 'local':
      // Booking.com doesn't have pure Airbnb, but apartments/homes
      filters.sort_by = 'review_score';
      filters.minRating = 7.5;
      console.log('   🏠 Apartment preference: best rated apartments/homes');
      break;

    default:
      // Use materialComfort slider if no preference specified
      if (materialComfort >= 70) {
        filters.sort_by = 'class_descending';
        filters.minStars = 4;
        filters.minRating = 8.0;
        console.log(`   🏰 High comfort (${materialComfort}): 4-5 star hotels`);
      } else if (materialComfort >= 40) {
        filters.sort_by = 'review_score';
        filters.minStars = 3;
        filters.minRating = 7.0;
        console.log(`   🏨 Medium comfort (${materialComfort}): 3+ star hotels`);
      } else {
        filters.sort_by = 'price';
        filters.minRating = 6.0;
        console.log(`   🎒 Low comfort (${materialComfort}): budget hotels`);
      }
  }

  return filters;
}

function calculateHotelNights(arrivalDate, departureDate) {
  const arrival = new Date(`${arrivalDate}T00:00:00Z`);
  const departure = new Date(`${departureDate}T00:00:00Z`);
  const diffMs = departure.getTime() - arrival.getTime();

  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

/**
 * Search hotels in a destination with user preferences
 * @param {Object} params
 * @param {string} params.destinationQuery - City name
 * @param {string} params.arrivalDate - Check-in date (YYYY-MM-DD)
 * @param {string} params.departureDate - Check-out date (YYYY-MM-DD)
 * @param {number} params.adults - Number of adults
 * @param {number} params.children - Number of children (optional)
 * @param {number} params.rooms - Number of rooms
 * @param {string} params.currency - Currency code
 * @param {string} params.accommodationPref - User's accommodation preference (luxe, confort, budget, etc.)
 * @param {number} params.materialComfort - 0-100 comfort slider
 * @param {number} params.maxPrice - Maximum total price for the stay
 * @param {string} params.tripContext - User's free text description (travelVibeDescription) for context-aware filtering
 * @param {string} params.tripType - User's selected trip type (solo, couple, family, friends, business)
 * @returns {Promise<Object>} Hotel search results
 */
export async function searchHotels({
  destinationQuery,
  arrivalDate,
  departureDate,
  adults = 1,
  children = 0,
  rooms = 1,
  currency = 'EUR',
  accommodationPref = null,
  materialComfort = 50,
  maxPrice = null,
  tripContext = null, // User's free text for context-aware hotel scoring
  tripType = null, // NEW: User's selected trip type (solo, couple, family, friends, business)
}) {
  // Include preference AND tripContext AND tripType in cache key (different context = different sorting)
  const prefKey = accommodationPref || `comfort_${materialComfort}`;
  // Create a simple hash of tripContext to include in cache key
  const contextHash = tripContext ? tripContext.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '') : 'none';
  const typeHash = tripType || 'any';
  const priceKey = maxPrice ? Math.round(maxPrice) : 'any';
  const cacheKey = `booking:hotels:${destinationQuery}:${arrivalDate}:${departureDate}:${adults}:${children}:${rooms}:${currency}:${priceKey}:${prefKey}:${contextHash}:${typeHash}`;

  // Check cache
  const cached = await cache.get(cacheKey);
  if (cached) {
    console.log(`✅ Hotel cache HIT: ${destinationQuery} (context: ${contextHash})`);
    return cached;
  }

  console.log(`🏨 Searching hotels in ${destinationQuery}...`);
  console.log(`   👥 ${adults} adults${children ? `, ${children} children` : ''}, ${rooms} room(s)`);

  // Get filters based on user preferences
  const filters = getHotelSearchFilters(accommodationPref, materialComfort);

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

    // Prefer REGION for islands/areas (Bali, Tenerife) or CITY for cities
    // This ensures we search the whole area, not just a sub-city
    const regionDest = destResponse.data.data.find(d => d.dest_type === 'region');
    const cityDest = destResponse.data.data.find(d => d.dest_type === 'city');

    // For islands/areas, prefer region. For specific cities, prefer city.
    const isIslandOrArea = ['bali', 'tenerife', 'mallorca', 'santorini', 'maldives', 'phuket', 'sicily', 'sardinia', 'corsica', 'crete']
      .some(name => destinationQuery.toLowerCase().includes(name));

    const dest = (isIslandOrArea && regionDest) ? regionDest : (cityDest || destResponse.data.data[0]);
    const dest_id = dest.dest_id;
    const search_type = dest.dest_type?.toUpperCase() || 'CITY';

    console.log(`📍 Found hotel destination: ${dest.name || dest.city_name} (${dest_id}, type: ${search_type})`);

    // Step 2: Build search parameters
    const searchParams = {
      dest_id,
      search_type,
      arrival_date: arrivalDate,
      departure_date: departureDate,
      adults,
      room_qty: rooms,
      page_number: 1,
      units: 'metric',
      temperature_unit: 'c',
      languagecode: 'en-us',
      currency_code: currency,
      sort_by: filters.sort_by, // Apply user preference sort
    };

    // Add children if present
    if (children > 0) {
      searchParams.children_qty = children;
      // Default child ages (API requires this)
      const childAges = Array(children).fill('8').join(',');
      searchParams.children_age = childAges;
    }

    // Add price filter if specified
    if (maxPrice) {
      searchParams.price_max = maxPrice;
    }

    const hotelsResponse = await axios.get(`${BASE_URL}/api/v1/hotels/searchHotels`, {
      params: searchParams,
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

    const rawHotelData = hotelsResponse.data.data.hotels;

    // Step 3: Apply post-filtering based on user preferences.
    // The API filters don't always work, so we filter client-side.
    //
    // Graceful degradation: if the strict filter returns zero hotels (e.g.
    // tight budget on adventure trip → no 3★ in Bastia), step the star
    // requirement down one notch at a time until we find at least one
    // candidate or hit 0. Returning *some* hotel that's slightly under the
    // requested star level beats returning nothing — the alternative is
    // "no_hotel_available" cascading all the way up and the user sees a
    // blank trip detail page.
    let appliedMinStars = filters.minStars;
    let hotelData;
    while (true) {
      hotelData = rawHotelData.filter(hotel => {
        const stars = hotel.property?.propertyClass || 0;
        const rating = hotel.property?.reviewScore || 0;
        if (appliedMinStars > 0 && stars < appliedMinStars) return false;
        if (filters.minRating > 0 && rating > 0 && rating < filters.minRating) return false;
        return true;
      });
      if (hotelData.length > 0 || appliedMinStars <= 1) break;
      const previous = appliedMinStars;
      appliedMinStars -= 1;
      console.log(`   ⬇️  No hotels at ${previous}★ — relaxing to ${appliedMinStars}★ minimum`);
    }

    if (appliedMinStars !== filters.minStars) {
      console.log(`   ℹ️  Star floor relaxed from ${filters.minStars} to ${appliedMinStars} to find at least one hotel`);
    }

    console.log(`   🔍 After preference filter: ${hotelData.length} hotels (from ${rawHotelData.length})`);

    // Step 4: Extract trip context and score hotels accordingly
    // Now includes both tripType (selector) and tripContext (free text)
    const extractedContext = (tripContext || tripType) ? extractTripContext(tripContext, tripType) : null;

    // If we have trip context (from selector or free text), score and sort hotels by context match
    if (extractedContext && extractedContext.keywords.length > 0) {
      const contextDesc = tripContext ? `"${tripContext.substring(0, 50)}..."` : `type=${tripType}`;
      console.log(`   🎯 Scoring hotels by trip context: ${contextDesc}`);

      // Add context score to each hotel
      hotelData = hotelData.map(hotel => ({
        ...hotel,
        contextScore: scoreHotelByContext(hotel, extractedContext)
      }));

      // Sort by context score (highest first), then by rating
      hotelData.sort((a, b) => {
        // Primary: context score
        if (b.contextScore !== a.contextScore) {
          return b.contextScore - a.contextScore;
        }
        // Secondary: rating
        const ratingA = a.property?.reviewScore || 0;
        const ratingB = b.property?.reviewScore || 0;
        return ratingB - ratingA;
      });

      // Log top 3 hotels with their context scores
      console.log(`   🏆 Top hotels by context match:`);
      hotelData.slice(0, 3).forEach((h, i) => {
        console.log(`      ${i + 1}. ${h.property?.name} - context score: ${h.contextScore}, rating: ${h.property?.reviewScore || 'N/A'}`);
      });
    }

    const hotels = hotelData.map(hotel => {
      // Price is in property.priceBreakdown.grossPrice.value
      const grossPrice = hotel.property?.priceBreakdown?.grossPrice?.value || 0;
      const nights = calculateHotelNights(arrivalDate, departureDate);

      // Extract description from accessibilityLabel
      const description = hotel.accessibilityLabel || '';

      // Extract room details from description
      const roomMatch = description.match(/Entire\s+\w+\s+–\s+([\d\.]+\s*m²)\s*:\s*(.+?)(?:\.|$)/);
      const roomDetails = roomMatch ? roomMatch[2] : null;

      return {
        id: hotel.hotel_id,
        name: hotel.property?.name || 'Unknown Hotel',
        stars: hotel.property?.propertyClass || hotel.property?.accuratePropertyClass || 0,
        rating: {
          value: hotel.property?.reviewScore || 0,
          count: hotel.property?.reviewCount || 0,
          word: hotel.property?.reviewScoreWord || ''
        },
        price: {
          amount: grossPrice,
          currency: hotel.property?.priceBreakdown?.grossPrice?.currency || currency,
          formatted: `${currency} ${Math.round(grossPrice)}`
        },
        pricePerNight: grossPrice ? Math.round(grossPrice / nights) : 0,
        totalNights: nights,
        location: destinationQuery,
        photos: (hotel.property?.photoUrls || []).map(hiResPhoto),
        mainPhoto: hotel.property?.photoUrls?.[0] ? hiResPhoto(hotel.property.photoUrls[0]) : null,
        amenities: hotel.property?.amenities || [],
        checkInTime: hotel.property?.checkin?.fromTime,
        checkOutTime: hotel.property?.checkout?.untilTime,
        description: description,
        roomDetails: roomDetails,
        coordinates: {
          latitude: hotel.property?.latitude,
          longitude: hotel.property?.longitude
        },
        blockId: hotel.property?.blockIds?.[0],
        // Context score (how well hotel matches trip context like "romantic", "spa", etc.)
        contextScore: hotel.contextScore || 0,
        // Generate Booking.com deep link (affiliate-wrapped for commission)
        bookingUrl: affiliateUrl(`https://www.booking.com/hotel/${hotel.hotel_id}.html?checkin=${arrivalDate}&checkout=${departureDate}&group_adults=${adults}${children ? `&group_children=${children}` : ''}&no_rooms=${rooms}`)
      };
    });

    const result = {
      destination: destinationQuery,
      arrivalDate,
      departureDate,
      hotels,
      count: hotels.length,
      filters: {
        appliedPref: accommodationPref || `comfort_${materialComfort}`,
        sortBy: filters.sort_by,
        minStars: filters.minStars,
        minRating: filters.minRating,
      },
      // Include trip context info in result for debugging
      tripContextApplied: extractedContext ? {
        tripType: extractedContext.tripType,
        isRomantic: extractedContext.isRomantic,
        isSpa: extractedContext.isSpa,
        isLuxury: extractedContext.isLuxury,
        isFamily: extractedContext.isFamily,
        isBusiness: extractedContext.isBusiness,
        isAdventure: extractedContext.isAdventure,
        keywords: extractedContext.keywords.slice(0, 5) // First 5 keywords
      } : null
    };

    // Cache for 6 hours
    cache.set(cacheKey, result, CACHE_TTL.HOTEL_SEARCH);

    console.log(`✅ Found ${hotels.length} hotels in ${destinationQuery} (sorted by ${filters.sort_by})`);
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
