// backend/src/services/roadtripService.js
// Multi-city/multi-country roadtrip generation with multiple transport modes
import * as bookingService from './bookingService.js';
import { generateDestinationShortlist } from './claudeService.js';
import * as cache from '../utils/cache.js';
import axios from 'axios';

const BOOKING_API_KEY = process.env.BOOKING_API_KEY || 'b723f67a8cmshf49874500229ca8p12d559jsnedd1aee8f4ea';
const BASE_URL = 'https://booking-com15.p.rapidapi.com';

const CACHE_TTL = {
  CAR_RENTAL: 21600,      // 6 hours
  ATTRACTIONS: 43200,     // 12 hours
  MULTI_FLIGHTS: 3600,    // 1 hour
};

/**
 * Detect if user profile indicates roadtrip preference
 * @param {Object} userPreferences - User preferences from DB
 * @param {Object} searchParams - Search parameters (budget, duration, etc.)
 * @returns {boolean} - True if roadtrip should be proposed
 */
export function shouldProposeRoadtrip(userPreferences, searchParams = {}) {
  const { budget = 0, duration = 0 } = searchParams;

  // ❌ EXCLUDE if not enough budget or duration
  if (budget < 600) return false;
  if (duration < 5) return false;

  // ✅ PRIMARY INDICATOR: stayOrMove preference
  if (userPreferences.stayOrMove === 'roadtrip' || userPreferences.stayOrMove === 'itinerant') {
    console.log('✅ Roadtrip detected: stayOrMove =', userPreferences.stayOrMove);
    return true;
  }

  // ✅ SECONDARY INDICATOR: Multiple transport modes accepted
  const transportModes = userPreferences.transportModes || [];
  const refusedTransports = userPreferences.refusedTransports || [];

  // At least 2 different transport modes accepted (plane+train, plane+car, etc.)
  const acceptedModes = transportModes.filter(mode => !refusedTransports.includes(mode));
  if (acceptedModes.length >= 2 && duration >= 7) {
    console.log('✅ Roadtrip detected: Multiple transport modes accepted', acceptedModes);
    return true;
  }

  // ✅ TERTIARY INDICATOR: High flexibility + long duration
  const isFlexible = userPreferences.departureFlexibility === 'flexible';
  const isAdventurous = (userPreferences.riskTolerance || 0) > 60;
  const isExplorer = (userPreferences.originalityAppetite || 0) > 70;

  if (isFlexible && isAdventurous && isExplorer && duration >= 10) {
    console.log('✅ Roadtrip detected: Adventurous + flexible profile');
    return true;
  }

  // ❌ DEFAULT: Single destination preferred
  console.log('❌ Roadtrip not suitable for this profile');
  return false;
}

/**
 * Search multi-stop flights (City A → City B → City C)
 * @param {Array} legs - Array of {fromId, toId, departDate}
 * @returns {Promise<Object>} Multi-stop flight results
 */
export async function searchMultiStopFlights(legs, { adults = 1, cabinClass = 'ECONOMY', currency = 'EUR' }) {
  const cacheKey = `booking:multiflights:${JSON.stringify(legs)}:${adults}:${cabinClass}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('✅ Multi-flight cache HIT');
    return cached;
  }

  console.log(`✈️  Searching multi-stop flights (${legs.length} legs)...`);

  try {
    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchFlightsMultiStops`, {
      params: {
        legs: JSON.stringify(legs),
        adults,
        cabinClass,
        currency_code: currency
      },
      headers: {
        'x-rapidapi-key': BOOKING_API_KEY,
        'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
      },
      timeout: 45000 // Multi-stop takes longer
    });

    if (!response.data?.status || !response.data?.data?.flightOffers) {
      console.warn('⚠️  No multi-stop flights found');
      return { legs, flights: [], count: 0 };
    }

    const flightOffers = response.data.data.flightOffers || [];

    const flights = flightOffers.map(offer => {
      const price = offer.priceBreakdown?.total;

      return {
        token: offer.token,
        price: {
          amount: price?.units || 0,
          currency: price?.currencyCode || currency,
          formatted: `${price?.currencyCode || currency} ${price?.units || 0}`
        },
        segments: offer.segments?.map(seg => ({
          departureAirport: seg.departureAirport?.code,
          arrivalAirport: seg.arrivalAirport?.code,
          departureTime: seg.departureTime,
          arrivalTime: seg.arrivalTime,
          duration: seg.totalTime,
          airline: seg.legs?.[0]?.carriersData?.[0]?.name,
          airlineCode: seg.legs?.[0]?.carriersData?.[0]?.code,
          airlineLogo: seg.legs?.[0]?.carriersData?.[0]?.logo,
        })) || []
      };
    });

    const result = { legs, flights, count: flights.length };
    cache.set(cacheKey, result, CACHE_TTL.MULTI_FLIGHTS);

    console.log(`✅ Found ${flights.length} multi-stop flight options`);
    return result;

  } catch (error) {
    console.error('❌ searchMultiStopFlights failed:', error.message);

    // FALLBACK: Search individual segments
    console.log('🔄 Falling back to individual flight searches...');
    return await searchIndividualLegs(legs, { adults, cabinClass, currency });
  }
}

/**
 * Fallback: Search each leg individually
 */
async function searchIndividualLegs(legs, { adults, cabinClass, currency }) {
  const legResults = [];

  for (const leg of legs) {
    try {
      const flights = await bookingService.searchFlights({
        fromId: leg.fromId,
        toId: leg.toId,
        departDate: leg.departDate,
        returnDate: null, // One-way
        adults,
        cabinClass,
        currency
      });

      legResults.push({
        from: leg.fromId,
        to: leg.toId,
        date: leg.departDate,
        cheapestFlight: flights.flights?.[0] || null,
        flightCount: flights.count
      });
    } catch (error) {
      console.error(`❌ Failed to search leg ${leg.fromId} → ${leg.toId}:`, error.message);
      legResults.push({
        from: leg.fromId,
        to: leg.toId,
        date: leg.departDate,
        cheapestFlight: null,
        flightCount: 0
      });
    }
  }

  // Calculate total price
  const totalPrice = legResults.reduce((sum, leg) => {
    return sum + (leg.cheapestFlight?.price?.amount || 0);
  }, 0);

  return {
    legs,
    legResults,
    totalPrice,
    count: legResults.filter(l => l.cheapestFlight).length,
    isFallback: true
  };
}

/**
 * Search car rentals at a location
 * @param {Object} params
 * @param {string} params.pickUpLocation - City name
 * @param {string} params.pickUpDate - Date (YYYY-MM-DD)
 * @param {string} params.dropOffLocation - City name (can be different)
 * @param {string} params.dropOffDate - Date (YYYY-MM-DD)
 * @returns {Promise<Object>} Car rental options
 */
export async function searchCarRentals({
  pickUpLocation,
  pickUpDate,
  dropOffLocation,
  dropOffDate,
  currency = 'EUR'
}) {
  const cacheKey = `booking:carrental:${pickUpLocation}:${dropOffLocation}:${pickUpDate}:${dropOffDate}`;

  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('✅ Car rental cache HIT');
    return cached;
  }

  console.log(`🚗 Searching car rentals: ${pickUpLocation} → ${dropOffLocation}`);

  try {
    // Step 1: Get pickup location coordinates
    const pickupDestResponse = await axios.get(`${BASE_URL}/api/v1/cars/searchDestination`, {
      params: { query: pickUpLocation },
      headers: {
        'x-rapidapi-key': BOOKING_API_KEY,
        'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
      }
    });

    if (!pickupDestResponse.data?.status || !pickupDestResponse.data?.data?.length) {
      throw new Error(`Pickup location not found: ${pickUpLocation}`);
    }

    const pickupDest = pickupDestResponse.data.data[0];
    const pickUpLatitude = pickupDest.latitude;
    const pickUpLongitude = pickupDest.longitude;

    // Step 2: Get dropoff location coordinates
    const dropoffDestResponse = await axios.get(`${BASE_URL}/api/v1/cars/searchDestination`, {
      params: { query: dropOffLocation },
      headers: {
        'x-rapidapi-key': BOOKING_API_KEY,
        'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
      }
    });

    if (!dropoffDestResponse.data?.status || !dropoffDestResponse.data?.data?.length) {
      throw new Error(`Dropoff location not found: ${dropOffLocation}`);
    }

    const dropoffDest = dropoffDestResponse.data.data[0];
    const dropOffLatitude = dropoffDest.latitude;
    const dropOffLongitude = dropoffDest.longitude;

    console.log(`📍 Pickup: ${pickupDest.name} (${pickUpLatitude}, ${pickUpLongitude})`);
    console.log(`📍 Dropoff: ${dropoffDest.name} (${dropOffLatitude}, ${dropOffLongitude})`);

    // Step 3: Search car rentals
    const carsResponse = await axios.get(`${BASE_URL}/api/v1/cars/searchCarRentals`, {
      params: {
        pick_up_latitude: pickUpLatitude,
        pick_up_longitude: pickUpLongitude,
        pick_up_date: pickUpDate,
        pick_up_time: '10:00',
        drop_off_latitude: dropOffLatitude,
        drop_off_longitude: dropOffLongitude,
        drop_off_date: dropOffDate,
        drop_off_time: '10:00',
        currency_code: currency
      },
      headers: {
        'x-rapidapi-key': BOOKING_API_KEY,
        'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
      },
      timeout: 30000
    });

    if (!carsResponse.data?.status || !carsResponse.data?.data?.vehicles) {
      console.warn('⚠️  No car rentals found');
      return {
        pickUpLocation,
        dropOffLocation,
        pickUpDate,
        dropOffDate,
        cars: [],
        count: 0
      };
    }

    const vehicles = carsResponse.data.data.vehicles || [];

    const cars = vehicles.map(vehicle => ({
      id: vehicle.vehicle_id,
      name: vehicle.vehicle_info?.v_name || 'Unknown Vehicle',
      category: vehicle.vehicle_info?.category,
      transmission: vehicle.vehicle_info?.transmission,
      passengers: vehicle.vehicle_info?.passangers,
      bags: vehicle.vehicle_info?.bags,
      fuelType: vehicle.vehicle_info?.fuel,
      price: {
        amount: vehicle.pricing_info?.price || 0,
        currency: currency,
        formatted: `${currency} ${vehicle.pricing_info?.price || 0}`
      },
      imageUrl: vehicle.vehicle_info?.image_url,
      supplier: vehicle.supplier_info?.name
    }));

    // Sort by price
    cars.sort((a, b) => a.price.amount - b.price.amount);

    const result = {
      pickUpLocation,
      dropOffLocation,
      pickUpDate,
      dropOffDate,
      cars,
      count: cars.length
    };

    cache.set(cacheKey, result, CACHE_TTL.CAR_RENTAL);

    console.log(`✅ Found ${cars.length} car rental options`);
    return result;

  } catch (error) {
    console.error('❌ searchCarRentals failed:', error.message);
    return {
      pickUpLocation,
      dropOffLocation,
      pickUpDate,
      dropOffDate,
      cars: [],
      count: 0,
      error: error.message
    };
  }
}

/**
 * Search attractions/activities in a city
 * @param {string} cityName - City name
 * @returns {Promise<Object>} Top attractions
 */
export async function searchAttractions(cityName, { limit = 10, currency = 'EUR' } = {}) {
  const cacheKey = `booking:attractions:${cityName.toLowerCase()}:${limit}`;

  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`✅ Attractions cache HIT: ${cityName}`);
    return cached;
  }

  console.log(`🎭 Searching attractions in ${cityName}...`);

  try {
    // Step 1: Get location ID for attractions
    const destResponse = await axios.get(`${BASE_URL}/api/v1/attractions/searchLocation`, {
      params: { query: cityName },
      headers: {
        'x-rapidapi-key': BOOKING_API_KEY,
        'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
      }
    });

    if (!destResponse.data?.status || !destResponse.data?.data?.products?.length) {
      throw new Error(`Attraction location not found: ${cityName}`);
    }

    const location = destResponse.data.data.products[0];
    const locationId = location.id;

    console.log(`📍 Found location: ${location.name} (${locationId})`);

    // Step 2: Search attractions
    const attractionsResponse = await axios.get(`${BASE_URL}/api/v1/attractions/searchAttractions`, {
      params: {
        id: locationId,
        sortBy: 'trending', // trending, price, rating
        page: 1,
        currency_code: currency,
        languagecode: 'en-us'
      },
      headers: {
        'x-rapidapi-key': BOOKING_API_KEY,
        'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
      },
      timeout: 30000
    });

    if (!attractionsResponse.data?.status || !attractionsResponse.data?.data?.products) {
      console.warn(`⚠️  No attractions found in ${cityName}`);
      return {
        cityName,
        attractions: [],
        count: 0
      };
    }

    const products = attractionsResponse.data.data.products || [];

    const attractions = products.slice(0, limit).map(product => ({
      id: product.id,
      name: product.name,
      description: product.shortDescription,
      rating: {
        value: product.reviewsStats?.combinedNumericStats?.average || 0,
        count: product.reviewsStats?.allReviewsCount || 0
      },
      price: {
        amount: product.lowestPrice?.value || 0,
        currency: product.lowestPrice?.currency || currency,
        formatted: `${product.lowestPrice?.currency || currency} ${product.lowestPrice?.value || 0}`
      },
      imageUrl: product.primaryPhoto?.small || product.primaryPhoto?.medium,
      duration: product.representativePrice?.publicAmount,
      category: product.productType,
      isBookable: product.flags?.isBookable || false
    }));

    const result = {
      cityName,
      locationId,
      attractions,
      count: attractions.length
    };

    cache.set(cacheKey, result, CACHE_TTL.ATTRACTIONS);

    console.log(`✅ Found ${attractions.length} attractions in ${cityName}`);
    return result;

  } catch (error) {
    console.error(`❌ searchAttractions failed for ${cityName}:`, error.message);
    return {
      cityName,
      attractions: [],
      count: 0,
      error: error.message
    };
  }
}

/**
 * Generate a complete roadtrip itinerary with multiple cities
 * @param {Object} params
 * @param {Object} params.userProfile - User preferences
 * @param {string} params.origin - Starting city
 * @param {number} params.budget - Total budget in EUR
 * @param {number} params.duration - Trip duration in days
 * @param {string} params.departureDate - Start date (YYYY-MM-DD)
 * @returns {Promise<Object>} Complete roadtrip with cities, transport, hotels, activities
 */
export async function generateRoadtrip({
  userProfile,
  origin,
  budget,
  duration,
  departureDate
}) {
  console.log(`🗺️  Generating roadtrip from ${origin}, €${budget}, ${duration} days`);

  // STEP 1: Generate 2-4 destination cities based on duration
  const numCities = duration <= 7 ? 2 : duration <= 10 ? 3 : 4;
  const daysPerCity = Math.floor((duration - 1) / numCities); // -1 for travel days

  console.log(`🎯 Planning ${numCities} cities, ~${daysPerCity} days each`);

  // Generate diverse destinations (Claude AI)
  const destinations = await generateDestinationShortlist(userProfile, {
    budget,
    duration,
    origin,
    count: numCities * 2 // Get double to have options
  });

  // STEP 2: Get destination IDs
  const originDest = await bookingService.getDestinationId(origin);

  const destPromises = destinations.slice(0, numCities).map(async (cityName) => {
    try {
      const dest = await bookingService.getDestinationId(cityName);
      return { cityName, dest };
    } catch (error) {
      console.error(`❌ Failed to get destination ID for ${cityName}`);
      return null;
    }
  });

  const validDests = (await Promise.all(destPromises)).filter(d => d !== null);

  if (validDests.length < 2) {
    throw new Error('Not enough valid destinations for roadtrip');
  }

  console.log(`✅ Selected cities: ${validDests.map(d => d.dest.name).join(' → ')}`);

  // STEP 3: Determine transport modes
  const transportModes = userProfile.transportModes || [];
  const refusedTransports = userProfile.refusedTransports || [];
  const acceptedModes = transportModes.filter(mode => !refusedTransports.includes(mode));

  const usePlane = acceptedModes.includes('plane') || acceptedModes.includes('avion');
  const useCar = acceptedModes.includes('car') || acceptedModes.includes('voiture');
  const useTrain = acceptedModes.includes('train');

  console.log(`🚀 Accepted transport modes: ${acceptedModes.join(', ')}`);

  // STEP 4: Build itinerary structure
  const cities = [];
  let currentDate = new Date(departureDate);

  // Origin → City 1 → City 2 → ... → Origin
  const citySequence = [originDest, ...validDests.map(d => d.dest)];

  for (let i = 0; i < validDests.length; i++) {
    const city = validDests[i].dest;
    const arrivalDate = new Date(currentDate);
    const departureDate = new Date(currentDate);
    departureDate.setDate(departureDate.getDate() + daysPerCity);

    cities.push({
      name: city.name,
      code: city.code,
      country: city.countryName,
      arrivalDate: arrivalDate.toISOString().split('T')[0],
      departureDate: departureDate.toISOString().split('T')[0],
      nights: daysPerCity
    });

    currentDate = departureDate;
  }

  // STEP 5: Search transport options
  let transportPlan = [];
  let totalTransportCost = 0;

  if (usePlane) {
    console.log('✈️  Searching flights for roadtrip...');

    // Build flight legs: Origin → City1 → City2 → ... → Origin
    const legs = [];
    for (let i = 0; i < cities.length; i++) {
      const fromId = i === 0 ? originDest.id : validDests[i - 1].dest.id;
      const toId = validDests[i].dest.id;
      const date = cities[i].arrivalDate;

      legs.push({ fromId, toId, departDate: date });
    }

    // Add return leg
    legs.push({
      fromId: validDests[validDests.length - 1].dest.id,
      toId: originDest.id,
      departDate: cities[cities.length - 1].departureDate
    });

    const multiFlights = await searchMultiStopFlights(legs, {
      adults: 1,
      cabinClass: 'ECONOMY',
      currency: 'EUR'
    });

    if (multiFlights.count > 0 && multiFlights.flights?.[0]) {
      transportPlan.push({
        type: 'plane',
        details: multiFlights.flights[0],
        totalCost: multiFlights.flights[0].price.amount
      });
      totalTransportCost += multiFlights.flights[0].price.amount;
    } else if (multiFlights.isFallback && multiFlights.legResults) {
      // Use individual leg results
      transportPlan.push({
        type: 'plane',
        details: multiFlights.legResults,
        totalCost: multiFlights.totalPrice
      });
      totalTransportCost += multiFlights.totalPrice;
    }
  }

  if (useCar && cities.length >= 2) {
    console.log('🚗 Searching car rental options...');

    // Car rental for entire trip (one-way rental)
    const carRental = await searchCarRentals({
      pickUpLocation: cities[0].name,
      pickUpDate: cities[0].arrivalDate,
      dropOffLocation: cities[cities.length - 1].name,
      dropOffDate: cities[cities.length - 1].departureDate,
      currency: 'EUR'
    });

    if (carRental.count > 0 && carRental.cars?.[0]) {
      transportPlan.push({
        type: 'car',
        details: carRental.cars[0],
        totalCost: carRental.cars[0].price.amount
      });
      totalTransportCost += carRental.cars[0].price.amount;
    }
  }

  // STEP 6: Search hotels for each city
  const remainingBudget = budget - totalTransportCost;
  const budgetPerCity = remainingBudget / cities.length;

  console.log(`🏨 Searching hotels (€${Math.round(budgetPerCity)} per city)...`);

  const hotelPromises = cities.map(async (city) => {
    try {
      const hotels = await bookingService.searchHotels({
        destinationQuery: city.name,
        arrivalDate: city.arrivalDate,
        departureDate: city.departureDate,
        adults: 1,
        rooms: 1,
        currency: 'EUR'
      });

      // Filter by budget (70% of budget per city for hotel)
      const maxHotelBudget = budgetPerCity * 0.7;
      const affordable = hotels.hotels.filter(h => h.price.amount <= maxHotelBudget);

      // Sort by rating, pick best
      affordable.sort((a, b) => (b.rating?.value || 0) - (a.rating?.value || 0));

      return {
        city: city.name,
        selectedHotel: affordable[0] || null,
        hotelOptions: affordable.slice(0, 5)
      };
    } catch (error) {
      console.error(`❌ Failed to search hotels in ${city.name}`);
      return {
        city: city.name,
        selectedHotel: null,
        hotelOptions: []
      };
    }
  });

  const hotelResults = await Promise.all(hotelPromises);

  // STEP 7: Search top attractions for each city
  console.log(`🎭 Searching attractions for each city...`);

  const attractionsPromises = cities.map(async (city) => {
    try {
      const attractions = await searchAttractions(city.name, { limit: 5, currency: 'EUR' });
      return {
        city: city.name,
        attractions: attractions.attractions || []
      };
    } catch (error) {
      console.error(`❌ Failed to search attractions in ${city.name}`);
      return {
        city: city.name,
        attractions: []
      };
    }
  });

  const attractionsResults = await Promise.all(attractionsPromises);

  // STEP 8: Calculate total cost
  const totalHotelCost = hotelResults.reduce((sum, hr) => {
    return sum + (hr.selectedHotel?.price?.amount || 0);
  }, 0);

  const totalCost = totalTransportCost + totalHotelCost;
  const remainingForActivities = budget - totalCost;

  // STEP 9: Build final roadtrip object
  const roadtrip = {
    type: 'roadtrip',
    title: `${cities.map(c => c.name).join(' → ')} Roadtrip`,
    duration,
    origin: origin,
    cities: cities.map((city, i) => ({
      ...city,
      hotel: hotelResults[i]?.selectedHotel || null,
      hotelOptions: hotelResults[i]?.hotelOptions || [],
      attractions: attractionsResults[i]?.attractions || []
    })),
    transport: transportPlan,
    budget: {
      total: budget,
      transport: totalTransportCost,
      hotels: totalHotelCost,
      activities: remainingForActivities,
      totalCost
    },
    acceptedTransportModes: acceptedModes,
    isAffordable: totalCost <= budget
  };

  console.log(`✅ Roadtrip generated: €${totalCost} / €${budget}`);

  return roadtrip;
}

export default {
  shouldProposeRoadtrip,
  searchMultiStopFlights,
  searchCarRentals,
  searchAttractions,
  generateRoadtrip
};
