// End-to-end test for destination + flight + hotel workflow
// Run: node src/scripts/testEndToEnd.js

import dotenv from 'dotenv';
dotenv.config();

import * as bookingService from '../services/bookingService.js';
import * as destinationService from '../services/destinationService.js';

// Test scenarios
const testScenarios = [
  {
    name: 'Bali - Budget backpacker',
    destination: 'Bali',
    origin: 'Paris',
    userProfile: {
      onboardingPreferences: {
        accommodationPref: 'budget',
        materialComfort: 30,
      },
      constraints: {
        travelers: '1 adult',
      },
    },
    budget: 800,
    duration: 7,
  },
  {
    name: 'Bali - Luxury couple',
    destination: 'Bali',
    origin: 'Paris',
    userProfile: {
      onboardingPreferences: {
        accommodationPref: 'luxe',
        materialComfort: 85,
      },
      constraints: {
        travelers: '2 adults',
      },
    },
    budget: 3000,
    duration: 10,
  },
  {
    name: 'Tokyo - Family of 4',
    destination: 'Tokyo',
    origin: 'Paris',
    userProfile: {
      onboardingPreferences: {
        accommodationPref: 'confort',
        materialComfort: 60,
      },
      constraints: {
        travelers: '2 adults, 2 children',
      },
    },
    budget: 5000,
    duration: 14,
  },
  {
    name: 'Marrakech - Comfort solo',
    destination: 'Marrakech',
    origin: 'Paris',
    userProfile: {
      onboardingPreferences: {
        accommodationPref: 'confort',
        materialComfort: 50,
      },
      constraints: {
        travelers: 1,
      },
    },
    budget: 600,
    duration: 5,
  },
  {
    name: 'Maldives - Honeymoon luxury',
    destination: 'Maldives',
    origin: 'Paris',
    userProfile: {
      onboardingPreferences: {
        accommodationPref: 'luxe',
        materialComfort: 95,
      },
      constraints: {
        travelers: '2 adults',
      },
    },
    budget: 6000,
    duration: 7,
  },
];

async function testFlightDestination(destination, origin) {
  console.log(`\n🛫 Testing flight destination resolution: ${origin} → ${destination}`);

  try {
    const originDest = await bookingService.getDestinationId(origin);
    console.log(`   Origin: ${originDest.name} (${originDest.id})`);

    const destDest = await bookingService.getDestinationId(destination);
    console.log(`   Destination: ${destDest.name} (${destDest.id}) - ${destDest.countryName || destDest.country}`);

    return { origin: originDest, destination: destDest, success: true };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testHotelSearch(destination, userProfile, dates) {
  console.log(`\n🏨 Testing hotel search: ${destination}`);
  console.log(`   Preference: ${userProfile.onboardingPreferences?.accommodationPref || 'default'}`);
  console.log(`   Comfort: ${userProfile.onboardingPreferences?.materialComfort || 50}/100`);
  console.log(`   Travelers: ${userProfile.constraints?.travelers || 1}`);

  try {
    // Parse travelers
    const travelers = userProfile.constraints?.travelers || 1;
    let adults = 1, children = 0, rooms = 1;

    if (typeof travelers === 'number') {
      adults = travelers;
    } else if (typeof travelers === 'string') {
      const adultMatch = travelers.match(/(\d+)\s*adult/i);
      const childMatch = travelers.match(/(\d+)\s*child/i);
      if (adultMatch) adults = parseInt(adultMatch[1]);
      if (childMatch) children = parseInt(childMatch[1]);
    }
    rooms = Math.ceil(adults / 2);

    const result = await bookingService.searchHotels({
      destinationQuery: destination,
      arrivalDate: dates.arrival,
      departureDate: dates.departure,
      adults,
      children,
      rooms,
      currency: 'EUR',
      accommodationPref: userProfile.onboardingPreferences?.accommodationPref,
      materialComfort: userProfile.onboardingPreferences?.materialComfort || 50,
    });

    console.log(`   ✅ Found ${result.count} hotels`);
    console.log(`   Filters applied: ${JSON.stringify(result.filters)}`);

    if (result.hotels.length > 0) {
      console.log(`\n   📋 Top 3 hotels:`);
      result.hotels.slice(0, 3).forEach((h, i) => {
        console.log(`   ${i + 1}. ${h.name}`);
        console.log(`      ⭐ ${h.stars} stars | 💰 €${h.price.amount?.toFixed(0) || 0} | 📊 ${h.rating.value}/10`);
      });

      // Validate filters were applied
      const avgStars = result.hotels.reduce((sum, h) => sum + (h.stars || 0), 0) / result.hotels.length;
      const avgRating = result.hotels.reduce((sum, h) => sum + (h.rating.value || 0), 0) / result.hotels.length;
      console.log(`\n   📊 Results analysis:`);
      console.log(`      Avg stars: ${avgStars.toFixed(1)}`);
      console.log(`      Avg rating: ${avgRating.toFixed(1)}`);
    }

    return { success: true, count: result.count, filters: result.filters };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runScenario(scenario) {
  console.log('\n' + '='.repeat(70));
  console.log(`🧪 SCENARIO: ${scenario.name}`);
  console.log('='.repeat(70));
  console.log(`   Destination: ${scenario.destination}`);
  console.log(`   Budget: €${scenario.budget}`);
  console.log(`   Duration: ${scenario.duration} days`);

  // Calculate dates (30 days from now)
  const arrival = new Date();
  arrival.setDate(arrival.getDate() + 30);
  const departure = new Date(arrival);
  departure.setDate(departure.getDate() + scenario.duration);

  const dates = {
    arrival: arrival.toISOString().split('T')[0],
    departure: departure.toISOString().split('T')[0],
  };

  console.log(`   Dates: ${dates.arrival} → ${dates.departure}`);

  // Test 1: Flight destination resolution
  const flightResult = await testFlightDestination(scenario.destination, scenario.origin);

  if (!flightResult.success) {
    console.log(`\n❌ SCENARIO FAILED: Could not resolve flight destination`);
    return { success: false, step: 'flight', error: flightResult.error };
  }

  // Validate flight destination is correct
  const expectedCountries = {
    'bali': 'indonesia',
    'tokyo': 'japan',
    'marrakech': 'morocco',
    'maldives': 'maldives',
    'bangkok': 'thailand',
    'phuket': 'thailand',
  };

  const expectedCountry = expectedCountries[scenario.destination.toLowerCase()];
  const actualCountry = (flightResult.destination.countryName || flightResult.destination.country || '').toLowerCase();

  if (expectedCountry && !actualCountry.includes(expectedCountry)) {
    console.log(`\n⚠️  DESTINATION MISMATCH!`);
    console.log(`   Expected: ${expectedCountry}`);
    console.log(`   Got: ${actualCountry}`);
    return { success: false, step: 'validation', error: 'Country mismatch' };
  } else {
    console.log(`\n✅ Flight destination verified: ${scenario.destination} → ${actualCountry}`);
  }

  // Test 2: Hotel search with preferences
  await new Promise(r => setTimeout(r, 500)); // Rate limiting
  const hotelResult = await testHotelSearch(scenario.destination, scenario.userProfile, dates);

  if (!hotelResult.success) {
    console.log(`\n❌ SCENARIO FAILED: Hotel search failed`);
    return { success: false, step: 'hotel', error: hotelResult.error };
  }

  console.log(`\n✅ SCENARIO PASSED: ${scenario.name}`);
  return {
    success: true,
    flightDestination: flightResult.destination.name,
    hotelCount: hotelResult.count,
    filters: hotelResult.filters,
  };
}

async function runAllTests() {
  console.log('='.repeat(70));
  console.log('END-TO-END API WORKFLOW TESTS');
  console.log('='.repeat(70));
  console.log(`Running ${testScenarios.length} scenarios...`);

  const results = [];

  for (const scenario of testScenarios) {
    try {
      const result = await runScenario(scenario);
      results.push({ scenario: scenario.name, ...result });
    } catch (error) {
      results.push({ scenario: scenario.name, success: false, error: error.message });
    }

    // Rate limiting between scenarios
    await new Promise(r => setTimeout(r, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`${status} ${r.scenario}`);
    if (!r.success) {
      console.log(`   Failed at: ${r.step || 'unknown'} - ${r.error}`);
    } else {
      console.log(`   Flight: ${r.flightDestination}`);
      console.log(`   Hotels: ${r.hotelCount} found`);
    }
  });

  console.log(`\n📊 Results: ${passed}/${results.length} passed`);

  if (failed > 0) {
    console.log(`\n⚠️  ${failed} scenarios failed!`);
    process.exit(1);
  } else {
    console.log(`\n✅ All scenarios passed!`);
  }
}

runAllTests().catch(console.error);
