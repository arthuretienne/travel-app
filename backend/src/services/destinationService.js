// backend/src/services/destinationService.js
// Destination discovery and optimization logic
// MIGRATED TO BOOKING.COM API (2025-11-30)

import * as bookingService from './bookingService.js';
import { generateDestinationShortlist } from './claudeService.js';
import * as airScraper from './airScraperService.js'; // Keep for fallback
import * as hotelService from './hotelService.js'; // Old hotel service (not used)

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
}) {
  console.log(`🔍 NEW WORKFLOW: Discovering destinations from ${origin} with budget €${budget}`);

  try {
    // STEP 1: Claude AI generates personalized shortlist (6 destinations)
    console.log('🤖 Step 1: Generating personalized shortlist with Claude AI...');

    const shortlist = await generateDestinationShortlist(userProfile, {
      budget,
      duration,
      origin,
      count: 6
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
          name: dest.name,
          cityName,
          code: dest.code,
          country: dest.country,
          countryName: dest.countryName,
          destinationId: dest.id,
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
 * Optimize trip for a specific destination
 * NEW WORKFLOW: Uses Booking.com API
 * Returns complete trip package with flights, hotel, and budget breakdown
 */
export async function optimizeDestination({
  destination,
  userProfile,
  budget,
  origin,
  duration = 7,
  departureDate = null,
}) {
  console.log(`🎯 NEW WORKFLOW: Optimizing ${destination} trip for €${budget} budget`);

  try {
    // Calculate departure date if not provided
    if (!departureDate) {
      const today = new Date();
      const future = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days
      departureDate = future.toISOString().split('T')[0];
    }

    // Calculate return date
    const returnDate = new Date(departureDate);
    returnDate.setDate(returnDate.getDate() + duration);
    const returnDateStr = returnDate.toISOString().split('T')[0];

    // STEP 1: Get destination IDs
    console.log('📍 Step 1: Getting destination IDs...');
    const originDest = await bookingService.getDestinationId(origin);
    const destDest = await bookingService.getDestinationId(destination);

    // STEP 2: Search flights
    console.log('✈️  Step 2: Searching flights...');
    const flightResults = await bookingService.searchFlights({
      fromId: originDest.id,
      toId: destDest.id,
      departDate: departureDate,
      returnDate: returnDateStr,
      adults: 1,
      cabinClass: 'ECONOMY',
      currency: 'EUR'
    });

    if (!flightResults.flights || flightResults.flights.length === 0) {
      throw new Error(`No flights found from ${origin} to ${destination}`);
    }

    const bestFlight = flightResults.flights[0]; // Already sorted by 'best'
    const flightCost = bestFlight.price.amount;

    console.log(`✅ Best flight: ${bestFlight.outbound.airline} - €${flightCost}`);

    // STEP 3: Calculate remaining budget for hotel
    const remainingForAccommodation = budget - flightCost;
    const totalNights = duration;
    const maxNightlyRate = (remainingForAccommodation / totalNights) * 0.7; // 70% for hotel

    console.log(`🏨 Budget for hotel: €${maxNightlyRate}/night × ${totalNights} nights`);

    // STEP 4: Search hotels using Booking.com API
    let suggestedHotel;
    let hotelSearchResults = null;

    try {
      hotelSearchResults = await bookingService.searchHotels({
        destinationQuery: destination,
        arrivalDate: departureDate,
        departureDate: returnDateStr,
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

    const result = {
      destination: {
        name: destDest.cityName || destDest.name,  // Use cityName for clean display
        code: destDest.code,
        id: destDest.id,
      },
      origin: {
        name: originDest.cityName || originDest.name,  // Use cityName for clean display
        code: originDest.code,
        id: originDest.id,
      },
      dates: {
        departure: departureDate,
        return: returnDateStr,
        duration: duration,
      },
      flight: {
        outbound: {
          departureTime: bestFlight.outbound.departureTime,
          arrivalTime: bestFlight.outbound.arrivalTime,
          departureAirport: bestFlight.outbound.departureAirport,
          arrivalAirport: bestFlight.outbound.arrivalAirport,
          duration: bestFlight.outbound.duration,
          airline: bestFlight.outbound.airline,
          airlineCode: bestFlight.outbound.airlineCode,
          airlineLogo: bestFlight.outbound.airlineLogo,
        },
        return: bestFlight.return ? {
          departureTime: bestFlight.return.departureTime,
          arrivalTime: bestFlight.return.arrivalTime,
          departureAirport: bestFlight.return.departureAirport,
          arrivalAirport: bestFlight.return.arrivalAirport,
          duration: bestFlight.return.duration,
          airline: bestFlight.return.airline,
          airlineCode: bestFlight.return.airlineCode,
          airlineLogo: bestFlight.return.airlineLogo,
        } : null,
        totalCost: flightCost,
      },
      hotel: suggestedHotel,
      budget: {
        total: budget,
        flight: flightCost,
        hotel: hotelCost,
        remaining: remainingBudget,
        dailyActivities: Math.round(remainingBudget / duration),
      },
    };

    console.log(`✅ Trip optimized: €${flightCost} flight + €${hotelCost} hotel = €${flightCost + hotelCost} (€${remainingBudget} for activities)`);

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
