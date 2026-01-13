// backend/src/services/bookingService.js
// Booking.com API integration for flights and hotels
import axios from 'axios';
import * as cache from '../utils/cache.js';

const BASE_URL = 'https://booking-com15.p.rapidapi.com';
const BOOKING_API_KEY = process.env.BOOKING_API_KEY || 'b723f67a8cmshf49874500229ca8p12d559jsnedd1aee8f4ea';

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
  'mauritius': 'Port Louis',    // Capital of Mauritius
  'seychelles': 'Mahe',         // Main island
  'zanzibar': 'Zanzibar',       // Tanzania
  'canary islands': 'Tenerife', // Main island
  'azores': 'Ponta Delgada',    // Main island
  'madeira': 'Funchal',         // Main city
  'crete': 'Heraklion',         // Main airport in Crete
  'rhodes': 'Rhodes',           // Greek island
  'corfu': 'Corfu',             // Greek island
  'mykonos': 'Mykonos',         // Greek island
};

/**
 * Check if a destination result matches the expected query
 * Prevents mismatches like "Bali" → "Kraków-Balice"
 */
function isDestinationMatch(result, queryName) {
  const query = queryName.toLowerCase().trim();
  const resultName = (result.name || '').toLowerCase();
  const resultCountry = (result.countryName || result.country || '').toLowerCase();

  // Extract base query (remove country suffix like "Bali, Indonesia")
  const baseQuery = query.split(',')[0].trim();

  // Known country associations for common destinations
  const expectedCountries = {
    'bali': 'indonesia',
    'denpasar': 'indonesia',
    'phuket': 'thailand',
    'bangkok': 'thailand',
    'tokyo': 'japan',
    'maldives': 'maldives',
    'male': 'maldives',
    'marrakech': 'morocco',
    'dubai': 'united arab emirates',
    'cape town': 'south africa',
    'zanzibar': 'tanzania',
    'mauritius': 'mauritius',
    'seychelles': 'seychelles',
  };

  // If we know the expected country, verify it matches
  const expectedCountry = expectedCountries[baseQuery];
  if (expectedCountry && !resultCountry.includes(expectedCountry)) {
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
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`✅ Cache HIT for "${destinationName}" → ${cached.id}`);
    return cached;
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
      const firstCity = results.find(d => d.type === 'CITY');
      if (firstCity) {
        console.log(`   ⚠️ No exact match, using first CITY: ${firstCity.name} (${firstCity.countryName || firstCity.country})`);
        selectedDest = firstCity;
      }
    }

    // Priority 4: First result (last resort)
    if (!selectedDest) {
      selectedDest = results[0];
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
      cityName: extractCityName(selectedDest.name, destinationName),
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
  const cached = cache.get(cacheKey);
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

  const cached = cache.get(cacheKey);
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
}) {
  // Include preference in cache key
  const prefKey = accommodationPref || `comfort_${materialComfort}`;
  const cacheKey = `booking:hotels:${destinationQuery}:${arrivalDate}:${departureDate}:${adults}:${children}:${rooms}:${prefKey}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`✅ Hotel cache HIT: ${destinationQuery}`);
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

    let hotelData = hotelsResponse.data.data.hotels;

    // Step 3: Apply post-filtering based on user preferences
    // (API filters don't always work, so we filter client-side)
    hotelData = hotelData.filter(hotel => {
      const stars = hotel.property?.propertyClass || 0;
      const rating = hotel.property?.reviewScore || 0;

      // Apply minimum star filter
      if (filters.minStars > 0 && stars < filters.minStars && stars > 0) {
        return false;
      }

      // Apply minimum rating filter (only if hotel has reviews)
      if (filters.minRating > 0 && rating > 0 && rating < filters.minRating) {
        return false;
      }

      return true;
    });

    console.log(`   🔍 After preference filter: ${hotelData.length} hotels (from ${hotelsResponse.data.data.hotels.length})`);

    const hotels = hotelData.map(hotel => {
      // Price is in property.priceBreakdown.grossPrice.value
      const grossPrice = hotel.property?.priceBreakdown?.grossPrice?.value || 0;

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
        pricePerNight: grossPrice,
        location: destinationQuery,
        photos: hotel.property?.photoUrls || [],
        mainPhoto: hotel.property?.photoUrls?.[0] || null,
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
        // Generate Booking.com URL with correct parameters
        bookingUrl: `https://www.booking.com/hotel/${hotel.hotel_id}.html?checkin=${arrivalDate}&checkout=${departureDate}&group_adults=${adults}${children ? `&group_children=${children}` : ''}&no_rooms=${rooms}`
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
      }
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
