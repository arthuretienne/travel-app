// backend/src/services/destinationService.js
// Destination discovery and optimization logic
// MIGRATED TO BOOKING.COM API (2025-11-30)

import * as bookingService from './bookingService.js';
import { generateDestinationShortlist } from './claudeService.js';
import * as airScraper from './airScraperService.js'; // Keep for fallback
import * as hotelService from './hotelService.js'; // Old hotel service (not used)

/**
 * Mapping of popular destinations without airports to their nearest airport
 * Includes ground transport info (type, duration, estimated cost)
 */
const NEAREST_AIRPORT_MAP = {
  // Italy
  'lake como': { airport: 'Milan', airportCode: 'MXP', transport: 'train', duration: '1h', cost: 15, distance: '50km' },
  'como': { airport: 'Milan', airportCode: 'MXP', transport: 'train', duration: '40min', cost: 12, distance: '45km' },
  'cinque terre': { airport: 'Pisa', airportCode: 'PSA', transport: 'train', duration: '1h30', cost: 15, distance: '80km' },
  'amalfi': { airport: 'Naples', airportCode: 'NAP', transport: 'bus', duration: '1h30', cost: 20, distance: '65km' },
  'positano': { airport: 'Naples', airportCode: 'NAP', transport: 'bus', duration: '1h45', cost: 20, distance: '60km' },
  'sorrento': { airport: 'Naples', airportCode: 'NAP', transport: 'train', duration: '1h', cost: 10, distance: '50km' },
  'capri': { airport: 'Naples', airportCode: 'NAP', transport: 'ferry', duration: '1h30', cost: 25, distance: '30km' },
  'siena': { airport: 'Florence', airportCode: 'FLR', transport: 'bus', duration: '1h15', cost: 12, distance: '70km' },
  'san gimignano': { airport: 'Florence', airportCode: 'FLR', transport: 'bus', duration: '1h30', cost: 15, distance: '55km' },
  'portofino': { airport: 'Genoa', airportCode: 'GOA', transport: 'bus', duration: '45min', cost: 10, distance: '35km' },

  // France
  'saint-tropez': { airport: 'Nice', airportCode: 'NCE', transport: 'bus', duration: '2h', cost: 25, distance: '100km' },
  'cannes': { airport: 'Nice', airportCode: 'NCE', transport: 'train', duration: '30min', cost: 8, distance: '30km' },
  'monaco': { airport: 'Nice', airportCode: 'NCE', transport: 'train', duration: '25min', cost: 6, distance: '20km' },
  'mont saint-michel': { airport: 'Rennes', airportCode: 'RNS', transport: 'bus', duration: '1h15', cost: 15, distance: '70km' },
  'chamonix': { airport: 'Geneva', airportCode: 'GVA', transport: 'bus', duration: '1h15', cost: 30, distance: '85km' },

  // Spain
  'costa brava': { airport: 'Barcelona', airportCode: 'BCN', transport: 'bus', duration: '1h30', cost: 15, distance: '100km' },
  'san sebastian': { airport: 'Bilbao', airportCode: 'BIO', transport: 'bus', duration: '1h15', cost: 12, distance: '100km' },
  'toledo': { airport: 'Madrid', airportCode: 'MAD', transport: 'train', duration: '30min', cost: 15, distance: '70km' },

  // Greece
  'santorini': { airport: 'Santorini', airportCode: 'JTR', transport: null, duration: null, cost: 0, distance: null }, // Has airport but small
  'meteora': { airport: 'Thessaloniki', airportCode: 'SKG', transport: 'bus', duration: '3h', cost: 20, distance: '230km' },

  // Croatia
  'plitvice': { airport: 'Zagreb', airportCode: 'ZAG', transport: 'bus', duration: '2h', cost: 15, distance: '130km' },
  'hvar': { airport: 'Split', airportCode: 'SPU', transport: 'ferry', duration: '1h', cost: 20, distance: '45km' },

  // Switzerland
  'zermatt': { airport: 'Geneva', airportCode: 'GVA', transport: 'train', duration: '3h30', cost: 80, distance: '240km' },
  'interlaken': { airport: 'Zurich', airportCode: 'ZRH', transport: 'train', duration: '2h', cost: 35, distance: '120km' },
  'lucerne': { airport: 'Zurich', airportCode: 'ZRH', transport: 'train', duration: '1h', cost: 25, distance: '55km' },

  // Austria
  'hallstatt': { airport: 'Salzburg', airportCode: 'SZG', transport: 'bus', duration: '1h30', cost: 15, distance: '75km' },

  // UK
  'cotswolds': { airport: 'London', airportCode: 'LHR', transport: 'train', duration: '1h30', cost: 30, distance: '130km' },
  'lake district': { airport: 'Manchester', airportCode: 'MAN', transport: 'train', duration: '2h', cost: 35, distance: '130km' },

  // Portugal
  'sintra': { airport: 'Lisbon', airportCode: 'LIS', transport: 'train', duration: '40min', cost: 5, distance: '30km' },
  'algarve': { airport: 'Faro', airportCode: 'FAO', transport: null, duration: null, cost: 0, distance: null }, // Has airport

  // Netherlands
  'giethoorn': { airport: 'Amsterdam', airportCode: 'AMS', transport: 'bus', duration: '2h', cost: 20, distance: '120km' },

  // Indonesia
  'ubud': { airport: 'Bali', airportCode: 'DPS', transport: 'car', duration: '1h30', cost: 20, distance: '35km' },
  'gili islands': { airport: 'Lombok', airportCode: 'LOP', transport: 'boat', duration: '30min', cost: 15, distance: '15km' },
};

/**
 * Find nearest airport for a destination that has no direct flights
 * @param {string} destinationName - The destination to search
 * @returns {Object|null} - Nearest airport info or null if destination has an airport
 */
function findNearestAirport(destinationName) {
  const normalized = destinationName.toLowerCase()
    .replace(/,\s*(italy|france|spain|greece|croatia|switzerland|austria|uk|portugal|netherlands|indonesia)$/i, '')
    .trim();

  // Check exact match first
  if (NEAREST_AIRPORT_MAP[normalized]) {
    return NEAREST_AIRPORT_MAP[normalized];
  }

  // Check partial match (e.g., "Lake Como, Italy" -> "lake como")
  for (const [key, value] of Object.entries(NEAREST_AIRPORT_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  return null;
}

/**
 * Discover destinations when user doesn't specify one
 * NEW WORKFLOW: Uses Claude AI + Booking.com API
 * Returns top 3-5 destinations with flights and prices
 */
export async function discoverDestinations({
  userProfile,
  budget,
  origin,
  duration = 7,
  departureDate = null,
  userId = null, // For diversity tracking
}) {
  console.log(`🔍 NEW WORKFLOW: Discovering destinations from ${origin} with budget €${budget}`);

  try {
    // STEP 1: Claude AI generates personalized shortlist (4 destinations - faster)
    console.log('🤖 Step 1: Generating personalized shortlist with Claude AI...');

    const shortlist = await generateDestinationShortlist(userProfile, {
      budget,
      duration,
      origin,
      count: 4, // Reduced from 6 to 4 for faster response
      userId // Pass userId for diversity (avoids recently recommended destinations)
    });

    console.log(`✅ Claude suggested: ${shortlist.join(', ')}`);

    // STEP 2: Get destination IDs (from cache or API)
    console.log('📍 Step 2: Getting destination IDs (from cache)...');

    const originDest = await bookingService.getDestinationId(origin);

    const destinationPromises = shortlist.map(async (cityName) => {
      try {
        const dest = await bookingService.getDestinationId(cityName);
        return { cityName, dest };
      } catch (error) {
        console.warn(`⚠️  Could not find destination ID for ${cityName}:`, error.message);
        return null;
      }
    });

    const destinationResults = await Promise.all(destinationPromises);
    const validDestinations = destinationResults.filter(d => d !== null);

    console.log(`✅ Found ${validDestinations.length}/${shortlist.length} destination IDs`);

    // STEP 3: Search flights for all destinations
    console.log('✈️  Step 3: Searching flights for all destinations...');

    // Calculate dates
    if (!departureDate) {
      const today = new Date();
      const future = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      departureDate = future.toISOString().split('T')[0];
    }

    const returnDate = new Date(departureDate);
    returnDate.setDate(returnDate.getDate() + duration);
    const returnDateStr = returnDate.toISOString().split('T')[0];

    const flightPromises = validDestinations.map(async ({ cityName, dest }) => {
      try {
        const flights = await bookingService.searchFlights({
          fromId: originDest.id,
          toId: dest.id,
          departDate: departureDate,
          returnDate: returnDateStr,
          adults: 1,
          cabinClass: 'ECONOMY',
          currency: 'EUR'
        });

        if (flights.count === 0) {
          console.warn(`⚠️  No flights found for ${cityName}`);
          return null;
        }

        const cheapestFlight = flights.flights[0];

        return {
          name: cityName, // Use clean city name instead of airport name
          cityName,
          code: dest.code,
          country: dest.country,
          countryName: dest.countryName,
          destinationId: dest.id,
          airportName: dest.name, // Keep original airport name for reference
          price: {
            amount: cheapestFlight.price.amount,
            currency: cheapestFlight.price.currency,
            formatted: cheapestFlight.price.formatted
          },
          flight: cheapestFlight,
          flightCount: flights.count
        };
      } catch (error) {
        console.warn(`⚠️  Flight search failed for ${cityName}:`, error.message);
        return null;
      }
    });

    const flightResults = await Promise.all(flightPromises);
    const destinationsWithFlights = flightResults.filter(d => d !== null);

    console.log(`✅ Found flights for ${destinationsWithFlights.length} destinations`);

    // STEP 4: Filter by budget and select best matches
    const maxFlightBudget = budget * 0.6; // Reserve 60% for flights (round-trip)

    const affordable = destinationsWithFlights.filter(d => d.price.amount <= maxFlightBudget);

    console.log(`✅ ${affordable.length} destinations within flight budget (€${maxFlightBudget})`);

    if (affordable.length === 0) {
      console.warn('⚠️  No destinations within budget, using fallback');
      return await fallbackDestinations(origin, budget, userProfile);
    }

    // Sort by price (cheapest first)
    affordable.sort((a, b) => a.price.amount - b.price.amount);

    // Return top 3-5 destinations
    const selected = affordable.slice(0, Math.min(5, affordable.length));

    console.log(`🎯 Selected ${selected.length} best destinations:`);
    selected.forEach((d, i) => {
      console.log(`  ${i + 1}. ${d.name} - €${d.price.amount} (${d.flightCount} flights)`);
    });

    return selected;

  } catch (error) {
    console.error('❌ discoverDestinations failed:', error.message);
    console.error(error.stack);
    // Fallback to curated list
    return await fallbackDestinations(origin, budget, userProfile);
  }
}

/**
 * Generate date candidates for multi-date search
 * OPTIMIZED: Reduced from 7 to 3 candidates for faster response (saves ~5-8s per destination)
 * Returns array of departure dates to check
 */
function generateDateCandidates(userDepartureDate, duration) {
  const candidates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (userDepartureDate) {
    // User specified a date - check ±1 day around it (was ±3, now ±1 for speed)
    const baseDate = new Date(userDepartureDate);
    for (let offset = -1; offset <= 1; offset++) {
      const candidate = new Date(baseDate);
      candidate.setDate(candidate.getDate() + offset);
      // Don't search dates in the past
      if (candidate >= today) {
        candidates.push(candidate.toISOString().split('T')[0]);
      }
    }
  } else {
    // No date specified - search 3 strategic dates (was 8 weeks, now just 3 key dates)
    const startSearch = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000); // Start in 3 weeks

    // 1. First Friday (weekend trip option)
    const friday = new Date(startSearch);
    friday.setDate(friday.getDate() + (5 - friday.getDay() + 7) % 7);
    if (friday > today) {
      candidates.push(friday.toISOString().split('T')[0]);
    }

    // 2. Wednesday 2 weeks later (often cheapest)
    const wednesday = new Date(friday);
    wednesday.setDate(wednesday.getDate() + 12); // ~2 weeks after Friday
    if (wednesday > today) {
      candidates.push(wednesday.toISOString().split('T')[0]);
    }

    // 3. Friday 4 weeks out (more availability)
    const laterFriday = new Date(friday);
    laterFriday.setDate(laterFriday.getDate() + 28);
    if (laterFriday > today) {
      candidates.push(laterFriday.toISOString().split('T')[0]);
    }
  }

  // Sort by date - max 3 candidates for speed
  candidates.sort();
  return candidates.slice(0, 3);
}

/**
 * Optimize trip for a specific destination
 * NEW WORKFLOW: Uses Booking.com API with multi-date search
 * Returns complete trip package with flights, hotel, and budget breakdown
 */
export async function optimizeDestination({
  destination,
  destinationId = null, // Hotel destination ID (for hotel search, not flights)
  userProfile,
  budget,
  origin,
  duration = 7,
  departureDate = null,
}) {
  console.log(`🎯 NEW WORKFLOW: Optimizing ${destination} trip for €${budget} budget`);

  try {
    // STEP 1: Get flight destination IDs (airport/city)
    console.log('📍 Step 1: Getting flight destination IDs...');
    const originDest = await bookingService.getDestinationId(origin);

    // Try to find flights to the destination
    // If no flights found, check if we need to use a nearby airport
    let destDest = null;
    let groundTransport = null;
    let actualFlightDestination = destination;

    // First, check if this destination is known to need a nearby airport
    const nearestAirportInfo = findNearestAirport(destination);

    try {
      console.log(`🔍 Resolving flight destination for: ${destination}`);
      destDest = await bookingService.getDestinationId(destination);
      console.log(`✅ Found airport: ${destDest.name} (${destDest.id})`);
    } catch (error) {
      console.warn(`⚠️ No airport found for ${destination}: ${error.message}`);

      // If we have a known nearby airport, use it
      if (nearestAirportInfo) {
        console.log(`🚂 Using nearest airport: ${nearestAirportInfo.airport}`);
        destDest = await bookingService.getDestinationId(nearestAirportInfo.airport);
        actualFlightDestination = nearestAirportInfo.airport;
        groundTransport = {
          from: nearestAirportInfo.airport,
          to: destination,
          type: nearestAirportInfo.transport,
          duration: nearestAirportInfo.duration,
          estimatedCost: nearestAirportInfo.cost,
          distance: nearestAirportInfo.distance,
        };
        console.log(`✅ Will fly to ${nearestAirportInfo.airport}, then ${nearestAirportInfo.transport} to ${destination} (${nearestAirportInfo.duration}, ~€${nearestAirportInfo.cost})`);
      } else {
        throw new Error(`No flights available to ${destination} and no nearby airport found`);
      }
    }

    // STEP 2: Generate date candidates and search flights in parallel
    const dateCandidates = generateDateCandidates(departureDate, duration);
    console.log(`📅 Step 2: Checking ${dateCandidates.length} date options for best price...`);
    console.log(`   Dates: ${dateCandidates.join(', ')}`);

    // Search flights for all date candidates in parallel (max 5 concurrent for speed)
    let flightSearches = [];
    const batchSize = 5; // Increased from 3 to 5 for faster response

    for (let i = 0; i < dateCandidates.length; i += batchSize) {
      const batch = dateCandidates.slice(i, i + batchSize);
      const batchPromises = batch.map(async (depDate) => {
        const returnDate = new Date(depDate);
        returnDate.setDate(returnDate.getDate() + duration);
        const returnDateStr = returnDate.toISOString().split('T')[0];

        try {
          const result = await bookingService.searchFlights({
            fromId: originDest.id,
            toId: destDest.id,
            departDate: depDate,
            returnDate: returnDateStr,
            adults: 1,
            cabinClass: 'ECONOMY',
            currency: 'EUR'
          });

          if (result.flights && result.flights.length > 0) {
            const bestFlight = result.flights[0];
            return {
              departureDate: depDate,
              returnDate: returnDateStr,
              flight: bestFlight,
              price: bestFlight.price.amount
            };
          }
          return null;
        } catch (error) {
          console.warn(`   ⚠️ Failed to search ${depDate}: ${error.message}`);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      flightSearches.push(...batchResults.filter(r => r !== null));
    }

    // If no flights found and we haven't tried the nearest airport yet, try it now
    if (flightSearches.length === 0 && !groundTransport && nearestAirportInfo) {
      console.log(`⚠️ No direct flights found. Trying nearest airport: ${nearestAirportInfo.airport}`);

      destDest = await bookingService.getDestinationId(nearestAirportInfo.airport);
      actualFlightDestination = nearestAirportInfo.airport;
      groundTransport = {
        from: nearestAirportInfo.airport,
        to: destination,
        type: nearestAirportInfo.transport,
        duration: nearestAirportInfo.duration,
        estimatedCost: nearestAirportInfo.cost,
        distance: nearestAirportInfo.distance,
      };

      // Retry flight search with nearest airport
      for (let i = 0; i < dateCandidates.length; i += batchSize) {
        const batch = dateCandidates.slice(i, i + batchSize);
        const batchPromises = batch.map(async (depDate) => {
          const returnDate = new Date(depDate);
          returnDate.setDate(returnDate.getDate() + duration);
          const returnDateStr = returnDate.toISOString().split('T')[0];

          try {
            const result = await bookingService.searchFlights({
              fromId: originDest.id,
              toId: destDest.id,
              departDate: depDate,
              returnDate: returnDateStr,
              adults: 1,
              cabinClass: 'ECONOMY',
              currency: 'EUR'
            });

            if (result.flights && result.flights.length > 0) {
              const bestFlight = result.flights[0];
              return {
                departureDate: depDate,
                returnDate: returnDateStr,
                flight: bestFlight,
                price: bestFlight.price.amount
              };
            }
            return null;
          } catch (error) {
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        flightSearches.push(...batchResults.filter(r => r !== null));
      }
    }

    if (flightSearches.length === 0) {
      throw new Error(`No flights found from ${origin} to ${actualFlightDestination} for any date`);
    }

    // Find the cheapest date option
    flightSearches.sort((a, b) => a.price - b.price);
    const bestOption = flightSearches[0];

    console.log(`✅ Best price found: €${bestOption.price} on ${bestOption.departureDate}`);
    if (flightSearches.length > 1) {
      const savings = flightSearches[flightSearches.length - 1].price - bestOption.price;
      if (savings > 0) {
        console.log(`   💰 Savings vs worst date: €${savings}`);
      }
    }

    const bestFlight = bestOption.flight;
    const flightCost = bestOption.price;
    const selectedDepartureDate = bestOption.departureDate;
    const selectedReturnDate = bestOption.returnDate;

    console.log(`✅ Best flight: ${bestFlight.outbound.airline} - €${flightCost}`);

    // STEP 3: Calculate remaining budget for hotel
    const remainingForAccommodation = budget - flightCost;
    const totalNights = duration;
    const maxNightlyRate = (remainingForAccommodation / totalNights) * 0.7; // 70% for hotel

    console.log(`🏨 Budget for hotel: €${maxNightlyRate}/night × ${totalNights} nights`);

    // STEP 4: Search hotels using Booking.com API
    console.log(`🏨 Step 3: Searching hotels for ${selectedDepartureDate} to ${selectedReturnDate}...`);
    let suggestedHotel;
    let hotelSearchResults = null;

    try {
      hotelSearchResults = await bookingService.searchHotels({
        destinationQuery: destination,
        arrivalDate: selectedDepartureDate,
        departureDate: selectedReturnDate,
        adults: 1,
        rooms: 1,
        currency: 'EUR'
      });

      if (hotelSearchResults.count === 0) {
        throw new Error('No hotels found');
      }

      // Find best hotel within budget
      const affordableHotels = hotelSearchResults.hotels.filter(h => {
        const nightlyRate = h.price.amount / totalNights;
        return nightlyRate <= maxNightlyRate;
      });

      if (affordableHotels.length > 0) {
        // Sort by rating and pick best one
        affordableHotels.sort((a, b) => (b.rating?.value || 0) - (a.rating?.value || 0));
        const bestHotel = affordableHotels[0];
        const nightlyRate = bestHotel.price.amount / totalNights;

        suggestedHotel = {
          id: bestHotel.id,
          name: bestHotel.name,
          stars: bestHotel.stars,
          pricePerNight: Math.round(nightlyRate),
          totalNights: totalNights,
          totalPrice: bestHotel.price.amount,
          location: bestHotel.location,
          amenities: bestHotel.amenities,
          rating: bestHotel.rating,
          mainPhoto: bestHotel.mainPhoto,
          checkInTime: bestHotel.checkInTime,
          checkOutTime: bestHotel.checkOutTime,
        };

        console.log(`✅ Found hotel: ${suggestedHotel.name} (${suggestedHotel.stars}★) - €${suggestedHotel.pricePerNight}/night`);
      } else {
        throw new Error('No hotels within budget');
      }
    } catch (error) {
      console.warn('⚠️  Hotel search failed, using fallback:', error.message);

      // Fallback: Create estimated hotel
      suggestedHotel = {
        name: `Hotel in ${destination}`,
        stars: 3,
        pricePerNight: Math.round(maxNightlyRate),
        totalNights: totalNights,
        totalPrice: Math.round(maxNightlyRate * totalNights),
        location: 'City Center',
        amenities: ['WiFi', 'Breakfast'],
        distanceToCenter: '0.5 km',
      };
    }

    // STEP 5: Calculate budget breakdown
    const hotelCost = suggestedHotel.totalPrice;
    const remainingBudget = budget - flightCost - hotelCost;

    // Extract city name from airport name (e.g., "Amsterdam Schiphol" → "Amsterdam")
    const extractCityName = (airportName) => {
      // Remove common airport suffixes
      return airportName
        .replace(/\s+(Airport|International|Intl|Municipal|Regional)$/i, '')
        .replace(/\s+(Charles de Gaulle|Orly|CDG|ORY)$/i, '')
        .replace(/\s+(Schiphol|Fiumicino|El Prat|Barajas)$/i, '')
        .trim();
    };

    // Estimate activity budget based on destination cost of living
    const dailyCostIndex = estimateCostOfLiving(destDest.countryName || destDest.country || 'Unknown');
    const estimatedDailyActivities = Math.round(dailyCostIndex * 1.2); // Daily activity budget
    const estimatedActivitiesBudget = estimatedDailyActivities * duration;

    // Log destination data for debugging
    console.log(`📍 Destination data: city=${destDest.cityName || destDest.name}, country=${destDest.countryName || destDest.country || 'Unknown'}`);
    if (groundTransport) {
      console.log(`🚂 Ground transport: ${groundTransport.type} from ${groundTransport.from} to ${groundTransport.to} (${groundTransport.duration}, ~€${groundTransport.estimatedCost})`);
    }

    // Extract actual destination name (remove country suffix if present)
    const actualDestinationName = destination.split(',')[0].trim();

    const result = {
      destination: {
        // If we're using a nearby airport, show the actual destination (e.g., "Lake Como"), not the airport city
        name: groundTransport ? actualDestinationName : (destDest.cityName || destDest.name),
        country: destDest.countryName || destDest.country || 'Unknown',
        code: destDest.code,
        id: destDest.id,
        iata: destDest.code,
        // If using nearby airport, include that info
        nearestAirport: groundTransport ? {
          city: groundTransport.from,
          code: destDest.code,
        } : null,
      },
      origin: {
        name: originDest.cityName || originDest.name,  // Use cityName for clean display
        code: originDest.code,
        id: originDest.id,
      },
      dates: {
        departure: selectedDepartureDate,
        return: selectedReturnDate,
        duration: duration,
        userRequestedDate: departureDate, // Original user request (if any)
        datesChecked: dateCandidates.length, // How many dates we checked
      },
      flight: {
        outbound: {
          departureTime: bestFlight.outbound.departureTime,
          arrivalTime: bestFlight.outbound.arrivalTime,
          departureAirport: bestFlight.outbound.departureAirport,
          arrivalAirport: bestFlight.outbound.arrivalAirport,
          duration: bestFlight.outbound.duration,
          stops: bestFlight.outbound.stops || 0,
          airline: bestFlight.outbound.airline,
          airlineCode: bestFlight.outbound.airlineCode,
          airlineLogo: bestFlight.outbound.airlineLogo,
          segments: bestFlight.outbound.segments || [],
        },
        return: bestFlight.return ? {
          departureTime: bestFlight.return.departureTime,
          arrivalTime: bestFlight.return.arrivalTime,
          departureAirport: bestFlight.return.departureAirport,
          arrivalAirport: bestFlight.return.arrivalAirport,
          duration: bestFlight.return.duration,
          stops: bestFlight.return.stops || 0,
          airline: bestFlight.return.airline,
          airlineCode: bestFlight.return.airlineCode,
          airlineLogo: bestFlight.return.airlineLogo,
          segments: bestFlight.return.segments || [],
        } : null,
        totalCost: flightCost,
      },
      hotel: suggestedHotel,
      // Ground transport info (if flying to nearby airport)
      groundTransport: groundTransport ? {
        type: groundTransport.type, // 'train', 'bus', 'ferry', 'car'
        from: groundTransport.from, // Airport city
        to: groundTransport.to, // Final destination
        duration: groundTransport.duration, // e.g., "1h30"
        estimatedCost: groundTransport.estimatedCost, // Per person, one way
        estimatedCostRoundTrip: groundTransport.estimatedCost * 2, // Round trip
        distance: groundTransport.distance,
      } : null,
      budget: {
        total: budget,
        flight: flightCost,
        hotel: hotelCost,
        groundTransport: groundTransport ? groundTransport.estimatedCost * 2 : 0, // Round trip cost
        remaining: remainingBudget - (groundTransport ? groundTransport.estimatedCost * 2 : 0),
        // Activity estimation based on destination cost of living, not leftover budget
        activities: Math.min(estimatedActivitiesBudget, remainingBudget - (groundTransport ? groundTransport.estimatedCost * 2 : 0)),
        dailyActivities: estimatedDailyActivities,
      },
    };

    const transportCost = groundTransport ? groundTransport.estimatedCost * 2 : 0;
    console.log(`✅ Trip optimized: €${flightCost} flight + €${hotelCost} hotel${transportCost > 0 ? ` + €${transportCost} transport` : ''} = €${flightCost + hotelCost + transportCost} (€${remainingBudget - transportCost} for activities)`);

    return result;

  } catch (error) {
    console.error(`❌ optimizeDestination failed for ${destination}:`, error.message);
    throw error;
  }
}

/**
 * Fallback destinations when searchFlightEverywhere fails
 * Returns curated list based on origin and user preferences
 */
async function fallbackDestinations(origin, budget, userProfile) {
  console.log('📋 Using fallback destination list');

  // Curated destinations by region
  const europeanDestinations = [
    { name: 'Barcelona', country: 'Spain', region: 'Europe' },
    { name: 'Lisbon', country: 'Portugal', region: 'Europe' },
    { name: 'Rome', country: 'Italy', region: 'Europe' },
    { name: 'Amsterdam', country: 'Netherlands', region: 'Europe' },
    { name: 'Prague', country: 'Czech Republic', region: 'Europe' },
  ];

  const globalDestinations = [
    { name: 'Marrakech', country: 'Morocco', region: 'Africa' },
    { name: 'Istanbul', country: 'Turkey', region: 'Asia' },
    { name: 'Dubai', country: 'UAE', region: 'Asia' },
    { name: 'Bangkok', country: 'Thailand', region: 'Asia' },
    { name: 'New York', country: 'USA', region: 'Americas' },
  ];

  // For European origins, include global destinations
  const isEuropeanOrigin = ['Paris', 'London', 'Berlin', 'Madrid', 'Amsterdam'].some(
    city => origin.toLowerCase().includes(city.toLowerCase())
  );

  const candidateList = isEuropeanOrigin
    ? [...europeanDestinations, ...globalDestinations]
    : europeanDestinations;

  // Score fallback destinations
  const scored = candidateList.map(dest => {
    let score = Math.random() * 20; // Random variance

    const interests = userProfile.interests || [];
    if (interests.includes('beach') && ['Barcelona', 'Lisbon', 'Dubai'].includes(dest.name)) score += 30;
    if (interests.includes('culture') && ['Rome', 'Istanbul', 'Marrakech'].includes(dest.name)) score += 25;
    if (interests.includes('food') && ['Barcelona', 'Bangkok', 'Rome'].includes(dest.name)) score += 20;

    const costOfLiving = estimateCostOfLiving(dest.country);
    if (userProfile.budgetLevel === 'budget' && costOfLiving < 60) score += 10;
    if (userProfile.budgetLevel === 'medium' && costOfLiving >= 60 && costOfLiving <= 120) score += 10;

    return {
      ...dest,
      score,
      costOfLiving,
      price: { amount: 150, formatted: '€150' }, // Placeholder
    };
  });

  const sorted = scored.sort((a, b) => b.score - a.score);
  return sorted.slice(0, 5);
}

/**
 * Estimate cost of living for a country (daily budget index)
 */
function estimateCostOfLiving(country) {
  const costIndex = {
    // Budget-friendly (<€60/day)
    'Thailand': 40,
    'Morocco': 45,
    'Portugal': 55,
    'Czech Republic': 50,
    'Spain': 65,

    // Medium (€60-120/day)
    'Italy': 80,
    'Netherlands': 95,
    'France': 100,
    'Germany': 90,

    // Expensive (>€120/day)
    'Switzerland': 150,
    'Norway': 140,
    'UAE': 130,
    'USA': 120,
  };

  return costIndex[country] || 80; // Default to medium
}

/**
 * Determine region from country
 */
function getRegion(country) {
  const regions = {
    'Europe': ['Spain', 'Portugal', 'Italy', 'France', 'Germany', 'Netherlands', 'Czech Republic', 'Switzerland', 'Norway', 'Iceland'],
    'Asia': ['Thailand', 'UAE', 'Turkey', 'Japan', 'China', 'Vietnam', 'Indonesia'],
    'Africa': ['Morocco', 'Egypt', 'South Africa', 'Kenya'],
    'Americas': ['USA', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Costa Rica'],
    'Oceania': ['Australia', 'New Zealand'],
  };

  for (const [region, countries] of Object.entries(regions)) {
    if (countries.includes(country)) return region;
  }

  return 'Europe'; // Default
}

export default {
  discoverDestinations,
  optimizeDestination,
};
