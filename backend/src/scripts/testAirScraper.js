// backend/src/scripts/testAirScraper.js
// POC: Test Air Scraper API quality and response times

import axios from 'axios';
import 'dotenv/config';

const AIR_SCRAPER_API_KEY = process.env.AIR_SCRAPER_API_KEY;
const BASE_URL = 'https://sky-scrapper.p.rapidapi.com';

// Test scenarios based on user flow
const TEST_SCENARIOS = [
  {
    name: 'Scenario A: User with specific destination (Paris → Barcelona)',
    origin: 'CDG', // Paris
    destination: 'BCN', // Barcelona
    date: '2025-06-15',
  },
  {
    name: 'Scenario B: User with flexible dates (Paris → Amsterdam)',
    origin: 'CDG',
    destination: 'AMS',
    // Will use getPriceCalendar to find best dates
  },
  {
    name: 'Scenario C: User without destination (searchFlightEverywhere)',
    origin: 'CDG',
    budget: 200,
    // Will use searchFlightEverywhere to find cheap destinations
  },
];

// Helper: Search specific flight
async function searchFlights(origin, destination, date) {
  const startTime = Date.now();

  try {
    const response = await axios.get(`${BASE_URL}/api/v2/flights/searchFlights`, {
      params: {
        originSkyId: origin,
        destinationSkyId: destination,
        originEntityId: origin,
        destinationEntityId: destination,
        date: date,
        cabinClass: 'economy',
        adults: '1',
        sortBy: 'best',
        currency: 'EUR',
        market: 'fr-FR',
        countryCode: 'FR',
      },
      headers: {
        'X-RapidAPI-Key': AIR_SCRAPER_API_KEY,
        'X-RapidAPI-Host': 'sky-scrapper.p.rapidapi.com',
      },
    });

    const duration = Date.now() - startTime;

    console.log(`\n✅ searchFlights SUCCESS (${duration}ms)`);
    console.log(`   Origin: ${origin} → Destination: ${destination}`);
    console.log(`   Date: ${date}`);

    if (response.data?.data?.itineraries) {
      const flights = response.data.data.itineraries.slice(0, 3);
      console.log(`   Found ${flights.length} flights:`);

      flights.forEach((flight, idx) => {
        const price = flight.price?.formatted || 'N/A';
        const legs = flight.legs?.map(leg => ({
          departure: leg.departure,
          arrival: leg.arrival,
          duration: leg.durationInMinutes,
          carriers: leg.carriers?.marketing?.map(c => c.name).join(', '),
        }));

        console.log(`   ${idx + 1}. ${price} - ${legs?.[0]?.carriers || 'Unknown carrier'}`);
        console.log(`      Departure: ${legs?.[0]?.departure}`);
        console.log(`      Arrival: ${legs?.[0]?.arrival}`);
        console.log(`      Duration: ${legs?.[0]?.duration}min`);
      });
    } else {
      console.log('   ⚠️  No itineraries found');
    }

    return response.data;
  } catch (error) {
    console.error(`❌ searchFlights FAILED (${Date.now() - startTime}ms)`);
    console.error(`   Error: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// Helper: Get price calendar
async function getPriceCalendar(origin, destination, year, month) {
  const startTime = Date.now();

  try {
    const response = await axios.get(`${BASE_URL}/api/v1/flights/getPriceCalendar`, {
      params: {
        originSkyId: origin,
        destinationSkyId: destination,
        fromDate: `${year}-${String(month).padStart(2, '0')}-01`,
        currency: 'EUR',
        market: 'fr-FR',
      },
      headers: {
        'X-RapidAPI-Key': AIR_SCRAPER_API_KEY,
        'X-RapidAPI-Host': 'sky-scrapper.p.rapidapi.com',
      },
    });

    const duration = Date.now() - startTime;

    console.log(`\n✅ getPriceCalendar SUCCESS (${duration}ms)`);
    console.log(`   Origin: ${origin} → Destination: ${destination}`);
    console.log(`   Month: ${year}-${month}`);

    if (response.data?.data?.month) {
      const days = response.data.data.month.days;
      const cheapestDay = days.reduce((min, day) =>
        day.price < min.price ? day : min
      );

      console.log(`   Cheapest date: ${cheapestDay.day} (€${cheapestDay.price})`);
      console.log(`   Price range: €${Math.min(...days.map(d => d.price))} - €${Math.max(...days.map(d => d.price))}`);
    }

    return response.data;
  } catch (error) {
    console.error(`❌ getPriceCalendar FAILED (${Date.now() - startTime}ms)`);
    console.error(`   Error: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// Helper: Search flights everywhere (no destination)
async function searchFlightEverywhere(origin, budget) {
  const startTime = Date.now();

  try {
    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchFlightEverywhere`, {
      params: {
        originSkyId: origin,
        currency: 'EUR',
        anytime: 'true',
      },
      headers: {
        'X-RapidAPI-Key': AIR_SCRAPER_API_KEY,
        'X-RapidAPI-Host': 'sky-scrapper.p.rapidapi.com',
      },
    });

    const duration = Date.now() - startTime;

    console.log(`\n✅ searchFlightEverywhere SUCCESS (${duration}ms)`);
    console.log(`   Origin: ${origin}`);
    console.log(`   Budget: €${budget}`);

    if (response.data?.data?.results) {
      const affordableDestinations = response.data.data.results
        .filter(dest => dest.price?.amount <= budget)
        .slice(0, 10);

      console.log(`   Found ${affordableDestinations.length} destinations under €${budget}:`);

      affordableDestinations.forEach((dest, idx) => {
        console.log(`   ${idx + 1}. ${dest.content?.location?.name} - €${dest.price?.amount}`);
      });
    }

    return response.data;
  } catch (error) {
    console.error(`❌ searchFlightEverywhere FAILED (${Date.now() - startTime}ms)`);
    console.error(`   Error: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Air Scraper API Tests...\n');
  console.log('=' .repeat(60));

  // Test 1: Specific flight search (Scenario A)
  console.log('\n📋 TEST 1: Specific Flight Search (Paris → Barcelona)');
  console.log('-'.repeat(60));
  await searchFlights('CDG', 'BCN', '2025-06-15');

  // Test 2: Price calendar (Scenario B)
  console.log('\n📋 TEST 2: Price Calendar (Paris → Amsterdam, June 2025)');
  console.log('-'.repeat(60));
  await getPriceCalendar('CDG', 'AMS', 2025, 6);

  // Test 3: Search everywhere (Scenario C)
  console.log('\n📋 TEST 3: Search Flight Everywhere (Paris, Budget €200)');
  console.log('-'.repeat(60));
  await searchFlightEverywhere('CDG', 200);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Tests completed!\n');
}

// Run tests
runTests().catch(console.error);
