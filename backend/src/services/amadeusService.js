// backend/src/services/amadeusService.js
import Amadeus from 'amadeus';
import dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: __dirname + '/../../.env' });

console.log('Amadeus credentials:', {
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET,
  hostname: 'test' // Use 'production' when ready
});

// Pre-screening: Check which destinations have flights within budget
export async function preScreenDestinations(destinations, originCity, userBudget) {
  console.log('🔍 Pre-screening destinations with Flight Inspiration API...');
  
  try {
    // Flight Inspiration API - broad search
    const response = await amadeus.shopping.flightDestinations.get({
      origin: originCity,
      maxPrice: Math.floor(userBudget * 0.5), // Allocate 50% to flights
      oneWay: false
    });

    const availableDestinations = response.data.map(d => d.destination);
    
    // Filter Claude's destinations by availability
    const filtered = destinations.filter(dest => 
      availableDestinations.includes(dest.iataCode)
    );

    console.log(`✅ Pre-screening: ${filtered.length}/${destinations.length} destinations have flights`);
    return filtered.slice(0, 5); // Keep top 5
  } catch (error) {
    console.error('Amadeus pre-screening error:', error.response?.data || error.message);
    // Fallback: return top 5 by AI score if API fails
    return destinations.slice(0, 5);
  }
}

// Detailed search for top destinations
export async function searchFlightOffers(destination, slot, originCity) {
  try {
    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: originCity,
      destinationLocationCode: destination.iataCode,
      departureDate: slot.startDate,
      returnDate: slot.endDate,
      adults: 1,
      currencyCode: 'EUR',
      max: 3 // Get top 3 offers
    });

    if (!response.data || response.data.length === 0) {
      return null;
    }

    const bestOffer = response.data[0];
    return {
      price: parseFloat(bestOffer.price.total),
      currency: bestOffer.price.currency,
      segments: bestOffer.itineraries[0].segments.map(seg => ({
        departure: seg.departure.iataCode,
        arrival: seg.arrival.iataCode,
        departureTime: seg.departure.at,
        arrivalTime: seg.arrival.at,
        carrier: seg.carrierCode,
        flightNumber: seg.number,
        duration: seg.duration
      })),
      totalDuration: bestOffer.itineraries[0].duration,
      validatingAirline: bestOffer.validatingAirlineCodes[0]
    };
  } catch (error) {
    console.error(`Flight search error for ${destination.city}:`, error.response?.data || error.message);
    return null;
  }
}

// Estimate hotel cost (simplified - you can add Amadeus Hotel API later)
export function estimateHotelCost(destination, slot, style) {
  const nights = slot.duration - 1; // nights = days - 1
  
  const baseRates = {
    backpacker: 30,
    confort: 80,
    aventure: 50,
    luxe: 200
  };

  const priceMultipliers = {
    1: 2.0,   // Very expensive (Tokyo, NYC)
    2: 1.8,
    3: 1.6,
    4: 1.4,
    5: 1.2,
    6: 1.0,   // Average
    7: 0.85,
    8: 0.7,
    9: 0.6,
    10: 0.5   // Very cheap
  };

  const baseRate = baseRates[style] || 80;
  const multiplier = priceMultipliers[destination.popularityScore] || 1.0;
  
  return Math.round(baseRate * multiplier * nights);
}