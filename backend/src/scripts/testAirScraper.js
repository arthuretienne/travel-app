// backend/src/scripts/testAirScraper.js
// POC: Test Air Scraper API quality and response times

import axios from 'axios';
import 'dotenv/config';

const AIR_SCRAPER_API_KEY = process.env.AIR_SCRAPER_API_KEY;
const BASE_URL = 'https://sky-scrapper.p.rapidapi.com';

// Helper: Search airport to get proper IDs
async function searchAirport(query) {
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchAirport`, {
      params: {
        query: query,
        locale: 'fr-FR',
      },
      headers: {
        'X-RapidAPI-Key': AIR_SCRAPER_API_KEY,
        'X-RapidAPI-Host': 'sky-scrapper.p.rapidapi.com',
      },
    });

    if (response.data?.data && response.data.data.length > 0) {
      const airport = response.data.data[0];
      console.log(`      Found: ${airport.presentation.title} - skyId: ${airport.skyId}, entityId: ${airport.entityId}`);
      return {
        skyId: airport.skyId,
        entityId: airport.entityId,
        name: airport.presentation.title,
      };
    }

    console.log(`      No airport found for "${query}"`);
    return null;
  } catch (error) {
    console.error(`❌ searchAirport FAILED for "${query}"`);
    return null;
  }
}

// Helper: Search specific flight
async function searchFlights(originQuery, destinationQuery, date) {
  const startTime = Date.now();

  try {
    // Step 1: Get airport IDs
    console.log(`   🔍 Looking up airports...`);
    const originAirport = await searchAirport(originQuery);
    const destAirport = await searchAirport(destinationQuery);

    if (!originAirport || !destAirport) {
      console.error(`   ❌ Could not find airport IDs`);
      return null;
    }

    console.log(`   📍 ${originAirport.name} (${originAirport.skyId})`);
    console.log(`   📍 ${destAirport.name} (${destAirport.skyId})`);

    // Step 2: Search flights with proper IDs
    const response = await axios.get(`${BASE_URL}/api/v2/flights/searchFlights`, {
      params: {
        originSkyId: originAirport.skyId,
        destinationSkyId: destAirport.skyId,
        originEntityId: originAirport.entityId,
        destinationEntityId: destAirport.entityId,
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
    console.log(`   Origin: ${originQuery} → Destination: ${destinationQuery}`);
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
async function getPriceCalendar(originQuery, destinationQuery, year, month) {
  const startTime = Date.now();

  try {
    // Get airport IDs
    console.log(`   🔍 Looking up airports...`);
    const originAirport = await searchAirport(originQuery);
    const destAirport = await searchAirport(destinationQuery);

    if (!originAirport || !destAirport) {
      console.error(`   ❌ Could not find airport IDs`);
      return null;
    }

    const response = await axios.get(`${BASE_URL}/api/v1/flights/getPriceCalendar`, {
      params: {
        originSkyId: originAirport.skyId,
        destinationSkyId: destAirport.skyId,
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
    console.log(`   Origin: ${originQuery} → Destination: ${destinationQuery}`);
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
async function searchFlightEverywhere(originQuery, budget) {
  const startTime = Date.now();

  try {
    // Get origin airport ID
    console.log(`   🔍 Looking up origin airport...`);
    const originAirport = await searchAirport(originQuery);

    if (!originAirport) {
      console.error(`   ❌ Could not find origin airport`);
      return null;
    }

    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchFlightEverywhere`, {
      params: {
        originSkyId: originAirport.skyId,
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
    console.log(`   Origin: ${originQuery} (${originAirport.name})`);
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

// Simplified versions using direct codes (to avoid rate limits)
async function searchFlightsDirectly(originCode, destCode, originEntityId, destEntityId, date) {
  const startTime = Date.now();

  try {
    const response = await axios.get(`${BASE_URL}/api/v2/flights/searchFlights`, {
      params: {
        originSkyId: originCode,
        destinationSkyId: destCode,
        originEntityId: originEntityId,
        destinationEntityId: destEntityId,
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

    console.log(`✅ searchFlights SUCCESS (${duration}ms)`);
    console.log(`   Origin: ${originCode} → Destination: ${destCode}`);
    console.log(`   Date: ${date}`);

    if (response.data?.data?.itineraries) {
      const flights = response.data.data.itineraries.slice(0, 3);
      console.log(`   Found ${flights.length} flights:\n`);

      flights.forEach((flight, idx) => {
        const price = flight.price?.formatted || 'N/A';
        const outbound = flight.legs?.[0];
        const carriers = outbound?.carriers?.marketing?.map(c => c.name).join(', ') || 'Unknown';

        console.log(`   ${idx + 1}. ${price} - ${carriers}`);
        console.log(`      Depart: ${outbound?.departure || 'N/A'}`);
        console.log(`      Arrive: ${outbound?.arrival || 'N/A'}`);
        console.log(`      Duration: ${outbound?.durationInMinutes || 'N/A'}min\n`);
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

async function getPriceCalendarDirectly(originCode, destCode, year, month) {
  const startTime = Date.now();

  try {
    const response = await axios.get(`${BASE_URL}/api/v1/flights/getPriceCalendar`, {
      params: {
        originSkyId: originCode,
        destinationSkyId: destCode,
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

    console.log(`✅ getPriceCalendar SUCCESS (${duration}ms)`);
    console.log(`   Origin: ${originCode} → Destination: ${destCode}`);
    console.log(`   Month: ${year}-${month}`);

    if (response.data?.data?.month?.days) {
      const days = response.data.data.month.days;
      const validDays = days.filter(d => d.price && d.price > 0);

      if (validDays.length > 0) {
        const cheapestDay = validDays.reduce((min, day) =>
          day.price < min.price ? day : min
        );

        console.log(`   Cheapest date: ${cheapestDay.day} (€${cheapestDay.price})`);
        console.log(`   Price range: €${Math.min(...validDays.map(d => d.price))} - €${Math.max(...validDays.map(d => d.price))}`);
      }
    } else {
      console.log('   ⚠️  No price data available');
    }

    return response.data;
  } catch (error) {
    console.error(`❌ getPriceCalendar FAILED (${Date.now() - startTime}ms)`);
    console.error(`   Error: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function searchFlightEverywhereDirectly(originCode, budget) {
  const startTime = Date.now();

  try {
    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchFlightEverywhere`, {
      params: {
        originSkyId: originCode,
        currency: 'EUR',
        anytime: 'true',
      },
      headers: {
        'X-RapidAPI-Key': AIR_SCRAPER_API_KEY,
        'X-RapidAPI-Host': 'sky-scrapper.p.rapidapi.com',
      },
    });

    const duration = Date.now() - startTime;

    console.log(`✅ searchFlightEverywhere SUCCESS (${duration}ms)`);
    console.log(`   Origin: ${originCode}`);
    console.log(`   Budget: €${budget}`);

    if (response.data?.data?.results) {
      const affordableDestinations = response.data.data.results
        .filter(dest => dest.price?.amount && dest.price.amount <= budget)
        .slice(0, 10);

      console.log(`   Found ${affordableDestinations.length} destinations under €${budget}:\n`);

      affordableDestinations.forEach((dest, idx) => {
        const name = dest.content?.location?.name || 'Unknown';
        const price = dest.price?.amount || 'N/A';
        console.log(`   ${idx + 1}. ${name} - €${price}`);
      });
    } else {
      console.log('   ⚠️  No destinations found');
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
  // Using direct IDs to avoid rate limit on searchAirport
  console.log('\n📋 TEST 1: Specific Flight Search (Paris CDG → Barcelona)');
  console.log('-'.repeat(60));
  await searchFlightsDirectly('CDG', 'BCN', '27539733', '27544008', '2025-06-15');

  // Wait to avoid rate limit
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Price calendar (Scenario B)
  console.log('\n📋 TEST 2: Price Calendar (Paris CDG → Amsterdam, June 2025)');
  console.log('-'.repeat(60));
  await getPriceCalendarDirectly('CDG', 'AMS', 2025, 6);

  // Wait to avoid rate limit
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Search everywhere (Scenario C)
  console.log('\n📋 TEST 3: Search Flight Everywhere (Paris CDG, Budget €200)');
  console.log('-'.repeat(60));
  await searchFlightEverywhereDirectly('CDG', 200);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Tests completed!\n');
}

// Run tests
runTests().catch(console.error);
